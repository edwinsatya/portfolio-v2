import { profile } from "@/content/profile";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "./ContactForm";
import {
  ArrowUpRight,
  Download,
  Github,
  Linkedin,
  Mail,
} from "@/components/ui/Icons";

const channels = [
  {
    label: "Email",
    value: profile.email,
    href: `mailto:${profile.email}`,
    Icon: Mail,
  },
  {
    label: "GitHub",
    value: "github.com/edwinsatya",
    href: profile.links.github,
    Icon: Github,
  },
  {
    label: "LinkedIn",
    value: "Edwin Satya Yudistira",
    href: profile.links.linkedin,
    Icon: Linkedin,
  },
];

export function Contact() {
  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Let’s build something"
      lede={profile.availability.detail}
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div className="space-y-8">
          <Reveal>
            <ul className="panel divide-y divide-line rounded-2xl">
              {channels.map(({ label, value, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface/60"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors group-hover:border-accent/40 group-hover:text-accent-ink">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-faint">{label}</span>
                      <span className="block truncate text-sm">{value}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-accent-ink" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <a
              href={profile.links.resume}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-3 text-sm transition-colors hover:border-accent/50"
            >
              <Download className="size-4" />
              Download resume
            </a>
            <p className="mt-5 text-sm leading-relaxed text-faint">
              All channels monitored — usually replies within 24 hours.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  );
}
