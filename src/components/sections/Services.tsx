import { services } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Check } from "@/components/ui/Icons";

export function Services() {
  return (
    <Section
      id="services"
      eyebrow="Services"
      title="Three ways to work together"
      lede="Pick whichever sounds closest to the problem you’re staring at."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {services.map((service, index) => (
          <Reveal
            as="li"
            key={service.title}
            delay={index * 0.1}
            className="panel panel-hover edge-light flex flex-col rounded-2xl p-6 sm:p-8"
          >
            <span className="font-display text-xs text-faint tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>

            <h3 className="mt-5 font-display text-xl font-semibold text-balance">
              {service.title}
            </h3>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted text-pretty">
              {service.summary}
            </p>

            <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
              {service.details.map((detail) => (
                <li
                  key={detail}
                  className="flex items-center gap-2.5 text-sm text-muted"
                >
                  <Check className="size-3.5 shrink-0 text-accent-ink" />
                  {detail}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
