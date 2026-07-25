"use client";

import { useEffect, useRef, useState } from "react";
import {
  fireLike,
  getBootComplete,
  onCelebrate,
  onLike,
  onNovaBooted,
  onNovaGlance,
  onPeekRibbon,
  onVibeChange,
  setNovaPort,
  type Celebration,
} from "@/lib/nova-bus";
import { getLights, onLightsBeat, type LightsBeat } from "@/lib/nova-lights";
import { beginSulk, getTemper, onTemperChange } from "@/lib/nova-temper";
import {
  getDroop,
  getPower,
  getSlump,
  LOW_AT,
  onPowerEvent,
  type PowerEvent,
} from "@/lib/power";
import {
  blendPose,
  ease as easeBlend,
  poseFor,
  restingPose,
  stateMs,
  STATE_MS,
  SUSTAINED,
  type NovaState,
  type Pose,
  type TimedState,
} from "@/lib/nova-pose";

/** The anchor's CSS width. Everything scales from this to hero or dock size. */
const BASE_WIDTH = 380;
const ASPECT = 320 / 240;
const BASE_HEIGHT = BASE_WIDTH * ASPECT;

const DOCK_WIDTH = 118;
const DOCK_WIDTH_SMALL = 86;
const DOCK_MARGIN = 20;
/** Clearance kept between her feet and a bottom tab bar while charging. */
const CHARGE_DOCK_GAP = 14;
const SMALL_SCREEN = 640;
/** Size NOVA steps aside to when the terminal is up — about 45% of full. */
const SIDELINE_WIDTH = 172;
const SIDELINE_MARGIN = 28;
/** Length of the step aside and back. */
const SIDELINE_MS = 400;

/** Vertical position of NOVA's eyes and antenna within the viewBox, 0–1. */
const EYE_LINE = 109 / 320;
const HEAD_TOP = 19 / 320;
/** Her chest lamp, which doubles as the charging port. */
const PORT_LINE = 215 / 320;
/** The ground she stands on. The "powered off" label hangs below it. */
const FOOT_LINE = 303 / 320;

/**
 * NOVA's local box, and the lines across it that everything else measures from.
 *
 * The anchor is `BASE_WIDTH` wide and this tall, and anything rendered *inside*
 * it is laid out in these coordinates. That's what lets the charging aura live
 * in her anchor and be placed with constants rather than tracked frame by
 * frame: her transform is then the only thing that ever moves it.
 */
export const NOVA_BOX = {
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  centreX: BASE_WIDTH / 2,
  headY: BASE_HEIGHT * HEAD_TOP,
  /** Her chest lamp — where the cable plugs in and the finale erupts from. */
  portY: BASE_HEIGHT * PORT_LINE,
  footY: BASE_HEIGHT * FOOT_LINE,
  /** Head to foot: "her height", for anything that scales with her. */
  span: BASE_HEIGHT * (FOOT_LINE - HEAD_TOP),
} as const;

/** Clearance the bubble keeps from every viewport edge. */
const EDGE_PAD = 12;
/** Gap between the bubble and NOVA herself. */
const BUBBLE_GAP = 10;
/** Fallback nav height, used only if the header can't be measured. */
const NAV_FALLBACK = 64;
/** How far in from the bubble's corner the tail sits. */
const TAIL_INSET = 20;
/**
 * How close to a viewport edge she has to be before the finale's label stops
 * centring on her and hangs inward instead. Half the label's widest rendering
 * plus a margin — see `.power-aura-max`.
 */
const LABEL_REACH = 130;

const clamp = (value: number, min: number, max: number) =>
  // Guards the case where the bubble is taller than the space it has to fit in:
  // min wins, so it stays below the nav rather than sliding under it.
  Math.max(min, Math.min(max, value));

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a plain function of 0–1.
 *
 * The flights used to be CSS transitions on the anchor, which is why they need
 * an equivalent here — see the note on the rendered position in the loop. Solved
 * by bisection rather than Newton: twelve halvings is well under a pixel of
 * error on an 800ms move and has no derivative to blow up on a curve with
 * overshoot (`y` outside 0–1 is deliberate on the step-aside).
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const axis = (a: number, b: number, t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 12; i++) {
      const at = axis(x1, x2, t);
      if (Math.abs(at - x) < 1e-4) break;
      if (at < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return axis(y1, y2, t);
  };
}

/** The hero↔dock flight, and the shorter step aside. Were CSS, now ours. */
const EASE_FLY = cubicBezier(0.4, 0.1, 0.2, 1);
const EASE_STEP = cubicBezier(0.34, 1.1, 0.4, 1);

/** How far the pointer travels, in px, before the gaze is fully committed. */
const REACH = 380;
/** Silence after which NOVA stops tracking and starts looking around alone. */
const IDLE_AFTER = 3200;
/** Length of the flight between hero and dock. Eased in the loop — see `EASE_FLY`. */
const FLY_MS = 800;
/** Randomised gap between idle waves. */
const WAVE_MIN_MS = 15000;
const WAVE_MAX_MS = 30000;
/** Randomised gap between yawns, once the battery is flat. Rarer than a wave —
    a yawn every fifteen seconds reads as a tic rather than as tiredness. */
const YAWN_MIN_MS = 18000;
const YAWN_MAX_MS = 34000;
/** Gap between the head-nods of fighting sleep. More often than a yawn: on a
    critical battery losing the fight *is* the idle. */
const NOD_MIN_MS = 7000;
const NOD_MAX_MS = 14000;
/** Gap between the anime power-up poses she strikes while charging past saver.
    Frequent — it's the idle *of* charging, the beat the wake-ups punctuate. */
const POWERUP_MIN_MS = 2600;
const POWERUP_MAX_MS = 4600;
/** How long the visor's reboot flicker runs. Matches `nova-spark` in nova.css. */
const SPARK_MS = 1300;
/** How long the joyful face lingers after the last like. */
const JOY_MS = 1400;
/** Crossfade into a new move, from whatever pose is on screen. */
const BLEND_IN_MS = 200;
/** Longer on the way back, so settling reads as relaxing rather than stopping. */
const BLEND_IDLE_MS = 400;
/** Ceiling once the distance scaling is applied. */
const BLEND_MAX_MS = 520;
/** Intensity added per like while already celebrating, and its decay. */
const INTENSITY_STEP = 0.34;
const INTENSITY_DECAY_MS = 2600;
/** Randomised gap between idle activities. */
const IDLE_ACT_MIN_MS = 20000;
const IDLE_ACT_MAX_MS = 40000;
/** How far round she has to be before the face is hidden behind her. */
const FACING_AWAY_AT = 0.45;

/**
 * Which states may take over from which.
 *
 * Bigger wins, and equal wins — a celebration can replace a celebration, and
 * one idle activity can replace another. The ordering the whole personality
 * hangs off is: music beats anger beats celebration beats pottering about.
 *
 * Power moves sit above anger deliberately, and only just below music. Running
 * out of battery is the one thing on this page that isn't a mood, and a robot
 * too cross to notice she is dying would be the wrong joke. (Music never has to
 * argue with it: a flat battery closes the player, which stops the vibe at
 * source.)
 *
 * The light-switch gag sits above the celebrations and below the sulk, which is
 * the one place it can go: it's a twelve-second scripted bit that drives the
 * whole page, so a stray like landing in the middle of it must not be able to
 * cut to a wave — but nothing about it outranks her actually being cross, or
 * dying, or listening to something. It never has to argue with any of those
 * anyway; `nova-lights.ts` refuses to start unless all three are clear.
 */
