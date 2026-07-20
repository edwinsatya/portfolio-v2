"use client";

import { useEffect, useState } from "react";

/**
 * Reports which `[data-section]` block currently owns the viewport.
 *
 * Drives the nav's active state today; from step 4 it also tells NOVA which mood
 * to switch to and which line to speak, so both stay in sync by construction.
 */
export function useActiveSection(ids: string[], fallback = ids[0]) {
  const [active, setActive] = useState(fallback);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    // Track ratios for every section and pick the most visible one, rather than
    // reacting to whichever crossed the line last — that stays stable when two
    // short sections share the screen.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId = "";
        let bestRatio = 0;

        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestId = id;
            bestRatio = ratio;
          }
        }

        if (bestId && bestRatio > 0.05) setActive(bestId);
      },
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
