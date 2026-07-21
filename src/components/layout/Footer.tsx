import { profile } from "@/content/profile";
import { Github, Linkedin, Mail } from "@/components/ui/Icons";
import { ForgetMe } from "./ForgetMe";

const socials = [
  { label: "GitHub", href: profile.links.github, Icon: Github },
  { label: "LinkedIn", href: profile.links.linkedin, Icon: Linkedin },
  { label: "Email", href: `mailto:${profile.email}`, Icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row sm:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p className="text-center text-sm text-faint sm:text-left">
            © {new Date().getFullYear()} {profile.name}
          </p>
          <ForgetMe />
        </div>

        <ul className="flex items-center gap-1">
          {socials.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface hover:text-ink"
              >
                <span className="sr-only">{label}</span>
                <Icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
