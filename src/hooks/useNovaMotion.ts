"use client";

import { useEffect, useRef } from "react";

/** How far the pointer travels, in px, before NOVA's gaze is fully committed. */
const REACH = 380;
/** Silence after which NOVA stops tracking and starts looking around alone. */
const IDLE_AFTER = 3200;
/** Fraction of the SVG's height where the eyes sit — the point gaze pivots on. */
const EYE_LINE = 0.41;

/**
 * Drives NOVA's gaze, blinking, and click reaction.
 *
 * Everything is written to CSS custom properties from inside a single
 * requestAnimationFrame loop rather than React state — pointer movement fires
 * far too often to re-render on, and the easing below is what makes the gaze
 * feel like it has weight instead of snapping.
 *
 * Attach the returned ref to the root <svg>.
 */
export function useNovaMotion() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Where the gaze is now, and where it wants to be. Both normalised to
    // roughly -1..1 on each axis; the CSS scales them into pixels and degrees.
    const gaze = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const pointer = { x: 0, y: 0 };
    let pointerSeen = false;
    let lastPointerAt = 0;
    let nextWanderAt = 0;
    let onScreen = true;
    let frame = 0;

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    /* ---------------------------------------------------------------- */
    /* Gaze                                                              */
    /* ---------------------------------------------------------------- */

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerSeen = true;
      lastPointerAt = performance.now();
    };

    // Pointer gone from the window: let the idle behaviour take back over.
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) lastPointerAt = 0;
    };

    // Somewhere plausible to look when nobody's driving. Biased shorter on the
    // vertical axis so NOVA glances sideways more than up and down.
    const pickWanderTarget = (now: number) => {
      target.x = (Math.random() * 2 - 1) * 0.8;
      target.y = (Math.random() * 2 - 1) * 0.55;
      nextWanderAt = now + 1300 + Math.random() * 1900;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!onScreen) return;

      // One layout read up front, then only writes — reading after a write in
      // the same frame would force a synchronous reflow.
      const rect = svg.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height * EYE_LINE;

      const idle = !pointerSeen || now - lastPointerAt > IDLE_AFTER;

      if (idle) {
        if (reducedMotion.matches) {
          target.x = 0;
          target.y = 0;
        } else if (now > nextWanderAt) {
          pickWanderTarget(now);
        }
      } else {
        const dx = (pointer.x - originX) / REACH;
        const dy = (pointer.y - originY) / REACH;
        // Clamp to the unit circle, so a diagonal pointer doesn't push the
        // gaze further than a straight-on one.
        const distance = Math.hypot(dx, dy);
        const limit = distance > 1 ? 1 / distance : 1;
        target.x = dx * limit;
        target.y = dy * limit;
        nextWanderAt = 0;
      }

      // Drift lazily when idling, follow crisply when being led.
      const ease = idle ? 0.035 : 0.12;
      gaze.x += (target.x - gaze.x) * ease;
      gaze.y += (target.y - gaze.y) * ease;

      svg.style.setProperty("--nova-look-x", gaze.x.toFixed(3));
      svg.style.setProperty("--nova-look-y", gaze.y.toFixed(3));
    };

    /* ---------------------------------------------------------------- */
    /* Blinking                                                          */
    /* ---------------------------------------------------------------- */

    const blink = () => {
      svg.dataset.blink = "true";
      later(() => {
        svg.dataset.blink = "false";
      }, 110);
    };

    const scheduleBlink = () => {
      later(
        () => {
          blink();
          // Every so often, a double blink. Perfectly even blinking reads robotic
          // in the wrong way.
          if (Math.random() < 0.22) later(blink, 260);
          scheduleBlink();
        },
        2400 + Math.random() * 3800,
      );
    };

    /* ---------------------------------------------------------------- */
    /* Click reaction                                                    */
    /* ---------------------------------------------------------------- */

    const handlePointerDown = () => {
      if (reducedMotion.matches) return;
      svg.dataset.react = "true";
      blink();
      later(() => {
        svg.dataset.react = "false";
      }, 420);
    };

    /* ---------------------------------------------------------------- */
    /* Wiring                                                            */
    /* ---------------------------------------------------------------- */

    // No point animating a character that's scrolled out of view.
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting))
        : null;
    observer?.observe(svg);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    frame = requestAnimationFrame(tick);
    if (!reducedMotion.matches) scheduleBlink();

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      timers.forEach(window.clearTimeout);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return ref;
}
