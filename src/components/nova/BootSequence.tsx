"use client";

import { useEffect, useRef, useState } from "react";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { novaBooted } from "@/lib/nova-bus";

/** Full boot, first visit. */
const FIRST_LINES = [
  "POWERING ON",
  "MOUNTING NOVA MEMORY",
  "CALIBRATING EYES",
  "READY",
];

const FIRST_MS = 2600;
const RETURN_MS = 900;

/**
 * The terminal-style boot screen that plays before the hero.
 *
 * Deliberately an overlay rather than a gate: the page underneath is fully
 * rendered and readable the whole time, so a visitor who skips — or whose JS
 * never runs — loses nothing. It also never blocks a deep link; anyone arriving
 * at `#projects` gets it dismissed immediately.
 *
 * Skipping is bound to pointer, key, scroll, and touch, because a splash you
 * can't dismiss is worse than no splash at all.
 */
export function BootSequence() {
  const { visit } = useNovaMemory();
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(FIRST_LINES[0]);
  const started = useRef(false);

  useEffect(() => {
    // Wait for memory, so a returning visitor never sees the long version first.
    if (!visit.previous || started.current) return;
    started.current = true;

    const returning = visit.previous.visitCount > 0;
    const name = visit.name;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Anyone who arrived at a deep link wants that section, not a splash.
    const deepLinked =
      Boolean(window.location.hash) && window.location.hash !== "#intro";

    const lines = returning
      ? [name ? `RESUMING SESSION — WELCOME BACK, ${name.toUpperCase()}` : "RESUMING SESSION — WELCOME BACK", "READY"]
      : FIRST_LINES;

    const total = deepLinked ? 0 : reduced ? 400 : returning ? RETURN_MS : FIRST_MS;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      // `total` is 0 for a deep link, which lands on 1 immediately.
      const ratio = total <= 0 ? 1 : Math.min(1, elapsed / total);
      setProgress(Math.round(ratio * 100));
      // Step through the status lines in proportion to progress.
      setLine(lines[Math.min(lines.length - 1, Math.floor(ratio * lines.length))]);

      if (ratio >= 1) {
        setDone(true);
        delete document.documentElement.dataset.booting;
        novaBooted();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    document.documentElement.dataset.booting = "true";
    frame = requestAnimationFrame(tick);

    const skip = () => {
      cancelAnimationFrame(frame);
      setProgress(100);
      setDone(true);
      delete document.documentElement.dataset.booting;
      novaBooted();
    };

    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.booting;
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [visit.previous, visit.name]);

  return (
    <div
      className="nova-boot"
      data-done={done}
      // Purely decorative chrome over content that's already present and
      // readable underneath — announcing it would just delay the real page.
      aria-hidden="true"
    >
      <div className="nova-boot-readout">
        <div className="nova-boot-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="nova-boot-status">
          <span>{String(progress).padStart(3, "0")}</span>
          <span>{line}</span>
        </div>
      </div>
    </div>
  );
}
