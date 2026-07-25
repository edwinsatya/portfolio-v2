"use client";

import { useEffect, useRef, useState } from "react";
import { getNovaPort } from "@/lib/nova-bus";
import { getPower, onCharged } from "@/lib/power";
import "./power-aura.css";

/**
 * The charging power-up — NOVA's fighting-game full-power aura.
 *
 * While the cable is connected she stands small in the lower-centre of a tall
 * pillar of energy — roughly two-and-a-half times her height — that whips into
 * sharp flame spikes, layered outer→mid→core from translucent edge to white-hot
 * heart, over a rippling shockwave pool on the floor. The colour charges toward
 * the final tier: ember-orange (0–20%) → gold (20–60%) → electric blue/white
 * (60–100%). At a full charge the whole pillar collapses inward and erupts.
 * Original styling — an energy-aura trope, no copyrighted character in it.
 *
 * Built like `PowerSocket`: one rAF loop owns everything continuous — the
 * pillar's placement and colour, the three animated flame silhouettes (their
 * `d` regenerated each frame so the spikes grow, split, and collapse), the
 * arcs, and the debris — writing DOM directly rather than through React,
 * because re-rendering a component sixty times a second to move a `<path>` is
 * the most expensive thing a page can do. React owns only the keyed one-shot
 * finale, the same way `PowerVoid` keys its toast.
 *
 * It tracks NOVA off the custom properties the stage loop already publishes on
 * the document root each frame (`--nova-head-x/y`, `--nova-foot-y`, plus
 * `--nova-pulse` and `--nova-tremble-x`), so it never measures the SVG.
 */

/** How long the 100% finale runs before the aura is left to dissipate. */
const FINALE_MS = 1400;
/** Aura fade when the cable comes out under a full charge. */
const DISSIPATE_MS = 640;
/** Cap on live arcs, so a full charge crackles hard without unbounded DOM. */
const MAX_BOLTS = 8;
/** Fragments that lift off the ground and travel up through the aura. */
const DEBRIS_COUNT = 6;
/** Points sampled per flame silhouette. Capped for performance. */
const FLAME_POINTS = 58;

const SVG_NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

type Rgb = [number, number, number];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];
const rgb = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
const WHITE: Rgb = [255, 255, 255];

/**
 * The aura's primary colour at a given charge.
 *
 * Ember-orange while she's barely alive, warming through gold, then tipping
 * hard into electric blue over the top third — the blue is the *final* tier,
 * the thing the charge builds toward, so the stops linger in warm territory and
 * cross over late.
 */
const STOPS: ReadonlyArray<[number, Rgb]> = [
  [0.0, [255, 92, 22]],
  [0.2, [255, 122, 32]],
  [0.5, [255, 190, 66]],
  [0.6, [255, 208, 116]],
  [0.78, [86, 176, 255]],
  [1.0, [64, 148, 255]],
];

