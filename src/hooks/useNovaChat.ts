"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_GREETING, DEFAULT_SUGGESTIONS } from "@/content/nova-qa";
import { scriptedResponder, type NovaResponder } from "@/lib/nova-brain";

export type ChatMessage = {
  id: number;
  from: "visitor" | "nova";
  text: string;
};

/** Minimum beat before a reply lands, so answers don't snap in instantly. */
const THINKING_MS = 480;

let nextId = 0;

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "start",
  });
}

/**
 * Conversation state for the chat panel.
 *
 * History lives here rather than in the panel component, so closing and
 * reopening keeps the thread — the stage never unmounts, so the conversation
 * lasts as long as the visit does.
 *
 * `respond` is injected. Today it's the scripted keyword matcher; pointing it at
 * an API route later needs no changes here or in the UI.
 */
export function useNovaChat({
  name,
  respond = scriptedResponder,
}: {
  name: string | null;
  respond?: NovaResponder;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Guards against a second question being sent while the first is in flight.
  const busy = useRef(false);

  const open = useCallback(() => {
    setIsOpen(true);
    // Seed the thread the first time only; reopening keeps what was said.
    setMessages((current) =>
      current.length > 0
        ? current
        : [{ id: nextId++, from: "nova", text: CHAT_GREETING(name) }],
    );
  }, [name]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, open, close]);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || busy.current) return;

      busy.current = true;
      setMessages((current) => [
        ...current,
        { id: nextId++, from: "visitor", text: question },
      ]);
      setIsThinking(true);

      void (async () => {
        try {
          // Race the answer against a minimum pause: instant for the scripted
          // brain, and already correct for a slower API-backed one.
          const [reply] = await Promise.all([
            respond(question, { name }),
            new Promise((resolve) => setTimeout(resolve, THINKING_MS)),
          ]);

          setMessages((current) => [
            ...current,
            { id: nextId++, from: "nova", text: reply.text },
          ]);
          setSuggestions(reply.suggestions);
          if (reply.scrollTo) scrollToSection(reply.scrollTo);
        } finally {
          setIsThinking(false);
          busy.current = false;
        }
      })();
    },
    [name, respond],
  );

  // Escape closes from anywhere, not just while focus is inside the panel.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return { isOpen, messages, isThinking, suggestions, open, close, toggle, send };
}
