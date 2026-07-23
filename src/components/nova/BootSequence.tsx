"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/profile";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { goToLegacy, SWITCH_DELAY_MS } from "@/lib/legacy";
import { novaBooted } from "@/lib/nova-bus";

/**
 * The POST log, first visit.
 *
 * Long enough to fill the opening stage at a readable pace — a boot that prints
 * three lines and then sits there for eight seconds is dead air, and dead air is
 * what makes a splash feel like a loading screen. The project count is read off
 * the real list so the line can't quietly go stale.
 */
const FIRST_POST = [
  "POWERING ON",
  "MOUNTING NOVA MEMORY",
  "LOADING HUMOUR MODULE",
  `INDEXING ${projects.length} SHIPPED PROJECTS`,
  "WARMING UP WAVE SERVOS",
  "CALIBRATING EYES",
];

/**
 * How the boot spends its time.
 *
 * Held as weights rather than absolute times: a returning visitor's boot runs
 * the same four stages in 3s, and reading the split off one table means the two
 * can't drift apart. `FIRST_MS` is the sum, and the bar paces to the whole of
 * it rather than to any one stage.
 */
const STAGES = [
  /** POST lines printing. */
  { id: "post", ms: 2500 },
  /** Wireframe, and the build selector — the stage that asks something. */
  { id: "select", ms: 4500 },
  /** She powers on: flicker, visor, body. */
  { id: "wake", ms: 2000 },
  /** ALL SYSTEMS NOMINAL, the wave, and the dissolve. */
  { id: "nominal", ms: 1000 },
] as const;

type Stage = (typeof STAGES)[number]["id"];

const FIRST_MS = STAGES.reduce((total, stage) => total + stage.ms, 0);
const RETURN_MS = 3000;

/** Cumulative end of each stage as a fraction of the boot, in order. */
const STAGE_ENDS = STAGES.map(
  (_, i) =>
    STAGES.slice(0, i + 1).reduce((total, s) => total + s.ms, 0) / FIRST_MS,
);

const stageAt = (ratio: number): Stage =>
  STAGES[STAGE_ENDS.findIndex((end) => ratio < end)]?.id ?? "nominal";

/** What the status line reads once the POST log has finished printing. */
const STAGE_LABEL: Record<Stage, string> = {
  post: "",
  select: "SELECT BUILD",
  wake: "POWERING NOVA",
  nominal: "ALL SYSTEMS NOMINAL",
};

/**
 * Boot time the selector can borrow while the pointer rests on it.
 *
 * Hovering the options is someone reading them, and running the clock out from
 * under a decision would be the one moment this screen actually cost them
 * something. Capped rather than open-ended: a pointer parked over the block —
 * or left there by a visitor who wandered off — must not hang the splash.
 */
