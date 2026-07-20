import { projects, type Project } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowUpRight, Github, Sparkle } from "@/components/ui/Icons";

function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  return (
    <div
      className={`panel panel-hover edge-light group flex h-full flex-col rounded-2xl p-6 sm:p-7 ${
        featured ? "sm:p-8" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className={`font-display font-semibold ${
            featured ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {project.name}
        </h3>

        {project.featured && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[0.68rem] text-accent">
            <Sparkle className="size-3" />
            NOVA’s pick
          </span>
        )}
      </div>

      <p
        className={`mt-3 leading-relaxed text-muted text-pretty ${
          featured ? "text-base" : "text-sm"
        }`}
      >
        {project.blurb}
      </p>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li
            key={tech}
            className="rounded-md border border-line bg-bg-soft/70 px-2 py-1 text-[0.7rem] text-faint"
          >
            {tech}
          </li>
        ))}
      </ul>

      {(project.live || project.source) && (
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ink transition-colors hover:text-accent"
            >
              Live site
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
          {project.source && (
            <a
              href={project.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
            >
              <Github className="size-3.5" />
              Source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function Projects() {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);

  return (
    <Section
      id="projects"
      eyebrow="Selected work"
      title="Things that actually shipped"
      lede="Ten projects, from bootcamp experiments to platforms with real users on them. NOVA has opinions about which are best."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {featured.map((project, index) => (
          <Reveal as="li" key={project.slug} delay={index * 0.08}>
            <ProjectCard project={project} featured />
          </Reveal>
        ))}
      </ul>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((project, index) => (
          <Reveal as="li" key={project.slug} delay={(index % 3) * 0.08}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
