"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMMANDS,
  type Prefill,
  type TerminalLine,
  type WindowState,
} from "@/hooks/useNovaChat";
import { TERMINAL_CHIPS } from "@/content/nova-qa";
import { scenes } from "@/content/scenes";
import { workBySlug, workCards, type WorkCard } from "@/content/work";

/** Characters per tick while a reply types itself out. */
const TYPE_MS = 12;

/** The other completable pool, beside the commands. */
const PROJECT_NAMES = workCards.map((card) => card.name);

/**
 * Session history depth.
 *
 * Deep enough to walk back through a whole conversation and shallow enough that
 * ↑ never turns into an archaeology dig. Not persisted: it's a session, and a
 * shell that remembers last week's commands isn't what this is imitating.
 */
const HISTORY_MAX = 50;

/** Everything the focus trap will cycle through. */
const FOCUSABLE = 'button, input, [href], [tabindex]:not([tabindex="-1"])';

type NovaTerminalProps = {
  isOpen: boolean;
  windowState: WindowState;
  /**
   * The resume window is up in front of this one — both can be open at once,
   * since either can be restored from the dock while the other is showing. The
   * terminal then stops answering Escape and stops trapping Tab, so the window
   * actually on top is the one the keyboard talks to.
   */
  obscured?: boolean;
  lines: TerminalLine[];
  isThinking: boolean;
  /** Text seeded into the prompt from a page-level shortcut. */
  prefill?: Prefill | null;
  onSend: (text: string) => void;
  /** Writes straight to the transcript, bypassing NOVA. Completion lists, `^C`. */
  onPrint: (text: string, kind?: TerminalLine["kind"]) => void;
  onClear: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onScene: (sceneId: string) => void;
  onProject: (slug: string) => void;
};

