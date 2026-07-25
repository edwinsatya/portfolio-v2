"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { SceneShell } from "@/components/stage/SceneShell";
import {
  career,
  projectsFor,
  workCards,
  type WorkCard,
  type WorkOrg,
} from "@/content/work";
import { novaGlance } from "@/lib/nova-bus";
import "./work.css";

/**
 * WORK — the career on her left, the shipped work on her right, NOVA between.
 *
 * The scene the whole site exists for, so it is the one that behaves most like
 * an application: the stage still doesn't scroll, but the project column does,
 * and the career column drives it. Selecting a role scrolls its first project
 * into view and quiets the rest, so "what did he do at Magloft" is one click
 * rather than a hunt.
 *
 * NOVA is not decoration in the middle of that. She stands between the two
 * columns and looks at whichever one is being used — a tilt to the left for the
 * career, a lean to the right for the list — which is why the reactions here go
 * through the bus rather than being animated locally: the stage owns her, and it
 * refuses a glance when she's tired, cross, or mid-gag.
 *
 * Below `lg` the three columns become one read, and Part C turns that into the
 * phone layout proper (snap-scrolling career, a featured card, compact rows).
 */

export function WorkScene() {
  /** The career stop being inspected, or `null` for "show me everything". */
  const [active, setActive] = useState<WorkOrg | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  const select = useCallback(
    (org: WorkOrg) => {
      const next = active === org ? null : org;
      setActive(next);
      // She looks at the column being worked. The stage decides whether she's
      // free to; a rapid click-through is swallowed by its own busy guard.
      novaGlance("left");

      if (!next) return;
      const first = projectsFor(next)[0];
      const el = first && cardRefs.current.get(first.slug);
      // Scroll the list rather than filter it: all ten stay reachable, and the
      // one being asked about is brought to the top of the column, where the
      // answer to "what did he do there" should obviously be.
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [active],
  );

  const matches = active ? projectsFor(active) : [];
  const activeStop = career.find((stop) => stop.org === active);
  /*
   * Only quiet the list when there is something to quiet it *for*.
   *
   * Two of the roles have nothing public attached, and dimming all ten to make
   * that point reads as the page breaking rather than as an answer — the note
   * above the list is the answer. So the cards are left alone and the visitor
   * keeps a readable list.
   */
  const filtering = matches.length > 0;

  return (
    <SceneShell side="full">
      <div className="work">
        {/* Lede. The breadcrumb and the intro share a line on desktop and
            stack on a phone. */}
        <header className="work-lede">
          <p className="work-crumb" data-reveal style={cssIndex(0)}>
            02 / WORK
          </p>
          <p className="work-intro" data-reveal style={cssIndex(1)}>
            Six years of shipped work — logistics, publishing, health, farming,
            and the web.
          </p>
        </header>

        <div className="work-cols">
          {/* ---------------------------------------------------------- */}
          {/* Career                                                      */}
          {/* ---------------------------------------------------------- */}
          <section className="work-career" data-reveal style={cssIndex(2)}>
            <div className="work-head">
              <h2 className="mono-label text-faint">Career</h2>
              <span className="mono-label work-head-count">
                {String(career.length).padStart(2, "0")}
              </span>
            </div>

            <ul className="work-career-list">
              {career.map((stop) => {
                const count = projectsFor(stop.org).length;
                return (
                  <li key={stop.org}>
                    <button
                      type="button"
                      className="work-stop"
                      data-active={stop.org === active || undefined}
                      data-current={stop.current || undefined}
                      onClick={() => select(stop.org)}
                      onMouseEnter={() => novaGlance("left")}
                      aria-pressed={stop.org === active}
                    >
                      <span className="work-stop-dot" aria-hidden />
                      <span className="work-stop-period mono-label">
                        {stop.from} — {stop.to}
                      </span>
                      <span className="work-stop-company">{stop.company}</span>
                      <span className="work-stop-title mono-label">
                        {stop.title}
                      </span>
                      {/* Only where there's something to open. A count on a
                          role with nothing public would read as a dead end. */}
                      {count > 0 && (
                        <span className="work-stop-count mono-label" aria-hidden>
                          {count} {count === 1 ? "project" : "projects"}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* The middle column is NOVA's. She's drawn on the fixed stage layer,
              so this is only the space kept clear for her. */}
          <div className="work-gap" aria-hidden />

          {/* ---------------------------------------------------------- */}
          {/* Selected work                                               */}
          {/* ---------------------------------------------------------- */}
          <section className="work-list" data-reveal style={cssIndex(3)}>
            <div className="work-head">
              <h2 className="mono-label text-faint">Selected work</h2>
              <span className="mono-label work-head-count">
                {String(workCards.length).padStart(2, "0")}
              </span>
            </div>

            {/* What the career selection did, said in words — otherwise a role
                with no public projects just looks like a click that failed. */}
            {activeStop && (
              <p className="work-filter mono-label" role="status">
                {matches.length > 0 ? (
                  <>
                    <span>{activeStop.company}</span> · {matches.length}{" "}
                    {matches.length === 1 ? "project" : "projects"} —{" "}
                    <button type="button" onClick={() => select(activeStop.org)}>
                      show all
                    </button>
                  </>
                ) : (
                  <>
                    <span>{activeStop.company}</span> · nothing public from this
                    one —{" "}
                    <button type="button" onClick={() => select(activeStop.org)}>
                      show all
                    </button>
                  </>
                )}
              </p>
            )}

            <ul className="work-cards" data-filtered={filtering || undefined}>
              {workCards.map((card) => (
                <li
                  key={card.slug}
                  ref={(el) => {
                    if (el) cardRefs.current.set(card.slug, el);
                    else cardRefs.current.delete(card.slug);
                  }}
                >
                  <WorkCardLink
                    card={card}
                    match={filtering ? card.org === active : undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </SceneShell>
  );
}

/** Inline custom property that staggers the reveal transition per element. */
function cssIndex(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

function WorkCardLink({
  card,
  /** `undefined` when nothing is selected; otherwise "is this one of theirs". */
  match,
}: {
  card: WorkCard;
  match?: boolean;
}) {
  return (
    <Link
      href={`/work/${card.slug}`}
      className="work-card"
      data-match={match === true || undefined}
      data-dim={match === false || undefined}
      onMouseEnter={() => novaGlance("right")}
    >
      <span className="work-card-shot">
        <Image
          src={`/projects/${card.image}`}
          alt=""
          fill
          sizes="(min-width: 1024px) 9rem, (min-width: 640px) 12rem, 6rem"
          className="work-card-img"
        />
      </span>

      <span className="work-card-body">
        <span className="work-card-head">
          <span className="work-card-kicker mono-label">
            <b>{card.no}</b> · {card.category}
          </span>
          {card.badge && (
            <span className="work-card-badge mono-label">{card.badge}</span>
          )}
        </span>

        <span className="work-card-name">{card.name}</span>
        <span className="work-card-blurb">{card.blurb}</span>

        <span className="work-card-tags" aria-hidden>
          {card.tags.map((tag) => (
            <span className="work-card-tag mono-label" key={tag}>
              {tag}
            </span>
          ))}
        </span>
      </span>

      <span className="work-card-arrow" aria-hidden>
        ↗
      </span>
    </Link>
  );
}
