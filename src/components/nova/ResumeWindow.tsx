"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  capabilityStack,
  experience,
  profile,
  type Capability,
} from "@/content/profile";
import type { ResumeTheme, WindowState } from "@/hooks/useResumeWindow";
import type { ResumeSection } from "@/lib/nova-bus";
import {
  Badge,
  Cloud,
  Database,
  Download,
  Layers,
  Mail,
  Moon,
  Server,
  Sparkle,
  Sun,
} from "@/components/ui/Icons";
import "./resume.css";

/** Length of an eased scroll between sections. */
const SCROLL_MS = 720;

/** Nav items, in document order. `id` is the section's anchor. */
const NAV = [
  { id: "resume-about", label: "About" },
  { id: "resume-experience", label: "Experience" },
  { id: "resume-capabilities", label: "Capabilities" },
] as const;

const ICONS: Record<Capability["icon"], typeof Layers> = {
  layers: Layers,
  server: Server,
  database: Database,
  sparkle: Sparkle,
  cloud: Cloud,
  badge: Badge,
};

type ResumeWindowProps = {
  isOpen: boolean;
  windowState: WindowState;
  theme: ResumeTheme;
  /** A section to land on when the window opens, with a nonce so a repeat fires. */
  focusSection: { id: ResumeSection; nonce: number } | null;
  onFocusSectionConsumed: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onToggleTheme: () => void;
};

/**
 * The resume, as a document in a window.
 *
 * Same macOS-window pattern as the terminal — traffic lights, a labelled spine,
 * a dock pill when minimised, Escape to close, focus trapped while it's up — but
 * the surface inside is paper rather than a console, and it carries its own
 * light/dark switch that no other part of the page follows. That's deliberate:
 * a resume is a document you might want to read dark at midnight without
 * repainting the site around it.
 */
