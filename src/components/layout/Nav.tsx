"use client";

import { profile, sections } from "@/content/profile";
import { useActiveSection } from "@/hooks/useActiveSection";
import { askNova } from "@/lib/nova-bus";
import {
  ChatBubble,
  FileText,
  Grid,
  Home,
  Mail,
  User,
} from "@/components/ui/Icons";

// Module scope so the array identity is stable across renders.
const SECTION_IDS = sections.map((section) => section.id);

/**
 * The reference's four-item nav, mapped onto this site's sections. Each carries
 * an icon because the pill collapses to icons on phones, where four monospace
 * labels would run the full width of the screen.
 */
const NAV_ITEMS = [
  { id: "intro", label: "Home", Icon: Home },
  { id: "projects", label: "Work", Icon: Grid },
  { id: "about", label: "About", Icon: User },
  { id: "contact", label: "Contact", Icon: Mail },
];

/**
 * Floating pill nav, top-right.
 *
 * No mobile sheet: four short monospace labels fit across a phone at this size,
 * so the pill only tightens its padding rather than collapsing behind a
 * hamburger — one less tap between the visitor and the page.
 */
export function Nav() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <header
      data-site-nav
      className="fixed inset-x-0 top-0 z-50 flex justify-end px-4 pt-4 sm:px-6 sm:pt-6"
    >
      <nav
        aria-label="Primary"
        className="flex items-center gap-1 rounded-full border border-white/70 bg-surface/85 p-1.5 shadow-[0_8px_30px_-12px_rgb(20_22_31/0.25)] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={() => askNova()}
          className="nav-icon"
          aria-label="Talk to NOVA"
        >
          <ChatBubble className="size-4" />
        </button>

        <a
          href={profile.links.resume}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-icon"
          aria-label="Resume (opens in a new tab)"
        >
          <FileText className="size-4" />
        </a>

        <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />

        <ul className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`mono-label flex items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-chrome text-bg" : "text-faint hover:text-ink"
                  } size-8 sm:size-auto sm:px-3.5 sm:py-2`}
                >
                  {/* Icon on phones, label from `sm` up. The label is always in
                      the accessibility tree either way. */}
                  <Icon className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
