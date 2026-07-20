"use client";

import { useEffect, useRef, useState } from "react";
import { Nova } from "./Nova";
import { NovaChat } from "./NovaChat";
import { greetings } from "@/content/profile";
import { useNovaChat } from "@/hooks/useNovaChat";
import { useNovaMemory } from "@/hooks/useNovaMemory";
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
 * for the page. Three things opt back in: the robot herself (tap to chat), the
 * name prompt, and the chat panel.
 */
export function NovaStage() {
  const { visit } = useNovaMemory();
  const chat = useNovaChat({ name: visit.name });

  // Chatting pulls her out of the hero and down to the corner, so the panel is
  // always beside her rather than stranded across the page.
  const { stageRef, anchorRef, svgRef, bubbleRef, docked } = useNovaStage({
    forceDock: chat.isOpen,
  });

  const { mood, line, open, asksName, submitName, skipName } =
    useSectionReactions();
  const [draft, setDraft] = useState("");
  const tapRef = useRef<HTMLButtonElement>(null);

  // Whichever way the panel closes — Escape, the X, or tapping NOVA again —
  // focus goes back to the robot rather than being dropped on the document.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !chat.isOpen) tapRef.current?.focus();
    wasOpen.current = chat.isOpen;
  }, [chat.isOpen]);

  return (
    <div ref={stageRef} className="nova-stage" data-chatting={chat.isOpen}>
      <div ref={anchorRef} className="nova-anchor">
        <Nova ref={svgRef} mood={mood} />

        {/* Invisible hit area over the robot's silhouette, so the click target
            is NOVA rather than the whole bloom around her. */}
        <button
          ref={tapRef}
          type="button"
          onClick={chat.toggle}
          className="nova-tap"
          aria-expanded={chat.isOpen}
          aria-label={chat.isOpen ? "Close chat with NOVA" : "Talk to NOVA"}
        />
      </div>

      {/* Positioned by the stage loop; the inner bubble owns its own entrance
          so the two transforms never fight. The chat replaces it while open —
          two things talking at once would just be noise. */}
      <div ref={bubbleRef} className="nova-speech-anchor">
        <div
          className="nova-speech"
          data-open={open && !chat.isOpen}
          data-dock={docked}
          data-interactive={asksName && !chat.isOpen}
        >
          {/* Ambient narration that repeats what the section heading already
              says — announcing it would talk over the visitor's own navigation.
              When it's the name question it stays exposed, as the input's
              description rather than a second copy of the same sentence. */}
          <p id="nova-says" aria-hidden={!asksName}>
            {line}
          </p>

          {asksName && !chat.isOpen && (
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
              <button type="button" onClick={skipName} className="nova-ask-skip">
                {greetings.nameSkip}
              </button>
            </form>
          )}
        </div>
      </div>

      <NovaChat
        isOpen={chat.isOpen}
        messages={chat.messages}
        isThinking={chat.isThinking}
        suggestions={chat.suggestions}
        onSend={chat.send}
        onClose={chat.close}
      />
    </div>
  );
}
