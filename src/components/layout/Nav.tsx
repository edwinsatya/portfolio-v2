"use client";

import { useEffect, useState } from "react";
import { profile, sections } from "@/content/profile";
import { useActiveSection } from "@/hooks/useActiveSection";
import { ArrowUpRight, Sparkle } from "@/components/ui/Icons";

// Module scope so the array identity is stable across renders.
const SECTION_IDS = sections.map((section) => section.id);
const NAV_ITEMS = sections.filter((section) => section.id !== "intro");

export function Nav() {
  const active = useActiveSection(SECTION_IDS);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Solidify the bar once the hero is behind us.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on Escape, and lock the page behind it.
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      data-site-nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen ? "border-b border-line/70 bg-bg/80 backdrop-blur-xl" : ""
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8"
      >
        <a
          href="#intro"
          className="group flex items-center gap-2.5 font-display text-sm font-semibold tracking-tight"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 rounded-full bg-accent opacity-60 blur-[3px]" />
            <span className="relative size-2.5 rounded-full bg-accent" />
          </span>
          {profile.firstName}
          <span className="text-faint transition-colors group-hover:text-muted">
            .dev
          </span>
        </a>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={`relative rounded-full px-3.5 py-2 text-sm transition-colors ${
                  active === section.id
                    ? "text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {active === section.id && (
                  <span className="absolute inset-0 rounded-full border border-line bg-surface/80" />
                )}
                <span className="relative">{section.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href={profile.links.flagship}
            title="Experience the flagship edition of this portfolio"
            className="flagship-ring group relative hidden items-center gap-1.5 rounded-full bg-surface/40 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface/70 sm:inline-flex"
          >
            <Sparkle className="size-3.5 text-violet transition-transform duration-500 group-hover:rotate-90" />
            <span className="text-gradient">Flagship</span>
            <ArrowUpRight className="size-3.5 text-violet" />
          </a>

          <a
            href={profile.links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-line bg-surface/60 px-4 py-2 text-sm text-ink transition-colors hover:border-accent/50 sm:inline-flex"
          >
            Resume
            <ArrowUpRight className="size-3.5" />
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface/60 md:hidden"
          >
            <span className="sr-only">
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <span className="relative block h-3 w-4">
              <span
                className={`absolute inset-x-0 h-px bg-ink transition-transform duration-300 ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute inset-x-0 h-px bg-ink transition-transform duration-300 ${
                  menuOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="min-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-bg/95 backdrop-blur-2xl md:hidden"
      >
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <a
            href={profile.links.flagship}
            onClick={() => setMenuOpen(false)}
            className="flagship-ring group relative flex items-center gap-3 rounded-2xl bg-surface/50 p-4"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet/10">
              <Sparkle className="size-5 text-violet transition-transform duration-500 group-hover:rotate-90" />
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2">
                <span className="text-gradient text-base font-semibold">
                  Flagship edition
                </span>
                <span className="rounded-full border border-violet/40 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-violet">
                  New
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                A bolder redesign of this portfolio — take a look.
              </span>
            </span>
            <ArrowUpRight className="size-5 shrink-0 text-violet" />
          </a>
        </div>

        <ul className="mx-auto max-w-6xl px-6 py-4">
          {NAV_ITEMS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between border-b border-line/60 py-3.5 text-base last:border-0 ${
                  active === section.id ? "text-accent" : "text-ink"
                }`}
              >
                {section.label}
                <ArrowUpRight className="size-4 text-faint" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
