"use client";

import { useState } from "react";
import { Nova } from "./Nova";
import { greetings } from "@/content/profile";
import { useNovaStage } from "@/hooks/useNovaStage";
import { useSectionReactions } from "@/hooks/useSectionReactions";

/**
 * The fixed layer NOVA lives on.
 *
 * She is rendered exactly once. While the hero is on screen the stage pins her
 * over the `[data-nova-slot]` box the hero reserves; once that scrolls away she
 * flies down into the corner and stays there. One instance rather than a hero
 * copy and a dock copy means her gaze, blink timing, and mood never disagree
 * with themselves mid-handoff.
 *
 * The layer is pointer-events: none, so nothing here can intercept a click meant
 * for the page. The one exception is the name prompt, which has to be typable —
 * and which disappears the moment the visitor scrolls on and ignores it.
 */
export function NovaStage() {
  const { stageRef, anchorRef, svgRef, bubbleRef, docked } = useNovaStage();
  const { mood, line, open, asksName, submitName, skipName } =
    useSectionReactions();
  const [draft, setDraft] = useState("");

  return (
    <div ref={stageRef} className="nova-stage">
      <div ref={anchorRef} className="nova-anchor">
        <Nova ref={svgRef} mood={mood} />
      </div>

      {/* Positioned by the stage loop; the inner bubble owns its own entrance
          so the two transforms never fight. */}
      <div ref={bubbleRef} className="nova-speech-anchor">
        <div
          className="nova-speech"
          data-open={open}
          data-dock={docked}
          data-interactive={asksName}
        >
          {/* Ambient narration that repeats what the section heading already
              says — announcing it would talk over the visitor's own navigation.
              When it's the name question it stays exposed, as the input's
              description rather than a second copy of the same sentence. */}
          <p id="nova-says" aria-hidden={!asksName}>
            {line}
          </p>

          {asksName && (
            <form
              className="nova-ask"
              onSubmit={(event) => {
                event.preventDefault();
                submitName(draft);
              }}
            >
              <input
                id="nova-name"
                name="nova-name"
                type="text"
                value={draft}
                maxLength={24}
                autoComplete="given-name"
                placeholder={greetings.namePlaceholder}
                aria-label={greetings.namePlaceholder}
                aria-describedby="nova-says"
                onChange={(event) => setDraft(event.target.value)}
                className="nova-ask-input"
              />
              <button type="submit" className="nova-ask-save">
                {greetings.nameSubmit}
              </button>
              <button
                type="button"
                onClick={skipName}
                className="nova-ask-skip"
              >
                {greetings.nameSkip}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
