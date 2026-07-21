"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ROTATING_LINES } from "@/content/nova-qa";
import {
  askNova,
  fireLike,
  getChatOpen,
  getServerChatOpen,
  subscribeChatOpen,
} from "@/lib/nova-bus";

/** How long a line stays readable *after* it has finished materialising. */
const HOLD_MS = 10000;
/** Reduced motion has no reveal to wait for, so it's a flat interval. */
const REDUCED_HOLD_MS = 7000;
/** Stagger between words materialising. */
const WORD_STEP_MS = 55;
/** Matches the word transition in globals.css. */
const WORD_REVEAL_MS = 420;
/** Beat before the first line, so the boot screen is gone. */
const START_DELAY = 600;
/** Window for a second tap to count as a double-tap. */
const DOUBLE_TAP_MS = 320;

/**
 * NOVA's line and suggestion chips, bottom-left of the stage.
 *
 * The line cycles: the scene's own line first, then the scene-agnostic ones, so
 * whichever scene you're on you always get its introduction before the filler.
 */
export function HeroChat({
  sceneId,
  line,
  chips,
}: {
  sceneId: string;
  line: string;
  chips: string[];
}) {
  return (
    <div className="stage-chat">
      <p className="mono-label text-accent-ink">Nova</p>

      {/* Keyed by scene: React remounts the rotator so it restarts from that
          scene's own line, rather than resuming mid-cycle. */}
      <LineRotator key={sceneId} line={line} />

      {/* Phones only — on desktop the chips read as clickable on their own. */}
      <p className="stage-ask-hint" aria-hidden>
        Tap to ask ↓
      </p>

      <ul className="stage-chips">
        {chips.map((chip) => (
          <li key={chip}>
            <button
              type="button"
              onClick={() => askNova(chip)}
              className="hero-chip"
            >
              <span aria-hidden className="hero-chip-caret">
                ›
              </span>
              {chip}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cycles the taglines, materialising each word by word from blurred to sharp.
 *
 * The hold is measured from when the *last word* lands, not from when the reveal
 * starts — a long line takes longer to materialise, and timing from the start
 * would quietly give it less reading time than a short one.
 *
 * Rotation pauses while the visitor is hovering the text (they're reading it) or
 * has the chat open (they're busy), and resumes with the remaining time intact
 * rather than restarting the clock.
 */
function LineRotator({ line }: { line: string }) {
  // Scene line first, then the rotating ones.
  const lines = useMemo(() => [line, ...ROTATING_LINES], [line]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const chatOpen = useSyncExternalStore(
    subscribeChatOpen,
    getChatOpen,
    getServerChatOpen,
  );
  const paused = hovered || chatOpen;

  // Milliseconds still owed to the current line. Survives pause/resume.
  const remaining = useRef<number | null>(null);
  const startedAt = useRef(0);
  // Timestamp of the last tap, for detecting a double-tap on touch.
  const lastTapAt = useRef(0);

  const current = lines[index];
  const words = useMemo(() => current.split(" "), [current]);

  // Reveal the line, then hand over to the hold timer below.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const show = window.setTimeout(
      () => {
        setVisible(true);
        // Reveal finishes when the last word's transition ends.
        const revealMs = reduced
          ? 0
          : (words.length - 1) * WORD_STEP_MS + WORD_REVEAL_MS;
        remaining.current = revealMs + (reduced ? REDUCED_HOLD_MS : HOLD_MS);
        startedAt.current = performance.now();
      },
      index === 0 && !reduced ? START_DELAY : 20,
    );

    return () => window.clearTimeout(show);
  }, [index, words.length]);

  // The hold. Re-runs on pause changes, banking the time already served.
  useEffect(() => {
    if (remaining.current === null) return;

    if (paused) {
      // Bank what's left and stop the clock.
      const served = performance.now() - startedAt.current;
      remaining.current = Math.max(0, remaining.current - served);
      return;
    }

    startedAt.current = performance.now();
    const timer = window.setTimeout(() => {
      remaining.current = null;
      setVisible(false);
      setIndex((i) => (i + 1) % lines.length);
    }, remaining.current);

    return () => window.clearTimeout(timer);
  }, [paused, index, visible, lines.length]);

  return (
    <p
      className="stage-line"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // Liking from the tagline, as well as from NOVA and the counter. Touch
      // needs a double-tap: a single tap here is how you pause the rotation to
      // read, and firing hearts for that would be noise.
      onClick={(event) => {
        const isTouch = event.nativeEvent.detail === 0 || !window.matchMedia("(hover: hover)").matches;
        if (!isTouch) {
          fireLike({ x: event.clientX, y: event.clientY });
          return;
        }

        const now = Date.now();
        if (now - lastTapAt.current < DOUBLE_TAP_MS) {
          lastTapAt.current = 0;
          fireLike({ x: event.clientX, y: event.clientY });
        } else {
          lastTapAt.current = now;
        }
      }}
    >
      {/* Screen readers get the sentence whole; the word split is visual. */}
      <span className="sr-only">{current}</span>
      <span aria-hidden>
        {/* Keyed by line index so React swaps the spans and the reveal restarts
            from the first word instead of resuming mid-sentence. */}
        {words.map((word, wordIndex) => (
          <span
            key={`${index}-${wordIndex}`}
            className="stage-word"
            data-visible={visible}
            style={{ transitionDelay: `${wordIndex * WORD_STEP_MS}ms` }}
          >
            {word}
            {wordIndex < words.length - 1 ? " " : ""}
          </span>
        ))}
        <span className="hero-caret hero-caret-blink" />
      </span>
    </p>
  );
}
