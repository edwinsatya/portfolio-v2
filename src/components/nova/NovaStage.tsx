"use client";

import { useEffect, useRef } from "react";
import { addLike } from "@/lib/likes";
import { celebrate, fireLike, onCelebrate, onLike } from "@/lib/nova-bus";
import { onCharged, spendOnCelebration, startPowerClock } from "@/lib/power";
import { initTheme } from "@/lib/theme";
import { DockPill } from "./DockPill";
import { LoveBurst } from "./LoveBurst";
import { Nova } from "./Nova";
import { NovaTerminal } from "./NovaTerminal";
import { PowerSocket } from "./PowerSocket";
import { ResumeWindow } from "./ResumeWindow";
import { useNovaChat } from "@/hooks/useNovaChat";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { useNovaStage } from "@/hooks/useNovaStage";
import { useResumeWindow } from "@/hooks/useResumeWindow";
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

  const resume = useResumeWindow();

  // NOVA steps aside to the corner while either window has the visitor.
  const { stageRef, anchorRef, svgRef, bubbleRef } = useNovaStage({
    sidelined: chat.isEngaged || resume.isEngaged,
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

  /*
   * The battery clock. Started here rather than inside `usePower` because it is
   * a side effect on the whole app — every component that reads the level would
   * otherwise start one, and the drain would scale with how many of them happen
   * to be mounted.
   */
  useEffect(() => startPowerClock(), []);

  // Wakes the theme store, which is what subscribes it to the battery. Without
  // this a visitor who never types `/dark-mode` would drain to 20% and never
  // get battery saver — see the note on `initTheme`.
  useEffect(() => initTheme(), []);

  // Moving costs her something. Subscribed to the bus rather than folded into
  // the like handler above, because celebrations also come from the music
  // widget, the name flow, and a returning-visitor greeting.
  useEffect(() => onCelebrate(() => spendOnCelebration()), []);

  // Back to full: the cable pops out on its own (see `power.ts`) and she
  // celebrates properly, which she has the power for again.
  useEffect(() => onCharged(() => celebrate("dance")), []);

  return (
    <div
      ref={stageRef}
      className="nova-stage"
      data-chatting={chat.isEngaged || resume.isEngaged}
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

      {/* Inside the stage layer so it rides up with it: a window opening covers
          the cable with its scrim, the same way it covers the music widget. */}
      <PowerSocket />

      <NovaTerminal
        isOpen={chat.isOpen}
        windowState={chat.windowState}
        obscured={resume.isEngaged}
        lines={chat.lines}
        isThinking={chat.isThinking}
        onSend={chat.send}
        onClose={chat.close}
        onMinimize={chat.minimize}
        onToggleMaximize={chat.toggleMaximize}
        onScene={chat.goToScene}
      />

      <ResumeWindow
        isOpen={resume.isOpen}
        windowState={resume.windowState}
        theme={resume.theme}
        onClose={resume.close}
        onMinimize={resume.minimize}
        onToggleMaximize={resume.toggleMaximize}
        onToggleTheme={resume.toggleTheme}
      />

      {/* Both windows collapse into the same strip, so two minimised windows sit
          side by side rather than on top of one another. */}
      <div className="nova-dock-strip">
        <DockPill
          label="NOVA_AI · TERMINAL"
          open={chat.isOpen && chat.windowState === "minimized"}
          onClick={chat.restore}
        />
        <DockPill
          label="NOVA · LIVE_RESUME"
          tone="paper"
          open={resume.isOpen && resume.windowState === "minimized"}
          onClick={resume.restore}
        />
      </div>
    </div>
  );
}
