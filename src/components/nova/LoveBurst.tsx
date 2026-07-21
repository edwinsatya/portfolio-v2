"use client";

import { useEffect, useState } from "react";
import { onLike, type LikeOrigin } from "@/lib/nova-bus";

/** How long one heart lives. Matches the keyframes in nova.css. */
const HEART_MS = 1500;
const MIN_PER_BURST = 4;
const MAX_PER_BURST = 8;
/** Ceiling on live hearts, so spamming L can't grow the DOM without bound. */
const MAX_LIVE = 60;

type Heart = {
  id: number;
  x: number;
  y: number;
  /** Horizontal drift in px, signed. */
  drift: number;
  scale: number;
  delay: number;
  rotate: number;
};

let nextId = 0;

/**
 * The hearts that float up when the visitor likes NOVA.
 *
 * Lives on the fixed stage layer rather than inside NOVA's anchor: the anchor is
 * scaled (down to ~0.3 when docked), and hearts inheriting that would be
 * pinpricks in the corner. Instead they read NOVA's head position from the two
 * custom properties the stage loop writes each frame, so they launch from the
 * right place at any size.
 *
 * Each heart is a self-contained CSS animation on transform and opacity — no JS
 * runs per frame, and a burst can't touch layout.
 */
export function LoveBurst() {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(
    () =>
      onLike((origin: LikeOrigin) => {
        const count =
          MIN_PER_BURST +
          Math.floor(Math.random() * (MAX_PER_BURST - MIN_PER_BURST + 1));

        // No explicit origin means "from NOVA's head" — the stage loop keeps
        // these two properties current.
        const root = document.documentElement;
        const headX = origin
          ? origin.x
          : parseFloat(
              getComputedStyle(root).getPropertyValue("--nova-head-x") || "0",
            );
        const headY = origin
          ? origin.y
          : parseFloat(
              getComputedStyle(root).getPropertyValue("--nova-head-y") || "0",
            );

        const batch: Heart[] = Array.from({ length: count }, () => ({
          id: nextId++,
          // Spread the launch points so they don't stack into one column.
          x: headX + (Math.random() * 2 - 1) * 26,
          y: headY + (Math.random() * 2 - 1) * 10,
          drift: (Math.random() * 2 - 1) * 70,
          scale: 0.65 + Math.random() * 0.6,
          delay: Math.random() * 180,
          rotate: (Math.random() * 2 - 1) * 30,
        }));

        setHearts((current) => [...current, ...batch].slice(-MAX_LIVE));

        // Reap by id rather than by count: bursts overlap, so trimming the
        // front of the list would cull hearts that are still mid-flight.
        const ids = new Set(batch.map((heart) => heart.id));
        window.setTimeout(
          () => setHearts((current) => current.filter((h) => !ids.has(h.id))),
          HEART_MS + 260,
        );
      }),
    [],
  );

  if (hearts.length === 0) return null;

  return (
    <div className="love-layer" aria-hidden>
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="love-heart"
          style={
            {
              left: `${heart.x}px`,
              top: `${heart.y}px`,
              "--drift": `${heart.drift}px`,
              "--scale": heart.scale,
              "--spin": `${heart.rotate}deg`,
              animationDelay: `${heart.delay}ms`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z"
              fill="currentColor"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
