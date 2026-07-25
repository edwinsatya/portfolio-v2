import { Nav } from "@/components/layout/Nav";
import { NovaStage } from "@/components/nova/NovaStage";
import { BootSequence } from "@/components/nova/BootSequence";
import { MusicWidget } from "@/components/nova/MusicWidget";
import { PowerAuraVignette } from "@/components/nova/PowerAura";
import { PowerVoid } from "@/components/nova/PowerVoid";
import { StageFrame } from "@/components/stage/StageFrame";
import { ClassicRibbon } from "@/components/scenes/ClassicRibbon";
import { TrajectoryTicker } from "@/components/scenes/TrajectoryTicker";

/**
 * The persistent stage.
 *
 * Everything here survives a scene change untouched — App Router layouts
 * preserve state and don't re-render on navigation, which is what keeps NOVA
 * mid-blink and mid-conversation while the scene around her swaps. Only
 * `children` is replaced.
 */
export default function StageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      <StageFrame>{children}</StageFrame>
      {/* Fixed layer above the stage — NOVA, her speech bubble, and the chat. */}
      <NovaStage />
      {/* Fixed chrome, siblings of the stage so their `position: fixed` anchors
          to the viewport rather than to a scene's transformed box: the bottom
          trajectory ticker (ABOUT) and the classic-build ribbon (all scenes). */}
      <TrajectoryTicker />
      <ClassicRibbon />
      {/* Sibling of the stage, not inside it — see the note in `music.css`. */}
      <MusicWidget />
      {/* Also a sibling, and for the opposite reason: its two layers have to sit
          on either side of NOVA's, which is impossible from inside one of
          them. See the z-index note in `power.css`. */}
      <PowerVoid />
      {/* The charging power-up itself lives inside NOVA's anchor (see
          `NovaStage`), so it can never drift from her. This is the one piece of
          it that can't: a full-viewport tint under her layer, which has no
          position to get wrong and so is free to stay out here at z 38. */}
      <PowerAuraVignette />
      <BootSequence />
    </>
  );
}
