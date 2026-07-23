"use client";

import { useId } from "react";
import type { NovaMood } from "@/content/profile";
import "./nova.css";

type NovaProps = {
  /** Drives the whole face. See the mood blocks in nova.css. */
  mood?: NovaMood;
  className?: string;
  ref?: React.Ref<SVGSVGElement>;
};

/**
 * NOVA — the robot who introduces Edwin.
 *
 * Purely presentational: it draws every part it could ever need and lets CSS
 * decide which are visible and how they move. All the motion — gaze, blinking,
 * waving, docking — is driven from `useNovaStage`, which owns the ref.
 *
 * Rigged like a puppet. Each limb is its own group with `transform-box:
 * view-box` and a `transform-origin` sitting exactly on its joint (see the
 * JOINTS table in nova.css), so a rotation swings from the shoulder or hip
 * rather than sliding the whole shape. Arms are two segments — upper arm, then
 * a forearm group pivoting at the elbow — which is what lets the wave bend
 * instead of rocking like a plank.
 *
 * Anatomy, back to front: bloom, ground shadow, legs, torso, arms, head. The
 * head geometry is untouched from the original design.
 */
export function Nova({ mood = "greeting", className = "", ref }: NovaProps) {
  // Namespaced so a second NOVA on the page can't hijack the first one's
  // gradients — SVG ids are global to the document. Stripped down to characters
  // that are safe inside url(#…), since useId's format is React's to change.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${uid}-${name}`;

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 320"
      data-mood={mood}
      className={`nova ${className}`}
      role="img"
      aria-label="NOVA, a small robot character whose eyes follow your cursor"
    >
      <defs>
        <linearGradient id={id("plate")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#5b6274" />
          <stop offset="0.28" stopColor="#2a2f3d" />
          <stop offset="0.72" stopColor="#171a24" />
          <stop offset="1" stopColor="#0b0d13" />
        </linearGradient>

        <linearGradient id={id("shell")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#4a5162" />
          <stop offset="0.3" stopColor="#222732" />
          <stop offset="0.75" stopColor="#141822" />
          <stop offset="1" stopColor="#0a0c11" />
        </linearGradient>

        <linearGradient id={id("limb")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#525a6d" />
          <stop offset="0.35" stopColor="#252b38" />
          <stop offset="1" stopColor="#0d1017" />
        </linearGradient>

        <linearGradient id={id("visor")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1017" />
          <stop offset="1" stopColor="#020409" />
        </linearGradient>

        <radialGradient id={id("bloom")}>
          <stop className="nova-bloom-start" offset="0" />
          <stop className="nova-bloom-end" offset="1" />
        </radialGradient>

        <clipPath id={id("visor-clip")}>
          <rect x="64" y="70" width="112" height="76" rx="34" />
        </clipPath>
      </defs>

      {/* Ambient light NOVA casts on the page behind her. */}
      <ellipse cx="120" cy="150" rx="120" ry="150" fill={`url(#${id("bloom")})`} />

      {/* Feet stay planted, so the shadow doesn't ride the breathing bob. */}
      <ellipse className="nova-shadow" cx="120" cy="303" rx="54" ry="7" />

      <g className="nova-lean">
        {/* ---- Legs. Planted; they take the body's sway, not the float. ---- */}
        <g className="nova-leg nova-leg-l">
          <rect
            className="nova-plate"
            x="92"
            y="246"
            width="21"
            height="44"
            rx="10.5"
            fill={`url(#${id("limb")})`}
            strokeWidth="1.5"
          />
          <rect
            className="nova-plate"
            x="84"
            y="284"
            width="37"
            height="17"
            rx="8.5"
            fill={`url(#${id("shell")})`}
            strokeWidth="1.5"
          />
        </g>

        <g className="nova-leg nova-leg-r">
          <rect
            className="nova-plate"
            x="127"
            y="246"
            width="21"
            height="44"
            rx="10.5"
            fill={`url(#${id("limb")})`}
            strokeWidth="1.5"
          />
          <rect
            className="nova-plate"
            x="119"
            y="284"
            width="37"
            height="17"
            rx="8.5"
            fill={`url(#${id("shell")})`}
            strokeWidth="1.5"
          />
        </g>

        {/* ---- Everything above the hips breathes together. ---- */}
        <g className="nova-float">
          <g className="nova-bob">
            {/* Arms sit behind the torso so the shoulder seam is hidden. */}
            <g className="nova-arm nova-arm-l">
              <g className="nova-arm-sway">
                <rect
                  className="nova-plate"
                  x="50"
                  y="188"
                  width="15"
                  height="38"
                  rx="7.5"
                  fill={`url(#${id("limb")})`}
                  strokeWidth="1.5"
                />
                <g className="nova-forearm nova-forearm-l">
                  <rect
                    className="nova-plate"
                    x="50"
                    y="216"
                    width="15"
                    height="34"
                    rx="7.5"
                    fill={`url(#${id("limb")})`}
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            </g>

            <g className="nova-arm nova-arm-r">
              <g className="nova-arm-sway">
                <rect
                  className="nova-plate"
                  x="175"
                  y="188"
                  width="15"
                  height="38"
                  rx="7.5"
                  fill={`url(#${id("limb")})`}
                  strokeWidth="1.5"
                />
                <g className="nova-forearm nova-forearm-r">
                  <rect
                    className="nova-plate"
                    x="175"
                    y="216"
                    width="15"
                    height="34"
                    rx="7.5"
                    fill={`url(#${id("limb")})`}
                    strokeWidth="1.5"
                  />
                </g>
              </g>
            </g>

            {/* ---- Torso ---- */}
            <g className="nova-torso">
              {/* Neck, drawn first so the torso's top edge covers the join. */}
              <rect
                className="nova-gloss"
                x="104"
                y="162"
                width="32"
                height="26"
                rx="11"
                fill="#171b25"
              />
              <rect
                className="nova-plate"
                x="70"
                y="178"
                width="100"
                height="72"
                rx="30"
                fill={`url(#${id("shell")})`}
                strokeWidth="1.5"
              />
              {/* Specular highlight. Classed for the same reason as the neck
                  above: it's flat paint sitting on the plate rather than part
                  of it, and the boot's wireframe takes the plate fills out
                  from under it. See `.nova-gloss` in nova.css. */}
              <rect
                className="nova-gloss"
                x="88"
                y="186"
                width="64"
                height="13"
                rx="6.5"
                fill="#fff"
                opacity="0.17"
              />
              <circle className="nova-lamp nova-glowing" cx="120" cy="215" r="9.5" />

              {/* The charging port. Her chest lamp already sits here, so the
                  socket is a ring around it rather than a new part — it only
                  becomes visible once there's a plug in play. */}
              <g className="nova-port" aria-hidden>
                <circle className="nova-port-ring" cx="120" cy="215" r="15" />
                <path
                  className="nova-port-bolt"
                  d="M122.5 206.5l-6 9h4.5l-3 8 6.5-9.5h-4.5z"
                />
              </g>
            </g>

            {/* ---- Head. Geometry unchanged from the original design. ---- */}
            <g className="nova-head">
              <g className="nova-antenna">
                <path
                  className="nova-stem"
                  d="M120 50V34"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle className="nova-lamp nova-glowing" cx="120" cy="26" r="7" />
              </g>

              {/* Ears */}
              <rect
                className="nova-plate"
                x="32"
                y="96"
                width="15"
                height="34"
                rx="7.5"
                fill={`url(#${id("shell")})`}
                strokeWidth="1.5"
              />
              <rect
                className="nova-plate"
                x="193"
                y="96"
                width="15"
                height="34"
                rx="7.5"
                fill={`url(#${id("shell")})`}
                strokeWidth="1.5"
              />

              {/* Skull */}
              <rect
                className="nova-plate"
                x="46"
                y="48"
                width="148"
                height="120"
                rx="46"
                fill={`url(#${id("plate")})`}
                strokeWidth="1.5"
              />
              <rect
                className="nova-gloss"
                x="62"
                y="56"
                width="116"
                height="24"
                rx="12"
                fill="#fff"
                opacity="0.2"
              />

              {/* Face plate. Classed for the boot sequence, which wireframes
                  it while she's unpowered and lights it as she wakes. */}
              <rect
                className="nova-visor"
                x="64"
                y="70"
                width="112"
                height="76"
                rx="34"
                fill={`url(#${id("visor")})`}
              />
              {/* Sheen across the visor, clipped to it. Same treatment as the
                  plate highlights: it's white paint on a fill that fades. */}
              <g clipPath={`url(#${id("visor-clip")})`}>
                <path
                  className="nova-gloss"
                  d="M76 62h22L58 154H36z"
                  fill="#fff"
                  opacity="0.07"
                />
              </g>

              {/* Every expression is drawn; CSS shows the one this mood wants. */}
              <g className="nova-eyes">
                <rect className="nova-eye" x="88" y="96" width="16" height="26" rx="8" />
                <rect
                  className="nova-eye"
                  x="136"
                  y="96"
                  width="16"
                  height="26"
                  rx="8"
                />

                <path
                  className="nova-eye-happy"
                  d="M87 114q9-14 18 0"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  className="nova-eye-happy"
                  d="M135 114q9-14 18 0"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                <path
                  className="nova-sparkle"
                  d="M74 78l2.2 5.8 5.8 2.2-5.8 2.2L74 94l-2.2-5.8L66 86l5.8-2.2z"
                />
                <path
                  className="nova-sparkle nova-sparkle-late"
                  d="M166 82l1.8 4.8 4.8 1.8-4.8 1.8-1.8 4.8-1.8-4.8-4.8-1.8 4.8-1.8z"
                />
              </g>

              <g className="nova-mouth">
                <path
                  className="nova-mouth-smile"
                  d="M107 132q13 9 26 0"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  className="nova-mouth-grin"
                  d="M103 130q17 15 34 0"
                  fill="none"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <path
                  className="nova-mouth-flat"
                  d="M110 134h20"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <ellipse className="nova-mouth-open" cx="120" cy="134" rx="7" ry="8.5" />
              </g>

              {/* Chin lamps */}
              <circle className="nova-lamp" cx="88" cy="157" r="2.5" opacity="0.55" />
              <circle className="nova-lamp" cx="152" cy="157" r="2.5" opacity="0.55" />

              {/* ---- Headphones. Drawn last so the band passes in front of
                   the antenna and the cups cover her ears, which is how a pair
                   actually sits. Inside `.nova-head`, so they ride her gaze
                   rather than needing to be animated after it. Hidden until
                   the music player opens — see `.nova-cans` in nova.css. ---- */}
              <g className="nova-cans" aria-hidden>
                <path
                  className="nova-cans-band"
                  d="M40 104C40 44 200 44 200 104"
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <rect
                  className="nova-cans-cup"
                  x="25"
                  y="88"
                  width="30"
                  height="52"
                  rx="14"
                />
                <rect
                  className="nova-cans-cup"
                  x="185"
                  y="88"
                  width="30"
                  height="52"
                  rx="14"
                />
                {/* The lit ring on each cup. Reads from `--nova-tint` like
                    every other glowing part of her, so it dims with the
                    battery instead of staying bright on a flat robot. */}
                <ellipse className="nova-cans-glow" cx="40" cy="114" rx="8" ry="17" />
                <ellipse className="nova-cans-glow" cx="200" cy="114" rx="8" ry="17" />
              </g>
            </g>

            {/* Steam, and the tick. Outside the head group so they hang in the
                air above her rather than swinging with her gaze — the same
                reason the sleep particles below are out here. Shown only once
                she's genuinely cross; see the temper block in nova.css. */}
            <g className="nova-cross" aria-hidden>
              <path
                className="nova-cross-mark"
                d="M196 40l16 16M212 40l-16 16"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                className="nova-steam"
                d="M52 44c-5-6 3-9-2-15"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                className="nova-steam nova-steam-late"
                d="M38 52c-5-6 3-9-2-15"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>

            {/* Sleep particles, shown only in critical. Outside the head group
                so they drift straight up rather than swinging with her gaze. */}
            <g className="nova-zzz" aria-hidden>
              <text className="nova-z" x="196" y="60">
                z
              </text>
              <text className="nova-z nova-z-mid" x="206" y="44">
                z
              </text>
              <text className="nova-z nova-z-late" x="216" y="30">
                z
              </text>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
