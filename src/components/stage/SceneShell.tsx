"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Wraps a scene's content and crossfades it when the route changes.
 *
 * Hand-rolled rather than using React's `<ViewTransition>`: that's still behind
 * an experimental flag and animates differently in Safari, and all this needs is
 * a fade-and-lift on one box. A CSS transition keyed to the pathname behaves the
 * same everywhere and costs nothing.
 *
 * The scene owns its own scroll — the stage itself never scrolls, so content
 * that overflows scrolls inside this box.
 */
export function SceneShell({
  children,
  /** Where the content sits relative to NOVA. */
  side = "right",
  /**
   * Optional layer rendered as a sibling of the scrolling content, not inside
   * it — for decoration that must stay put while the content scrolls and reach
   * outside the content column (ABOUT's floating badges and trajectory ticker).
   * Position it with `position: absolute`; the scene box is the containing block.
   */
  overlay,
}: {
  children: React.ReactNode;
  side?: "right" | "full";
  overlay?: React.ReactNode;
}) {
  const pathname = usePathname();

  // Keyed by pathname: React discards the old box and mounts a fresh one in its
  // pre-transition state, so there's nothing to reset and no cascading render.
  return (
    <SceneBox key={pathname} side={side} overlay={overlay}>
      {children}
    </SceneBox>
  );
}

function SceneBox({
  children,
  side,
  overlay,
}: {
  children: React.ReactNode;
  side: "right" | "full";
  overlay?: React.ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Two frames: one to paint the pre-transition styles, one to release them.
    // A single rAF can be batched into the same paint and skip the animation.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="scene" data-side={side} data-entered={entered}>
      <div className="scene-scroll">{children}</div>
      {overlay}
    </div>
  );
}
