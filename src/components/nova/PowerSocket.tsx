"use client";

import { useEffect, useRef, useState } from "react";
import { getNovaPort } from "@/lib/nova-bus";
import { getPower, setDragging, startCharging, stopCharging } from "@/lib/power";
import { usePower } from "@/hooks/usePower";
import "./power.css";

/** How close the plug has to land to NOVA's port to snap in, in px. */
const SNAP_RADIUS = 130;
/** Where the socket sits on the left edge, as a fraction of viewport height. */
const SOCKET_Y = 0.5;
/** How long the cable takes to snap back to the socket when it's let go. */
const RECOIL_MS = 420;

/**
 * The charging cable.
 *
 * Two layers with different jobs. The DOM holds the socket and the plug — real
 * elements, so the plug can be focused, tabbed to, and dragged with a pointer.
 * A `pointer-events: none` SVG on top draws the cable between them, repainted
 * from a rAF loop while there's anything to move.
 *
 * The cable is deliberately *not* React state. It changes every frame while
 * dragging and again every frame while NOVA is flying between the hero and the
 * dock, and re-rendering a component sixty times a second to move one `<path>`
 * would be the most expensive thing on the page. The loop writes `d` directly,
 * the same way `useNovaStage` writes NOVA's transform.
 */
export function PowerSocket() {
  const power = usePower();
  const cableRef = useRef<SVGPathElement>(null);
  const plugRef = useRef<HTMLDivElement>(null);

  // Where the plug is while it's being dragged. A ref, for the same reason the
  // cable is: it moves per-frame.
  const held = useRef<{ x: number; y: number } | null>(null);
  const [near, setNear] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const cable = cableRef.current;
    const plug = plugRef.current;
    if (!cable || !plug) return;

    let frame = 0;
    // Where the end was last frame, and when it was last let go. Together these
    // give the cable its recoil: on release — whether the drop missed, or the
    // charge finished and the plug popped out — it springs back from wherever
    // it actually was rather than teleporting to the socket.
    let lastX = 26;
    let lastY = window.innerHeight * SOCKET_Y;
    let recoilFrom: { x: number; y: number } | null = null;
    let recoilAt = 0;
    let wasAttached = false;
    let drawn = "";

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);

      const { charging, dragging } = getPower();
      const attached = charging || dragging;

      const originX = 0;
      const originY = window.innerHeight * SOCKET_Y;
      const restX = originX + 26;

      // Let go this frame: start the recoil from where the end was sitting.
      if (wasAttached && !attached) {
        recoilFrom = { x: lastX, y: lastY };
        recoilAt = now;
      }
      wasAttached = attached;

      // Where the free end wants to be: the visitor's hand while dragging,
      // NOVA's chest once it's plugged in, and the socket the rest of the time.
      let endX = restX;
      let endY = originY;

      if (dragging && held.current) {
        endX = held.current.x;
        endY = held.current.y;
      } else if (charging) {
        const port = getNovaPort();
        endX = port.x;
        endY = port.y;
      } else if (recoilFrom) {
        const t = (now - recoilAt) / RECOIL_MS;
        if (t >= 1) {
          recoilFrom = null;
        } else {
          // Ease-out, so it whips away from NOVA and settles into the socket.
          const k = 1 - Math.pow(1 - t, 3);
          endX = recoilFrom.x + (restX - recoilFrom.x) * k;
          endY = recoilFrom.y + (originY - recoilFrom.y) * k;
        }
      }

      lastX = endX;
      lastY = endY;

      // Slack, proportional to how far the cable is stretched — a taut cable
      // over a short distance would read as a wire, not as a cable.
      const dx = endX - originX;
      const dy = endY - originY;
      const sag = Math.min(120, Math.hypot(dx, dy) * 0.28);

      const d = `M ${originX} ${originY} Q ${originX + dx / 2} ${
        originY + dy / 2 + sag
      } ${endX} ${endY}`;

      // Idle, this loop has nothing to do but hand the same string back. The
      // compare is what keeps a permanently-running rAF from dirtying the SVG
      // and the plug's transform sixty times a second for no visible change.
      if (d === drawn) return;
      drawn = d;

      cable.setAttribute("d", d);
      // The plug rides the end of its own cable.
      plug.style.transform = `translate(${endX}px, ${endY}px)`;
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Dragging                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const plug = plugRef.current;
    if (!plug) return;

    /** True when the point is over NOVA's silhouette, or close enough to it. */
    const overNova = (x: number, y: number) => {
      const port = getNovaPort();
      if (Math.hypot(x - port.x, y - port.y) < SNAP_RADIUS) return true;
      // Her hit area is the authority when she's large enough for it to be
      // meaningfully bigger than the snap radius — in the hero, that's most of
      // the middle of the screen.
      const rect = document
        .querySelector(".nova-tap")
        ?.getBoundingClientRect();
      return Boolean(
        rect &&
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom,
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      if (getPower().charging) return;
      // Reduced motion gets the click path instead — see `toggle`. Flinging a
      // cable across the viewport is precisely what that preference turns off.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      plug.setPointerCapture(event.pointerId);
      held.current = { x: event.clientX, y: event.clientY };
      setDragging(true);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!getPower().dragging) return;
      held.current = { x: event.clientX, y: event.clientY };
      setNear(overNova(event.clientX, event.clientY));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!getPower().dragging) return;
      plug.releasePointerCapture?.(event.pointerId);

      const landed = overNova(event.clientX, event.clientY);
      held.current = null;
      setNear(false);
      setDragging(false);
      // The cable springs back on its own when `dragging` clears — the draw
      // loop's else-branch puts the end back at the socket.
      if (landed) startCharging();
    };

    plug.addEventListener("pointerdown", onPointerDown);
    plug.addEventListener("pointermove", onPointerMove);
    plug.addEventListener("pointerup", onPointerUp);
    plug.addEventListener("pointercancel", onPointerUp);

    return () => {
      plug.removeEventListener("pointerdown", onPointerDown);
      plug.removeEventListener("pointermove", onPointerMove);
      plug.removeEventListener("pointerup", onPointerUp);
      plug.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  /*
   * The no-drag path.
   *
   * Tapping the socket connects outright. That isn't a fallback bolted on for
   * touch — it's the whole interaction for anyone using a keyboard, and for
   * anyone who has asked for reduced motion, where flinging a cable across the
   * screen is exactly the thing they turned off.
   */
  const toggle = () => {
    if (getPower().charging) stopCharging();
    else startCharging();
  };

  const urgent = power.state !== "normal" && !power.charging;

  return (
    <div
      className="power"
      data-urgent={urgent}
      data-charging={power.charging}
      data-dragging={power.dragging}
      data-near={near}
      style={{ "--power-y": `${SOCKET_Y * 100}%` } as React.CSSProperties}
    >
      {/* Cable. Behind the plug and the socket, and never clickable. */}
      <svg className="power-cable" aria-hidden>
        <path ref={cableRef} className="power-cable-line" />
      </svg>

      <button
        type="button"
        className="power-socket"
        onClick={toggle}
        aria-label={
          power.charging
            ? `Unplug NOVA — charging, ${power.level} percent`
            : `Charge NOVA — battery at ${power.level} percent`
        }
      >
        <span className="power-socket-face" aria-hidden>
          <i />
          <i />
        </span>
      </button>

      {/* The draggable end. Presentational — the socket button above is the
          accessible control, and this would only be a second copy of it. */}
      <div ref={plugRef} className="power-plug" aria-hidden>
        <span className="power-plug-body">
          <svg viewBox="0 0 24 24" width="13" height="13">
            <path
              d="M13 2L5 13h5l-2 9 8-11h-5z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </span>
      </div>

      {/* Only while she actually needs it — a permanent instruction to charge a
          robot who is fine would just be clutter. */}
      <p className="power-hint" aria-hidden>
        <span className="power-hint-drag">⚡ Drag the charger to NOVA</span>
        <span className="power-hint-tap">⚡ Tap the charger</span>
      </p>
    </div>
  );
}