const PRIORITY: Record<NovaState, number> = {
  vibe: 50,

  twitch: 40,
  stretch: 40,
  shake: 40,
  nod: 40,
  yawn: 40,

  // Below the celebrations and the wave, so a like or a greeting still lands
  // over her mid-flex — she's charging, not unavailable — but above the plain
  // idle it plays out of. The wake-up beats (40) always outrank it, which is
  // exactly the "layered under the staged wake-up" the power-up is meant to be.
  powerup: 18,

  annoyed: 30,
  turnAway: 30,
  sulk: 30,
  glance: 30,
  forgive: 30,

  wonder: 25,
  idea: 25,
  flick: 25,
  caught: 25,

  wave: 20,
  dance: 20,
  hop: 20,
  happy: 20,

  tilt: 10,
  inspect: 10,
  hum: 10,
  dust: 10,
  balance: 10,
  peek: 10,
  // Below the waves and celebrations, so a like still lands over it, but above
  // the plain idle it plays out of — she'll lean, and drop it the moment
  // anything she'd rather do comes along.
  lean: 15,

  idle: 0,
};

/**
 * The idle repertoire, and how often each comes up relative to the others.
 *
 * Weighted rather than uniform because they aren't equally good: a head-tilt is
 * small enough to see often, where a full look-behind is a whole beat of
 * screen time and wears out fast. `stretch` is borrowed from the wake-up
 * sequence rather than written twice — evaluated at zero droop it is exactly
 * the standing stretch this wants.
 */
const IDLE_ACTS: ReadonlyArray<{ state: NovaState; weight: number }> = [
  { state: "tilt", weight: 5 },
  { state: "hum", weight: 4 },
  { state: "inspect", weight: 3 },
  { state: "dust", weight: 3 },
  { state: "stretch", weight: 3 },
  { state: "balance", weight: 2 },
  { state: "peek", weight: 2 },
];

/**
 * What survives a flat battery.
 *
 * Everything else in the pool is something done for its own sake — inspecting a
 * hand, balancing on one foot, checking who's behind you — and a robot with
 * nothing left to run on doesn't do things for their own sake. A sway and a
 * yawn are what tiredness looks like when it still has to stand there.
 */
const TIRED_ACTS: ReadonlyArray<{ state: NovaState; weight: number }> = [
  { state: "hum", weight: 4 },
  { state: "yawn", weight: 2 },
];

/**
 * Where a few of the activities want her looking, since the gaze is idling
 * anyway when they play. A head-tilt at nothing is a head-tilt; a head-tilt
 * with the eyes gone the same way is her having noticed something.
 */
const GAZE_BIAS: Partial<Record<NovaState, { x: number; y: number }>> = {
  tilt: { x: -0.8, y: -0.25 },
  inspect: { x: 0.45, y: 0.5 },
  balance: { x: 0, y: -0.35 },
  /* Toward the ribbon on the right edge — the eyes go with the lean. */
  lean: { x: 0.92, y: 0.12 },
  /* The gag. The switch is drawn to her left and a little below her eyeline, so
     that is where she looks while her hand is on it; `caught` is the only entry
     here that aims at nothing, because straight down the lens *is* the pose. */
  idea: { x: -0.3, y: -0.45 },
  flick: { x: -0.7, y: 0.3 },
  caught: { x: 0, y: 0 },
};

/**
 * Gazes that are a sequence rather than a direction.
 *
 * A bias says "look over there for as long as this runs", which is right for a
 * head-tilt and wrong for someone searching a room. This gets the elapsed time
 * and can therefore sweep, which is the difference between NOVA looking away and
 * NOVA looking *for* you.
 */
const GAZE_SCRIPT: Partial<
  Record<NovaState, (elapsed: number) => { x: number; y: number }>
> = {
  // One way, then the other, then damped onto the camera — the eyes land there
  // a beat before the bubble opens, so the question is asked at somebody.
  wonder: (elapsed) => {
    const p = Math.min(1, elapsed / STATE_MS.wonder);
    const damp = p < 0.72 ? 1 : Math.max(0, (1 - p) / 0.28);
    return { x: Math.sin(p * Math.PI * 2) * 0.9 * damp, y: -0.12 * damp };
  },
};

/**
 * Owns every per-frame concern in one requestAnimationFrame loop: where NOVA
 * sits (hero slot or corner dock), where she's looking, when she blinks, and
 * where the speech bubble hangs.
 *
 * Deliberately one loop rather than several. The gaze origin is derived from
 * the dock position computed the same frame instead of measuring the SVG, so
 * each frame is a single layout read followed only by writes — reading back
 * after a write would force a synchronous reflow every frame.
 */
