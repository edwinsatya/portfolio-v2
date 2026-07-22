"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHAT_GREETING,
  CHAT_NAME_ASK,
  DEFAULT_SUGGESTIONS,
  greetingsFor,
} from "@/content/nova-qa";
import { scenes } from "@/content/scenes";
import { profile } from "@/content/profile";
import { matchIntent, scriptedResponder, type NovaResponder } from "@/lib/nova-brain";
import { celebrate, onAskNova, setNovaThinking, setWindowOpen } from "@/lib/nova-bus";
import { sanitizeName, setVisitorName } from "@/lib/memory";

/**
 * One line of terminal output.
 *
 * `kind` decides how it renders — the prompt prefix, the colour, whether it
 * types itself out. Keeping the transcript as tagged lines rather than
 * chat bubbles is what lets the log read like a real session.
 */
export type TerminalLine = {
  id: number;
  kind: "boot" | "hint" | "comment" | "input" | "status" | "reply" | "error";
  text: string;
  /** On a reply: offer a NAVIGATE_TO button for this scene. */
  scene?: string;
  /** Newly-landed replies type themselves; replayed history does not. */
  fresh?: boolean;
};

/** Minimum beat before a reply lands, so answers don't snap in instantly. */
const THINKING_MS = 520;

/** Commands the terminal understands, shown in the header and on error. */
export const COMMANDS = ["/work", "/about", "/contact", "/cv", "/clear"] as const;

/** How the terminal window is presented. Mirrors the traffic lights. */
export type WindowState = "normal" | "minimized" | "maximized";

const BOOT_LINES: Omit<TerminalLine, "id">[] = [
  { kind: "boot", text: "nova_ai v1.0 · cognition_layer online" },
  { kind: "hint", text: `type a question, or one of: ${COMMANDS.join(" ")}` },
];

let nextId = 0;
const line = (l: Omit<TerminalLine, "id">): TerminalLine => ({ id: nextId++, ...l });

