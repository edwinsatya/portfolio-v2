"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { openResume } from "@/lib/nova-bus";
import { useBootComplete } from "@/hooks/useBootComplete";
import { trajectory } from "@/content/trajectory";
import "./ticker.css";

/**
 * The trajectory ticker — a fixed news-strip along the very bottom of the
 * viewport.
 *
 * Rendered from the stage layout, not from inside a scene: a scene box carries
 * a `transform` for its entrance, which would make a `position: fixed` child
 * anchor to the scene instead of the viewport. Out here it pins to the true
 * bottom edge, the last pixel row, below NOVA's line, the chips and the status
 * readout (the stage reserves room for it via `.stage[data-scene="about"]`).
 *
 * Shown on ABOUT only for now — `data-show` is the single seam a later scene
 * would flip to fade it in elsewhere. Clicking it opens the live resume at
 * Experience.
 */

/** One pass of the loop. Two of these sit back to back for a seamless scroll. */
function Segment() {
  return (
    <span className="about-ticker-seg">
      <span className="about-ticker-lead">Trajectory</span>
      <span className="about-ticker-dash" aria-hidden>
        —
      </span>
      {trajectory.map((stop) => (
        <span className="about-ticker-item" key={stop.year + stop.label}>
          <span className="about-ticker-year">{stop.year}</span>
          {stop.label}
          <span className="about-ticker-dot" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </span>
  );
}

export function TrajectoryTicker() {
  const segment = useSelectedLayoutSegment();
  const bootComplete = useBootComplete();
  const show = segment === "about" && bootComplete;

  return (
    <div className="about-ticker" data-show={show} aria-hidden={!show}>
      <button
        type="button"
        className="about-ticker-btn"
        onClick={() => openResume("resume-experience")}
        tabIndex={show ? 0 : -1}
        aria-label="Open the live resume at Edwin's experience"
      >
        <span className="about-ticker-viewport">
          <span className="about-ticker-track" aria-hidden>
            <Segment />
            <Segment />
          </span>
        </span>
      </button>
    </div>
  );
}
