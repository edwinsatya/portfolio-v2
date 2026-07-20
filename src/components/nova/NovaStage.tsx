"use client";

import { Nova } from "./Nova";
import { useNovaStage } from "@/hooks/useNovaStage";
import { useSectionReactions } from "@/hooks/useSectionReactions";

/**
 * The fixed layer NOVA lives on.
 *
 * She is rendered exactly once. While the hero is on screen the stage pins her
 * over the `[data-nova-slot]` box the hero reserves; once that scrolls away she
 * flies down into the corner and stays there. One instance rather than a
 * hero copy and a dock copy means her gaze, blink timing, and mood never
 * disagree with themselves mid-handoff.
 *
 * The whole layer is pointer-events: none, so nothing here can ever intercept a
 * click meant for the page.
 */
export function NovaStage() {
  const { stageRef, anchorRef, svgRef, bubbleRef, docked } = useNovaStage();
  const { mood, line, open } = useSectionReactions();

  return (
    <div ref={stageRef} className="nova-stage">
      <div ref={anchorRef} className="nova-anchor">
        <Nova ref={svgRef} mood={mood} />
      </div>

      {/* Positioned by the stage loop; the inner bubble owns its own entrance
          so the two transforms never fight. */}
      <div ref={bubbleRef} className="nova-speech-anchor">
        <p
          className="nova-speech"
          data-open={open}
          data-dock={docked}
          // Ambient narration that repeats what the section heading already
          // says — announcing it would talk over the visitor's own navigation.
          aria-hidden="true"
        >
          {line}
        </p>
      </div>
    </div>
  );
}
