"use client";

import { useEffect, useRef, useState } from "react";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { goToLegacy, SWITCH_DELAY_MS } from "@/lib/legacy";
import { novaBooted } from "@/lib/nova-bus";

/** Full boot, first visit. */
const FIRST_LINES = [
  "POWERING ON",
  "MOUNTING NOVA MEMORY",
  "CALIBRATING EYES",
  "READY",
];

const FIRST_MS = 2600;
const RETURN_MS = 900;

/**
 * The terminal-style boot screen that plays before the hero.
 *
 * Deliberately an overlay rather than a gate: the page underneath is fully
 * rendered and readable the whole time, so a visitor who skips — or whose JS
 * never runs — loses nothing. It also never blocks a deep link; anyone arriving
 * at `#projects` gets it dismissed immediately.
 *
 * Skipping is bound to pointer, key, scroll, and touch, because a splash you
 * can't dismiss is worse than no splash at all.
 */
export function BootSequence() {
  const { visit } = useNovaMemory();
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(FIRST_LINES[0]);
  /*
   * Which selector to draw. `pending` until memory says whether this is a first
   * visit, so a returning visitor never sees the full block flash before it
   * collapses into their one-liner.
   */
  const [mode, setMode] = useState<"pending" | "full" | "compact">("pending");
  /** Set once CLASSIC is taken: the overlay stays up and says why. */
  const [switching, setSwitching] = useState(false);
  const started = useRef(false);

  /*
   * The two exits, published for the buttons to call.
   *
   * Refs rather than state because they're defined inside the boot effect,
   * where the frame handle and the listeners they have to tear down live. The
   * markup only needs to be able to *call* them.
   */
  const finishRef = useRef<() => void>(() => {});
  const classicRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Wait for memory, so a returning visitor never sees the long version first.
    if (!visit.previous || started.current) return;
    started.current = true;

    const returning = visit.previous.visitCount > 0;
    const name = visit.name;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Anyone who arrived at a deep link wants that section, not a splash.
    const deepLinked =
      Boolean(window.location.hash) && window.location.hash !== "#intro";

    const lines = returning
      ? [name ? `RESUMING SESSION — WELCOME BACK, ${name.toUpperCase()}` : "RESUMING SESSION — WELCOME BACK", "READY"]
      : FIRST_LINES;

    // A returning visitor gets under a second of boot — a two-line menu they
    // can't finish reading would be worse than the one-liner that fits.
    setMode(returning ? "compact" : "full");

    const total = deepLinked ? 0 : reduced ? 400 : returning ? RETURN_MS : FIRST_MS;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      // `total` is 0 for a deep link, which lands on 1 immediately.
      const ratio = total <= 0 ? 1 : Math.min(1, elapsed / total);
      setProgress(Math.round(ratio * 100));
      // Step through the status lines in proportion to progress.
      setLine(lines[Math.min(lines.length - 1, Math.floor(ratio * lines.length))]);

      if (ratio >= 1) {
        setDone(true);
        delete document.documentElement.dataset.booting;
        novaBooted();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    document.documentElement.dataset.booting = "true";
    frame = requestAnimationFrame(tick);

    const finish = () => {
      cancelAnimationFrame(frame);
      setProgress(100);
      setDone(true);
      delete document.documentElement.dataset.booting;
      novaBooted();
    };
    finishRef.current = finish;

    /*
     * Takes the classic build.
     *
     * The overlay is deliberately left up: this is a full page load to another
     * origin, and finishing the boot first would flash a second of the site the
     * visitor just declined. The frame loop is cancelled so nothing completes
     * the boot out from under the redirect.
     */
    let switchTimer = 0;
    const chooseClassic = () => {
      if (switchTimer) return;
      cancelAnimationFrame(frame);
      setSwitching(true);
      switchTimer = window.setTimeout(goToLegacy, SWITCH_DELAY_MS);
    };
    classicRef.current = chooseClassic;

    /* A tap on either option is a choice, not a skip — the options handle
       themselves, and letting this through would dismiss the boot before the
       click ever reached CLASSIC. */
    const skip = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-boot-choice]")) {
        return;
      }
      finish();
    };

    // `1` is the only key the selector claims. Everything else — Enter
    // included — still skips into the flagship build, as it always has.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        finish();
        return;
      }
      if (event.key === "1") {
        chooseClassic();
        return;
      }
      finish();
    };

    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(switchTimer);
      delete document.documentElement.dataset.booting;
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [visit.previous, visit.name]);

  return (
    <div
      className="nova-boot"
      data-done={done}
      // Purely decorative chrome over content that's already present and
      // readable underneath — announcing it would just delay the real page.
      aria-hidden="true"
    >
      <div className="nova-boot-readout">
        <div className="nova-boot-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="nova-boot-status">
          <span>{String(progress).padStart(3, "0")}</span>
          <span>{line}</span>
        </div>

        {/* Sits under the bar for whatever is left of the boot — it rides the
            existing stages rather than adding one, so choosing nothing costs
            nothing. The buttons are `tabIndex={-1}` on purpose: the overlay is
            aria-hidden, so anything reachable by Tab in here would be focus
            landing on something a screen reader has been told isn't there.
            Keyboard visitors get `1` and Enter, which is what the block says,
            and the classic build stays reachable from `/v1` besides. */}
        {switching ? (
          <p className="boot-select-switching">
            {"// switching to classic build…"}
          </p>
        ) : mode === "full" ? (
          <div className="boot-select">
            <p className="boot-select-title">SELECT BUILD:</p>
            <button
              type="button"
              tabIndex={-1}
              data-boot-choice
              data-current="true"
              className="boot-option"
              onClick={() => finishRef.current()}
            >
              <span className="boot-option-mark">▸</span>
              <span className="boot-option-name">[ FLAGSHIP — NOVA v2 ]</span>
              <span className="boot-option-note">
                current · press enter or just wait
              </span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-boot-choice
              className="boot-option"
              onClick={() => classicRef.current()}
            >
              <span className="boot-option-mark" />
              <span className="boot-option-name">[ CLASSIC — v1 ]</span>
              <span className="boot-option-note">
                the previous portfolio · press 1
              </span>
            </button>
          </div>
        ) : mode === "compact" ? (
          <p className="boot-select" data-compact="true">
            build: FLAGSHIP ·{" "}
            <button
              type="button"
              tabIndex={-1}
              data-boot-choice
              className="boot-option-inline"
              onClick={() => classicRef.current()}
            >
              press 1 for classic
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
