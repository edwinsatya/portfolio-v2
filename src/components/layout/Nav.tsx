"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { scenes } from "@/content/scenes";
import { askNova, noPower, openResume } from "@/lib/nova-bus";
import { isDead } from "@/lib/power";
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
 * Site navigation.
 *
 * Desktop: a floating pill top-right. Phones: a bottom tab bar with icons and
 * labels, where thumbs actually reach. Each item is a real route, so the back
 * button and direct links work without anything custom.
 */
export function Nav() {
  const segment = useSelectedLayoutSegment();
  const active = segment ?? "home";

  /*
   * Scene switching is locked at 0%.
   *
   * Handled on the link rather than by turning off pointer events on the nav,
   * which would swallow the click and read as a broken page. The store is read
   * in the handler rather than subscribed to: the nav doesn't otherwise care
   * about the battery, and a re-render per percent to keep a boolean current
   * would cost more than reading it at the one moment it's needed.
   */
  const blockIfDead = (event: React.MouseEvent) => {
    if (!isDead()) return;
    event.preventDefault();
    noPower();
  };

  return (
    <header
      data-site-nav
      className="site-nav"
    >
      <nav aria-label="Primary" className="site-nav-pill">
        {/* Utilities. Inline in the desktop pill; on phones this whole group
            breaks out to the top-right, leaving the bottom bar to the scenes. */}
        <span className="site-nav-utils">
          <button
            type="button"
            onClick={() => askNova()}
            className="nav-icon nav-icon-chat"
            aria-label="Talk to NOVA"
          >
            <ChatBubble className="size-4" />
          </button>

          {/* Opens the live resume window rather than leaving for the PDF —
              the PDF is still one click away, from inside it. */}
          <button
            type="button"
            onClick={() => openResume()}
            className="nav-icon"
            aria-label="Open live resume"
          >
            <FileText className="size-4" />
          </button>
        </span>

        <ul className="site-nav-items">
          {scenes.map((scene) => {
            const Icon = ICONS[scene.id];
            const isActive = active === scene.id;
            return (
              <li key={scene.id}>
                <Link
                  href={scene.href}
                  onClick={blockIfDead}
                  aria-current={isActive ? "page" : undefined}
                  className="site-nav-link mono-label"
                  data-active={isActive}
                >
                  {/* Icon shows on phones only; the label is always present. */}
                  <Icon className="site-nav-icon" />
                  <span>{scene.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
