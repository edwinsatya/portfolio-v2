import { BootSequence } from "@/components/nova/BootSequence";

/**
 * The artifact layout — a project detail, and nothing else.
 *
 * A route group rather than another scene, because a case study is a full-page
 * takeover: it scrolls, it is long, and none of the stage's furniture belongs on
 * it. Being its own branch of the tree is what makes that true by construction
 * rather than by a pile of hiding rules — NOVA, the tickers, the ribbon, the
 * music widget, the search pill and the battery readout are all mounted by the
 * *stage* layout, so out here they simply don't exist. There is nothing left to
 * collide with the page.
 *
 * `(stage)/work/page.tsx` and `(artifact)/work/[slug]/page.tsx` resolve to
 * different URLs, which is the one thing route groups aren't allowed to share.
 * Both sit under the same root layout, so crossing between them is a soft
 * navigation rather than a full page load.
 *
 * The boot still gates a first load: a link to a case study from outside opens
 * through the same splash as the front door. It is the same component the stage
 * uses and it knows when the session has already booted, so arriving here from
 * `/work` doesn't replay it.
 */
export default function ArtifactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <BootSequence />
    </>
  );
}
