"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { profile } from "@/content/profile";
import { scenes } from "@/content/scenes";
import { askNova } from "@/lib/nova-bus";
import {
  ChatBubble,
  FileText,
  Grid,
  Home,
  Mail,
  User,
} from "@/components/ui/Icons";

/** Icons for the collapsed mobile pill, keyed by scene. */
const ICONS = { home: Home, work: Grid, about: User, contact: Mail };

/**
 * Floating pill nav, top-right. Each item is a real route, so the back button
 * and direct links work without anything custom.
 *
 * No mobile sheet: the four labels collapse to icons on phones rather than
 * hiding behind a hamburger — one less tap between the visitor and the scene.
 */
export function Nav() {
  const segment = useSelectedLayoutSegment();
  const active = segment ?? "home";

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
          {scenes.map((scene) => {
            const Icon = ICONS[scene.id];
            const isActive = active === scene.id;
            return (
              <li key={scene.id}>
                <Link
                  href={scene.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`mono-label flex items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-chrome text-bg" : "text-faint hover:text-ink"
                  } size-8 sm:size-auto sm:px-3.5 sm:py-2`}
                >
                  {/* Icon on phones, label from `sm` up. The label stays in the
                      accessibility tree either way. */}
                  <Icon className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">{scene.label}</span>
                  <span className="sr-only sm:hidden">{scene.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
