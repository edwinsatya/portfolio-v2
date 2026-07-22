"use client";

import { useEffect, useRef } from "react";
import { addLike } from "@/lib/likes";
import { celebrate, fireLike, onLike } from "@/lib/nova-bus";
import { LoveBurst } from "./LoveBurst";
import { Nova } from "./Nova";
import { NovaTerminal } from "./NovaTerminal";
import { useNovaChat } from "@/hooks/useNovaChat";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { useNovaStage } from "@/hooks/useNovaStage";
import { useSceneReactions } from "@/hooks/useSceneReactions";

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
 * for the page. Two things opt back in: the robot herself (tap to chat) and the
 * chat panel.
 */
export function NovaStage() {
  const { visit } = useNovaMemory();
  const chat = useNovaChat({
    name: visit.name,
    isFirstVisit: (visit.previous?.visitCount ?? 0) === 0,
  });

  // NOVA steps aside to the corner while the terminal has the visitor.
  const { stageRef, anchorRef, svgRef, bubbleRef } = useNovaStage({
    sidelined: chat.isEngaged,
  });

  const { mood, line, open } = useSceneReactions();
  const tapRef = useRef<HTMLButtonElement>(null);

  // Whichever way the panel closes — Escape or the X — focus goes back to the
  // robot rather than being dropped on the document.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !chat.isOpen) tapRef.current?.focus();
    wasOpen.current = chat.isOpen;
  }, [chat.isOpen]);

  // One place records a like and picks a celebration, whatever fired it — the
  // L key, the counter, the tagline, or NOVA herself.
  useEffect(
    () =>
      onLike(() => {
        addLike();
        celebrate();
      }),
    [],
  );

  return (
    <div
      ref={stageRef}
      className="nova-stage"
      data-chatting={chat.isEngaged}
      data-window={chat.isOpen ? chat.windowState : undefined}
    >
      <div ref={anchorRef} className="nova-anchor">
        <Nova ref={svgRef} mood={mood} />

        {/* Invisible hit area over the robot's silhouette, so the click target
            is NOVA rather than the whole bloom around her. Clicking her likes —
            the chat is opened from the nav's chat icon and the chips. */}
        <button
          ref={tapRef}
          type="button"
          onClick={() => fireLike()}
          className="nova-tap"
          aria-label="Like NOVA"
        />
      </div>

      {/* Positioned by the stage loop; the inner bubble owns its own entrance
          so the two transforms never fight. The chat replaces it while open —
          two things talking at once would just be noise. */}
      <div ref={bubbleRef} className="nova-speech-anchor">
        <div className="nova-speech" data-open={open}>
          {/* Ambient narration that repeats what the section heading already
              says — announcing it would talk over the visitor's own navigation. */}
          <p id="nova-says" aria-hidden="true">
            {line}
          </p>
        </div>
      </div>

      <LoveBurst />

      <NovaTerminal
        isOpen={chat.isOpen}
        windowState={chat.windowState}
        lines={chat.lines}
        isThinking={chat.isThinking}
        onSend={chat.send}
        onClose={chat.close}
        onMinimize={chat.minimize}
        onToggleMaximize={chat.toggleMaximize}
        onRestore={chat.restore}
        onScene={chat.goToScene}
      />
    </div>
  );
}
