"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  CLASSIC_BUILD_LINE,
  CRITICAL_LINES,
  LOW_POWER_LINES,
  ROTATING_LINES,
} from "@/content/nova-qa";
import { usePower } from "@/hooks/usePower";
import { classicHintPending, markClassicHintShown } from "@/lib/legacy";
import type { PowerState } from "@/lib/power";
import {
  askNova,
  fireLike,
  getServerStageBusy,
  getStageBusy,
  subscribeStageBusy,
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
/** Where the once-per-session classic-build mention sits in the rotation. */
const CLASSIC_HINT_AT = 1;

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
  const power = usePower();

  return (
    <div className="stage-chat">
      <p className="mono-label text-accent-ink">Nova</p>

      {/* Keyed by scene: React remounts the rotator so it restarts from that
          scene's own line, rather than resuming mid-cycle. Also keyed by the
          power state, so dropping a band swaps the script at once instead of
          finishing the line she was halfway through. */}
      <LineRotator
        key={`${sceneId}-${power.state}`}
        line={line}
        state={power.state}
      />

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
function LineRotator({ line, state }: { line: string; state: PowerState }) {
  /* Scene line first, then the rotating ones — unless she's flat, in which case
     the power set replaces the lot, scene line included. A tired robot
     narrating the section she's standing in would be the wrong voice entirely,
     and a dying one more so. `dead` keeps the critical script: she stopped
     mid-sentence, and what's on screen is where she stopped. */
  /* The classic-build mention rides along until it has been said once. Second
     in the pool rather than last: a line takes about ten seconds, the rotator
     restarts on every scene change, and a mention buried four lines deep is one
     most visitors would never reach. The scene line still goes first. */
  const [classicHint, setClassicHint] = useState(classicHintPending);

  const lines = useMemo(() => {
    if (state === "critical" || state === "dead") return CRITICAL_LINES;
    if (state === "low") return LOW_POWER_LINES;
    const pool = [line, ...ROTATING_LINES];
    if (classicHint) pool.splice(CLASSIC_HINT_AT, 0, CLASSIC_BUILD_LINE);
    return pool;
  }, [line, state, classicHint]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const stageBusy = useSyncExternalStore(
    subscribeStageBusy,
    getStageBusy,
    getServerStageBusy,
  );
  const paused = hovered || stageBusy;

  // Milliseconds still owed to the current line. Survives pause/resume.
  const remaining = useRef<number | null>(null);
  const startedAt = useRef(0);
  // Timestamp of the last tap, for detecting a double-tap on touch.
  const lastTapAt = useRef(0);

  const current = lines[index];
  const words = useMemo(() => current.split(" "), [current]);
  const showingClassicHint = current === CLASSIC_BUILD_LINE;

  // Reveal the line, then hand over to the hold timer below.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const show = window.setTimeout(
      () => {
        setVisible(true);
        // Counted as said the moment it's on screen, not when it rotates away:
        // the rotator remounts on every scene change, and a visitor who reads
        // it and then navigates has been told.
        if (showingClassicHint) markClassicHintShown();
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
  }, [index, words.length, showingClassicHint]);

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
      if (showingClassicHint) {
        // Retire it on the way out, and hand over by position rather than by
        // increment: dropping it shifts the rest of the pool down one, so a
        // plain `i + 1` would step straight over the line that follows it.
        setClassicHint(false);
        setIndex(CLASSIC_HINT_AT);
      } else {
        setIndex((i) => (i + 1) % lines.length);
      }
    }, remaining.current);

    return () => window.clearTimeout(timer);
  }, [paused, index, visible, lines.length, showingClassicHint]);

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
