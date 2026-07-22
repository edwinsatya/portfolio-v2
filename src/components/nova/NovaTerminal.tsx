"use client";

import { useEffect, useRef, useState } from "react";
import { COMMANDS, type TerminalLine, type WindowState } from "@/hooks/useNovaChat";
import { TERMINAL_CHIPS } from "@/content/nova-qa";
import { scenes } from "@/content/scenes";

/** Characters per tick while a reply types itself out. */
const TYPE_MS = 12;

type NovaTerminalProps = {
  isOpen: boolean;
  windowState: WindowState;
  lines: TerminalLine[];
  isThinking: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onRestore: () => void;
  onScene: (sceneId: string) => void;
};

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
 */
export function NovaTerminal({
  isOpen,
  windowState,
  lines,
  isThinking,
  onSend,
  onClose,
  onMinimize,
  onToggleMaximize,
  onRestore,
  onScene,
}: NovaTerminalProps) {
  const minimized = windowState === "minimized";
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  // Focus the prompt on open, and hand focus back to whatever opened it.
  useEffect(() => {
    if (isOpen && !minimized) {
      restoreTo.current = document.activeElement as HTMLElement | null;
      // After the open transition has started, so focus doesn't scroll the page.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    restoreTo.current?.focus?.();
  }, [isOpen, minimized]);

  // Escape closes; Tab cycles inside the dialog rather than escaping to the page
  // behind it.
  useEffect(() => {
    if (!isOpen || minimized) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

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
  }, [isOpen, minimized, onClose]);

  // Keep the newest line in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines, isThinking]);

  /*
   * The opening lines are pinned above the question row; everything said since
   * scrolls below it. Splitting on the first `input` is what keeps the chips
   * between the header and the conversation, as in the reference, rather than
   * floating above the version banner.
   */
  const firstInput = lines.findIndex((l) => l.kind === "input");
  const header = firstInput === -1 ? lines : lines.slice(0, firstInput);
  const body = firstInput === -1 ? [] : lines.slice(firstInput);

  function submit(text: string) {
    onSend(text);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <>
      {/* Minimised: a dock pill, the way a real window collapses. The transcript
          is untouched — restoring picks the session back up. */}
      <button
        type="button"
        className="term-dock"
        data-open={isOpen && minimized}
        aria-hidden={!(isOpen && minimized)}
        inert={!(isOpen && minimized)}
        onClick={onRestore}
      >
        <span className="term-dock-lights" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        NOVA_AI · TERMINAL
        <span className="term-dock-live" aria-hidden />
      </button>

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
            <TerminalRow key={entry.id} entry={entry} onScene={onScene} />
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
            <TerminalRow key={entry.id} entry={entry} onScene={onScene} />
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
              onChange={(event) => setDraft(event.target.value)}
              className="term-input"
            />
            {/* Block cursor, parked after whatever's been typed. */}
            <span className="term-caret" data-typing={draft.length > 0} aria-hidden />
          </span>
        </form>
      </div>
    </div>
    </>
  );
}

/** One transcript line. Replies type themselves; everything else is instant. */
function TerminalRow({
  entry,
  onScene,
}: {
  entry: TerminalLine;
  onScene: (sceneId: string) => void;
}) {
  const scene = entry.scene
    ? scenes.find((s) => s.id === entry.scene)
    : undefined;

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
