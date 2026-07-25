"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AskNova } from "@/components/artifact/AskNova";
import { useBootComplete } from "@/hooks/useBootComplete";
import { caseStudyFor, neighboursOf, positionOf } from "@/content/case-studies";
import { workBySlug, workCards } from "@/content/work";
import "./artifact.css";

/**
 * A project, in full — the case-study page behind every card on WORK.
 *
 * Client-side for three reasons and no others: the arrow keys page between
 * projects, the hero opens a lightbox, and the ASK NOVA card holds a
 * conversation. Everything else here is static content rendered once.
 *
 * The page is deliberately plain furniture — a bar, a column, a sidebar. It is
 * the one place on this site where a recruiter is reading rather than being
 * shown something, and the robot, the ticker and the rest of the stage are all
 * absent by construction (see `(artifact)/layout.tsx`).
 */
export function ArtifactView({
  slug,
  hasStudy,
}: {
  slug: string;
  /** Resolved on the server so the two can't disagree about what exists. */
  hasStudy: boolean;
}) {
  const router = useRouter();
  const bootComplete = useBootComplete();
  const card = workBySlug(slug);
  const study = caseStudyFor(slug);
  const { previous, next } = neighboursOf(slug);
  const position = positionOf(slug);

  const [zoomed, setZoomed] = useState(false);
  /*
   * Touch opens the hero by holding it, not by tapping — the caption under the
   * image says so ("hold image to x-ray"). A tap is reserved because on a phone
   * the image is most of the screen, and a full-screen lightbox arriving from a
   * stray thumb while scrolling is the worst kind of surprise.
   *
   * Mouse and keyboard are unchanged: a click opens it.
   */
  const holdTimer = useRef(0);
  const fromTouch = useRef(false);
  const held = useRef(false);

  // Plain functions: the compiler memoizes them, and hand-rolled `useCallback`
  // here only gives it a dependency list to disagree with.
  const startHold = (event: React.PointerEvent) => {
    fromTouch.current = event.pointerType === "touch";
    held.current = false;
    if (!fromTouch.current) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setZoomed(true);
    }, HOLD_MS);
  };

  const endHold = () => window.clearTimeout(holdTimer.current);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  /*
   * ← and → page between projects.
   *
   * Guarded the same way the stage's `/` shortcut is: never while someone is
   * typing (the ASK NOVA input is right there), never with a modifier, and
   * never while the lightbox is up — there, Escape is the only key with a job.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }
      if (zoomed) return;

      event.preventDefault();
      router.push(`/work/${event.key === "ArrowLeft" ? previous.slug : next.slug}`);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, previous.slug, next.slug, zoomed]);

  if (!card) return null;

  return (
    <div className="artifact" data-entered={bootComplete || undefined}>
      {/* --- Bar: back, and the position in the list --------------------- */}
      <header className="artifact-bar">
        <Link href="/work" className="artifact-back">
          <span aria-hidden>←</span> back
        </Link>

        <nav className="artifact-pager" aria-label="Projects">
          <Link
            href={`/work/${previous.slug}`}
            className="artifact-page-btn"
            aria-label={`Previous project — ${previous.name}`}
          >
            <span aria-hidden>←</span>
          </Link>
          <p className="artifact-count">
            <span>{String(position).padStart(2, "0")}</span> /{" "}
            {String(workCards.length).padStart(2, "0")}
          </p>
          <Link
            href={`/work/${next.slug}`}
            className="artifact-page-btn"
            aria-label={`Next project — ${next.name}`}
          >
            <span aria-hidden>→</span>
          </Link>
        </nav>
      </header>

      <div className="artifact-body">
        {/* --- The read ------------------------------------------------- */}
        <main className="artifact-main">
          <p className="artifact-tag" data-reveal style={cssIndex(0)}>
            <i aria-hidden />
            PROJ_{card.slug.replace(/-/g, "").toUpperCase()}
          </p>

          <h1 className="artifact-title" data-reveal style={cssIndex(1)}>
            {card.name}
          </h1>

          <p className="artifact-meta" data-reveal style={cssIndex(2)}>
            {study ? (
              <>
                {study.role}
                {/* Dropped where the date isn't known rather than printed as a
                    guess — see the note at the top of `case-studies.ts`. */}
                {study.timeline && (
                  <>
                    {" "}
                    <i aria-hidden>·</i> {study.timeline}
                  </>
                )}
              </>
            ) : (
              <>
                {card.category} <i aria-hidden>·</i> {card.tags.join(" · ")}
              </>
            )}
          </p>

          {/* --- Hero ---------------------------------------------------- */}
          <figure className="artifact-hero" data-reveal style={cssIndex(3)}>
            {/* The caption is a sibling of the button, not a child of it: the
                button is a fixed-ratio box with `overflow: hidden`, so a caption
                inside it can only ever sit *over* the image — and on a phone it
                belongs underneath. Out here it can do both. */}
            <span className="artifact-shot-wrap">
            <button
              type="button"
              className="artifact-shot"
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onPointerLeave={endHold}
              onClick={() => {
                // A tap on touch isn't the gesture; the hold above already
                // opened it if the visitor meant to.
                if (fromTouch.current && !held.current) return;
                setZoomed(true);
              }}
              aria-label={`Expand the ${card.name} screenshot`}
            >
              <Image
                src={`/projects/${card.image}`}
                alt={`${card.name} — screenshot`}
                fill
                sizes="(min-width: 1100px) 42rem, 92vw"
                priority
                className="artifact-shot-img"
              />
            </button>

            {/* Two wordings, because they are two different gestures. CSS
                picks, the same way the stage's like hint does. */}
            <span className="artifact-expand mono-label" aria-hidden>
              <span className="artifact-expand-click">Click to expand</span>
              <span className="artifact-expand-hold">Hold image to x-ray</span>
            </span>
            </span>

            {study?.confidential && (
              <figcaption className="artifact-locked">
                <span aria-hidden>🔒</span> internal product — visuals limited to
                what can be public.
              </figcaption>
            )}
          </figure>

          <p className="artifact-lede" data-reveal style={cssIndex(4)}>
            {study?.lede ?? card.blurb}
          </p>

          {study ? (
            <div className="artifact-sections">
              {/* 01 — left-bordered, the quiet opener. */}
              <Section no="01" title="Context" tone="rule" index={5}>
                <p>{study.sections.context}</p>
              </Section>

              {/* 02 — the tinted panel, because the problem is the point. */}
              <Section no="02" title="The problem" tone="panel" index={6}>
                <p>{study.sections.problem}</p>
              </Section>

              {/* 03 + 04 — side by side: what he did, and what it became. */}
              <div className="artifact-pair" data-reveal style={cssIndex(7)}>
                <Section no="03" title="Edwin's role" tone="card">
                  <p>{study.sections.contribution}</p>
                </Section>
                <Section no="04" title="The build" tone="card">
                  <p>{study.sections.build}</p>
                </Section>
              </div>

              <Section no="05" title="Key decisions" tone="card" index={8}>
                <ol className="artifact-decisions">
                  {study.sections.decisions.map((item, i) => (
                    <li key={item}>
                      <span className="artifact-decision-no" aria-hidden>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </Section>

              <Section no="06" title="Stack & constraints" tone="plain" index={9}>
                <ul className="artifact-chips">
                  {study.stack.map((tech) => (
                    <li className="artifact-chip" key={tech}>
                      {tech}
                    </li>
                  ))}
                </ul>
                <ul className="artifact-chips artifact-chips-quiet">
                  {study.sections.constraints.map((constraint) => (
                    <li className="artifact-chip" key={constraint}>
                      {constraint}
                    </li>
                  ))}
                </ul>
              </Section>

              {/* 07 — tinted again, closing the way it opened. */}
              <Section no="07" title="The outcome" tone="panel" index={10}>
                <p className="artifact-outcome">{study.sections.outcome}</p>
              </Section>
            </div>
          ) : (
            /* The nine that haven't been written yet. Honest about it rather
               than padded out with filler — every other part of the page (the
               hero, the glance, the stack, ASK NOVA, the pager) still works. */
            <p className="artifact-pending mono-label" data-reveal style={cssIndex(5)}>
              {"// case study in progress — ask NOVA in the meantime, she knows the shape of it."}
            </p>
          )}
        </main>

        {/* --- Sidebar --------------------------------------------------- */}
        <aside className="artifact-side">
          <section className="artifact-card" data-reveal style={cssIndex(3)}>
            <h2 className="mono-label artifact-card-head">At a glance</h2>
            <dl className="artifact-glance">
              <div>
                <dt>Role</dt>
                <dd>{study?.role ?? card.category}</dd>
              </div>
              {study?.timeline && (
                <div>
                  <dt>Timeline</dt>
                  <dd>{study.timeline}</dd>
                </div>
              )}
              {study?.glance && (
                <div>
                  <dt>{study.glance.label}</dt>
                  <dd className="artifact-glance-strong">{study.glance.value}</dd>
                </div>
              )}
              {!study && card.badge && (
                <div>
                  <dt>Status</dt>
                  <dd className="artifact-glance-strong">{card.badge}</dd>
                </div>
              )}
            </dl>

            {/* The two links that matter, where a live project has them. */}
            {(card.live || card.source) && (
              <div className="artifact-links">
                {card.live && (
                  <a
                    className="artifact-link artifact-link-primary"
                    href={card.live}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit live <span aria-hidden>↗</span>
                  </a>
                )}
                {card.source && (
                  <a
                    className="artifact-link"
                    href={card.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
            )}
          </section>

          <section className="artifact-card" data-reveal style={cssIndex(4)}>
            <h2 className="mono-label artifact-card-head">Stack</h2>
            <ul className="artifact-chips">
              {(study?.stack ?? card.tags).map((tech) => (
                <li className="artifact-chip" key={tech}>
                  {tech}
                </li>
              ))}
            </ul>
          </section>

          <AskNova slug={slug} index={5} />

          <Link
            href={`/work/${next.slug}`}
            className="artifact-next"
            data-reveal
            style={cssIndex(6)}
          >
            <span className="mono-label artifact-next-label">Next artifact</span>
            <span className="artifact-next-name">
              {next.name}
              <span aria-hidden>→</span>
            </span>
          </Link>
        </aside>
      </div>

      {zoomed && (
        <Lightbox
          src={`/projects/${card.image}`}
          name={card.name}
          onClose={() => setZoomed(false)}
        />
      )}

      {/* Kept off-screen rather than dropped: `hasStudy` is the server's answer
          and this is the client's, and a mismatch is a bug worth seeing in the
          DOM rather than never. */}
      {hasStudy !== Boolean(study) && (
        <p hidden data-artifact-mismatch>
          study mismatch for {slug}
        </p>
      )}
    </div>
  );
}

/** How long a touch has to rest on the hero before it opens. */
const HOLD_MS = 380;

/** Inline custom property that staggers the reveal transition per element. */
function cssIndex(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One numbered block.
 *
 * `tone` is the only thing that varies: a rule down the left, a tinted panel, a
 * bordered card, or nothing at all. Four treatments in a fixed order down the
 * page, so the read has a rhythm instead of being seven identical boxes.
 */
function Section({
  no,
  title,
  tone,
  index,
  children,
}: {
  no: string;
  title: string;
  tone: "rule" | "panel" | "card" | "plain";
  /** Omitted when a parent already carries the reveal (the 03/04 pair). */
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="artifact-section"
      data-tone={tone}
      data-reveal={index === undefined ? undefined : ""}
      style={index === undefined ? undefined : cssIndex(index)}
    >
      <h2 className="artifact-section-head mono-label">
        <span className="artifact-section-dot" aria-hidden />
        {no} <i aria-hidden>·</i> {title}
      </h2>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Lightbox                                                                    */
/* -------------------------------------------------------------------------- */

/** The hero, full size, over a dimmed page. Escape or the ✕ closes it. */
function Lightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      // Focus goes back where it came from — the hero button, so the page
      // doesn't jump to the top when the image closes.
      restoreTo.current?.focus?.();
    };
  }, [close]);

  return (
    <div
      className="artifact-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — full size`}
      onClick={close}
    >
      <button
        ref={closeRef}
        type="button"
        className="artifact-lightbox-close"
        onClick={close}
        aria-label="Close"
      >
        <span aria-hidden>✕</span>
      </button>

      {/* The image itself doesn't dismiss — only the backdrop around it. */}
      <div
        className="artifact-lightbox-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={src}
          alt={`${name} — screenshot, full size`}
          fill
          sizes="92vw"
          className="artifact-lightbox-img"
        />
      </div>
    </div>
  );
}
