import type { Metadata } from "next";
import { profile, certifications, stats } from "@/content/profile";
import { SceneShell } from "@/components/stage/SceneShell";
import { Check } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "About",
  description: profile.bio,
};

const facts = [
  { label: "Based in", value: profile.location },
  { label: "Experience", value: "6+ years" },
  { label: "Shipped", value: "11 projects" },
  { label: "Teams", value: "5 and counting" },
];

export default function AboutScene() {
  return (
    <SceneShell>
      <h2 className="mono-label text-accent-ink">About</h2>

      <p className="mt-4 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">
        A developer from a small town, building for the whole web.
      </p>

      <div className="mt-5 space-y-3.5 text-sm leading-relaxed text-muted">
        <p>{profile.bio}</p>
        <p>
          It started in {profile.location} — far from any tech hub, with a
          laptop and a lot of curiosity. Six years later that’s turned into more
          than ten shipped projects across five teams, from logistics platforms
          and publishing tools to farm operations software.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-line py-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            <dd className="font-display text-2xl font-semibold">{stat.value}</dd>
            <p className="mono-label mt-1 leading-snug text-faint">
              {stat.label}
            </p>
          </div>
        ))}
      </dl>

      <dl className="mt-6 space-y-2.5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-4">
            <dt className="mono-label text-faint">{fact.label}</dt>
            <dd className="text-sm text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7">
        <h3 className="mono-label text-faint">Certifications</h3>
        <ul className="mt-3 space-y-2">
          {certifications.map((cert) => (
            <li key={cert} className="flex items-start gap-2.5 text-sm text-muted">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-ink">
                <Check className="size-3" />
              </span>
              {cert}
            </li>
          ))}
        </ul>
      </div>
    </SceneShell>
  );
}