export function ResumeWindow({
  isOpen,
  windowState,
  theme,
  focusSection,
  onFocusSectionConsumed,
  onClose,
  onMinimize,
  onToggleMaximize,
  onToggleTheme,
}: ResumeWindowProps) {
  const minimized = windowState === "minimized";
  const engaged = isOpen && !minimized;

  const dialogRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState<string>(NAV[0].id);

  // Focus the window on open, and hand focus back to whatever opened it.
  useEffect(() => {
    if (engaged) {
      restoreTo.current = document.activeElement as HTMLElement | null;
      const timer = window.setTimeout(() => dialogRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    restoreTo.current?.focus?.();
  }, [engaged]);

  // Escape closes; Tab cycles inside the dialog rather than escaping to the page
  // behind it. Capturing, so it wins over the terminal's identical handler if
  // both are somehow live.
  useEffect(() => {
    if (!engaged) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [engaged, onClose]);

  /*
   * Entrances and the active nav item, from one observer over the scroll
   * container. `data-in` is sticky — a section that has been read doesn't fade
   * back out when it leaves, which would read as the document forgetting itself.
   */
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !engaged) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc
        .querySelectorAll<HTMLElement>("[data-doc-reveal]")
        .forEach((el) => (el.dataset.in = "true"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.in = "true";
          }
        }
      },
      { root: doc, rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    doc
      .querySelectorAll<HTMLElement>("[data-doc-reveal]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [engaged]);

  // Which nav item is lit. Separate from the reveal observer because it needs a
  // band near the top of the window, not "has appeared at all".
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !engaged) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { root: doc, rootMargin: "-10% 0px -70% 0px" },
    );

    NAV.forEach(({ id }) => {
      const section = doc.querySelector(`#${id}`);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [engaged]);

  /**
   * Eased scroll to a section.
   *
   * Hand-rolled rather than `scrollIntoView({ behavior: "smooth" })` because the
   * native curve is linear-ish and short; this is the same ease-in-out the
   * window chrome animates on, so a nav click feels like part of the same
   * object. Reduced motion jumps.
   */
  const scrollTo = useCallback((id: string) => {
    const doc = docRef.current;
    const target = doc?.querySelector<HTMLElement>(`#${id}`);
    if (!doc || !target) return;

    const from = doc.scrollTop;
    const to = Math.min(
      target.offsetTop,
      doc.scrollHeight - doc.clientHeight,
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doc.scrollTop = to;
      setActive(id);
      return;
    }

    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / SCROLL_MS);
      // easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      doc.scrollTop = from + (to - from) * eased;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setActive(id);
  }, []);

  /*
   * Land on a requested section when the window opens at one.
   *
   * Keyed on the nonce so opening at the same section twice still scrolls, and
   * consumed straight after so a later plain open() doesn't re-jump. A beat of
   * delay lets the dialog finish mounting before `scrollTo` reads `offsetTop`.
   */
  useEffect(() => {
    if (!engaged || !focusSection) return;
    const timer = window.setTimeout(() => {
      scrollTo(focusSection.id);
      onFocusSectionConsumed();
    }, 90);
    return () => window.clearTimeout(timer);
  }, [engaged, focusSection, scrollTo, onFocusSectionConsumed]);

  const nav = (
    <>
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className="resume-navlink"
          data-active={active === item.id}
          onClick={() => scrollTo(item.id)}
        >
          {item.label}
        </button>
      ))}
    </>
  );

  return (
    <div
      className="resume-layer"
      data-open={engaged}
      data-window={windowState}
      data-theme={theme}
      aria-hidden={!engaged}
      inert={!engaged}
    >
      {/* Clicking the dimmed page closes, the way clicking off a window does. */}
      <button
        type="button"
        className="resume-scrim"
        tabIndex={-1}
        aria-label="Close live resume"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className="resume"
        role="dialog"
        aria-modal="true"
        aria-label="Live resume"
        tabIndex={-1}
      >
        {/* Desktop chrome: the dark edge strip. */}
        <div className="resume-rail">
          <div className="resume-lights">
            <button
              type="button"
              className="resume-light resume-light-close"
              onClick={onClose}
              aria-label="Close live resume"
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
              </svg>
            </button>
            <button
              type="button"
              className="resume-light resume-light-min"
              onClick={onMinimize}
              aria-label="Minimise live resume"
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M3 6h6" />
              </svg>
            </button>
            <button
              type="button"
              className="resume-light resume-light-max"
              onClick={onToggleMaximize}
              aria-label={
                windowState === "maximized"
                  ? "Restore live resume size"
                  : "Maximise live resume"
              }
            >
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M6 3v6M3 6h6" />
              </svg>
            </button>
          </div>

          <span className="resume-spine" aria-hidden>
            LIVE_RESUME_NODE
          </span>
        </div>

        {/* The paper. The second spine label sits on the page rather than the
            rail, as in a printed document's margin. */}
        <div className="resume-body">
          <span className="resume-margin" aria-hidden>
            RESUME &apos;26 — FULL-STACK · WEB DEVELOPER
          </span>

          <header className="resume-head">
            <a className="resume-contact" href={`mailto:${profile.email}`}>
              <Mail className="resume-contact-icon" />
              {profile.email}
            </a>

            <div className="resume-actions">
              <nav className="resume-nav" aria-label="Resume sections">
                {nav}
              </nav>

              <button
                type="button"
                className="resume-theme"
                onClick={onToggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={
                  theme === "dark"
                    ? "Switch resume to light"
                    : "Switch resume to dark"
                }
              >
                {theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </button>

              <a
                className="resume-cv"
                href={profile.links.resume}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download CV
                <Download className="size-3.5" />
              </a>
            </div>
          </header>

          <div className="resume-doc" ref={docRef}>
            {/* --- Hero ---------------------------------------------------- */}
            <section id="resume-about" className="resume-hero">
              <h2 className="resume-name" data-doc-reveal>
                {profile.name}
                <span className="resume-dot" aria-hidden>
                  .
                </span>
              </h2>

              <p className="resume-meta" data-doc-reveal>
                <span>Full-Stack Developer</span>
                <i aria-hidden />
                <span>6+ Years</span>
                <i aria-hidden />
                <span>Lumajang, ID</span>
              </p>

              <p className="resume-bio" data-doc-reveal>
                {profile.bio}
              </p>

              <button
                type="button"
                className="resume-scroll"
                onClick={() => scrollTo("resume-experience")}
              >
                Scroll
              </button>
            </section>

            {/* --- Experience ---------------------------------------------- */}
            <section id="resume-experience" className="resume-section">
              <h3 className="resume-heading" data-doc-reveal>
                experience
              </h3>

              <ol className="resume-rows">
                {experience.map((role) => (
                  <li
                    className="resume-row"
                    key={role.company + role.period}
                    data-doc-reveal
                  >
                    <div className="resume-row-left">
                      <p className="resume-company">{role.company}</p>
                      <p className="resume-when">
                        {role.project ? `${role.project} · ` : ""}
                        {role.period}
                      </p>
                    </div>

                    <div className="resume-row-right">
                      <p className="resume-title">{role.title}</p>
                      {role.tags && (
                        <p className="resume-tags">{role.tags.join(", ")}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* --- Capability stack ---------------------------------------- */}
            <section id="resume-capabilities" className="resume-section">
              <h3 className="resume-heading" data-doc-reveal>
                capability stack
              </h3>

              <div className="resume-cards">
                {capabilityStack.map((group) => {
                  const Icon = ICONS[group.icon];
                  return (
                    <article
                      className="resume-card"
                      key={group.title}
                      data-doc-reveal
                    >
                      <Icon className="resume-card-icon" />
                      <h4 className="resume-card-title">{group.title}</h4>
                      <ul className="resume-card-list">
                        {group.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Mobile chrome: a compact title bar instead of the rail, with the
            same internal nav collapsed to an inline row beneath it. */}
        <header className="resume-bar">
          <span className="resume-bar-title">LIVE_RESUME</span>
          <span className="resume-bar-actions">
            <button
              type="button"
              onClick={onToggleTheme}
              className="resume-bar-btn"
              aria-pressed={theme === "dark"}
              aria-label={
                theme === "dark"
                  ? "Switch resume to light"
                  : "Switch resume to dark"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="resume-bar-btn"
              aria-label="Close live resume"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        </header>

        <nav className="resume-bar-nav" aria-label="Resume sections">
          {nav}
        </nav>
      </div>
    </div>
  );
}
