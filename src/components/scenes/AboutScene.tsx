"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { trajectory } from "@/content/trajectory";
import { SceneShell } from "@/components/stage/SceneShell";
import { useBootComplete } from "@/hooks/useBootComplete";
import { useClassicSwitch } from "@/hooks/useClassicSwitch";
import { usePower } from "@/hooks/usePower";
import { celebrate, getBootComplete, openResume } from "@/lib/nova-bus";
import "./about.css";

/**
 * ABOUT — NOVA introduces Edwin.
 *
 * NOVA slides to the left third (the shift lives in `about.css`, keyed off the
 * `data-scene` the stage frame writes) and the content stacks in a right-hand
 * column. Around her float the badges *she* issued; along the bottom, a
 * trajectory ticker that opens the live resume at Experience.
 *
 * The scene owns three layers: the scrolling content column (children of the
 * shell), and a non-scrolling `overlay` for the left-region decoration — the
 * lede, the floating badges, the ticker. Below `lg` the overlay is hidden and
 * the same pieces reappear inline in the column, so the whole thing collapses
 * to a single stacked read on phones.
 */

/** Numbers count up from zero on first view. `suffix` rides along after. */
const STATS = [
  { target: 6, suffix: "+", label: "Years building" },
  { target: 10, suffix: "+", label: "Projects shipped" },
  { target: 5, suffix: "", label: "Teams" },
] as const;

type BadgeTone = "mint" | "violet" | "aws" | "love";

type BadgeDef = {
  id: string;
  /** Text that wraps the rim. Repeated to fill the circle. */
  rim: string;
  /** Big glyph in the middle. */
  emblem: string;
  /** Small word under the emblem. */
  caption: string;
  /** Tiny asterisked footnote, for the joke that needs a get-out. */
  sub?: string;
  /** Real credentials get a solid fill so they read as genuine among the gags. */
  real?: boolean;
  tone: BadgeTone;
  /** Scatter placement in the left region, and a resting tilt. */
  x: number;
  y: number;
  rot: number;
};

const BADGES: BadgeDef[] = [
  {
    id: "best-human",
    rim: "NOVA CERTIFIED · BEST HUMAN I KNOW · ",
    emblem: "★",
    caption: "CERTIFIED",
    tone: "mint",
    x: 4,
    y: 13,
    rot: -9,
  },
  {
    id: "hacktiv8",
    rim: "HACKTIV8 · FULL STACK GRADUATE · ",
    emblem: "H8",
    caption: "GRAD",
    real: true,
    tone: "violet",
    x: 39,
    y: 7,
    rot: 8,
  },
  {
    id: "aws",
    rim: "AWS · CERTIFIED SOLUTIONS ARCHITECT · ",
    emblem: "AWS",
    caption: "SA · ASSOCIATE",
    real: true,
    tone: "aws",
    x: 0,
    y: 45,
    rot: 6,
  },
  {
    id: "deadlines",
    rim: "SIX YEARS · NO MISSED DEADLINES · ",
    emblem: "6y",
    caption: "ON TIME",
    sub: "*that i know of",
    tone: "violet",
    x: 43,
    y: 41,
    rot: -7,
  },
  {
    id: "coffee",
    rim: "POWERED BY COFFEE & CURIOSITY · ",
    emblem: "∞",
    caption: "FUELED",
    tone: "love",
    x: 8,
    y: 69,
    rot: 7,
  },
  {
    id: "ships",
    rim: "SHIPS REAL THINGS · VERIFIED BY NOVA · ",
    emblem: "✓",
    caption: "VERIFIED",
    tone: "mint",
    x: 37,
    y: 67,
    rot: -9,
  },
];

