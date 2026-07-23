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
import {
  celebrate,
  noPower,
  onAskNova,
  setNovaThinking,
  setWindowOpen,
} from "@/lib/nova-bus";
import { sanitizeName, setVisitorName } from "@/lib/memory";
import { getPower, isDead, onPowerEvent, setLevel } from "@/lib/power";
import { setTheme } from "@/lib/theme";

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

/**
 * Commands the terminal understands, shown in the header and on error.
 *
 * The theme pair also answer to `/dark` and `/light`; the aliases are handled
 * but deliberately not listed, since printing all seven would bury the four
 * commands that actually navigate.
 */
export const COMMANDS = [
  "/work",
  "/about",
  "/contact",
  "/cv",
  "/dark-mode",
  "/light-mode",
  "/clear",
] as const;

/** How the terminal window is presented. Mirrors the traffic lights. */
export type WindowState = "normal" | "minimized" | "maximized";

const BOOT_LINES: Omit<TerminalLine, "id">[] = [
  { kind: "boot", text: "nova_ai v1.0 · cognition_layer online" },
  { kind: "hint", text: `type a question, or one of: ${COMMANDS.join(" ")}` },
];

let nextId = 0;
const line = (l: Omit<TerminalLine, "id">): TerminalLine => ({ id: nextId++, ...l });

/** Prefixed onto her answers when she's running on the last few percent. */
const SLEEPY_PREFIXES = [
  "*yawn* ",
  "mm… ",
  "hang on, waking up… ",
  "sorry, low power. ",
];

/** Longer than this and a critical reply gets cut short. */
const TRUNCATE_OVER = 108;

/**
 * Cuts a reply off where a sentence runs out of power.
 *
 * Backs up to the last natural break rather than slicing mid-word, so what's
 * left still reads as something she started saying — a hard character cut reads
 * as a bug in the renderer, not as a robot losing her train of thought.
 */
function truncate(text: string): string {
  if (text.length <= TRUNCATE_OVER) return text;
  const cut = text.slice(0, TRUNCATE_OVER);
  const stop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf(", "),
    cut.lastIndexOf(" "),
  );
  return `${(stop > 40 ? cut.slice(0, stop) : cut).trimEnd()}…`;
}

/**
 * Colours a reply with how flat she is.
 *
 * On `low` the content still has to be correct and complete — she's tired, not
 * unhelpful — so tiredness lands in the delivery and nowhere else, and only
 * sometimes, because a tic on every single line stops reading as character.
 *
 * On `critical` it goes further, because by then the honest thing is that she
 * genuinely can't finish: the answer is banner-prefixed, slurred, and cut off.
 * The terminal still works, which is the point — she is degrading, not down.
 */
function sleepy(text: string): string {
  const { state } = getPower();

  if (state === "critical") {
    const prefix =
      SLEEPY_PREFIXES[Math.floor(Math.random() * SLEEPY_PREFIXES.length)];
    return `// LOW POWER MODE\n${prefix}${truncate(text)}`;
  }

  if (state !== "low" || Math.random() > 0.35) return text;
  return SLEEPY_PREFIXES[Math.floor(Math.random() * SLEEPY_PREFIXES.length)] + text;
}

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
      // Locked at 0%. The refusal is the whole response — no window, no
      // transcript, just the toast, because a terminal that opens to say she
      // can't talk is still a terminal that opened.
      if (isDead()) {
        noPower();
        return;
      }
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

      /*
       * Hidden: `/set-battery-42`, and the spaced form for convenience.
       *
       * Deliberately absent from `COMMANDS`, so it appears in neither the
       * header hint nor the "command not found" list — a visitor who never
       * types it will never learn it exists. It's here because the drain is
       * tuned to ~17 minutes and the low-power states are otherwise untestable
       * without sitting through it.
       *
       * Matched before the switch: the value is part of the command word, so
       * there is no fixed string for a `case` to match on.
       */
      const battery = /^\/set-battery[-\s](\d{1,3})$/.exec(raw.trim().toLowerCase());
      if (battery) {
        const applied = setLevel(Number(battery[1]));
        // `status` rather than `reply` — dim and italic, so it reads as the
        // debug output it is rather than as NOVA saying something.
        push({ kind: "status", text: `// battery set to ${applied}%` });
        return true;
      }

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

        case "/dark-mode":
        case "/dark": {
          const result = setTheme("dark");
          push({
            kind: "reply",
            text:
              result === "already"
                ? "lights are already out."
                : "lights out. much easier on my optics.",
          });
          return true;
        }

        case "/light-mode":
        case "/light": {
          const result = setTheme("light");
          if (result === "refused") {
            // The one command a flat battery turns down. Phrased as her
            // refusing rather than as the site failing — it's a state she's in,
            // and the fix is on screen.
            push({
              kind: "error",
              text: "// ERROR: insufficient power. charge me first.",
            });
            return true;
          }
          push({
            kind: "reply",
            text:
              result === "already"
                ? "lights are already on."
                : "lights on. blinding, but you're the boss.",
          });
          return true;
        }

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
              text: sleepy(reply.text),
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

  /*
   * Hitting 0% mid-conversation closes the window.
   *
   * Leaving it open would be the only lit thing on a page that has just gone
   * dark, and it would sit there refusing to answer — worse than shutting down,
   * which is at least what happened. The transcript survives; reopening after
   * she's revived picks it up where it stopped.
   */
  useEffect(
    () =>
      onPowerEvent((event) => {
        if (event === "died") close();
      }),
    [close],
  );

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
