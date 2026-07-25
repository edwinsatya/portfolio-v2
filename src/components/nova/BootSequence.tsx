"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/profile";
import { useNovaMemory } from "@/hooks/useNovaMemory";
import { goToLegacy, SWITCH_DELAY_MS } from "@/lib/legacy";
import { novaBooted } from "@/lib/nova-bus";
import { useBootComplete } from "@/hooks/useBootComplete";

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
 * How long the overlay takes to dissolve. Must match the `.nova-boot` opacity
 * transition in globals.css — the boot's own attributes are held for exactly
 * this long after it finishes, and everything the reveal crossfades reads from
 * them.
 */
const DISSOLVE_MS = 500;
const DISSOLVE_REDUCED_MS = 150;

/**
 * The terminal-style boot screen that plays before the hero.
 *
 * Deliberately an overlay rather than a gate: the page underneath is fully
 * rendered and readable the whole time, so a visitor who skips — or whose JS
 * never runs — loses nothing. It also never blocks a deep link; anyone arriving
 * at `#projects` gets it dismissed immediately.
 *
 * Skipping is one button and nothing else. It used to answer to any key, any
 * click, any scroll and any touch, which read as responsive until you watched
 * someone lose the sequence to a stray spacebar or a trackpad nudge they never
 * meant as an instruction. A splash you can't dismiss is worse than no splash;
 * a splash that dismisses itself on contact is worse than both.
 */
export function BootSequence() {
  const { visit } = useNovaMemory();
  const [done, setDone] = useState(false);
  /*
   * Whether the session has already booted, through the same store the rest of
   * the site gates on.
   *
   * There are two of these on the site now — one in the stage layout, one in the
   * artifact layout, so a direct link to a case study still opens through the
   * splash. Crossing between them is a soft navigation, which mounts a fresh
   * instance; without this it would replay the whole POST log on the way into a
   * project and again on the way back. On a real first load the flag is false on
   * the server and on the client, so hydration still agrees.
   */
  const alreadyBooted = useBootComplete();
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
    // Wait for memory, so a returning visitor never sees the long version
    // first — and stand down entirely if the session has already booted, which
    // is what the second instance of this component does (see `alreadyBooted`).
    if (!visit.previous || started.current || alreadyBooted) return;
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
     * The wave, the greeting bubble, the music card — everything waiting on the
     * boot.
     *
     * Fired once the overlay has finished dissolving, not when NOMINAL comes
     * up. Firing it early meant the main stage started arriving while the boot
     * screen was still on top of it: the greeting bubble opened over the POST
     * log, and her hello was spent on a frame nobody could see. The stage gets
     * revealed first and *then* introduces itself. Idempotent, because a skip
     * lands here too.
     */
    let booted = false;
    /*
     * Set the moment the overlay starts leaving.
     *
     * The boot answers to `1` and Enter through a *window* listener, and the
     * component stays mounted once it's done — so without this the keys keep
     * answering for the rest of the session. Enter in the terminal re-ran the
     * exit and put the boot attributes back for the length of a dissolve, which
     * blinked the whole stage (see `html[data-booting]` in globals.css); `1`
     * redirected to the classic build from wherever the visitor was typing.
     */
    let over = false;
    const fireBooted = () => {
      if (booted) return;
      booted = true;
      novaBooted();
    };

    let last = performance.now();
    // Boot time served, and reading time the selector may still borrow.
    let elapsed = 0;
    let grace = GRACE_MS;

    const dissolve = reduced ? DISSOLVE_REDUCED_MS : DISSOLVE_MS;
    let dissolveTimer = 0;

    const clearBootAttrs = () => {
      delete document.documentElement.dataset.booting;
      delete document.documentElement.dataset.bootStage;
      document.documentElement.style.removeProperty("--boot-wake-ms");
    };

    /**
     * The overlay's own exit, shared by the clock running out and by a skip.
     *
     * The attributes deliberately outlive the overlay by the length of its
     * dissolve. Dropping them in the same frame the fade started was what put
     * the flash in the reveal: `booting` is what holds NOVA above the overlay,
     * so losing it dropped her behind a sheet that was still opaque and washed
     * her out in the page's own background colour for half a second. Holding
     * the stage at `nominal` instead of deleting it also gives the plates, the
     * gloss and the dimming somewhere to interpolate *to*, so a skip taken
     * mid-wireframe crossfades into the finished robot rather than snapping.
     */
    const complete = () => {
      if (over) return;
      over = true;
      cancelAnimationFrame(frame);
      // The sequence is finished with the keyboard. Dropped here rather than
      // only in the cleanup, which doesn't run until the page does.
      window.removeEventListener("keydown", onKeyDown);
      setDone(true);
      document.documentElement.dataset.booting = "out";
      if (staged) document.documentElement.dataset.bootStage = "nominal";
      dissolveTimer = window.setTimeout(() => {
        clearBootAttrs();
        fireBooted();
      }, dissolve);
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

      setStageAttr(stageAt(ratio));

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
      // CLASSIC has been taken and the redirect is pending. Completing the boot
      // now would dissolve the overlay onto the build they just declined, for
      // the second it takes the navigation to land — the exact flash the
      // overlay is held up to prevent.
      if (over || switchTimer) return;
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
      if (over || switchTimer) return;
      cancelAnimationFrame(frame);
      setSwitching(true);
      switchTimer = window.setTimeout(goToLegacy, SWITCH_DELAY_MS);
    };
    classicRef.current = chooseClassic;

    /*
     * The two keys the selector claims, and nothing else.
     *
     * Everything that isn't one of them is now inert: a stray key, a click
     * anywhere, a scroll, a touch. That is the point — the boot is a sequence
     * with a stated exit, not a screen that dismisses itself the moment the
     * visitor's hand moves. Modifier chords fall through untouched, so the
     * browser's own shortcuts still work while it's up.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "1") {
        chooseClassic();
        return;
      }
      if (event.key === "Enter") finish();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(switchTimer);
      window.clearTimeout(dissolveTimer);
      clearBootAttrs();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visit.previous, visit.name, alreadyBooted]);

  return (
    <div
      className="nova-boot"
      data-done={done || alreadyBooted}
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
              className="boot-option-inline"
              onClick={() => classicRef.current()}
            >
              press 1 for classic
            </button>
          </p>
        ) : null}
      </div>

      {/* The only way out, and now the *whole* way out — nothing else on the
          page dismisses this. Ten seconds is a long time to hold someone who
          didn't ask to wait, so it is on screen from the first POST line, and
          parked in the corner rather than under the readout, where it would
          read as a third item on a menu that has two. */}
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
  );
}