/**
 * Terminal state for the NOVA chat.
 *
 * The answering brain, the name flow, and the memory writes are unchanged from
 * the bubble version — this is the same conversation wearing a terminal. What's
 * new is slash commands and that an answer's scene becomes a navigate button
 * rather than a scroll, since the stage doesn't scroll any more.
 *
 * `respond` is still injected, so pointing it at an LLM route later needs no
 * changes here or in the UI.
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Guards against a second question being sent while the first is in flight.
  const busy = useRef(false);
  // True between NOVA asking the visitor's name and them answering.
  const awaitingName = useRef(false);

  const push = useCallback((l: Omit<TerminalLine, "id">) => {
    setLines((current) => [...current, line(l)]);
  }, []);

  /**
   * `withQuestion` means the visitor arrived via a suggestion chip, so they want
   * that answered — asking their name first would talk straight over it.
   */
  const open = useCallback(
    (withQuestion = false) => {
      setIsOpen(true);
      // Reopening from the dock restores the window rather than leaving it
      // collapsed, which would look like the click did nothing.
      setWindowState((w) => (w === "minimized" ? "normal" : w));
      setLines((current) => {
        if (current.length > 0) return current;
        const asksName = isFirstVisit && !name && !withQuestion;
        awaitingName.current = asksName;
        return [
          ...BOOT_LINES.map(line),
          line({
            kind: "comment",
            text: asksName
              ? `// ${CHAT_NAME_ASK}`
              : `// ${CHAT_GREETING(name).toLowerCase()}`,
          }),
        ];
      });
    },
    [name, isFirstVisit],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    // Next open starts at a normal window; a maximised one left behind would
    // be a surprise.
    setWindowState("normal");
  }, []);

  /** Yellow light. Collapses to the dock pill, keeping the transcript. */
  const minimize = useCallback(() => setWindowState("minimized"), []);

  /** Green light. Toggles between near-full-viewport and normal. */
  const toggleMaximize = useCallback(
    () => setWindowState((w) => (w === "maximized" ? "normal" : "maximized")),
    [],
  );

  /** Clicking the dock pill. */
  const restore = useCallback(() => setWindowState("normal"), []);
  const toggle = useCallback(
    () => (isOpen ? close() : open()),
    [isOpen, open, close],
  );

  /** Leaves the terminal and switches scene. Used by /commands and buttons. */
  const goToScene = useCallback(
    (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      close();
      router.push(scene.href);
    },
    [close, router],
  );

  /** Returns true if the input was a command and has been handled. */
  const runCommand = useCallback(
    (raw: string): boolean => {
      if (!raw.startsWith("/")) return false;

      const cmd = raw.toLowerCase().split(/\s+/)[0];
      push({ kind: "input", text: raw });

      switch (cmd) {
        case "/work":
        case "/about":
        case "/contact":
          goToScene(cmd.slice(1));
          return true;

        case "/cv":
          push({ kind: "reply", text: "opening resume in a new tab…" });
          window.open(profile.links.resume, "_blank", "noopener,noreferrer");
          return true;

        case "/clear":
          // Back to a fresh prompt, header and all. The name ask doesn't
          // return — they've already been asked once.
          setLines(BOOT_LINES.map(line));
          return true;

        default:
          push({
            kind: "error",
            text: `command not found: ${cmd}\navailable: ${COMMANDS.join("  ")}`,
          });
          return true;
      }
    },
    [push, goToScene],
  );

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || busy.current) return;

      if (runCommand(question)) return;

      busy.current = true;
      push({ kind: "input", text: question });
      setIsThinking(true);
      // Also on the bus: the stage readout shows the same beat from outside.
      setNovaThinking(true);

      void (async () => {
        try {
          // While waiting on a name, anything that isn't recognisably a question
          // is taken as the answer. Checking the intent first means "what has he
          // built?" still gets answered rather than stored as someone's name.
          const takingName = awaitingName.current && !matchIntent(question);

          const [reply] = await Promise.all([
            takingName ? Promise.resolve(null) : respond(question, { name }),
            new Promise((resolve) => setTimeout(resolve, THINKING_MS)),
          ]);

          if (takingName) {
            awaitingName.current = false;
            const saved = setVisitorName(question);
            push({
              kind: "reply",
              fresh: true,
              text: saved
                ? greetingsFor.named(saved)
                : "No problem — ask me anything about Edwin.",
            });
            // Pleased to meet you. Only sometimes — every time would stop
            // reading as a reaction and start reading as a transition.
            if (saved && Math.random() < 0.6) celebrate("wave");
            setSuggestions(DEFAULT_SUGGESTIONS);
            return;
          }

          // They asked a real question instead of answering; stop waiting.
          awaitingName.current = false;
          if (reply) {
            push({
              kind: "reply",
              text: reply.text,
              scene: reply.scene,
              fresh: true,
            });
            setSuggestions(reply.suggestions);
          }
        } finally {
          setIsThinking(false);
          setNovaThinking(false);
          busy.current = false;
        }
      })();
    },
    [name, respond, push, runCommand],
  );

  // Hero chips: open the terminal, then ask. Deferred a tick so the header is
  // seeded before the question lands under it.
  useEffect(
    () =>
      onAskNova((question) => {
        open(Boolean(question));
        if (question) window.setTimeout(() => send(question), 60);
      }),
    [open, send],
  );

  /**
   * "Occupying the visitor" — drives NOVA stepping aside and the tagline
   * rotation pausing. A minimised terminal is docked out of the way, so it
   * doesn't count even though it's still open.
   */
  const isEngaged = isOpen && windowState !== "minimized";

  useEffect(() => setWindowOpen("terminal", isEngaged), [isEngaged]);

  return {
    isOpen,
    windowState,
    isEngaged,
    lines,
    isThinking,
    suggestions,
    open,
    close,
    minimize,
    toggleMaximize,
    restore,
    toggle,
    send,
    goToScene,
  };
}

/** Re-exported so the terminal can label its own input. */
export { sanitizeName };
