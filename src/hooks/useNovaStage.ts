"use client";

import { useEffect, useRef, useState } from "react";
import {
  fireLike,
  onCelebrate,
  onNovaBooted,
  type Celebration,
} from "@/lib/nova-bus";

/** The anchor's CSS width. Everything scales from this to hero or dock size. */
const BASE_WIDTH = 380;
const ASPECT = 320 / 240;
const BASE_HEIGHT = BASE_WIDTH * ASPECT;

const DOCK_WIDTH = 118;
const DOCK_WIDTH_SMALL = 86;
const DOCK_MARGIN = 20;
const SMALL_SCREEN = 640;

/** Vertical position of NOVA's eyes and antenna within the viewBox, 0–1. */
const EYE_LINE = 109 / 320;
const HEAD_TOP = 19 / 320;

/** Clearance the bubble keeps from every viewport edge. */
const EDGE_PAD = 12;
/** Gap between the bubble and NOVA herself. */
const BUBBLE_GAP = 10;
/** Fallback nav height, used only if the header can't be measured. */
const NAV_FALLBACK = 64;
/** How far in from the bubble's corner the tail sits. */
const TAIL_INSET = 20;

const clamp = (value: number, min: number, max: number) =>
  // Guards the case where the bubble is taller than the space it has to fit in:
  // min wins, so it stays below the nav rather than sliding under it.
  Math.max(min, Math.min(max, value));

/** How far the pointer travels, in px, before the gaze is fully committed. */
const REACH = 380;
/** Silence after which NOVA stops tracking and starts looking around alone. */
const IDLE_AFTER = 3200;
/** Length of the flight between hero and dock; matches the CSS transition. */
const FLY_MS = 800;
/** Wave duration; matches the keyframes in nova.css. */
const WAVE_MS = 2100;
/** Celebration durations, matching their keyframes. */
const CELEBRATE_MS: Record<Celebration, number> = {
  wave: 2100,
  dance: 1900,
  hop: 1050,
};
/** Randomised gap between idle waves. */
const WAVE_MIN_MS = 15000;
const WAVE_MAX_MS = 30000;

/**
 * Owns every per-frame concern in one requestAnimationFrame loop: where NOVA
 * sits (hero slot or corner dock), where she's looking, when she blinks, and
 * where the speech bubble hangs.
 *
 * Deliberately one loop rather than several. The gaze origin is derived from
 * the dock position computed the same frame instead of measuring the SVG, so
 * each frame is a single layout read followed only by writes — reading back
 * after a write would force a synchronous reflow every frame.
 */
