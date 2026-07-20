import { experience } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Experience() {
  return (
    <Section
      id="experience"
      eyebrow="Experience"
      title="Where the years went"
      lede="Five teams, from a fiber-optic internship to full-stack ownership."
    >
      <ol className="relative max-w-4xl">
        {/* Timeline spine — decorative, so the list still reads without it. */}
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-accent/40 via-line to-transparent"
        />

        {experience.map((role, index) => (
          <Reveal
            as="li"
            key={role.company + role.period}
            delay={index * 0.06}
            // Spacing lives on the <li>: `last:` has to match against the list,
            // not the wrapper div, which is always its parent's only child.
            className="pb-10 last:pb-0"
          >
            <div className="group relative flex gap-6 pl-8 sm:gap-10">
              <span
                aria-hidden
                className="absolute top-2 left-0 size-[15px] rounded-full border border-line bg-bg transition-colors group-hover:border-accent"
              >
                <span className="absolute inset-[3px] rounded-full bg-line transition-colors group-hover:bg-accent" />
              </span>

              <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-8">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold">
                    {role.company}
                    {role.project && (
                      <span className="font-normal text-muted">
                        {" "}
                        · {role.project}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{role.title}</p>
                </div>

                <p className="mt-2 shrink-0 font-display text-xs tracking-wide text-faint tabular-nums sm:mt-0">
                  {role.period}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
