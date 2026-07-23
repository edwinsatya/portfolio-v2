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
  getStageBusy,
  noPower,
  onAskNova,
  setNovaThinking,
  setWindowOpen,
} from "@/lib/nova-bus";
import { goToLegacy, SWITCH_DELAY_MS } from "@/lib/legacy";
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
  /**
   * Part of the opening block, pinned above the question row rather than
   * scrolling in the log below it.
   *
   * Flagged rather than inferred from position: the prompt can now print lines
   * of its own — a tab-completion list, a `^C` — before the visitor has
   * submitted anything, and "everything before the first input" would strand
   * those up in the header for the rest of the session.
   */
  head?: boolean;
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
  "/v1",
  "/dark-mode",
  "/light-mode",
  "/clear",
  "/help",
] as const;

export type Command = (typeof COMMANDS)[number];

/**
 * One line each, for `/help`.
 *
 * Kept beside `COMMANDS` rather than in `nova-qa.ts`: these describe what the
 * terminal *does*, not what NOVA knows, and the record is typed off the tuple
 * so adding a command without documenting it fails the build.
 */
const COMMAND_HELP: Record<Command, string> = {
  "/work": "jump to the work scene",
  "/about": "jump to the about scene",
  "/contact": "jump to the contact scene",
  "/cv": "open edwin's resume in a new tab",
  "/v1": "leave for the classic build (/classic)",
  "/dark-mode": "lights out",
  "/light-mode": "lights on — needs power",
  "/clear": "wipe the screen (ctrl+l)",
  "/help": "print this list",
};

/** How the terminal window is presented. Mirrors the traffic lights. */
export type WindowState = "normal" | "minimized" | "maximized";

const BOOT_LINES: Omit<TerminalLine, "id">[] = [
  { kind: "boot", head: true, text: "nova_ai v1.0 · cognition_layer online" },
  {
    kind: "hint",
    head: true,
    text: "type a question, or /help for commands · ↑↓ history · tab completes",
  },
];

/**
 * Text seeded into the prompt from outside the terminal.
 *
 * The nonce is what makes it an *event* rather than a value: pressing `/` twice
 * has to reseed the prompt both times, and two identical `{ text: "/" }` objects
 * would be indistinguishable to the effect that consumes them.
 */
export type Prefill = { text: string; nonce: number };

let nextPrefill = 0;

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
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  // Guards against a second question being sent while the first is in flight.
  const busy = useRef(false);
  // True between NOVA asking the visitor's name and them answering.
  const awaitingName = useRef(false);

  const push = useCallback((l: Omit<TerminalLine, "id">) => {
    setLines((current) => [...current, line(l)]);
  }, []);

  /**
   * Prints a line nobody asked NOVA for — a tab-completion list, a `^C`.
   *
   * Exposed so the prompt can write to the transcript without going through
   * `send`, which would treat the text as a question and set her thinking.
   */
  const print = useCallback(
    (text: string, kind: TerminalLine["kind"] = "hint") => push({ kind, text }),
    [push],
  );

  /** Back to a fresh prompt, header and all. `/clear` and Ctrl+L both land here. */
  const clear = useCallback(() => setLines(BOOT_LINES.map(line)), []);

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
            head: true,
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

        case "/v1":
        case "/classic":
          // The one command that ends the session: a full load to the older
          // portfolio. `status` rather than `reply` — this is the terminal
          // reporting what it's doing, not NOVA saying goodbye — and the beat
          // before leaving is what makes the line readable at all.
          push({ kind: "status", text: "// loading classic build…" });
          window.setTimeout(goToLegacy, SWITCH_DELAY_MS);
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

        case "/help": {
          // Padded into a column, which `.term-line`'s `pre-wrap` and the
          // monospace face turn into an actual aligned table.
          const width = Math.max(...COMMANDS.map((c) => c.length));
          push({
            kind: "hint",
            text: COMMANDS.map(
              (c) => `  ${c.padEnd(width)}   ${COMMAND_HELP[c]}`,
            ).join("\n"),
          });
          return true;
        }

        case "/clear":
          // Back to a fresh prompt, header and all. The name ask doesn't
          // return — they've already been asked once.
          clear();
          return true;

        default:
          push({
            kind: "error",
            text: `command not found: ${cmd}\navailable: ${COMMANDS.join("  ")}`,
          });
          return true;
      }
    },
    [push, goToScene, clear],
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

  /*
   * `/` and `T` from anywhere on the page.
   *
   * `/` seeds the prompt with a slash, because someone reaching for it is
   * reaching for a command; `T` opens to an empty line. Deliberately bare keys
   * with no modifier — the whole point is that they're as quick as they are in
   * a real shell — which is why the guards below matter more than usual: a
   * visitor mid-sentence in the contact form must never have a `t` eaten.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const wantsPrompt = event.key === "/";
      if (!wantsPrompt && event.key !== "t" && event.key !== "T") return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      // The boot screen swallows the first key as a skip; opening a terminal
      // out from under it would be two things happening on one press.
      if (document.documentElement.dataset.booting) return;
      // Something already has the visitor — the resume window, or the terminal
      // itself. A minimised terminal doesn't count: `/` restores it.
      if (getStageBusy()) return;

      // Firefox binds `/` to quick-find; Safari and Chrome don't, but the
      // preventDefault is cheap and the inconsistency wouldn't be.
      event.preventDefault();

      if (isDead()) {
        noPower();
        return;
      }

      open();
      setPrefill({ text: wantsPrompt ? "/" : "", nonce: nextPrefill++ });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
    prefill,
    open,
    close,
    minimize,
    toggleMaximize,
    restore,
    toggle,
    send,
    print,
    clear,
    goToScene,
  };
}

/** Re-exported so the terminal can label its own input. */
export { sanitizeName };
