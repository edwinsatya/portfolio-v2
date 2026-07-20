"use client";

import { useId } from "react";
import { useNovaMotion } from "@/hooks/useNovaMotion";
import "./nova.css";

/**
 * NOVA — the robot who introduces Edwin.
 *
 * Drawn entirely in SVG so there's no asset to load, nothing to fail, and every
 * part is addressable by CSS. `useNovaMotion` handles the gaze and blinking;
 * the class names here are the handles it moves.
 *
 * Anatomy, back to front: bloom, ground shadow, then a float wrapper holding
 * the body and a head group that pivots at the neck.
 */
export function Nova({ className = "" }: { className?: string }) {
  const ref = useNovaMotion();

  // Namespaced so a second NOVA on the page can't hijack the first one's
  // gradients — SVG ids are global to the document. Stripped down to characters
  // that are safe inside url(#…), since useId's format is React's to change.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${uid}-${name}`;

  return (
    <svg
      ref={ref}
      viewBox="0 0 240 264"
      className={`nova ${className}`}
      role="img"
      aria-label="NOVA, a small robot character whose eyes follow your cursor"
    >
      <defs>
        <linearGradient id={id("plate")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262f43" />
          <stop offset="1" stopColor="#0e121b" />
        </linearGradient>

        <linearGradient id={id("shell")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2432" />
          <stop offset="1" stopColor="#0b0f16" />
        </linearGradient>

        <linearGradient id={id("visor")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080b12" />
          <stop offset="1" stopColor="#03050a" />
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
      <ellipse cx="120" cy="132" rx="118" ry="128" fill={`url(#${id("bloom")})`} />

      <ellipse className="nova-shadow" cx="120" cy="252" rx="52" ry="7" />

      <g className="nova-float">
        <g className="nova-bob">
          <g className="nova-lean">
            {/* Detached arms, bobbing out of sync with the body. */}
            <rect
              className="nova-arm nova-plate"
              x="44"
              y="192"
              width="15"
              height="30"
              rx="7.5"
              fill={`url(#${id("shell")})`}
              strokeWidth="1.5"
            />
            <rect
              className="nova-arm nova-arm-right nova-plate"
              x="181"
              y="192"
              width="15"
              height="30"
              rx="7.5"
              fill={`url(#${id("shell")})`}
              strokeWidth="1.5"
            />

            {/* Torso. Kept clear of the head rather than almost touching it —
                everything on NOVA floats, so a visible gap reads deliberate
                where a hairline seam just looks like a mistake. */}
            <rect
              className="nova-plate"
              x="70"
              y="178"
              width="100"
              height="62"
              rx="28"
              fill={`url(#${id("shell")})`}
              strokeWidth="1.5"
            />
            <rect
              x="84"
              y="185"
              width="72"
              height="14"
              rx="7"
              fill="#fff"
              opacity="0.04"
            />
            <circle className="nova-lamp nova-glowing" cx="120" cy="209" r="9" />

            <g className="nova-head">
              {/* Antenna */}
              <path
                className="nova-stem"
                d="M120 50V34"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle className="nova-lamp nova-glowing" cx="120" cy="26" r="7" />

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
                x="64"
                y="56"
                width="112"
                height="26"
                rx="13"
                fill="#fff"
                opacity="0.05"
              />

              {/* Face plate */}
              <rect
                x="64"
                y="70"
                width="112"
                height="76"
                rx="34"
                fill={`url(#${id("visor")})`}
              />
              <g clipPath={`url(#${id("visor-clip")})`}>
                <path
                  d="M76 62h20L60 154H40z"
                  fill="#fff"
                  opacity="0.045"
                />
              </g>

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
              </g>

              <path
                className="nova-smile"
                d="M107 132q13 9 26 0"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Chin lamps */}
              <circle className="nova-lamp" cx="88" cy="157" r="2.5" opacity="0.55" />
              <circle className="nova-lamp" cx="152" cy="157" r="2.5" opacity="0.55" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
