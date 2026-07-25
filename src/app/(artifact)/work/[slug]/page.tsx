import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtifactView } from "@/components/artifact/ArtifactView";
import { caseStudyFor } from "@/content/case-studies";
import { workBySlug, workCards } from "@/content/work";

/**
 * One project, in full.
 *
 * A real route per project, so every one of them is shareable, linkable, and
 * openable cold — which is the whole reason these aren't a modal over the WORK
 * scene. Statically generated: the content is a TypeScript file, so there is
 * nothing to fetch and no reason for any of these to be rendered per request.
 */

export function generateStaticParams() {
  return workCards.map((card) => ({ slug: card.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = workBySlug(slug);
  if (!card) return {};

  return {
    title: card.name,
    description: card.blurb,
    openGraph: {
      title: `${card.name} — Edwin Satya Yudistira`,
      description: card.blurb,
      images: [{ url: `/projects/${card.image}` }],
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = workBySlug(slug);
  // A slug that isn't one of the ten is a 404, not an empty page.
  if (!card) notFound();

  return <ArtifactView slug={slug} hasStudy={Boolean(caseStudyFor(slug))} />;
}