export function AboutScene() {
  const bootComplete = useBootComplete();
  const power = usePower();
  const classic = useClassicSwitch();
  const dead = power.state === "dead";

  // Count-up runs once, on first view. Gated on boot so it doesn't tick away
  // behind the splash; a beat after, so it lands with the stagger rather than
  // ahead of it.
  const [counting, setCounting] = useState(false);
  useEffect(() => {
    if (!bootComplete) return;
    const timer = window.setTimeout(() => setCounting(true), 520);
    return () => window.clearTimeout(timer);
  }, [bootComplete]);

  // A presenting gesture on arrival — but only when navigating *in*. On a direct
  // load the boot sequence's own greeting wave already covers it, and two waves
  // in a row would read as a tic. `celebrate` is a no-op if she's tired or cross,
  // which is the right call: a flat robot doesn't gesture.
  useEffect(() => {
    if (!getBootComplete()) return;
    const timer = window.setTimeout(() => celebrate("wave"), 560);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <SceneShell
      side="right"
      /* Phones read this scene as one page rather than as a window scrolling
         inside a locked stage. See `.scene[data-flow="page"]` in globals.css. */
      flow="page"
      overlay={
        <div className="about-overlay" aria-hidden={false}>
          {/* Lede, top-left under the identity. */}
          <div className="about-lede" data-reveal style={cssIndex(0)}>
            <p className="about-crumb">03 / ABOUT</p>
            <p className="about-intro">
              The human behind me — six years turning small-town curiosity into
              software people rely on.
            </p>
          </div>

          {/* Badges she issued herself, scattered around her. */}
          <div className="about-badge-field">
            {BADGES.map((badge, i) => (
              <NovaBadge
                key={badge.id}
                badge={badge}
                scope="scatter"
                index={i}
              />
            ))}
          </div>
        </div>
      }
    >
      <div className="about-col" data-dead={dead || undefined}>
        {/* Reserve power. When the battery is flat NOVA goes dark — this is the
            one line that stays lit (its own colour, not a collapsing token), so
            the scene reads as "she's napping" rather than "the page broke". */}
        {dead && (
          <p className="about-offline" role="status">
            <span aria-hidden>◍</span> NOVA offline — running on reserve. Edwin&apos;s
            still here; plug her in to wake her.
          </p>
        )}

        {/* Phone-only breadcrumb — the desktop one lives in the overlay lede. */}
        <p className="about-crumb about-crumb-inline" data-reveal style={cssIndex(0)}>
          03 / ABOUT
        </p>

        <h2 className="about-name" data-reveal style={cssIndex(1)}>
          {profile.name}
          <span className="about-name-dot" aria-hidden>
            .
          </span>
        </h2>

        <p className="about-role" data-reveal style={cssIndex(2)}>
          Full-Stack Web Developer
          <i aria-hidden />
          {profile.location}
        </p>

        <p className="about-bio" data-reveal style={cssIndex(3)}>
          I&apos;m NOVA — the AI Edwin built to look after this place and talk to
          whoever wanders in. He&apos;s a full-stack developer from Lumajang
          who&apos;s been shipping for six years — logistics platforms,
          publishing tools, farm systems. Most of what I know, I learned from
          watching him work.
        </p>

        <div className="about-numbers" data-reveal style={cssIndex(4)}>
          <div className="about-numbers-head">
            <span className="mono-label text-faint">By the numbers</span>
            <span className="mono-label about-numbers-count">03</span>
          </div>

          <dl className="about-stats">
            {STATS.map((stat) => (
              <div className="about-stat" key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="about-stat-value">
                  <CountUp target={stat.target} run={counting} />
                  {stat.suffix}
                </dd>
                <p className="mono-label about-stat-label">{stat.label}</p>
              </div>
            ))}
          </dl>
        </div>

        <div className="about-manifesto" data-reveal style={cssIndex(5)}>
          <span className="mono-label about-manifesto-label">Manifesto</span>
          <p className="about-manifesto-body">
            He cares about both halves of the job — interfaces that feel right in
            the hand, and back ends that hold up when it matters. Lately
            he&apos;s been folding AI into everything. I&apos;m what that
            obsession looks like once it learns to talk.
          </p>
        </div>

        {/* Phone-only: badges become a snap-scroll row. Hidden on desktop, where
            the overlay scatters them around NOVA instead. */}
        <div className="about-badge-row" data-reveal style={cssIndex(6)}>
          {BADGES.map((badge, i) => (
            <NovaBadge key={badge.id} badge={badge} scope="row" index={i} />
          ))}
        </div>

        {/* Phone-only footer: the trajectory as static chips (no marquee on a
            small screen), and the classic-build access docked here at the end of
            the read rather than floating on the edge. Desktop uses the fixed
            bottom ticker and the edge ribbon instead. */}
        <div className="about-mobile-foot">
          <div className="about-traj-chips" data-reveal style={cssIndex(7)}>
            <span className="mono-label text-faint about-traj-label">
              Trajectory
            </span>
            <ul>
              {trajectory.map((stop) => (
                <li key={stop.year + stop.label}>
                  <button
                    type="button"
                    className="about-traj-chip"
                    onClick={() => openResume("resume-experience")}
                  >
                    <span className="about-traj-year">{stop.year}</span>
                    {stop.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="about-classic-link"
            data-loading={classic.loading || undefined}
            onClick={classic.start}
            data-reveal
            style={cssIndex(8)}
          >
            <span className="about-classic-mono" aria-hidden>
              E.
            </span>
            <span className="about-classic-text">
              {classic.loading
                ? "// loading classic build…"
                : "View the classic build"}
            </span>
            <span className="about-classic-v" aria-hidden>
              v1 ↗
            </span>
          </button>
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
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

function NovaBadge({
  badge,
  scope,
  index,
}: {
  badge: BadgeDef;
  scope: "scatter" | "row";
  index: number;
}) {
  // The rim path id has to be unique per rendered instance — the badge list is
  // rendered twice (scatter + row), so scope it.
  const pathId = `rim-${scope}-${badge.id}`;
  // Repeated so the text always wraps the whole circle; overflow past the path
  // end simply isn't drawn.
  const rimText = badge.rim.repeat(3);

  const style = {
    "--rot": `${badge.rot}deg`,
    "--delay": `${index * 0.4}s`,
    ...(scope === "scatter"
      ? { left: `${badge.x}%`, top: `${badge.y}%` }
      : {}),
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className="nova-badge"
      data-tone={badge.tone}
      data-real={badge.real ? "true" : undefined}
      style={style}
      aria-label={badge.rim.replace(/·/g, "").replace(/\s+/g, " ").trim()}
    >
      <svg className="nova-badge-ring" viewBox="0 0 100 100" aria-hidden>
        <circle className="nova-badge-disc" cx="50" cy="50" r="47" />
        <circle className="nova-badge-hoop" cx="50" cy="50" r="47" />
        <circle className="nova-badge-inner" cx="50" cy="50" r="34.5" />
        <defs>
          <path id={pathId} d="M50 9 a41 41 0 1 1 -0.01 0" fill="none" />
        </defs>
        <text className="nova-badge-rim">
          <textPath href={`#${pathId}`}>{rimText}</textPath>
        </text>
      </svg>

      <span className="nova-badge-center">
        <span className="nova-badge-emblem">{badge.emblem}</span>
        <span className="nova-badge-caption">{badge.caption}</span>
        {badge.sub && <span className="nova-badge-sub">{badge.sub}</span>}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Count-up                                                                    */
/* -------------------------------------------------------------------------- */

function CountUp({ target, run }: { target: number; run: boolean }) {
  const [value, setValue] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!run || done.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      done.current = true;
      return;
    }

    const DURATION = 1000;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / DURATION);
      // easeOutCubic — fast off the mark, settling onto the final figure.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(step);
      else done.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [run, target]);

  return <span className="tabular-nums">{value}</span>;
}