const GRACE_MS = 4000;

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
  const [stage, setStage] = useState<Stage>("post");
  /** The POST log, and how much of it has printed. */
  const [post, setPost] = useState<string[]>(FIRST_POST);
  const [printed, setPrinted] = useState(0);
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

  /** True while the pointer rests on the selector. Read by the frame loop. */
  const holdRef = useRef(false);

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

    const log = returning
      ? [name ? `RESUMING SESSION — WELCOME BACK, ${name.toUpperCase()}` : "RESUMING SESSION — WELCOME BACK"]
      : FIRST_POST;
    setPost(log);

    // A returning visitor gets three seconds — a two-line menu they can't
    // finish reading would be worse than the one-liner that fits.
    setMode(returning ? "compact" : "full");

    const total = deepLinked ? 0 : reduced ? 400 : returning ? RETURN_MS : FIRST_MS;
    let frame = 0;

    /*
     * She powers on with the readout rather than after it, so the last stages
     * have something to show. Skipped under reduced motion, where the boot is
     * over in 400ms and a flicker would be a strobe rather than a stage.
     */
    const staged = !reduced && total > 0;
    const setStageAttr = (next: Stage) => {
      setStage(next);
      if (staged) document.documentElement.dataset.bootStage = next;
    };

    /* Her power-on animations are timed off the wake stage rather than written
       as fixed durations, so the returning visitor's shorter boot doesn't cut
       the flicker off halfway through. */
    if (staged) {
      const wake = STAGES.find((s) => s.id === "wake")!.ms * (total / FIRST_MS);
      document.documentElement.style.setProperty("--boot-wake-ms", `${wake}ms`);
    }

    /*
     * The wave, and everything else waiting on the boot.
     *
     * Fired when NOMINAL comes up rather than when the overlay goes, so her
     * hello plays *during* the dissolve — the last second is her waking up and
     * waving through it, not a blank screen followed by a wave. Idempotent: a
     * skip lands here too, and the music widget's entrance is on the same
     * event, so a second call would run it twice.
     */
    let booted = false;
    const fireBooted = () => {
      if (booted) return;
      booted = true;
      novaBooted();
    };

    let last = performance.now();
    // Boot time served, and reading time the selector may still borrow.
    let elapsed = 0;
    let grace = GRACE_MS;

    /** The overlay's own exit, shared by the clock running out and by a skip. */
    const complete = () => {
      cancelAnimationFrame(frame);
      setDone(true);
      delete document.documentElement.dataset.booting;
      delete document.documentElement.dataset.bootStage;
      document.documentElement.style.removeProperty("--boot-wake-ms");
      fireBooted();
    };

    const tick = (now: number) => {
      const delta = now - last;
      last = now;

      // Hovering the selector spends the grace budget instead of the boot.
      if (holdRef.current && grace > 0) grace -= delta;
      else elapsed += delta;

      // `total` is 0 for a deep link, which lands on 1 immediately.
      const ratio = total <= 0 ? 1 : Math.min(1, elapsed / total);
      setProgress(Math.round(ratio * 100));

      const next = stageAt(ratio);
      setStageAttr(next);
      if (next === "nominal") fireBooted();

      // The log prints across the first stage, whatever that stage is worth.
      const through = Math.min(1, ratio / STAGE_ENDS[0]);
      setPrinted(Math.max(1, Math.ceil(through * log.length)));

      if (ratio >= 1) {
        complete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    document.documentElement.dataset.booting = "true";
    frame = requestAnimationFrame(tick);

    const finish = () => {
      setProgress(100);
      setStage("nominal");
      setPrinted(log.length);
      complete();
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
      delete document.documentElement.dataset.bootStage;
      document.documentElement.style.removeProperty("--boot-wake-ms");
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
        {/* The POST log stays up once printed — it's the session's history, and
            a stage that clears itself would leave the top half empty for the
            seven seconds that follow. */}
        <ul className="nova-boot-post">
          {post.slice(0, printed).map((entry, index) => (
            <li key={entry}>
              <span>{entry}</span>
              {/* The newest line is still working; the ones above it are done. */}
              <span className="nova-boot-ok">
                {index < printed - 1 || stage !== "post" ? "OK" : "··"}
              </span>
            </li>
          ))}
        </ul>

        <div className="nova-boot-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="nova-boot-status">
          <span>{String(progress).padStart(3, "0")}</span>
          <span>
            {stage === "post"
              ? post[Math.max(0, Math.min(printed, post.length) - 1)]
              : STAGE_LABEL[stage]}
          </span>
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
        ) : stage === "post" ? null : mode === "full" ? (
          <div
            className="boot-select"
            // Reading the options stops the clock, up to `GRACE_MS`. A
            // pointer resting here is a decision in progress, and this is the
            // one screen where the site would otherwise decide for them.
            onPointerEnter={() => {
              holdRef.current = true;
            }}
            onPointerLeave={() => {
              holdRef.current = false;
            }}
          >
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
          <p
            className="boot-select"
            data-compact="true"
            onPointerEnter={() => {
              holdRef.current = true;
            }}
            onPointerLeave={() => {
              holdRef.current = false;
            }}
          >
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

        {/* Ten seconds is a long time to hold someone who didn't ask to wait,
            so the way out is on screen from the first line rather than being
            folklore. Any key or click does it; this is just where it says so. */}
        {!switching && (
          <button
            type="button"
            tabIndex={-1}
            className="boot-skip"
            onClick={() => finishRef.current()}
          >
            SKIP ▸
          </button>
        )}
      </div>
    </div>
  );
}
