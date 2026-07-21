"use client";

import { useEffect, useState } from "react";
import { HERO_LINE, HERO_CHIPS } from "@/content/nova-qa";
import { askNova } from "@/lib/nova-bus";

const TYPE_MS = 32;
/** Beat before typing starts, so the boot screen is gone first. */
const START_DELAY = 700;

/**
 * The chat entry point in the hero's bottom-left: NOVA's label, a line that
 * types itself out, and three chips that open the panel with that question.
 *
 * The full line is always in the DOM for assistive tech and for anyone with
 * reduced motion — the typewriter is a visual reveal over text that's already
 * there, not a progressive load, so nothing depends on the animation running.
 */
export function HeroChat() {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let index = 0;
    let interval: number | undefined;

    const start = window.setTimeout(() => {
      // Reduced motion still gets the line, just all at once.
      if (reduced) {
        setShown(HERO_LINE.length);
        setTyping(false);
        return;
      }

      interval = window.setInterval(() => {
        index += 1;
        setShown(index);
        if (index >= HERO_LINE.length) {
          window.clearInterval(interval);
          setTyping(false);
        }
      }, TYPE_MS);
    }, reduced ? 0 : START_DELAY);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="max-w-md">
      <p className="mono-label text-accent-ink">Nova</p>

      <p className="mt-3 font-mono text-[0.95rem] leading-relaxed text-ink sm:text-lg">
        {/* Screen readers get the whole sentence at once; the split halves are
            a purely visual effect. */}
        <span className="sr-only">{HERO_LINE}</span>
        <span aria-hidden>
          {HERO_LINE.slice(0, shown)}
          <span
            className={`hero-caret ${typing ? "" : "hero-caret-blink"}`}
            aria-hidden
          />
        </span>
      </p>

      <ul className="mt-5 flex flex-wrap gap-2">
        {HERO_CHIPS.map((chip) => (
          <li key={chip}>
            <button
              type="button"
              onClick={() => askNova(chip)}
              className="hero-chip"
            >
              <span aria-hidden>›</span> {chip}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
