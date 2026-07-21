import Image from "next/image";
import type { Project } from "@/content/profile";

/**
 * The screenshot at the top of a project card.
 *
 * Every card gets the same aspect box whether or not there's an image, so one
 * missing file can't make the grid ragged. Where a project has no `image`, the
 * box fills with a tinted gradient and the project's initial instead of leaving
 * a hole or breaking the layout.
 *
 * The `sizes` value mirrors the grid in `Projects.tsx`: one column below 640px,
 * two up to 1024px, three above — with 72rem as the container cap. Getting this
 * wrong is the usual reason `next/image` ships a needlessly large file.
 */
export function ProjectShot({ project }: { project: Project }) {
  return (
    // 2:1 is a hair tighter than the sources' native 2.19:1, so object-cover
    // trims a few pixels top and bottom rather than letterboxing — and any
    // future screenshot at a different ratio still lands in the same box.
    <div className="relative aspect-[2/1] overflow-hidden rounded-xl border border-line bg-bg-soft">
      {project.image ? (
        <Image
          src={`/projects/${project.image}`}
          alt={`${project.name} — screenshot`}
          fill
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
          // No `priority`: the projects grid never sits above the fold, so every
          // one of these should stay lazy.
          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center bg-gradient-to-br from-accent/18 via-surface to-violet/18"
        >
          <span className="font-display text-4xl font-semibold text-accent/45">
            {project.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Sinks the image into the card instead of letting it sit as a bright
          rectangle on a dark panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/55 via-transparent to-transparent"
      />
    </div>
  );
}