export function useNovaStage({ forceDock = false }: { forceDock?: boolean } = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Mirrored into React state only so the bubble can switch which corner it
  // points from; the loop itself reads the ref.
  const [docked, setDocked] = useState(false);

  // Read by the loop, which is set up once and never re-created.
  const forceDockRef = useRef(forceDock);
  useEffect(() => {
    forceDockRef.current = forceDock;
  }, [forceDock]);

  useEffect(() => {
    const stage = stageRef.current;
    const anchor = anchorRef.current;
    const svg = svgRef.current;
    if (!stage || !anchor || !svg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const gaze = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };

    let pointerSeen = false;
    let lastPointerAt = 0;
    let nextWanderAt = 0;
    let isDocked = false;
    let ready = false;
    let slot: HTMLElement | null = null;
    let nav: HTMLElement | null = null;
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
    /* Pointer                                                           */
    /* ---------------------------------------------------------------- */

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerSeen = true;
      lastPointerAt = performance.now();
    };

    // Pointer gone from the window: let idle behaviour take back over.
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) lastPointerAt = 0;
    };

    // Somewhere plausible to look when nobody's driving. Biased shorter on the
    // vertical axis so NOVA glances sideways more than up and down.
    const pickWanderTarget = (now: number) => {
      target.x = (Math.random() * 2 - 1) * 0.85;
      target.y = (Math.random() * 2 - 1) * 0.55;
      nextWanderAt = now + 2000 + Math.random() * 2000;
    };

    /* ---------------------------------------------------------------- */
    /* Frame                                                             */
    /* ---------------------------------------------------------------- */

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // The reads of the frame, batched. Everything after this is a write —
      // reading back after a write would force a synchronous reflow.
      if (!slot?.isConnected) {
        slot = document.querySelector<HTMLElement>("[data-nova-slot]");
      }
      if (!nav?.isConnected) {
        nav = document.querySelector<HTMLElement>("[data-site-nav]");
      }
      const slotRect = slot?.getBoundingClientRect() ?? null;
      const navBottom = nav?.getBoundingClientRect().bottom ?? NAV_FALLBACK;

      // Measured every frame, open or not. The bubble hides with `visibility`,
      // which keeps its layout box, so these are real numbers throughout —
      // and treating a closed bubble as zero-sized made the placement below
      // solve to a different spot, so it visibly jumped at both ends of the
      // fade. It's the same batched read either way.
      const bubble = bubbleRef.current;
      const speech = bubble?.firstElementChild as HTMLElement | null;
      const bubbleWidth = speech?.offsetWidth ?? 0;
      const bubbleHeight = speech?.offsetHeight ?? 0;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Dock once the hero slot has scrolled up into the top quarter — or
      // immediately if the hero isn't on this page at all. Opening the chat
      // forces it too, so NOVA is always beside her own panel.
      const shouldDock =
        forceDockRef.current || !slotRect || slotRect.bottom < vh * 0.28;

      let centerX: number;
      let centerY: number;
      let scale: number;

      if (shouldDock || !slotRect) {
        const dockWidth = vw < SMALL_SCREEN ? DOCK_WIDTH_SMALL : DOCK_WIDTH;
        scale = dockWidth / BASE_WIDTH;
        centerX = vw - DOCK_MARGIN - dockWidth / 2;
        centerY = vh - DOCK_MARGIN - (dockWidth * ASPECT) / 2;
      } else {
        scale = slotRect.width / BASE_WIDTH;
        centerX = slotRect.left + slotRect.width / 2;
        centerY = slotRect.top + slotRect.height / 2;
      }

      // Only transition on the flight itself. While tracking the hero slot the
      // transform is rewritten every frame, and a transition would read as lag.
      if (shouldDock !== isDocked) {
        isDocked = shouldDock;
        setDocked(shouldDock);
        anchor.dataset.flying = "true";
        later(() => {
          anchor.dataset.flying = "false";
        }, FLY_MS);
      }

      anchor.style.transform = `translate(${centerX - BASE_WIDTH / 2}px, ${
        centerY - BASE_HEIGHT / 2
      }px) scale(${scale})`;

      if (!ready) {
        ready = true;
        stage.dataset.ready = "true";
      }

      /* Gaze — origin derived from the transform above, not measured. */
      const halfHeight = (BASE_HEIGHT * scale) / 2;
      const boxTop = centerY - halfHeight;
      const eyeY = boxTop + BASE_HEIGHT * scale * EYE_LINE;

      const idle = !pointerSeen || now - lastPointerAt > IDLE_AFTER;

      if (idle) {
        if (reducedMotion.matches) {
          target.x = 0;
          target.y = 0;
        } else if (now > nextWanderAt) {
          pickWanderTarget(now);
        }
      } else {
        const dx = (pointer.x - centerX) / REACH;
        const dy = (pointer.y - eyeY) / REACH;
        // Clamp to the unit circle, so a diagonal pointer doesn't push the gaze
        // further than a straight-on one.
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

      // Where the hearts launch from. Written to the root rather than the
      // stage so the burst layer can read it without threading refs around.
      const antennaTop = boxTop + BASE_HEIGHT * scale * HEAD_TOP;
      document.documentElement.style.setProperty(
        "--nova-head-x",
        `${Math.round(centerX)}`,
      );
      document.documentElement.style.setProperty(
        "--nova-head-y",
        `${Math.round(antennaTop)}`,
      );

      /* Bubble — placed by collision, not by fixed offsets.
         Prefers sitting above NOVA's antenna. Where that would put it under the
         navbar or off the top of the screen — which is exactly what happens in
         the hero on a phone — it flips below her instead and the tail flips with
         it. Both axes are then clamped into the safe area, so the bubble can
         never render outside the viewport or beneath the nav. */
      if (bubble) {
        const novaHeight = BASE_HEIGHT * scale;
        const antennaY = boxTop + novaHeight * HEAD_TOP;
        const novaBottom = boxTop + novaHeight;

        // Top and bottom of the region the bubble is allowed to occupy.
        const safeTop = navBottom + EDGE_PAD;
        const safeBottom = vh - EDGE_PAD;

        const above = antennaY - BUBBLE_GAP - bubbleHeight;
        const below = novaBottom + BUBBLE_GAP;

        // Flip only when there genuinely isn't room above — otherwise every
        // desktop bubble would move too.
        const placeBelow =
          above < safeTop && below + bubbleHeight <= safeBottom;

        const top = clamp(
          placeBelow ? below : above,
          safeTop,
          Math.max(safeTop, safeBottom - bubbleHeight),
        );

        // Docked, NOVA hugs the right edge, so the bubble hangs from her right
        // side rather than centring on her and overflowing.
        const preferredLeft = shouldDock
          ? centerX + (BASE_WIDTH * scale) / 2 - bubbleWidth
          : centerX - bubbleWidth / 2;

        const left = clamp(
          preferredLeft,
          EDGE_PAD,
          Math.max(EDGE_PAD, vw - EDGE_PAD - bubbleWidth),
        );

        // The tail tracks NOVA even after the body has been clamped away from
        // her, so it keeps pointing at the robot rather than into space.
        const tailX = clamp(
          centerX - left,
          TAIL_INSET,
          Math.max(TAIL_INSET, bubbleWidth - TAIL_INSET),
        );

        bubble.style.setProperty("--nova-bubble-x", `${Math.round(left)}px`);
        bubble.style.setProperty("--nova-bubble-y", `${Math.round(top)}px`);
        bubble.style.setProperty("--nova-tail-x", `${Math.round(tailX)}px`);
        speech!.dataset.place = placeBelow ? "below" : "above";
      }
    };

    /* ---------------------------------------------------------------- */
    /* Blinking and clicks                                               */
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
          // Every so often, a double blink. Perfectly even blinking reads
          // robotic in the wrong way.
          if (Math.random() < 0.22) later(blink, 260);
          scheduleBlink();
        },
        2400 + Math.random() * 3800,
      );
    };

    /* ---------------------------------------------------------------- */
    /* Waving                                                            */
    /* ---------------------------------------------------------------- */

    const wave = () => {
      if (reducedMotion.matches || svg.dataset.wave === "true") return;
      svg.dataset.wave = "true";
      later(() => {
        svg.dataset.wave = "false";
      }, WAVE_MS);
    };

    // Idle waves, at a randomised interval so they never feel metronomic.
    const scheduleWave = () => {
      later(
        () => {
          // Only when nobody's driving — waving mid-cursor-track reads as a
          // twitch rather than a greeting.
          if (!pointerSeen || performance.now() - lastPointerAt > IDLE_AFTER) {
            wave();
          }
          scheduleWave();
        },
        WAVE_MIN_MS + Math.random() * (WAVE_MAX_MS - WAVE_MIN_MS),
      );
    };

    // Hello, once, after the boot screen clears.
    const greetOnBoot = () => later(wave, 400);

    /* ---------------------------------------------------------------- */
    /* Celebrations                                                      */
    /* ---------------------------------------------------------------- */

    const runCelebration = (kind: Celebration) => {
      // Under reduced motion the joyful face is the whole celebration — no
      // dancing, no hopping, no arm across the screen.
      const shown = reducedMotion.matches ? "joy" : kind;
      svg.dataset.celebrate = shown;
      later(
        () => {
          // `delete`, not `= ""` — an empty string leaves the attribute in the
          // DOM, and `[data-celebrate]` matches it, which would strand NOVA in
          // her joyful face for the rest of the visit.
          delete svg.dataset.celebrate;
        },
        reducedMotion.matches ? 1400 : CELEBRATE_MS[kind],
      );
    };

    /* ---------------------------------------------------------------- */
    /* Liking                                                            */
    /* ---------------------------------------------------------------- */

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "l" && event.key !== "L") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Never steal the key from someone typing into the chat or a form.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      fireLike();
    };

    const handlePointerDown = () => {
      if (reducedMotion.matches) return;
      svg.dataset.react = "true";
      blink();
      later(() => {
        svg.dataset.react = "false";
      }, 420);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    const offBooted = onNovaBooted(greetOnBoot);
    const offCelebrate = onCelebrate(runCelebration);
    window.addEventListener("keydown", handleKeyDown);

    frame = requestAnimationFrame(tick);
    // Blinking survives reduced motion on purpose: it's a change of expression
    // in place, not movement across the screen, and without it NOVA reads as
    // switched off. The wave loop does not.
    scheduleBlink();
    if (!reducedMotion.matches) scheduleWave();

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      offBooted();
      offCelebrate();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return { stageRef, anchorRef, svgRef, bubbleRef, docked };
}
