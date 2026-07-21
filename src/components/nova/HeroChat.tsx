"use client";

import { useEffect, useMemo, useState } from "react";
import { ROTATING_LINES } from "@/content/nova-qa";
import { askNova } from "@/lib/nova-bus";

/** How long each line holds before the next one blurs in. */
const HOLD_MIN_MS = 6000;
const HOLD_MAX_MS = 8000;
/** Stagger between words materialising. */
const WORD_STEP_MS = 55;
/** Beat before the first line, so the boot screen is gone. */
const START_DELAY = 600;

/**
 * NOVA's line and suggestion chips, bottom-left of the stage.
 *
 * The line cycles: the scene's own line first, then the scene-agnostic ones, so
 * whichever scene you're on you always get its introduction before the filler.
 * Each new line materialises word by word, blurred to sharp.
 *
 * The animation is per-word `opacity`/`filter` with a CSS delay — no JS runs per
 * frame and nothing reflows, so a line landing costs nothing measurable.
 * The whole sentence is always in the DOM for assistive tech, and reduced
 * motion swaps text with no animation at all.
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

function LineRotator({ line }: { line: string }) {
  // Scene line first, then the rotating ones.
  const lines = useMemo(() => [line, ...ROTATING_LINES], [line]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  // Reveal the current line, then queue the next.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const show = window.setTimeout(
      () => setVisible(true),
      index === 0 && !reduced ? START_DELAY : 20,
    );

    const advance = window.setTimeout(
      () => {
        setVisible(false);
        setIndex((current) => (current + 1) % lines.length);
      },
      HOLD_MIN_MS + Math.random() * (HOLD_MAX_MS - HOLD_MIN_MS),
    );

    return () => {
      window.clearTimeout(show);
      window.clearTimeout(advance);
    };
  }, [index, lines.length]);

  const current = lines[index];
  const words = current.split(" ");

  return (
    <p className="stage-line">
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
