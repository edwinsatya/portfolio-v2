"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onNoPower } from "@/lib/nova-bus";
import { batteryCells, batteryUrgency, LOW_AT, onPowerEvent } from "@/lib/power";
import { usePower } from "@/hooks/usePower";
import "./power.css";

/**
 * How long "· REBOOTING ·" holds after the spark.
 *
 * Just past the 1300ms visor flicker, and short of the ~1.6s a charge takes to
 * climb from 1% to 5% — so the label is gone by the time she's out of the
 * barely-alive band and it never sits over a robot that has started stretching.
 */
const REBOOT_MS = 1500;
/** The refusal toast. Long enough to read four characters, no longer. */
const TOAST_MS = 1500;
/** Stagger between the feature-unlock pings, and how long each one holds. */
const PING_STEP_MS = 320;
const PING_MS = 1600;

/** In the order they come back — the same order the locks lift. */
const UNLOCKED = ["terminal online", "audio online", "reactions online"];

/**
 * The dark she dies into, and the labels that live in it.
 *
 * Deliberately not a scrim over the page: the dimming is done by the token
 * blocks in `globals.css`, which is what lets NOVA, the charger, and the battery
 * readout stay bright by simply naming their own colours. What's left for this
 * layer is the vignette — the tunnel that pulls the eye to the middle of the
 * screen — plus the labels, which belong to no component in particular.
 *
 * Two fixed layers rather than one, at different depths. The vignette sits under
 * NOVA's stage so it can never darken her; the text sits above the nav so it is
 * never printed underneath a phone's tab bar. One layer could only be in one of
 * those two places.
 */
export function PowerVoid() {
  const power = usePower();
  const [rebooting, setRebooting] = useState(false);
  /** The live toast, identified so a stale timer can't clear a newer one. */
  const [toast, setToast] = useState<number | null>(null);
  const [pings, setPings] = useState<string[]>([]);

  // One bag of timeouts for every sequence here, cleared together on unmount —
  // the alternative is four refs that all have to be cancelled correctly.
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const bag = timers.current;
    return () => {
      bag.forEach(window.clearTimeout);
      bag.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(
    () =>
      onPowerEvent((event) => {
        if (event === "spark") {
          setRebooting(true);
          later(() => setRebooting(false), REBOOT_MS);
          return;
        }

        // Back over the battery-saver line: the locks lift, and each one says
        // so. Staggered rather than announced at once, because "features unlock
        // one by one" is the payoff — a single line saying everything works
        // again would be a receipt, not a reboot.
        if (event === "revived") {
          setPings([]);
          UNLOCKED.forEach((label, index) => {
            later(
              () => setPings((current) => [...current, label]),
              index * PING_STEP_MS,
            );
            // FIFO: they're added in order and held for the same beat, so
            // dropping the oldest always drops the one whose time is up.
            later(
              () => setPings((current) => current.slice(1)),
              index * PING_STEP_MS + PING_MS,
            );
          });
        }
      }),
    [later],
  );

  useEffect(
    () =>
      onNoPower(() => {
        const id = performance.now();
        setToast(id);
        later(
          () => setToast((current) => (current === id ? null : current)),
          TOAST_MS,
        );
      }),
    [later],
  );

  const dead = power.state === "dead";

  /*
   * The phone's low-power battery chip.
   *
   * On phones the in-flow readout sits top-left under the identity — the exact
   * corner the vignette closes over first — so from the moment the page starts
   * dimming (`state` leaves `normal`, i.e. ≤20% or dead) it hands the number to
   * this chip. It rides this layer, above the vignette and the tab bar, which is
   * what keeps a red "0%" full-contrast against the heaviest dark. Phones only
   * in CSS; the desktop readout is centre-bottom and never loses the corner.
   */
  const chipUrgency = batteryUrgency(power.level, power.charging);
  const showChip = power.state !== "normal";

  /*
   * How far the dark has closed in, 0–1.
   *
   * A curve rather than a ramp, so the vignette is barely there through the
   * tired band and shuts fast over the last few percent — which is also what
   * makes charging back out of it read as the room lighting up rather than as a
   * slider moving. Zero at and above 20%, where battery saver ends, so a healthy
   * page never pays for this at all.
   */
  const closing = Math.max(0, Math.min(1, (LOW_AT - power.level) / LOW_AT));
  const depth = closing ** 2.6;

  return (
    <>
      <div
        aria-hidden
        className="power-void"
        data-on={depth > 0.01}
        style={{ "--power-void": depth.toFixed(3) } as React.CSSProperties}
      />

      <div className="power-void-ui">
        {/* Under her feet, tracking the position the stage loop publishes each
            frame. Not a caption on the page — a label on her. */}
        <p className="power-tag" data-show={dead || rebooting} aria-hidden>
          {rebooting ? "· rebooting ·" : "· powered off ·"}
        </p>

        {/* Keyed by the toast's id, so a second refusal replays the animation
            instead of landing on a live region whose text hasn't changed. */}
        {toast !== null && (
          <p key={toast} className="power-toast" role="status">
            {"// no power"}
          </p>
        )}

        <ul className="power-pings" aria-hidden>
          {pings.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>

        <div
          className="battery-chip"
          data-batt={chipUrgency}
          data-show={showChip}
          aria-hidden
        >
          {power.charging && <span className="stage-status-bolt">⚡</span>}
          {batteryCells(power.level)} {power.level}%
          {chipUrgency === "critical" && (
            <span className="battery-low-tag">⚠ Low power</span>
          )}
        </div>
      </div>
    </>
  );
}
