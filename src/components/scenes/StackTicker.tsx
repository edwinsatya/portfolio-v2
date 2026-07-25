"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useBootComplete } from "@/hooks/useBootComplete";
import { stackInTheWild } from "@/content/work";
import "./ticker.css";

/**
 * WORK's bottom strip — what the ten projects are actually built out of.
 *
 * Same strip as ABOUT's trajectory, same reasons for living out here in the
 * layout rather than inside the scene (a scene box carries a `transform` for its
 * entrance, which would anchor a `position: fixed` child to the scene instead of
 * the viewport). It shares `ticker.css` outright — one strip, two tenants, so
 * the second one can't drift from the first.
 *
 * Not a control, unlike the trajectory: there is nowhere useful to send someone
 * from a technology name, so this is a plain readout rather than a button that
 * would only disappoint.
 */

/** One pass of the loop. Two of these sit back to back for a seamless scroll. */
function Segment() {
  return (
    <span className="scene-ticker-seg">
      <span className="scene-ticker-lead">Stack in the wild</span>
      <span className="scene-ticker-dash" aria-hidden>
        —
      </span>
      {stackInTheWild.map((tech) => (
        <span className="scene-ticker-item" key={tech}>
          {tech}
          <span className="scene-ticker-dot" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </span>
  );
}

export function StackTicker() {
  const segment = useSelectedLayoutSegment();
  const bootComplete = useBootComplete();
  // The scene only — a project detail is a full-page takeover and has its own
  // furniture. `segment` is "work" on `/work` and on `/work/<slug>` alike, so
  // the detail routes opt out in Part B via their own layout flag.
  const show = segment === "work" && bootComplete;

  return (
    <div className="scene-ticker" data-show={show} aria-hidden={!show}>
      <div className="scene-ticker-static">
        <span className="scene-ticker-viewport">
          <span className="scene-ticker-track" aria-hidden>
            <Segment />
            <Segment />
          </span>
        </span>
      </div>
    </div>
  );
}
