"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_GREETING,
  CHAT_NAME_ASK,
  DEFAULT_SUGGESTIONS,
  greetingsFor,
} from "@/content/nova-qa";
import { matchIntent, scriptedResponder, type NovaResponder } from "@/lib/nova-brain";
import { onAskNova } from "@/lib/nova-bus";
import { sanitizeName, setVisitorName } from "@/lib/memory";

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
  isFirstVisit,
  respond = scriptedResponder,
}: {
  name: string | null;
  isFirstVisit: boolean;
  respond?: NovaResponder;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Guards against a second question being sent while the first is in flight.
  const busy = useRef(false);
  // True between NOVA asking the visitor's name and them answering. The ask now
  // lives here rather than in a hero speech bubble.
  const awaitingName = useRef(false);

  const push = useCallback((from: ChatMessage["from"], text: string) => {
    setMessages((current) => [...current, { id: nextId++, from, text }]);
  }, []);

  /**
   * `withQuestion` means the visitor arrived via a suggestion chip, so they want
   * that answered — asking their name first would talk straight over it. The
   * name is only requested when they open the chat to converse.
   */
  const open = useCallback(
    (withQuestion = false) => {
      setIsOpen(true);
      // Seed the thread the first time only; reopening keeps what was said.
      setMessages((current) => {
        if (current.length > 0) return current;
        const asksName = isFirstVisit && !name && !withQuestion;
        awaitingName.current = asksName;
        return [
          {
            id: nextId++,
            from: "nova",
            text: asksName ? CHAT_NAME_ASK : CHAT_GREETING(name),
          },
        ];
      });
    },
    [name, isFirstVisit],
  );

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(
    () => (isOpen ? close() : open()),
    [isOpen, open, close],
  );

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || busy.current) return;

      busy.current = true;
      push("visitor", question);
      setIsThinking(true);

      void (async () => {
        try {
          // While waiting on a name, anything that isn't recognisably a question
          // is taken as the answer. Checking the intent first means "what has he
          // built?" still gets answered rather than stored as someone's name.
          const takingName = awaitingName.current && !matchIntent(question);

          const [reply] = await Promise.all([
            takingName
              ? Promise.resolve(null)
              : respond(question, { name }),
            new Promise((resolve) => setTimeout(resolve, THINKING_MS)),
          ]);

          if (takingName) {
            awaitingName.current = false;
            const saved = setVisitorName(question);
            push(
              "nova",
              saved
                ? greetingsFor.named(saved)
                : "No problem — ask me anything about Edwin.",
            );
            setSuggestions(DEFAULT_SUGGESTIONS);
            return;
          }

          // They asked a real question instead of answering; stop waiting.
          awaitingName.current = false;
          if (reply) {
            push("nova", reply.text);
            setSuggestions(reply.suggestions);
            if (reply.scrollTo) scrollToSection(reply.scrollTo);
          }
        } finally {
          setIsThinking(false);
          busy.current = false;
        }
      })();
    },
    [name, respond, push],
  );

  // Hero chips: open the panel, then ask. The send is deferred a tick so the
  // greeting is seeded before the question lands under it.
  useEffect(
    () =>
      onAskNova((question) => {
        open(Boolean(question));
        // No question means "just open" — the nav's chat button.
        if (question) window.setTimeout(() => send(question), 60);
      }),
    [open, send],
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

/** Re-exported so the panel can label its own input. */
export { sanitizeName };