/** Longest string every candidate starts with — bash's first-Tab target. */
function commonPrefix(values: string[]): string {
  if (!values.length) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    let i = 0;
    while (i < prefix.length && prefix[i] === value[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

/**
 * The chat, as a terminal.
 *
 * A real modal this time, not the old non-blocking panel: it dims and blurs the
 * page, traps focus, and closes on Escape or the red traffic light. That's the
 * right trade here — a terminal is something you're *in*, and the stage behind
 * has nothing you need while you're typing.
 *
 * Desktop is a centred window; phones get a full-height sheet. Both render the
 * same transcript.
 *
 * The prompt itself is the fiddly part. It carries the ergonomics people expect
 * from a shell — history on ↑↓, inline ghost suggestions, Tab completion, Ctrl+L
 * and Ctrl+C — because a terminal that only accepts typed sentences is a
 * costume. Each of those lives in `onPromptKeyDown` below.
 */
export function NovaTerminal({
  isOpen,
  windowState,
  obscured = false,
  lines,
  isThinking,
  prefill,
  onSend,
  onPrint,
  onClear,
  onClose,
  onMinimize,
  onToggleMaximize,
  onScene,
  onProject,
}: NovaTerminalProps) {
  const minimized = windowState === "minimized";
  const [draft, setDraft] = useState("");
  /** Esc hides the current ghost without clearing the line. Reset on any edit. */
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  /* Newest last, like a shell's. Refs rather than state: nothing renders from
     them, and a submit that re-rendered the whole transcript to record its own
     history would be doing the work twice. */
  const history = useRef<string[]>([]);
  /** Index into `history` while walking it; null means "on the live line". */
  const cursor = useRef<number | null>(null);
  /** The half-typed line ↑ stepped away from, handed back on the way down. */
  const stash = useRef("");
  /** A Tab that found nothing to extend. The next one prints the options. */
  const tabbed = useRef(false);

  /**
   * The inline suggestion, or null.
   *
   * Commands are checked first so `/c` offers `/contact` rather than a question
   * that happens to start with a slash — not that one does today, but the
   * priority is the rule, not the accident.
   */
  const ghost = useMemo(() => {
    const typed = draft.toLowerCase();
    if (!typed.trim()) return null;

    const hit =
      COMMANDS.find((c) => c.startsWith(typed) && c.length > typed.length) ??
      PROJECT_NAMES.find(
        (n) => n.toLowerCase().startsWith(typed) && n.length > typed.length,
      ) ??
      TERMINAL_CHIPS.find(
        (q) => q.toLowerCase().startsWith(typed) && q.length > typed.length,
      );

    // Sliced by the *typed* length, not the match's: the visitor's casing stays
    // on screen and only the tail is ghosted.
    return hit ? { full: hit, rest: hit.slice(draft.length) } : null;
  }, [draft]);

  const showGhost = Boolean(ghost) && !dismissed;

  // Focus the prompt on open, and hand focus back to whatever opened it.
  useEffect(() => {
    if (isOpen && !minimized && !obscured) {
      restoreTo.current = document.activeElement as HTMLElement | null;
      // After the open transition has started, so focus doesn't scroll the page.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    restoreTo.current?.focus?.();
  }, [isOpen, minimized, obscured]);

  /** Parks the caret after the text, which is where a recall should leave it. */
  const caretToEnd = useCallback(() => {
    // Next frame: the value React is about to write isn't in the DOM yet.
    window.requestAnimationFrame(() => {
      const el = inputRef.current;
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  /* Seeded from the page-level `/` and `T` shortcuts. Keyed on the nonce, so
     pressing `/` again reseeds even though the text hasn't changed. */
  useEffect(() => {
    if (!prefill) return;
    // Seeded from the timer rather than the effect body: it lands just behind
    // the open effect's own focus call, so this is the one that wins the caret.
    const timer = window.setTimeout(() => {
      setDraft(prefill.text);
      setDismissed(false);
      cursor.current = null;
      tabbed.current = false;
      inputRef.current?.focus();
      caretToEnd();
    }, 70);
    return () => window.clearTimeout(timer);
  }, [prefill, caretToEnd]);

  /**
   * Everything Tab can reach, in DOM order.
   *
   * Filtered by whether it actually has a box, because the window carries two
   * sets of chrome that CSS picks between — the desktop rail and the phone title
   * bar — plus the phone-only history buttons. Handing `.focus()` a display:none
   * element does nothing at all, which would show up as a Tab that lands
   * somewhere invisible or nowhere.
   */
  const focusables = useCallback(
    () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((el) => el.getClientRects().length > 0),
    [],
  );

  // Escape closes; Tab cycles inside the dialog rather than escaping to the page
  // behind it.
  useEffect(() => {
    if (!isOpen || minimized || obscured) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        // A visible suggestion is the nearest thing Escape can dismiss, so it
        // goes first — same order of business as an editor's autocomplete.
        if (showGhost && event.target === inputRef.current) {
          setDismissed(true);
          return;
        }
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      // The prompt owns Tab: there it completes commands, and only falls back
      // to cycling when there's nothing to complete. See `onPromptKeyDown`.
      if (event.target === inputRef.current) return;

      const focusable = focusables();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, minimized, obscured, onClose, showGhost, focusables]);

  // Keep the newest line in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines, isThinking]);

  /*
   * The opening lines are pinned above the question row; everything said since
   * scrolls below it. That split is what keeps the chips between the header and
   * the conversation, as in the reference, rather than floating above the
   * version banner. `head` is set once, when the transcript is seeded.
   */
  const header = lines.filter((l) => l.head);
  const body = lines.filter((l) => !l.head);

  function submit(text: string) {
    const value = text.trim();
    if (value) {
      // Duplicates of the line directly above are dropped, the way a shell
      // drops them — otherwise ten `/clear`s cost ten presses to walk past.
      if (history.current[history.current.length - 1] !== value) {
        history.current = [...history.current, value].slice(-HISTORY_MAX);
      }
    }
    onSend(text);
    setDraft("");
    setDismissed(false);
    cursor.current = null;
    stash.current = "";
    tabbed.current = false;
    inputRef.current?.focus();
  }

  /** Takes the whole suggestion. Commands get the trailing space Tab implies. */
  const accept = useCallback(() => {
    if (!ghost || dismissed) return false;
    setDraft(ghost.full.startsWith("/") ? `${ghost.full} ` : ghost.full);
    tabbed.current = false;
    caretToEnd();
    inputRef.current?.focus();
    return true;
  }, [ghost, dismissed, caretToEnd]);

  /**
   * Walks history. `-1` is older, `+1` is newer.
   *
   * Stepping off the newest entry restores the line they were part-way through
   * when they first pressed ↑, rather than blanking it — losing a half-typed
   * question to a mistyped arrow is the one thing that would make this worse
   * than no history at all.
   */
  const recall = useCallback(
    (step: -1 | 1) => {
      const list = history.current;
      if (!list.length) return;
      setDismissed(false);
      // The phone buttons take focus when tapped; the recalled line is only
      // useful at a prompt you're standing in.
      inputRef.current?.focus();

      if (cursor.current === null) {
        if (step > 0) return;
        stash.current = draft;
        cursor.current = list.length - 1;
      } else {
        const next = cursor.current + step;
        if (next >= list.length) {
          cursor.current = null;
          setDraft(stash.current);
          caretToEnd();
          return;
        }
        cursor.current = Math.max(0, next);
      }

      setDraft(list[cursor.current]);
      caretToEnd();
    },
    [draft, caretToEnd],
  );

  /** Tab in the prompt: complete a command, take a suggestion, or cycle focus. */
  function complete(): boolean {
    if (draft.startsWith("/")) {
      const typed = draft.toLowerCase();
      const matches = COMMANDS.filter((c) => c.startsWith(typed));
      if (!matches.length) return false;

      if (matches.length === 1) {
        setDraft(`${matches[0]} `);
        tabbed.current = false;
        caretToEnd();
        return true;
      }

      const prefix = commonPrefix(matches);
      if (prefix.length > draft.length) {
        setDraft(prefix);
        tabbed.current = false;
        caretToEnd();
        return true;
      }

      // Nothing left to extend. Bash beeps once here and lists on the next
      // press; the beep is silent, but the two-step rhythm is the familiar bit.
      if (!tabbed.current) {
        tabbed.current = true;
        return true;
      }
      onPrint(matches.join("  "));
      tabbed.current = false;
      return true;
    }

    // Not a command: the ten project names are the other completable pool, and
    // they come before the suggestion chips because someone half-typing
    // "weath" is naming a thing, not starting a sentence.
    const typed = draft.toLowerCase();
    const names = PROJECT_NAMES.filter((n) => n.toLowerCase().startsWith(typed));
    if (typed.trim() && names.length) {
      if (names.length === 1) {
        setDraft(names[0]);
        tabbed.current = false;
        caretToEnd();
        return true;
      }
      const prefix = commonPrefix(names.map((n) => n.toLowerCase()));
      if (prefix.length > draft.length) {
        setDraft(prefix);
        tabbed.current = false;
        caretToEnd();
        return true;
      }
      if (!tabbed.current) {
        tabbed.current = true;
        return true;
      }
      onPrint(names.join("  "));
      tabbed.current = false;
      return true;
    }

    return accept();
  }

  /** Moves focus off the prompt when Tab has nothing to complete. */
  function cycleFocus(back: boolean) {
    const list = focusables();
    const at = list.indexOf(inputRef.current as HTMLElement);
    if (at === -1) return;
    const next = back
      ? (list[at - 1] ?? list[list.length - 1])
      : (list[at + 1] ?? list[0]);
    next?.focus();
  }

  function onPromptKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const el = event.currentTarget;

    if (event.ctrlKey && (event.key === "l" || event.key === "L")) {
      event.preventDefault();
      // Screen only. The line you were typing survives, as it does in a shell.
      onClear();
      return;
    }

    if (event.ctrlKey && (event.key === "c" || event.key === "C")) {
      // With a selection this is a copy, and stealing that would be rude.
      if (el.selectionStart !== el.selectionEnd) return;
      event.preventDefault();
      // Echoed as an input line so the abandoned text stays in the scrollback,
      // which is the whole reason a real shell prints it.
      onPrint(`${draft}^C`, "input");
      setDraft("");
      setDismissed(false);
      cursor.current = null;
      tabbed.current = false;
      return;
    }

    if (event.altKey || event.metaKey || event.ctrlKey) return;

    if (event.key === "Tab") {
      event.preventDefault();
      if (!complete()) cycleFocus(event.shiftKey);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      recall(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      recall(1);
      return;
    }

    // → only takes the suggestion from the end of the line; anywhere else it's
    // still an arrow key, and overriding it would break editing mid-word.
    if (
      event.key === "ArrowRight" &&
      showGhost &&
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length
    ) {
      event.preventDefault();
      accept();
    }
  }

  /* Minimised, the window collapses to a pill in the shared dock strip, which
     `NovaStage` renders — see `DockPill`. The transcript is untouched, so
     restoring picks the session back up. */
  return (
    <div
      className="term-layer"
      data-open={isOpen && !minimized}
      data-window={windowState}
      aria-hidden={!isOpen || minimized}
      inert={!isOpen || minimized}
    >
      {/* Clicking the dimmed page closes, the way clicking off a window does. */}
      <button
        type="button"
        className="term-scrim"
        tabIndex={-1}
        aria-label="Close terminal"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className="term"
        role="dialog"
        aria-modal="true"
        aria-label="NOVA terminal"
        /* Clicking dead space in a terminal puts you back at the prompt. Chrome
           and links keep their own clicks, and a drag that selected text keeps
           its selection rather than being yanked away by a refocus. */
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, textarea")) return;
          if (window.getSelection()?.toString()) return;
          inputRef.current?.focus();
        }}
      >
        {/* Desktop chrome: traffic lights, spine label, live dot. */}
        <div className="term-rail">
          <div className="term-lights">
            <button
              type="button"
              className="term-light term-light-close"
              onClick={onClose}
              aria-label="Close terminal"
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
              </svg>
            </button>
            <button
              type="button"
              className="term-light term-light-min"
              onClick={onMinimize}
              aria-label="Minimise terminal"
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M3 6h6" />
              </svg>
            </button>
            <button
              type="button"
              className="term-light term-light-max"
              onClick={onToggleMaximize}
              aria-label={
                windowState === "maximized"
                  ? "Restore terminal size"
                  : "Maximise terminal"
              }
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M6 3v6M3 6h6" />
              </svg>
            </button>
          </div>

          <span className="term-spine" aria-hidden>
            NOVA_AI · TERMINAL
          </span>

          <span className="term-live" aria-hidden>
            <i />
            LIVE
          </span>
        </div>

        {/* Mobile chrome: a compact title bar instead of the rail. */}
        <header className="term-bar">
          <span className="term-bar-title">
            <i aria-hidden />
            NOVA·AI — TERMINAL
          </span>
          <span className="term-bar-actions">
            <button
              type="button"
              onClick={onClose}
              className="term-bar-btn"
              aria-label="Minimise terminal"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                <path
                  d="M6 10l6 6 6-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="term-bar-btn"
              aria-label="Close terminal"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        </header>

        <div className="term-head-lines">
          {header.map((entry) => (
            <TerminalRow
                key={entry.id}
                entry={entry}
                onScene={onScene}
                onProject={onProject}
              />
          ))}
        </div>

        {/* Fixed question row, directly under the header lines and always
            available — unlike the old per-answer follow-ups, which vanished
            once you'd asked something. */}
        <div className="term-chips">
          {TERMINAL_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="term-chip"
            >
              {chip}
            </button>
          ))}
        </div>

        <div
          ref={logRef}
          className="term-log"
          role="log"
          aria-live="polite"
          aria-atomic="false"
        >
          {body.map((entry) => (
            <TerminalRow
                key={entry.id}
                entry={entry}
                onScene={onScene}
                onProject={onProject}
              />
          ))}

          {isThinking && (
            <p className="term-line" data-kind="status">
              {"// NOVA-STATE · LISTENING"}
            </p>
          )}
        </div>

        <form
          className="term-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <label className="term-prompt" htmlFor="nova-term-input">
            <span aria-hidden>$ guest@nova:~ $</span>
            <span className="sr-only">Ask NOVA about Edwin</span>
          </label>
          <span className="term-input-wrap">
            <input
              ref={inputRef}
              id="nova-term-input"
              type="text"
              value={draft}
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value);
                // Typing puts them back on the live line and restarts the
                // double-Tab count.
                setDismissed(false);
                cursor.current = null;
                tabbed.current = false;
              }}
              onKeyDown={onPromptKeyDown}
              className="term-input"
            />

            {/* Ghost text, laid over the input: the typed half is transparent
                and only spaces the tail correctly, which works because the face
                is monospace and both halves inherit it. */}
            {showGhost && ghost && (
              <span className="term-ghost" aria-hidden>
                <span className="term-ghost-typed">{draft}</span>
                {/* Tappable, which is the only way to take a suggestion on a
                    phone — there's no Tab and no → to press. */}
                <button
                  type="button"
                  tabIndex={-1}
                  className="term-ghost-rest"
                  onClick={accept}
                >
                  {ghost.rest}
                </button>
              </span>
            )}

            {/* Block cursor, parked after whatever's been typed. */}
            <span className="term-caret" data-typing={draft.length > 0} aria-hidden />
          </span>

          {/* Phones only. ↑↓ exist on a keyboard and nowhere else, so history
              needs somewhere to be pressed. */}
          <span className="term-hist">
            <button
              type="button"
              className="term-hist-btn"
              onClick={() => recall(-1)}
              aria-label="Previous command"
            >
              ↑
            </button>
            <button
              type="button"
              className="term-hist-btn"
              onClick={() => recall(1)}
              aria-label="Next command"
            >
              ↓
            </button>
          </span>
        </form>
      </div>
    </div>
  );
}

/** One transcript line. Replies type themselves; everything else is instant. */
function TerminalRow({
  entry,
  onScene,
  onProject,
}: {
  entry: TerminalLine;
  onScene: (sceneId: string) => void;
  onProject: (slug: string) => void;
}) {
  const scene = entry.scene
    ? scenes.find((s) => s.id === entry.scene)
    : undefined;
  const project = entry.project ? workBySlug(entry.project) : undefined;
  const listed = entry.projects
    ?.map((slug) => workBySlug(slug))
    .filter((card): card is WorkCard => Boolean(card));

  return (
    <div className="term-row">
      <p className="term-line" data-kind={entry.kind}>
        {entry.kind === "input" && (
          <span className="term-line-prompt" aria-hidden>
            $ guest@nova:~${" "}
          </span>
        )}
        {entry.kind === "reply" && (
          <span className="term-line-caret" aria-hidden>
            {">"}{" "}
          </span>
        )}
        {entry.kind === "reply" && entry.fresh ? (
          <Typed text={entry.text} />
        ) : (
          entry.text
        )}
      </p>

      {/* The palette's payoff: one keystroke from a name to the case study. */}
      {project && (
        <button
          type="button"
          className="term-nav"
          onClick={() => onProject(project.slug)}
        >
          OPEN_[{project.name.toUpperCase()}] →
        </button>
      )}

      {listed && listed.length > 0 && (
        <ul className="term-projects">
          {listed.map((card) => (
            <li key={card.slug}>
              <button
                type="button"
                className="term-project"
                onClick={() => onProject(card.slug)}
              >
                <span className="term-project-no">{card.no}</span>
                <span className="term-project-name">{card.name}</span>
                <span className="term-project-cat">{card.category}</span>
                <span className="term-project-go" aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {scene && (
        <button
          type="button"
          className="term-nav"
          onClick={() => onScene(scene.id)}
        >
          NAVIGATE_TO_[{scene.label.toUpperCase()}] →
        </button>
      )}
    </div>
  );
}

/**
 * Types text out character by character.
 *
 * The full string is always in the DOM for assistive tech — the animation only
 * governs how much is painted, so a screen reader never gets a half sentence.
 * Reduced motion skips straight to the end.
 */
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // Checked here rather than in a lazy initialiser: that runs on the server
    // too, where there is no matchMedia, and hydration would then keep the
    // server's value and type anyway.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion takes the whole line on the first tick — no typing, but
    // also no synchronous setState in the effect body.
    const step = reduced ? text.length : 2;

    const timer = window.setInterval(
      () => {
        setShown((n) => {
          const next = Math.min(text.length, n + step);
          if (next >= text.length) window.clearInterval(timer);
          return next;
        });
      },
      reduced ? 0 : TYPE_MS,
    );

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.slice(0, shown)}</span>
    </>
  );
}

export { COMMANDS };