export function useNovaStage({
  /** Terminal is up and has the visitor's attention: NOVA steps aside. */
  sidelined = false,
}: { sidelined?: boolean } = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Mirrored into React state only so the bubble can switch which corner it
  // points from; the loop itself reads the ref.
  const [docked, setDocked] = useState(false);

  // Read by the loop, which is set up once and never re-created.
  const sidelinedRef = useRef(sidelined);
  useEffect(() => {
    sidelinedRef.current = sidelined;
  }, [sidelined]);

  useEffect(() => {
    const stage = stageRef.current;
    const anchor = anchorRef.current;
    const svg = svgRef.current;
    if (!stage || !anchor || !svg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const gaze = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };

    let pointerSeen = false;
    let lastPointerAt = 0;
    let nextWanderAt = 0;
    let isDocked = false;
    let isSidelined = false;
    /*
     * Where she is actually drawn, as opposed to where she is heading.
     *
     * These two used to be the same number: the loop wrote the target transform
     * and a CSS transition on the anchor eased the element to it. Everything
     * else that draws around her — the cable, the bubble, the hearts, the notes,
     * the lamp, and anything reading `--nova-head-*` — is placed from what this
     * loop publishes, so all of it jumped to the target on the first frame of a
     * flight and stood there waiting for the robot to arrive. That is the
     * detachment. The flight is eased here instead, and every consumer is fed
     * the eased value, so the whole ensemble moves on one clock.
     */
    let renderX = 0;
    let renderY = 0;
    let renderScale = 0;
    let placed = false;
    /** The move in progress: where it started, when, how long, and its curve. */
    let flight: {
      x: number;
      y: number;
      scale: number;
      at: number;
      ms: number;
      ease: (t: number) => number;
    } | null = null;
    /** Eased upward offset that keeps the charging aura clear of a bottom bar. */
    let chargeLift = 0;
    /** Keeps the "charging" flag (and so her mobile-ABOUT visibility) alive for a
        grace beat after the cable leaves, so the finale and victory dance play
        out rather than blinking off the instant the charge completes. */
    let chargeHoldUntil = 0;
    let wasCharging = false;
    let ready = false;
    let slot: HTMLElement | null = null;
    let nav: HTMLElement | null = null;
    let frame = 0;
    /* --- Animation state machine ---------------------------------------
     * NOVA is always in exactly one state. A new trigger never hard-cuts the
     * current pose: `blendFrom` snapshots whatever is on screen and the engine
     * crossfades out of it, so entering *and* leaving a move are continuous.
     */
    let state: NovaState = "idle";
    let stateStartedAt = 0;
    let stateEndsAt = 0;
    /** At most one follow-up; further likes only add hearts and intensity. */
    let queued: NovaState | null = null;
    /** Snapshot of the live pose when the last state change happened. */
    let blendFrom: Pose = restingPose(0);
    let blendStartedAt = 0;
    let blendMs = BLEND_IN_MS;
    /** 0–1. Rises with rapid likes, decays back down. */
    let intensity = 0;
    let intensityAt = 0;
    /** The pose actually on screen this frame. */
    let pose: Pose = restingPose(0);
    let joyTimer: number | undefined;
    /** Music is playing. Read by the gaze, which stops tracking while it is. */
    let vibing = false;
    /** True while the current state came out of the idle repertoire. */
    let fromRepertoire = false;
    /**
     * The light-switch gag has the stage.
     *
     * Needed because the gag drops back to `idle` between beats — her hand comes
     * off the switch while she admires the work — and `idle` is exactly what the
     * repertoire and the wave wait for. Without this she would break off
     * mid-prank to inspect her own hand.
     */
    let mischief = false;
    /** So the pool never plays the same thing twice running. */
    let lastAct: NovaState | null = null;
    /** Mirrors `pose.turn` past the threshold, so the face isn't re-toggled. */
    let facingAway = false;
    /** Last value written to `data-temper`. Null so the first frame always writes
        one — the store outlives this effect, and a remount that inherited a sulk
        would otherwise show a perfectly cheerful face through it. */
    let temper: ReturnType<typeof getTemper> | null = null;

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    /* ---------------------------------------------------------------- */
    /* Pointer                                                           */
    /* ---------------------------------------------------------------- */

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerSeen = true;
      lastPointerAt = performance.now();

      /*
       * Caught pottering about.
       *
       * The repertoire is what she does when nobody is watching, so somebody
       * watching ends it — carrying on inspecting her own hand while the
       * visitor moves the cursor would read as her not having noticed them,
       * which is the opposite of a robot who follows you around the page.
       *
       * The stretch is the exception, and gets to finish. Half a stretch is
       * worse than none, and by the time the arms are overhead she is
       * committed whether anyone is watching or not.
       */
      if (fromRepertoire && state !== "stretch") {
        enterState("idle", lastPointerAt);
      }
    };

    // Pointer gone from the window: let idle behaviour take back over.
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) lastPointerAt = 0;
    };

    // Somewhere plausible to look when nobody's driving. Biased shorter on the
    // vertical axis so NOVA glances sideways more than up and down.
    const pickWanderTarget = (now: number) => {
      target.x = (Math.random() * 2 - 1) * 0.85;
      target.y = (Math.random() * 2 - 1) * 0.55;
      nextWanderAt = now + 2000 + Math.random() * 2000;
    };

    /**
     * Begin a move, easing from wherever she is drawn right now.
     *
     * Reduced motion cuts instead, as the CSS transition this replaces did: a
     * robot gliding across the viewport is the thing that preference turns off.
     */
    const takeOff = (now: number, ms: number, ease: (t: number) => number) => {
      if (reducedMotion.matches) return;
      flight = { x: renderX, y: renderY, scale: renderScale, at: now, ms, ease };
    };

    /* ---------------------------------------------------------------- */
    /* Frame                                                             */
    /* ---------------------------------------------------------------- */

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // The reads of the frame, batched. Everything after this is a write —
      // reading back after a write would force a synchronous reflow.
      if (!slot?.isConnected) {
        slot = document.querySelector<HTMLElement>("[data-nova-slot]");
      }
      if (!nav?.isConnected) {
        nav = document.querySelector<HTMLElement>("[data-site-nav]");
      }
      const slotRect = slot?.getBoundingClientRect() ?? null;
      const navRect = nav?.getBoundingClientRect() ?? null;
      const navBottom = navRect?.bottom ?? NAV_FALLBACK;

      // Measured every frame, open or not. The bubble hides with `visibility`,
      // which keeps its layout box, so these are real numbers throughout —
      // and treating a closed bubble as zero-sized made the placement below
      // solve to a different spot, so it visibly jumped at both ends of the
      // fade. It's the same batched read either way.
      const bubble = bubbleRef.current;
      const speech = bubble?.firstElementChild as HTMLElement | null;
      const bubbleWidth = speech?.offsetWidth ?? 0;
      const bubbleHeight = speech?.offsetHeight ?? 0;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Dock once the hero slot has scrolled up into the top quarter — or
      // immediately if the hero isn't on this page at all.
      const shouldDock = !slotRect || slotRect.bottom < vh * 0.28;

      // Stepping aside for the terminal is desktop-only: on phones the terminal
      // is a full-screen sheet, so there is nowhere to step aside *to*, and
      // lifting her above it would float a robot over the transcript.
      const shouldSideline = sidelinedRef.current && vw >= SMALL_SCREEN;

      let centerX: number;
      let centerY: number;
      let scale: number;

      if (shouldSideline) {
        scale = SIDELINE_WIDTH / BASE_WIDTH;
        centerX = vw - SIDELINE_MARGIN - SIDELINE_WIDTH / 2;
        centerY = vh - SIDELINE_MARGIN - (SIDELINE_WIDTH * ASPECT) / 2;
      } else if (shouldDock || !slotRect) {
        const dockWidth = vw < SMALL_SCREEN ? DOCK_WIDTH_SMALL : DOCK_WIDTH;
        scale = dockWidth / BASE_WIDTH;
        centerX = vw - DOCK_MARGIN - dockWidth / 2;
        centerY = vh - DOCK_MARGIN - (dockWidth * ASPECT) / 2;
      } else {
        scale = slotRect.width / BASE_WIDTH;
        centerX = slotRect.left + slotRect.width / 2;
        centerY = slotRect.top + slotRect.height / 2;
      }

      /* Charging in the corner: lift her clear of the bottom tab bar.
       *
       * On a phone the non-home scenes dock her to the bottom-right, which tucks
       * her lower half — and the base of her charging aura — behind the nav bar
       * (z-index 50, above the stage). While the cable is in, raise her just far
       * enough that her feet sit above the bar, so the whole power-up is on
       * screen rather than erupting from behind it. Only when docked and only
       * when the nav is actually a bottom bar (its top past mid-screen); the
       * desktop nav lives at the top and must never pull her up. Eased so
       * plugging in lifts her rather than teleporting her. */
      const barTop = navRect && navRect.top > vh * 0.5 ? navRect.top : vh;
      const feet = centerY + (BASE_HEIGHT * scale) / 2;
      const wantLift =
        shouldDock && getPower().charging
          ? Math.max(0, feet - (barTop - CHARGE_DOCK_GAP))
          : 0;
      chargeLift += (wantLift - chargeLift) * 0.12;
      if (wantLift === 0 && chargeLift < 0.2) chargeLift = 0;
      centerY -= chargeLift;

      /* --- Where she is, versus where she is going --------------------
       * First frame: she belongs at the target, not flying in from the origin.
       */
      if (!placed) {
        renderX = centerX;
        renderY = centerY;
        renderScale = scale;
        placed = true;
      }

      // Only eased on the flight itself. While tracking the hero slot she is
      // written straight through every frame, and easing would read as lag.
      if (shouldDock !== isDocked) {
        isDocked = shouldDock;
        setDocked(shouldDock);
        takeOff(now, FLY_MS, EASE_FLY);
        anchor.dataset.flying = "true";
        later(() => {
          anchor.dataset.flying = "false";
        }, FLY_MS);
      }

      // Stepping aside gets its own, shorter move.
      if (shouldSideline !== isSidelined) {
        isSidelined = shouldSideline;
        anchor.dataset.sideline = String(shouldSideline);
        takeOff(now, SIDELINE_MS, EASE_STEP);
        anchor.dataset.stepping = "true";
        later(() => {
          anchor.dataset.stepping = "false";
        }, SIDELINE_MS);
      }

      if (flight) {
        const t = (now - flight.at) / flight.ms;
        if (t >= 1) {
          flight = null;
        } else {
          // Toward the *live* target rather than a snapshot of it, so a slot
          // that is itself still animating is caught rather than chased.
          const k = flight.ease(t);
          renderX = flight.x + (centerX - flight.x) * k;
          renderY = flight.y + (centerY - flight.y) * k;
          renderScale = flight.scale + (scale - flight.scale) * k;
        }
      }
      if (!flight) {
        renderX = centerX;
        renderY = centerY;
        renderScale = scale;
      }

      // From here down there is only one position, and it's the drawn one.
      centerX = renderX;
      centerY = renderY;
      scale = renderScale;

      /* Which side the one label inside her anchor — the finale's power level —
         has to hang from so it can't run off the screen. Derived from where she
         *is*: keyed to the flight's destination instead, it flipped to centred
         on the first frame of a flight out of the corner and stayed clipped for
         the length of it. Compared before writing; this runs every frame and
         changes a handful of times a session. */
      const edge =
        centerX > vw - LABEL_REACH
          ? "right"
          : centerX < LABEL_REACH
            ? "left"
            : "";
      if (anchor.dataset.edge !== edge) anchor.dataset.edge = edge;

      /* --- Anime power-up charge (see PowerAura) ----------------------
       * One envelope drives the whole power-up read: zero below the
       * battery-saver line, ramping to one at a full charge. It sets how hard
       * her visor glows and how upright her antenna stands (a *posture*, so it
       * survives reduced motion as a gentle static glow), and — motion allowed
       * — a body tremble that intensifies with the percentage plus an
       * occasional energy pulse that lifts her a few px. The tremble is folded
       * into the anchor transform below so it costs no extra write; a ±2px
       * jitter is invisible against a docking flight, so it needs no guard. */
      const chargePow = getPower();
      const chargeK = chargePow.charging
        ? clamp((chargePow.level - LOW_AT) / (100 - LOW_AT), 0, 1)
        : 0;

      let trembleX = 0;
      let trembleY = 0;
      let pulseK = 0;
      if (chargeK > 0 && !reducedMotion.matches) {
        // Two detuned sines per axis read as an organic shudder rather than a
        // wobble; amplitude climbs from a barely-there hum to ~2px near full.
        const amp = 0.5 + chargeK * 1.6;
        trembleX = (Math.sin(now / 41) + Math.sin(now / 27)) * 0.5 * amp;
        trembleY = (Math.sin(now / 49) + Math.sin(now / 33)) * 0.5 * amp;
        // A brief raised-cosine surge every ~2.6s, stronger the fuller she is —
        // she lifts, and `PowerAura` reads the same value to flare the aura.
        const phase = (now % 2600) / 2600;
        if (phase < 0.2) {
          pulseK = Math.sin((phase / 0.2) * Math.PI) * (0.45 + chargeK * 0.55);
          trembleY -= pulseK * 5;
        }
      }
      svg.style.setProperty("--nova-charge", chargeK.toFixed(3));
      // Published for PowerAura: the energy pulse it flares on, and the tremble
      // it leans the whole pillar with so the aura shakes when she does.
      const root = document.documentElement.style;
      root.setProperty("--nova-pulse", pulseK.toFixed(3));
      root.setProperty("--nova-tremble-x", trembleX.toFixed(2));
      // How far down she is scaled, for the one thing inside her anchor that
      // must *not* scale with her: the finale's power-level label, which would
      // otherwise shrink to a third of itself in the corner dock.
      root.setProperty("--nova-scale", scale.toFixed(4));

      anchor.style.transform = `translate(${
        centerX - BASE_WIDTH / 2 + trembleX
      }px, ${centerY - BASE_HEIGHT / 2 + trembleY}px) scale(${scale})`;

      if (!ready) {
        ready = true;
        stage.dataset.ready = "true";
      }

      /* --- Pose -------------------------------------------------------
       * Head and eyes are deliberately *not* part of this: they track the
       * cursor from their own values below, so NOVA keeps watching you while
       * her body dances.
       */
      intensity = Math.max(
        0,
        intensity - (now - intensityAt) / INTENSITY_DECAY_MS,
      );
      intensityAt = now;

      // A finished move hands over to whatever is queued, else back to idle.
      if (state !== "idle" && now >= stateEndsAt) {
        enterState(queued ?? "idle", now);
        queued = null;
      }

      /* How tired the body reads, and how far it has collapsed. Read from the
         store's fractional level every frame rather than from the rounded
         snapshot, so a charge walks her back upright continuously instead of in
         one visible step per percent. */
      const power = getPower();
      const droop = getDroop();
      const slump = getSlump();
      const dead = power.state === "dead";

      if (svg.dataset.power !== power.state) svg.dataset.power = power.state;
      svg.style.setProperty("--nova-droop", droop.toFixed(2));
      svg.style.setProperty("--nova-slump", slump.toFixed(2));

      // The port shows itself the moment a plug is picked up, so the visitor
      // can see where they're aiming before they get there.
      if (power.dragging || power.charging) svg.dataset.port = "true";
      else delete svg.dataset.port;
      if (power.charging) svg.dataset.charging = "true";
      else delete svg.dataset.charging;

      // Mirrored onto <html> so page-level rules can react to charging — most
      // importantly the mobile ABOUT scene, which hides the docked robot but
      // must keep her (and her power-up aura) on screen while she's plugged in.
      // Held a beat past the disconnect so the 100% finale and the victory dance
      // it fires aren't cut off the instant the charge tops out. Guarded so it
      // writes only on the transition, not every frame.
      if (power.charging) wasCharging = true;
      else if (wasCharging) {
        wasCharging = false;
        chargeHoldUntil = now + 1800;
      }
      const rootEl = document.documentElement;
      const chargingFlag = power.charging || now < chargeHoldUntil ? "true" : undefined;
      if (rootEl.dataset.charging !== chargingFlag) {
        if (chargingFlag) rootEl.dataset.charging = chargingFlag;
        else delete rootEl.dataset.charging;
      }

      if (reducedMotion.matches) {
        // Held at a fixed rest pose — the engine's idle still breathes and
        // sways, which is motion the visitor asked not to see. Evaluated at a
        // constant time so nothing oscillates. Droop and slump still apply:
        // they're postures, not movements, and without them the power states
        // would be invisible here. The gestures are skipped entirely, leaving
        // the fades the CSS does anyway.
        pose = restingPose(0, droop, slump);
      } else {
        const wantPose = poseFor(
          state,
          now,
          now - stateStartedAt,
          intensity,
          droop,
          slump,
        );
        const blend = easeBlend(Math.min(1, (now - blendStartedAt) / blendMs));
        pose = blendPose(blendFrom, wantPose, blend);
      }

      svg.style.setProperty("--pose-arm-l", pose.armL.toFixed(2));
      svg.style.setProperty("--pose-arm-r", pose.armR.toFixed(2));
      svg.style.setProperty("--pose-fore-l", pose.foreL.toFixed(2));
      svg.style.setProperty("--pose-fore-r", pose.foreR.toFixed(2));
      svg.style.setProperty("--pose-body-y", pose.bodyY.toFixed(2));
      svg.style.setProperty("--pose-body-rot", pose.bodyRot.toFixed(2));
      svg.style.setProperty("--pose-sx", pose.bodySx.toFixed(3));
      svg.style.setProperty("--pose-sy", pose.bodySy.toFixed(3));
      svg.style.setProperty("--pose-chest", pose.chest.toFixed(3));
      svg.style.setProperty("--pose-head-rot", pose.headRot.toFixed(2));
      svg.style.setProperty("--pose-head-y", pose.headY.toFixed(2));
      svg.style.setProperty("--pose-leg-l", pose.legL.toFixed(2));
      svg.style.setProperty("--pose-leg-r", pose.legR.toFixed(2));
      svg.style.setProperty("--pose-turn", pose.turn.toFixed(3));

      /* The face goes when she's far enough round for it to be behind her.
         An attribute rather than an opacity derived from `--pose-turn`, so the
         180ms fade in CSS lands exactly at the edge-on frame — the one moment
         in the turn where losing a face is invisible. */
      const away = pose.turn > FACING_AWAY_AT;
      if (away !== facingAway) {
        facingAway = away;
        svg.dataset.facing = away ? "away" : "toward";
      }

      // Her temper drives the face from CSS. Compared before writing: this runs
      // sixty times a second and only changes a handful of times a session.
      const mood = getTemper();
      if (mood !== temper) {
        temper = mood;
        svg.dataset.temper = mood;
      }

      /* Gaze — origin derived from the transform above, not measured. */
      const halfHeight = (BASE_HEIGHT * scale) / 2;
      const boxTop = centerY - halfHeight;
      const eyeY = boxTop + BASE_HEIGHT * scale * EYE_LINE;

      const idle = !pointerSeen || now - lastPointerAt > IDLE_AFTER;

      // Nothing behind the visor to look with. The gaze eases to centre rather
      // than being cut, so the last thing she does before the lights go out is
      // stop following you.
      //
      // Vibing centres it for the opposite reason: she is in the zone, and a
      // robot with her eyes shut still tracking your cursor would be a robot
      // pretending. The ease below carries it there over about a second rather
      // than cutting, so putting the headphones on reads as her letting go of
      // you rather than as the tracking being switched off.
      if (dead || vibing) {
        target.x = 0;
        target.y = 0;
        nextWanderAt = 0;
      } else if (idle) {
        const script = GAZE_SCRIPT[state];
        const bias = GAZE_BIAS[state];
        if (script) {
          // A gaze with a script of its own, played from the state's own clock.
          const look = script(now - stateStartedAt);
          target.x = look.x;
          target.y = look.y;
          nextWanderAt = 0;
        } else if (bias) {
          // An activity that has somewhere specific to look, looking there.
          target.x = bias.x;
          target.y = bias.y;
          nextWanderAt = 0;
        } else if (reducedMotion.matches) {
          target.x = 0;
          target.y = 0;
        } else if (now > nextWanderAt) {
          pickWanderTarget(now);
        }
      } else {
        const dx = (pointer.x - centerX) / REACH;
        const dy = (pointer.y - eyeY) / REACH;
        // Clamp to the unit circle, so a diagonal pointer doesn't push the gaze
        // further than a straight-on one.
        const distance = Math.hypot(dx, dy);
        const limit = distance > 1 ? 1 / distance : 1;
        target.x = dx * limit;
        target.y = dy * limit;
        nextWanderAt = 0;
      }

      /* Drift lazily when idling, follow crisply when being led — and slower
         still on the way out, so the gaze settles rather than snapping to zero.
         The gag is the exception among the idle cases: it has a scripted gaze
         with beats to hit, and at the idle rate she is still turning her eyes
         towards the switch by the time the flick has already happened. */
      const ease = dead ? 0.02 : idle ? (mischief ? 0.09 : 0.035) : 0.12;
      gaze.x += (target.x - gaze.x) * ease;
      gaze.y += (target.y - gaze.y) * ease;

      svg.style.setProperty("--nova-look-x", gaze.x.toFixed(3));
      svg.style.setProperty("--nova-look-y", gaze.y.toFixed(3));

      // Where the hearts launch from. Written to the root rather than the
      // stage so the burst layer can read it without threading refs around.
      const antennaTop = boxTop + BASE_HEIGHT * scale * HEAD_TOP;
      document.documentElement.style.setProperty(
        "--nova-head-x",
        `${Math.round(centerX)}`,
      );
      document.documentElement.style.setProperty(
        "--nova-head-y",
        `${Math.round(antennaTop)}`,
      );
      // And where the ground under her is, which is what the "powered off"
      // label hangs from. Published the same way and for the same reason.
      document.documentElement.style.setProperty(
        "--nova-foot-y",
        `${Math.round(boxTop + BASE_HEIGHT * scale * FOOT_LINE)}`,
      );

      // Where the charging cable lands. Published in JS rather than as a custom
      // property: the charger draws a curve through it and would otherwise have
      // to read back computed style every frame.
      setNovaPort(centerX, boxTop + BASE_HEIGHT * scale * PORT_LINE);

      /* Bubble — placed by collision, not by fixed offsets.
         Prefers sitting above NOVA's antenna. Where that would put it under the
         navbar or off the top of the screen — which is exactly what happens in
         the hero on a phone — it flips below her instead and the tail flips with
         it. Both axes are then clamped into the safe area, so the bubble can
         never render outside the viewport or beneath the nav. */
      if (bubble) {
        const novaHeight = BASE_HEIGHT * scale;
        const antennaY = boxTop + novaHeight * HEAD_TOP;
        const novaBottom = boxTop + novaHeight;

        // Top and bottom of the region the bubble is allowed to occupy.
        const safeTop = navBottom + EDGE_PAD;
        const safeBottom = vh - EDGE_PAD;

        const above = antennaY - BUBBLE_GAP - bubbleHeight;
        const below = novaBottom + BUBBLE_GAP;

        // Flip only when there genuinely isn't room above — otherwise every
        // desktop bubble would move too.
        const placeBelow =
          above < safeTop && below + bubbleHeight <= safeBottom;

        const top = clamp(
          placeBelow ? below : above,
          safeTop,
          Math.max(safeTop, safeBottom - bubbleHeight),
        );

        // Docked, NOVA hugs the right edge, so the bubble hangs from her right
        // side rather than centring on her and overflowing.
        const preferredLeft = shouldDock
          ? centerX + (BASE_WIDTH * scale) / 2 - bubbleWidth
          : centerX - bubbleWidth / 2;

        const left = clamp(
          preferredLeft,
          EDGE_PAD,
          Math.max(EDGE_PAD, vw - EDGE_PAD - bubbleWidth),
        );

        // The tail tracks NOVA even after the body has been clamped away from
        // her, so it keeps pointing at the robot rather than into space.
        const tailX = clamp(
          centerX - left,
          TAIL_INSET,
          Math.max(TAIL_INSET, bubbleWidth - TAIL_INSET),
        );

        bubble.style.setProperty("--nova-bubble-x", `${Math.round(left)}px`);
        bubble.style.setProperty("--nova-bubble-y", `${Math.round(top)}px`);
        bubble.style.setProperty("--nova-tail-x", `${Math.round(tailX)}px`);
        speech!.dataset.place = placeBelow ? "below" : "above";
      }
    };

    /* ---------------------------------------------------------------- */
    /* Blinking and clicks                                               */
    /* ---------------------------------------------------------------- */

    const blink = () => {
      // Nothing to blink with once the visor is dark, and in critical the eyes
      // are running their own open-a-sliver-and-shut cycle that a blink would
      // only interrupt.
      if (getPower().state === "dead") return;
      svg.dataset.blink = "true";
      later(() => {
        svg.dataset.blink = "false";
      }, 110);
    };

    const scheduleBlink = () => {
      later(
        () => {
          blink();
          // Every so often, a double blink. Perfectly even blinking reads
          // robotic in the wrong way.
          if (Math.random() < 0.22) later(blink, 260);
          scheduleBlink();
        },
        2400 + Math.random() * 3800,
      );
    };

    /* ---------------------------------------------------------------- */
    /* Moves                                                             */
    /* ---------------------------------------------------------------- */

    /**
     * Switch state, blending out of the pose currently on screen.
     *
     * Nothing here reads a "current animation frame" — `pose` already holds
     * exactly what's rendered, so starting the crossfade from it is what
     * guarantees no teleport, whichever move is interrupted and whenever.
     */
    const enterState = (next: NovaState, now: number) => {
      blendFrom = pose;
      blendStartedAt = now;

      // Distance-aware: a big swing gets longer to wind up than a small one.
      // A fixed blend makes "hanging arms to overhead" cover 120° in the same
      // time as a 5° adjustment, which is what still read as a lurch.
      const first = poseFor(next, now, 0, intensity);
      const travel = Math.max(
        Math.abs(first.armL - pose.armL),
        Math.abs(first.armR - pose.armR),
        Math.abs(first.bodyRot - pose.bodyRot) * 3,
      );
      const base = next === "idle" ? BLEND_IDLE_MS : BLEND_IN_MS;
      blendMs = Math.min(BLEND_MAX_MS, base + travel * 1.7);

      state = next;
      stateStartedAt = now;
      stateEndsAt = SUSTAINED.has(next)
        ? Infinity
        : // `stateMs` rather than the raw table: a yawn on a dying battery
          // plays in slow motion, and the timer has to agree with the pose or
          // the stretch would finish early and hold.
          now +
          stateMs(next as TimedState, getSlump()) * (1 - intensity * 0.12);
      svg.dataset.state = next;
      // Only `runIdleAct` sets this, and only after the call — anything else
      // taking over means the current move is no longer hers to interrupt.
      fromRepertoire = false;
    };

    /**
     * Whether `next` is allowed to take the stage from whatever is on it.
     *
     * Equal priority passes, so a celebration can replace a celebration and one
     * idle activity can follow another. Everything automatic goes through this;
     * the power events don't, because a robot dying is not negotiating.
     */
    const canPlay = (next: NovaState) => PRIORITY[next] >= PRIORITY[state];

    const busy = () => state !== "idle";

    /**
     * A like landed.
     *
     * Free: the face and the hearts. Rationed: the body. Spamming should read
     * as NOVA getting more and more delighted, so extra likes raise `intensity`
     * — bigger, slightly faster moves — rather than starting a second animation
     * on limbs that are already swinging.
     */
    const runCelebration = (kind: Celebration) => {
      const now = performance.now();

      // Flat battery: no delight, no dance. A tired robot that still beams and
      // grins on every click would undo the whole state — the like still lands
      // and still throws hearts, she just hasn't the power to react to it.
      if (getPower().state !== "normal") return;

      /* Cross, or listening to something. The face is the tell here as much as
         the body: `data-joy` is a grin, and grinning through a sulk would give
         the whole thing away. Music wins over both — she's just not available.
         Checked before the joy face rather than alongside the body, because
         `canPlay` guards limbs and this guards the expression. */
      if (!canPlay("happy")) return;

      // Face first, always, however fast they click. Pure opacity, so it can
      // retrigger endlessly without ever snapping.
      window.clearTimeout(joyTimer);
      svg.dataset.joy = "true";
      joyTimer = later(() => {
        delete svg.dataset.joy;
      }, JOY_MS);

      if (reducedMotion.matches) return;

      if (!busy()) {
        enterState(kind, now);
        return;
      }

      // Already moving: intensify, and hold at most one follow-up.
      intensity = Math.min(1, intensity + INTENSITY_STEP);
      // Stretch the current move a touch so the extra energy has somewhere to
      // go rather than queueing a pile of animations.
      stateEndsAt = Math.min(stateEndsAt + 90, now + 2600);
      if (!queued && kind !== state) queued = kind;
    };

    /** The idle wave. Never interrupts a celebration, a flat battery, or a gag. */
    const wave = () => {
      if (reducedMotion.matches || busy() || mischief) return;
      if (getPower().state !== "normal") return;
      enterState("wave", performance.now());
    };

    /**
     * The ribbon on the right edge was hovered — lean over and look.
     *
     * Same guards as the wave: only from a standing idle, only when she has the
     * power for it, never over the light-switch gag. A one-shot rather than a
     * held pose, so a visitor sweeping past the ribbon gets one glance, not a
     * robot frozen mid-lean until they move the cursor away.
     */
    const leanPeek = () => {
      if (reducedMotion.matches || busy() || mischief) return;
      if (getPower().state !== "normal") return;
      enterState("lean", performance.now());
    };

    /**
     * Something on one side of her asked for a look — the WORK scene's career
     * column on the left, its project list on the right.
     *
     * Reuses the repertoire rather than adding poses: `lean` already cranes her
     * toward screen-right with the gaze to match (it's what the ribbon uses),
     * and `tilt` is the small head-tilt whose gaze bias points left. Same guards
     * as the peek, and the same one-shot shape — a visitor running down a list
     * gets a flicker of attention, not a robot held mid-lean.
     */
    const glanceAside = (side: "left" | "right") => {
      if (reducedMotion.matches || busy() || mischief) return;
      if (getPower().state !== "normal") return;
      enterState(side === "right" ? "lean" : "tilt", performance.now());
    };

    /* ---------------------------------------------------------------- */
    /* Idle repertoire                                                   */
    /* ---------------------------------------------------------------- */

    /**
     * One of the pool, weighted, never the one that just played.
     *
     * The exclusion is dropped rather than enforced when it would empty the
     * pool — the low-battery set is two long, and "never twice in a row" has to
     * lose to "play something" when the alternative is a robot that stops
     * moving altogether at 20%.
     */
    const pickAct = (pool: typeof IDLE_ACTS): NovaState => {
      const fresh = pool.filter((act) => act.state !== lastAct);
      const choices = fresh.length > 0 ? fresh : pool;
      const total = choices.reduce((sum, act) => sum + act.weight, 0);

      let roll = Math.random() * total;
      for (const act of choices) {
        roll -= act.weight;
        if (roll <= 0) return act.state;
      }
      return choices[choices.length - 1].state;
    };

    /**
     * Something to do when nobody is watching.
     *
     * Every guard here is the same guard the wave has, for the same reasons —
     * these are things she does *instead of* being watched, so the pool goes
     * quiet the moment there is a cursor to follow or a boot still finishing.
     */
    const runIdleAct = () => {
      if (reducedMotion.matches || !getBootComplete()) return;
      // She's busy. The gag parks her in `idle` between its own beats, which is
      // exactly the condition below, so this has to be checked first.
      if (mischief) return;
      if (state !== "idle") return;
      if (pointerSeen && performance.now() - lastPointerAt < IDLE_AFTER) return;

      // Nothing left to potter about with. Charging is deliberately *not* a
      // guard — unlike the yawn, which is tiredness and stops when she's on the
      // mains, none of these are about how much power she has.
      const power = getPower();
      if (power.state === "dead") return;

      const tired = power.state === "low" || power.state === "critical";
      const next = pickAct(tired ? TIRED_ACTS : IDLE_ACTS);

      lastAct = next;
      enterState(next, performance.now());
      fromRepertoire = true;
    };

    const scheduleIdleAct = () => {
      later(
        () => {
          runIdleAct();
          scheduleIdleAct();
        },
        IDLE_ACT_MIN_MS + Math.random() * (IDLE_ACT_MAX_MS - IDLE_ACT_MIN_MS),
      );
    };

    // Idle waves, at a randomised interval so they never feel metronomic.
    const scheduleWave = () => {
      later(
        () => {
          // Only when nobody's driving — waving mid-cursor-track reads as a
          // twitch rather than a greeting.
          if (!pointerSeen || performance.now() - lastPointerAt > IDLE_AFTER) {
            wave();
          }
          scheduleWave();
        },
        WAVE_MIN_MS + Math.random() * (WAVE_MAX_MS - WAVE_MIN_MS),
      );
    };

    /*
     * The yawn — the low-battery counterpart to the wave, and it runs on the
     * same one-shot schedule for the same reason: a fixed interval would read
     * as a mechanism rather than as a robot getting sleepy.
     *
     * In `low` and `critical` both, where `stateMs` stretches it into the
     * slow-motion version. Never at 0%, where there is nothing left to yawn
     * with, and never while charging — she's on her way back up.
     */
    const scheduleYawn = () => {
      later(
        () => {
          const power = getPower();
          const tired = power.state === "low" || power.state === "critical";
          if (tired && !power.charging && !busy()) {
            enterState("yawn", performance.now());
          }
          scheduleYawn();
        },
        YAWN_MIN_MS + Math.random() * (YAWN_MAX_MS - YAWN_MIN_MS),
      );
    };

    /*
     * Fighting sleep. Critical only — above it she's tired but still upright,
     * and below it there is no fight left to lose.
     */
    const scheduleNod = () => {
      later(
        () => {
          const power = getPower();
          if (power.state === "critical" && !power.charging && !busy()) {
            enterState("nod", performance.now());
          }
          scheduleNod();
        },
        NOD_MIN_MS + Math.random() * (NOD_MAX_MS - NOD_MIN_MS),
      );
    };

    /*
     * The power-up flex — the shonen charging pose, on the same one-shot
     * schedule as the wave and the yawn.
     *
     * Only while plugged in and only above the battery-saver line: below it she
     * is still waking up, and the staged revival (twitch, stretch, shake) owns
     * that band — those fire straight through `enterState` and outrank this, so
     * a power-up never steps on a wake-up beat, it fills the gaps between them.
     * From `idle` only, like every other scheduled gesture, so a like or a
     * greeting she's mid-flex for still lands.
     */
    const schedulePowerup = () => {
      later(
        () => {
          const power = getPower();
          if (
            power.charging &&
            power.level > LOW_AT &&
            !busy() &&
            !mischief &&
            !reducedMotion.matches
          ) {
            enterState("powerup", performance.now());
          }
          schedulePowerup();
        },
        POWERUP_MIN_MS + Math.random() * (POWERUP_MAX_MS - POWERUP_MIN_MS),
      );
    };

    /*
     * The revival, staged.
     *
     * Each beat is a gesture rather than a blend, because the continuous part —
     * the body lifting out of its slump, the glow coming back — is already
     * happening underneath from `slump` alone, and a wake-up you can only see by
     * watching the percentage isn't a wake-up.
     */
    const runPowerEvent = (event: PowerEvent) => {
      // Simplified fades instead: the postures and the CSS crossfades still
      // carry every state change, they just don't perform it.
      if (reducedMotion.matches) return;

      const now = performance.now();
      switch (event) {
        case "died":
          // Whatever she was doing, she isn't any more. The slumped idle is
          // already where the pose engine is heading; this just stops fighting
          // it, and the blend out of the interrupted move reads as collapsing.
          queued = null;
          intensity = 0;
          enterState("idle", now);
          break;

        case "spark":
          queued = null;
          // The visor's own catch-catch-hold, which CSS can't stage on its own:
          // leaving `dead` merely stops the shutdown rule, and the lights would
          // otherwise just be back. See `nova-spark` in nova.css.
          svg.dataset.spark = "true";
          later(() => {
            delete svg.dataset.spark;
          }, SPARK_MS);
          enterState("twitch", now);
          break;

        case "waking":
          // The stretch first, then the yawn it earns — the engine's one queued
          // follow-up is exactly the right size for this.
          enterState("stretch", now);
          queued = "yawn";
          break;

        case "revived":
          queued = null;
          enterState("shake", now);
          break;
      }
    };

    /* Hello, once, after the boot screen clears — and a beat after that, so the
       stage lands before she waves into it rather than with it. The bus now
       fires this at the end of the dissolve instead of at the start, so the
       wave is no longer spent behind an overlay that's still up. */
    const greetOnBoot = () => later(wave, 800);

    /* ---------------------------------------------------------------- */
    /* Music                                                             */
    /* ---------------------------------------------------------------- */

    /**
     * The player opened or closed.
     *
     * The headphones are an attribute rather than a pose, and they go on even
     * under reduced motion — a visitor who asked not to watch things move has
     * not asked to be left out of the joke. What the preference takes away is
     * the groove: no bob, no sway, no notes.
     */
    const runVibe = (on: boolean) => {
      vibing = on;
      if (on) svg.dataset.vibing = "true";
      else delete svg.dataset.vibing;

      if (reducedMotion.matches) return;
      const now = performance.now();

      if (on) {
        // Top of the priority table, so this is the one trigger that never has
        // to ask: it takes the stage from a sulk, a celebration, anything.
        queued = null;
        intensity = 0;
        enterState("vibe", now);
        return;
      }

      /* One last happy shake on the way out — but only from `vibe` itself. If
         something above her in the table already took over (dying, most
         likely) a cheerful wiggle on top of it would be the wrong note
         entirely. The engine hands `shake` back to idle when it finishes. */
      if (state === "vibe") enterState("shake", now);
    };

    /* ---------------------------------------------------------------- */
    /* The light-switch gag                                              */
    /* ---------------------------------------------------------------- */

    /**
     * One beat of "anyone home?".
     *
     * Her half only: the props and the theme are `nova-lights.ts`'s, the words
     * are the bubble's, and what's left here is a body and three faces.
     *
     * `canPlay` is deliberately not consulted. The gag has already asked a
     * stricter question than this one — it refuses to start at all unless she is
     * off the mains, above 20%, off the headphones and in a good mood — and once
     * it *is* running, `caught` has to be able to land from any of its own
     * states, which an equal-priority check would allow but a stricter reading
     * of "don't interrupt yourself" would not.
     */
    const runLightsBeat = (next: LightsBeat) => {
      const now = performance.now();

      switch (next) {
        case "wonder":
          mischief = true;
          /* Reduced motion gets the calm version, which is the bubble and one
             slow swap of the page. There is no pose in it at all — the beat
             still arrives so the bubble can open, and stops here. */
          if (reducedMotion.matches) return;
          queued = null;
          intensity = 0;
          enterState("wonder", now);
          return;

        case "idea":
          if (reducedMotion.matches) return;
          svg.dataset.mischief = "idea";
          enterState("idea", now);
          return;

        case "flick":
          if (reducedMotion.matches) return;
          // Once the flicking stops being careful, so does she.
          if (getLights().phase === "crescendo") {
            svg.dataset.mischief = "glee";
          }
          // Re-entered per flick on purpose — the arm stays out and only the
          // wrist restarts. See `flick` in `nova-pose.ts`.
          enterState("flick", now);
          return;

        case "caught":
          if (reducedMotion.matches) return;
          svg.dataset.mischief = "innocent";
          queued = null;
          intensity = 0;
          enterState("caught", now);
          return;

        case "over":
          mischief = false;
          delete svg.dataset.mischief;
          // No `enterState` here: `caught` is timed and has already handed back
          // to idle by the time this lands. Cutting to idle again would only
          // restart a blend that has finished.
          return;

        case "scheme":
          // Words, not movement. The bubble has this one.
          return;
      }
    };

    /* ---------------------------------------------------------------- */
    /* Temper                                                            */
    /* ---------------------------------------------------------------- */

    /**
     * She's had enough — or has stopped having had enough.
     *
     * Only the body is here. The face is `data-temper`, written from the frame
     * loop, which is what keeps the flat mouth and the half-lidded eyes working
     * under reduced motion where none of these poses run.
     */
    const runTemper = (next: ReturnType<typeof getTemper>) => {
      const now = performance.now();

      /* Reduced motion gets the expression and nothing else: the turn rotates
         her whole body, which is precisely what the preference is asking not to
         see. The sulk still has to *start*, or the cooldown never runs and she
         never forgives anybody. */
      if (reducedMotion.matches) {
        if (next === "mad") beginSulk();
        return;
      }

      switch (next) {
        case "annoyed":
          if (!canPlay("annoyed")) return;
          queued = null;
          intensity = 0;
          enterState("annoyed", now);
          return;

        case "mad":
          if (!canPlay("turnAway")) return;
          intensity = 0;
          enterState("turnAway", now);
          /* Queued rather than timed, so the pose that holds her turned round
             takes over on the exact frame the turn finishes. A timer racing the
             engine would drop her back to idle for however many frames it lost
             by, unwinding the whole turn on screen and then redoing it. */
          queued = "sulk";
          later(beginSulk, STATE_MS.turnAway);
          return;

        case "sulking":
          // Usually already there, via the queue above. This is the belt for
          // the reduced-motion braces, and for a `mad` that lost `canPlay`.
          if (state !== "sulk" && canPlay("sulk")) enterState("sulk", now);
          return;

        case "thawing":
          if (state === "sulk" || state === "glance") {
            enterState("forgive", now);
          }
          return;

        case "delighted":
          return;
      }
    };

    /**
     * Poked while she isn't talking to you.
     *
     * The one thing a click still buys during the strike, and pointedly not a
     * reward: she looks over a shoulder, never comes far enough round to show
     * her face, and goes back to it. `queued` is what takes her back — the
     * glance is a detour off the sulk, not a state she can be left in.
     */
    const runSnub = () => {
      if (reducedMotion.matches) return;
      if (state !== "sulk" && state !== "glance") return;
      queued = "sulk";
      enterState("glance", performance.now());
    };

    /* ---------------------------------------------------------------- */
    /* Liking                                                            */
    /* ---------------------------------------------------------------- */

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "l" && event.key !== "L") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Never steal the key from someone typing into the chat or a form.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      fireLike();
    };

    const handlePointerDown = () => {
      if (reducedMotion.matches) return;
      // A flat robot doesn't flinch when you poke her.
      if (getPower().state === "dead") return;
      // Neither does one that hasn't finished powering on. She's drawn above
      // the boot overlay, so every click on the splash reaches this handler —
      // and a click on the boot screen is now supposed to do nothing at all.
      if (!getBootComplete()) return;
      svg.dataset.react = "true";
      blink();
      later(() => {
        svg.dataset.react = "false";
      }, 420);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    const offBooted = onNovaBooted(greetOnBoot);
    const offCelebrate = onCelebrate(runCelebration);
    const offPower = onPowerEvent(runPowerEvent);
    const offVibe = onVibeChange(runVibe);
    const offTemper = onTemperChange(runTemper);
    const offLights = onLightsBeat(runLightsBeat);
    const offPeek = onPeekRibbon(leanPeek);
    const offGlance = onNovaGlance(glanceAside);
    /*
     * Subscribed to the like itself rather than to a celebration, because past
     * stage one there *is* no celebration — that's the whole point. What's left
     * is the two things a refused click still gets.
     *
     * `counts && !celebrate` is exactly the exasperated stage, and it re-enters
     * the head-shake on every one of them: `onTemperChange` fires only on the
     * way in, so without this the tenth click through the fourteenth would each
     * get the first one's answer standing in for them, which reads as her
     * having stopped noticing rather than as her noticing repeatedly.
     */
    const offLike = onLike((event) => {
      if (event.celebrate || reducedMotion.matches) return;

      if (event.counts) {
        if (canPlay("annoyed")) enterState("annoyed", performance.now());
        return;
      }
      runSnub();
    });
    window.addEventListener("keydown", handleKeyDown);

    frame = requestAnimationFrame(tick);
    // Blinking survives reduced motion on purpose: it's a change of expression
    // in place, not movement across the screen, and without it NOVA reads as
    // switched off. The wave loop does not.
    scheduleBlink();
    if (!reducedMotion.matches) {
      scheduleWave();
      scheduleYawn();
      scheduleNod();
      schedulePowerup();
      scheduleIdleAct();
    }

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      offBooted();
      offCelebrate();
      offPower();
      offVibe();
      offTemper();
      offLights();
      offPeek();
      offGlance();
      offLike();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
      // Don't leave a stale charging flag pinning the mobile-ABOUT robot on.
      delete document.documentElement.dataset.charging;
    };
  }, []);

  return { stageRef, anchorRef, svgRef, bubbleRef, docked };
}
