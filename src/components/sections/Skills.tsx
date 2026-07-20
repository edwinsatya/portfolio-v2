import { skillGroups } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Skills() {
  return (
    <Section
      id="skills"
      eyebrow="Tech arsenal"
      title="The tools, and what they’re for"
      lede="Nothing here is on the list because it looks good on a CV — each one has shipped something."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {skillGroups.map((group, index) => (
          <Reveal
            as="li"
            key={group.title}
            delay={index * 0.08}
            className="panel panel-hover edge-light rounded-2xl p-6 sm:p-7"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">
                {group.title}
              </h3>
              <span className="font-display text-xs text-faint tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-faint">{group.caption}</p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-line bg-bg-soft/70 px-2.5 py-1.5 text-[0.8rem] text-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
