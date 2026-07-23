import { profile, certifications, stats } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Check } from "@/components/ui/Icons";

const facts = [
  { label: "Based in", value: profile.location },
  { label: "Experience", value: "6+ years" },
  { label: "Shipped", value: "10+ projects" },
  { label: "Teams", value: "5 and counting" },
];

export function About() {
  return (
    <Section
      id="about"
      eyebrow="About"
      title="A developer from a small town, building for the whole web."
    >
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <Reveal className="space-y-6 text-base leading-relaxed text-muted text-pretty sm:text-lg">
          <p>{profile.bio}</p>
          <p>
            {/* Explicit space — JSX drops the one that follows an expression. */}
            It started in {profile.location}
            {" — far from any tech hub, with a laptop and a lot of curiosity. "}
            Six years later that’s turned into more than ten shipped projects
            across five teams, from logistics platforms and publishing tools to
            farm operations software.
          </p>
          <p>
            The thread running through all of it: caring about both halves of
            the job. An interface that feels right in the hand, and a back end
            that holds up when it matters. Right now most of that energy is
            going into AI-powered web apps.
          </p>
        </Reveal>

        <div className="space-y-8">
          <Reveal>
            <dl className="grid grid-cols-3 gap-4 border-b border-line pb-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-3xl font-semibold sm:text-4xl">
                    {stat.value}
                  </dd>
                  <p className="mono-label mt-1.5 leading-snug text-faint">
                    {stat.label}
                  </p>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="panel divide-y divide-line rounded-2xl">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <dt className="text-sm text-faint">{fact.label}</dt>
                  <dd className="font-display text-sm font-medium">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.18}>
            <h3 className="eyebrow mb-4">Certifications</h3>
            <ul className="space-y-3">
              {certifications.map((certification) => (
                <li
                  key={certification}
                  className="flex items-start gap-3 text-sm text-muted"
                >
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-ink">
                    <Check className="size-3" />
                  </span>
                  {certification}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
