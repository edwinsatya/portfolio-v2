import { Nav } from "@/components/layout/Nav";
import { NovaStage } from "@/components/nova/NovaStage";
import { BootSequence } from "@/components/nova/BootSequence";
import { MusicWidget } from "@/components/nova/MusicWidget";
import { PowerVoid } from "@/components/nova/PowerVoid";
import { StageFrame } from "@/components/stage/StageFrame";

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
      {/* Sibling of the stage, not inside it — see the note in `music.css`. */}
      <MusicWidget />
      {/* Also a sibling, and for the opposite reason: its two layers have to sit
          on either side of NOVA's, which is impossible from inside one of
          them. See the z-index note in `power.css`. */}
      <PowerVoid />
      <BootSequence />
    </>
  );
}