function primaryRgb(frac: number): Rgb {
  const p = clamp(frac, 0, 1);
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (p <= p1) {
      const [p0, c0] = STOPS[i - 1];
      return mix(c0, c1, (p - p0) / (p1 - p0));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** Reads a unitless px custom property the stage loop publishes on the root. */
function readVar(name: string): number {
  return parseFloat(document.documentElement.style.getPropertyValue(name));
}

/**
 * One flame silhouette, as an SVG path in the 100×200 viewBox space.
 *
 * A closed radial star around a low focus, biased hard upward so it reads as a
 * pillar rather than a halo: the radius is long toward the top, medium at the
 * sides, short at the base. The spikes are three detuned sines raised to a
 * power — sharpening the lobes into pointed tongues — with the phases advancing
 * in time so they whip, and their amplitude weighted toward the top and sides
 * so the crown bristles and the base flares. `radScale`/`ampScale` inset the
 * mid and core layers so all three speak the same jagged language.
 */
function buildFlame(
  t: number,
  seed: number,
  radScale: number,
  ampScale: number,
): string {
  const cx = 50;
  const cyF = 158;
  let d = "";
  for (let i = 0; i <= FLAME_POINTS; i++) {
    const a = (i / FLAME_POINTS) * TAU;
    const dirx = Math.sin(a);
    const diry = -Math.cos(a); // a = 0 → straight up
    const up = diry < 0 ? -diry : 0;
    const down = diry > 0 ? diry : 0;
    const side = Math.abs(dirx);

    const base = (30 + up * 92 + side * 15 - down * 4) * radScale;
    const n =
      Math.sin(a * 11 + t * 2.1 + seed) * 0.5 +
      Math.sin(a * 19 - t * 3.3 + seed * 1.7) * 0.3 +
      Math.sin(a * 31 + t * 1.6 + seed * 2.3) * 0.2;
    const sp = Math.pow((n + 1) / 2, 2.3);
    const amp = (0.3 + up + side * 0.4) * ampScale;
    const r = base * (1 + sp * amp * 0.55);

    const x = cx + dirx * r * 0.8; // compress x a little → a vertical pillar
    const y = cyF + diry * r;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

type FinaleAt = { id: number; x: number; y: number; top: number };

export function PowerAura() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<SVGPathElement>(null);
  const midRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);
  const boltsRef = useRef<SVGGElement>(null);
  const debrisRef = useRef<HTMLDivElement>(null);

  const [finale, setFinale] = useState<FinaleAt | null>(null);

  /* The 100% finale — fired once by the store when the charge tops out. */
  useEffect(() => {
    let clear = 0;
    const off = onCharged(() => {
      const port = getNovaPort();
      const id = performance.now();
      setFinale({ id, x: port.x, y: port.y, top: readVar("--nova-head-y") });
      window.clearTimeout(clear);
      clear = window.setTimeout(() => setFinale(null), FINALE_MS + 200);
    });
    return () => {
      off();
      window.clearTimeout(clear);
    };
  }, []);

  /* The continuous aura, arcs, and debris. */
  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const outer = outerRef.current;
    const midEl = midRef.current;
    const inner = innerRef.current;
    const bolts = boltsRef.current;
    const debrisHost = debrisRef.current;
    if (!root || !body || !outer || !midEl || !inner || !bolts || !debrisHost) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Fragments, made once and positioned every frame. Each keeps a horizontal
    // offset, a size, and a phase so they don't rise in lockstep.
    const pebbles = Array.from({ length: DEBRIS_COUNT }, (_, i) => {
      const el = document.createElement("i");
      el.className = "power-aura-pebble";
      debrisHost.appendChild(el);
      const dir = i % 2 === 0 ? 1 : -1;
      return {
        el,
        off: dir * (0.04 + Math.random() * 0.24),
        size: 2.5 + Math.random() * 3,
        phase: Math.random() * TAU,
        rate: 900 + Math.random() * 900,
        rise: 0.5 + Math.random() * 0.5,
      };
    });
    pebbles.forEach((p) => {
      p.el.style.width = `${p.size}px`;
      p.el.style.height = `${p.size}px`;
    });

    let presence = 0;
    let finaleAt = -Infinity;
    let boltCooldown = 0;
    let lastNow = performance.now();
    let live = 0;
    let frame = 0;

    const offCharged = onCharged(() => {
      finaleAt = performance.now();
    });

    /** One jagged arc across the aura surface, plus a spark off a kink. */
    const spawnBolt = (
      cx: number,
      cy: number,
      h: number,
      colour: string,
      frac: number,
    ) => {
      if (live >= MAX_BOLTS) return;
      const ang = Math.random() * TAU;
      // Reach out toward the aura's spikes — an upward-biased ellipse, so most
      // arcs crackle across the pillar's surface rather than only on her body.
      const rx = h * (0.28 + Math.random() * 0.2);
      const ry = h * (0.5 + Math.random() * 0.55);
      const x = cx + Math.cos(ang) * rx;
      const y = cy - Math.abs(Math.sin(ang)) * ry * 0.7 - ry * 0.15;

      const steps = 3 + Math.floor(Math.random() * 2);
      const len = h * (0.12 + Math.random() * 0.16);
      const nx = Math.cos(ang);
      const ny = Math.sin(ang);
      const px = -ny;
      const py = nx;
      let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      const kinks: Array<[number, number]> = [];
      for (let s = 1; s <= steps; s++) {
        const along = (len / steps) * s;
        const jag = (Math.random() - 0.5) * h * 0.1;
        const kx = x + nx * along + px * jag;
        const ky = y + ny * along + py * jag;
        d += ` L ${kx.toFixed(1)} ${ky.toFixed(1)}`;
        kinks.push([kx, ky]);
      }

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "power-aura-bolt");
      path.style.stroke = colour;
      const life = 100 + Math.random() * 100;
      path.style.animationDuration = `${life}ms`;
      bolts.appendChild(path);
      live++;
      window.setTimeout(() => {
        path.remove();
        live--;
      }, life + 40);

      if (kinks.length && Math.random() < 0.4 + frac * 0.5) {
        const [sx, sy] = kinks[Math.floor(Math.random() * kinks.length)];
        const spark = document.createElementNS(SVG_NS, "circle");
        spark.setAttribute("cx", sx.toFixed(1));
        spark.setAttribute("cy", sy.toFixed(1));
        spark.setAttribute("r", (0.8 + Math.random() * 1.5).toFixed(1));
        spark.setAttribute("class", "power-aura-spark");
        spark.style.fill = colour;
        spark.style.animationDuration = `${life}ms`;
        bolts.appendChild(spark);
        live++;
        window.setTimeout(() => {
          spark.remove();
          live--;
        }, life + 40);
      }
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(64, now - lastNow);
      lastNow = now;

      const power = getPower();
      const charging = power.charging;
      const frac = clamp(power.level / 100, 0, 1);
      const isReduced = reduced.matches;
      const inFinale = now - finaleAt < FINALE_MS;

      // Presence: rises fast on connect; dissipates over ~640ms on a plain
      // disconnect, or is driven by the finale's scripted pop at 100%.
      if (inFinale) {
        const ft = (now - finaleAt) / FINALE_MS;
        presence = ft < 0.16 ? 1 : 1 - ease((ft - 0.16) / 0.84);
      } else if (charging) {
        presence += (1 - presence) * Math.min(1, dt / 120);
      } else {
        presence = Math.max(0, presence - dt / DISSIPATE_MS);
      }

      const on = presence > 0.004;
      if (root.dataset.on !== String(on)) root.dataset.on = String(on);
      if (!on) {
        root.style.setProperty("--aura-presence", "0");
        return;
      }

      const cx = readVar("--nova-head-x");
      const topY = readVar("--nova-head-y");
      const footY = readVar("--nova-foot-y");
      if (!Number.isFinite(cx) || !Number.isFinite(topY) || !Number.isFinite(footY)) {
        return;
      }
      const h = Math.max(1, footY - topY);

      // Colour tiers derived from one primary, published on the root so NOVA's
      // own visor/lamp glow can share the mid/core (see nova.css).
      const prim = primaryRgb(frac);
      const outerC = rgb(mix(prim, WHITE, 0.22));
      const midC = rgb(prim);
      const coreC = rgb(mix(prim, WHITE, 0.8));
      const rimC = rgb(mix(prim, WHITE, 0.52));
      const rs = document.documentElement.style;
      rs.setProperty("--aura-outer", outerC);
      rs.setProperty("--aura-mid", midC);
      rs.setProperty("--aura-core", coreC);
      rs.setProperty("--aura-rim", rimC);
      rs.setProperty("--nova-aura", midC);
      rs.setProperty("--nova-aura-hot", coreC);

      const pulse = readVar("--nova-pulse") || 0;

      // Strength folds presence with charge and the surge pulse, floored so the
      // pillar always reads once it's up rather than fading to invisibility.
      const strengthRaw = presence * (0.45 + frac * 0.55) * (1 + pulse * 0.5);
      const strength = presence > 0.5 ? Math.max(0.5, strengthRaw) : strengthRaw;

      // A quick collapse at the top of the finale, then the eruption outward.
      let contract = 1;
      if (inFinale) {
        const ft = (now - finaleAt) / FINALE_MS;
        contract =
          ft < 0.16
            ? lerp(1, 0.42, ease(ft / 0.16))
            : lerp(0.42, 1.2, ease((ft - 0.16) / 0.3));
      }
      // Surge: the whole pillar flares 10–15% bigger for a beat on each pulse.
      // A scale change, never a flash — well under three a second.
      const scale = (0.94 + frac * 0.16 + pulse * 0.14) * contract;

      root.style.setProperty("--aura-presence", presence.toFixed(3));
      root.style.setProperty("--aura-strength", strength.toFixed(3));
      root.style.setProperty("--aura-frac", frac.toFixed(3));
      body.style.setProperty("--aura-h", `${h.toFixed(1)}px`);
      body.style.setProperty("--aura-scale", scale.toFixed(3));
      // Pillar box: ~1.5× her height wide (~2× her body width), ~2.4× tall,
      // base at her feet.
      body.style.setProperty("--aura-w", `${(h * 1.5).toFixed(1)}px`);
      body.style.setProperty("--aura-tall", `${(h * 2.4).toFixed(1)}px`);
      body.style.transform = `translate(${cx.toFixed(1)}px, ${footY.toFixed(
        1,
      )}px) translate(-50%, -100%)`;

      /* --- Flame silhouettes ----------------------------------------- */
      // Regenerated each frame so the spikes whip; frozen under reduced motion,
      // where CSS shows the static core glow instead and these are hidden.
      if (!isReduced) {
        const t = now / 1000;
        outer.setAttribute("d", buildFlame(t, 0.4, 1, 1));
        midEl.setAttribute("d", buildFlame(t, 0.4, 0.82, 0.85));
        inner.setAttribute("d", buildFlame(t, 0.4, 0.6, 0.6));
      }

      /* --- Lightning across the surface ------------------------------ */
      if (!isReduced && charging && power.level > 4) {
        const cyMid = footY - h * 0.55;
        boltCooldown -= dt;
        if (boltCooldown <= 0) {
          spawnBolt(cx, cyMid, h, rimC, frac);
          if (frac > 0.85 && Math.random() < 0.6) spawnBolt(cx, cyMid, h, coreC, frac);
          boltCooldown = lerp(680, 85, frac) * (0.6 + Math.random() * 0.7);
        }
      }

      /* --- Debris rising through the aura ---------------------------- */
      const ground = footY - 2;
      const maxLift = h * 0.62;
      for (const p of pebbles) {
        if (isReduced) {
          p.el.style.opacity = "0";
          continue;
        }
        // A slow climb looping from the ground up through the pillar, faster
        // the fuller she is; dropped to the floor the instant the cable is out.
        const climb = charging
          ? ((now / (p.rate * (1.6 - frac)) + p.phase) % 1)
          : 0;
        const x = cx + p.off * h + Math.sin(now / 300 + p.phase) * 3 * frac;
        const y = charging ? ground - climb * maxLift * p.rise : ground;
        p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        // Fade in off the floor, out near the top of its climb.
        const vis = charging ? Math.sin(climb * Math.PI) : 0;
        p.el.style.opacity = (presence * vis).toFixed(2);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      offCharged();
      pebbles.forEach((p) => p.el.remove());
      bolts.replaceChildren();
    };
  }, []);

  // Ground-pool rings and rising streaks are pure CSS; a fixed count so the
  // markup never changes and the layer count stays capped.
  const rings = [0, 1, 2];
  const streaks = [0, 1, 2, 3];

  return (
    <div className="power-aura" aria-hidden ref={rootRef} data-on="false">
      {/* Behind everything: a faint vignette that tints the page so the pillar
          reads against it. */}
      <div className="power-aura-vignette" />

      {/* Behind NOVA: the pillar. */}
      <div className="power-aura-back">
        <div className="power-aura-body" ref={bodyRef}>
          <div className="power-aura-inner">
            {/* The rippling shockwave pool on the floor. */}
            <div className="power-aura-pool">
              {rings.map((i) => (
                <span
                  key={i}
                  className="power-aura-pool-ring"
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </div>

            {/* White-hot heart hugging her silhouette. */}
            <span className="power-aura-core" />

            {/* The three flame layers, outer → mid → core. */}
            <svg
              className="power-aura-svg"
              viewBox="0 0 100 200"
              preserveAspectRatio="none"
            >
              <path className="power-aura-layer power-aura-outer" ref={outerRef} />
              <path className="power-aura-layer power-aura-mid" ref={midRef} />
              <path className="power-aura-layer power-aura-innermost" ref={innerRef} />
            </svg>

            {/* Internal energy streaks racing from base to tip. */}
            <div className="power-aura-streaks">
              {streaks.map((i) => (
                <span
                  key={i}
                  className="power-aura-streak"
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* In front of NOVA: arcs, sparks, debris, and the finale. */}
      <div className="power-aura-fore">
        <svg className="power-aura-bolts">
          <g ref={boltsRef} />
        </svg>
        <div className="power-aura-debris" ref={debrisRef} />

        {finale && (
          <div
            key={finale.id}
            className="power-aura-finale"
            style={
              {
                "--fx": `${finale.x}px`,
                "--fy": `${finale.y}px`,
                "--ftop": `${finale.top}px`,
              } as React.CSSProperties
            }
          >
            <span className="power-aura-burst" />
            <span className="power-aura-ring" />
            <p className="power-aura-max">{"// POWER LEVEL: MAXIMUM"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
