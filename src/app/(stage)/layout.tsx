import { Nav } from "@/components/layout/Nav";
import { NovaStage } from "@/components/nova/NovaStage";
import { BootSequence } from "@/components/nova/BootSequence";
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
      <BootSequence />
    </>
  );
}
