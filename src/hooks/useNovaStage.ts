"use client";

import { useEffect, useRef, useState } from "react";

/** The anchor's CSS width. Everything scales from this to hero or dock size. */
const BASE_WIDTH = 380;
const ASPECT = 264 / 240;
const BASE_HEIGHT = BASE_WIDTH * ASPECT;

const DOCK_WIDTH = 118;
const DOCK_WIDTH_SMALL = 86;
const DOCK_MARGIN = 20;
const SMALL_SCREEN = 640;

/** Vertical position of NOVA's eyes and antenna within the viewBox, 0–1. */
const EYE_LINE = 109 / 264;
const HEAD_TOP = 19 / 264;

/** How far the pointer travels, in px, before the gaze is fully committed. */
const REACH = 380;
/** Silence after which NOVA stops tracking and starts looking around alone. */
const IDLE_AFTER = 3200;
/** Length of the flight between hero and dock; matches the CSS transition. */
const FLY_MS = 800;

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
      target.x = (Math.random() * 2 - 1) * 0.8;
      target.y = (Math.random() * 2 - 1) * 0.55;
      nextWanderAt = now + 1300 + Math.random() * 1900;
    };

    /* ---------------------------------------------------------------- */
    /* Frame                                                             */
    /* ---------------------------------------------------------------- */

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // The one layout read of the frame. Everything after this is a write.
      if (!slot?.isConnected) {
        slot = document.querySelector<HTMLElement>("[data-nova-slot]");
      }
      const slotRect = slot?.getBoundingClientRect() ?? null;

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

      // How much room NOVA occupies at the bottom of the screen, so the chat
      // panel can sit directly on top of her at either dock size.
      if (shouldDock) {
        const dockTop = centerY - (BASE_HEIGHT * scale) / 2;
        stage.style.setProperty("--nova-dock-gap", `${Math.round(vh - dockTop + 10)}px`);
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

      /* Bubble — hangs just above the antenna, on the side with room. */
      const bubble = bubbleRef.current;
      if (bubble) {
        const headY = boxTop + BASE_HEIGHT * scale * HEAD_TOP - 12;
        const anchorX = shouldDock
          ? centerX + (BASE_WIDTH * scale) / 2
          : centerX;
        bubble.style.setProperty("--nova-bubble-x", `${anchorX}px`);
        bubble.style.setProperty("--nova-bubble-y", `${headY}px`);
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

    frame = requestAnimationFrame(tick);
    if (!reducedMotion.matches) scheduleBlink();

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return { stageRef, anchorRef, svgRef, bubbleRef, docked };
}
