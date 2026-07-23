"use client";

import { useSyncExternalStore } from "react";
import {
  getLights,
  getServerLights,
  subscribeLights,
} from "@/lib/nova-lights";
import "./lights.css";

/**
 * NOVA's props for the light-switch gag: a wall panel, and a lamp on a cord.
 *
 * DOM rather than SVG inside her, and that is the whole reason this file exists
 * separately. Both are meant to be *stage furniture* — the lamp is the thing
 * lighting the page, the panel is screwed to the wall next to her — and anything
 * drawn into her viewBox would scale with her, shrinking to a couple of pixels
 * the moment she flies down into the corner dock. Instead they read her position
 * off the two custom properties the stage loop already publishes each frame,
 * exactly as the hearts and the music notes do.
 *
 * Nothing here is interactive and nothing here is announced. It's a prop in a
 * bit that plays only when the visitor has already stopped looking; the words
 * are in her speech bubble, which is where a screen reader will find them.
 *
 * Unmounted entirely between runs. It exists for about ten seconds, once.
 */
export function StageLights() {
  const lights = useSyncExternalStore(
    subscribeLights,
    getLights,
    getServerLights,
  );

  if (!lights.present) return null;

  return (
    <div
      className="lights"
      data-lit={lights.lit}
      data-leaving={lights.leaving}
      aria-hidden
    >
      {/* Hangs from the top of the viewport down to just above her antenna. */}
      <div className="lights-lamp">
        <span className="lights-cord" />
        <span className="lights-shade">
          <span className="lights-filament" />
        </span>
        {/* The light it actually casts. Sits under the shade and fades on the
            same 150ms the page does, so the lamp and the theme read as one
            event rather than as two things that happened to agree. */}
        <span className="lights-cast" />
      </div>

      <div className="lights-panel">
        <span className="lights-panel-label">Stage lights</span>
        <span className="lights-rocker">
          <i className="lights-rocker-nub" />
        </span>
        {/* Keyed by the flick count so React replaces the node on every toggle
            and its animation replays from the top. A class or data attribute
            would only retrigger on alternate flicks, which is exactly the half
            of them the crescendo would drop. */}
        <span key={lights.flicks} className="lights-click" />
      </div>
    </div>
  );
}
