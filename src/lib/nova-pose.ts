/**
 * NOVA's pose engine.
 *
 * Every limb position is a *number computed each frame*, not a CSS keyframe.
 * That's the whole point: keyframe animations can only be swapped, and swapping
 * one mid-flight snaps the limb from wherever it is to the next animation's
 * first frame. Numbers can be blended, so a new move always grows out of the
 * pose NOVA is actually in.
 *
 * A state is a pure function of elapsed time and intensity. The engine in
 * `useNovaStage` crossfades between whatever was on screen and the new state's
 * output, which is what makes every transition — including the return to idle —
 * continuous by construction.
 */

export type Pose = {
  /** Shoulder rotations, degrees. Negative lifts the left arm outward. */
  armL: number;
  armR: number;
  /** Elbow rotations, degrees. */
  foreL: number;
  foreR: number;
  /** Whole-body lift, viewBox units. Negative is up. */
  bodyY: number;
  /** Body tilt at the feet, degrees. */
  bodyRot: number;
  /** Whole-body squash/stretch. */
  bodySx: number;
  bodySy: number;
  /** Torso-only breath, so the chest leads. */
  chest: number;
  /**
   * Head droop at the neck, degrees, and its sink in viewBox units.
   *
   * The head is in the pose rather than in CSS because the power states need it
   * to *move* — nodding off, twitching awake, lifting out of a slump — and a
   * keyframe there would fight the gaze. CSS adds these on top of the gaze's own
   * rotation, so she can still be looking at you while her head hangs.
   */
  headRot: number;
  headY: number;
};

export type NovaState =
  | "idle"
  | "wave"
  | "dance"
  | "hop"
  | "happy"
  | "yawn"
  /** Fighting sleep on a critical battery: head sinks, then jerks back up. */
  | "nod"
  /** The reboot jolt, the instant a dead battery takes its first charge. */
  | "twitch"
  /** Waking up: the long stretch, arms overhead. */
  | "stretch"
  /** "I'm back!" — the happy wiggle when the charge clears battery saver. */
  | "shake";

/** How long each move runs at rest intensity. */
export const STATE_MS: Record<Exclude<NovaState, "idle" | "happy">, number> = {
  wave: 2100,
  dance: 1900,
  hop: 1050,
  yawn: 2200,
  nod: 1500,
  twitch: 720,
  stretch: 2600,
  shake: 1100,
};

/**
 * How long a move actually runs, given how flat she is.
 *
 * Only the yawn stretches: on a dying battery it plays in slow motion, which is
 * the difference between a sleepy yawn and a system running out of clock. Both
 * the engine's timer and the pose function below read this, so the animation
 * always finishes exactly when the state does.
 */
export function stateMs(
  state: Exclude<NovaState, "idle" | "happy">,
  slump = 0,
): number {
  return state === "yawn" ? STATE_MS.yawn * (1 + slump * 1.1) : STATE_MS[state];
}

const TAU = Math.PI * 2;

/** Smootherstep — zero velocity at both ends, so blends have no visible corner. */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function blendPose(from: Pose, to: Pose, t: number): Pose {
  return {
    armL: lerp(from.armL, to.armL, t),
    armR: lerp(from.armR, to.armR, t),
    foreL: lerp(from.foreL, to.foreL, t),
    foreR: lerp(from.foreR, to.foreR, t),
    bodyY: lerp(from.bodyY, to.bodyY, t),
    bodyRot: lerp(from.bodyRot, to.bodyRot, t),
    bodySx: lerp(from.bodySx, to.bodySx, t),
    bodySy: lerp(from.bodySy, to.bodySy, t),
    chest: lerp(from.chest, to.chest, t),
    headRot: lerp(from.headRot, to.headRot, t),
    headY: lerp(from.headY, to.headY, t),
  };
}

/**
 * Resting pose: breathing, and arms hanging with a slow sway.
 *
 * Driven by absolute time rather than time-since-entry, so returning to idle
 * rejoins the breath already in progress instead of restarting it — the body
 * never hitches when a celebration ends.
 *
 * Two power parameters, both 0–1 and both continuous so that charging walks her
 * back out of them frame by frame instead of snapping her upright:
 *
 *   `droop` — how flat the battery is. Slows the breath, sinks the body, and
 *             lets the arms hang dead rather than swinging. The same idle, tired.
 *   `slump` — how far past tired she is. Kills the breath outright, hangs the
 *             head forward, and adds the totter of something that can barely
 *             stand. At 1 she is a powered-off machine holding itself up: no
 *             breath, no sway, nothing.
 */
function idle(now: number, droop = 0, slump = 0): Pose {
  // The whole clock slows down, so the bob and the sway stretch together.
  const slow = 1 + droop * 1.35 + slump * 2.4;
  const breath = Math.sin((now / (4600 * slow)) * TAU);
  const sway = 1 - droop * 0.75;
  // What's left of her: the breath fades out entirely as she powers down.
  const life = 1 - slump;

  /* The totter of barely standing. Peaks mid-collapse and returns to nothing at
     both ends — upright doesn't sway, and neither does a machine that has
     finished shutting down. It's the *dying* that wobbles. */
  const stagger =
    Math.sin((now / 2700) * TAU) * 1.7 * slump * (1 - slump) * 4;

  return {
    armL: 1.5 + Math.sin((now / (5200 * slow)) * TAU) * 2 * sway * life + droop * 3 + slump * 4,
    armR:
      1.5 +
      Math.sin((now / (5900 * slow)) * TAU + Math.PI) * 2 * sway * life -
      droop * 3 -
      slump * 4,
    foreL: droop * 5 + slump * 6,
    foreR: -droop * 5 - slump * 6,
    // Sinks on her legs, and the breath shallows out.
    bodyY: -2 + breath * 2 * (1 - droop * 0.55) * life + droop * 4 + slump * 7,
    bodyRot: stagger,
    bodySx: 1 + droop * 0.012 + slump * 0.022,
    bodySy: 1 - droop * 0.02 - slump * 0.032,
    chest: 1 + ((breath + 1) / 2) * 0.018 * (1 - droop * 0.4) * life,
    /* Almost all of the hang is rotation. The head is drawn over the torso, so
       sinking it far enough to read as a slump instead reads as it coming off
       her shoulders — the few units here are only what stops the rotation from
       looking like a head merely turned to one side. */
    headRot: slump * 13,
    headY: slump * 3.5,
  };
}

/**
 * The yawn: a slow stretch up, a hold, and a heavier slump than she started in.
 *
 * Only ever played on a low battery, where the arms are already hanging — which
 * is why it's built on the drooped idle rather than the upright one. On a
 * critical battery `stateMs` stretches it out, and the same duration is used
 * here, so it decelerates rather than finishing early and holding.
 */
function yawn(now: number, elapsed: number, droop: number, slump: number): Pose {
  const base = idle(now, droop, slump);
  const p = Math.min(1, elapsed / stateMs("yawn", slump));

  // Up over the first third, held, down over the last quarter — slower at both
  // ends than a wave, because a tired stretch has no snap in it.
  const stretch =
    p < 0.34 ? ease(p / 0.34) : p > 0.74 ? ease((1 - p) / 0.26) : 1;

  return {
    ...base,
    armL: lerp(base.armL, 96, stretch),
    armR: lerp(base.armR, -96, stretch),
    foreL: lerp(base.foreL, 26, stretch),
    foreR: lerp(base.foreR, -26, stretch),
    bodyY: base.bodyY - 3 * stretch,
    bodySy: base.bodySy + 0.02 * stretch,
    chest: base.chest + 0.02 * stretch,
    // The head comes up with the yawn and falls back further than it started.
    headRot: base.headRot - 5 * stretch,
    headY: base.headY - 2 * stretch,
  };
}

/**
 * Nodding off, and catching herself.
 *
 * The whole read is in the asymmetry: the head sinks over most of the move and
 * comes back in a fraction of it, overshooting past neutral before settling.
 * A symmetrical nod is agreement; this is losing the fight and losing it again.
 */
function nod(now: number, elapsed: number, droop: number, slump: number): Pose {
  const base = idle(now, droop, slump);
  const p = Math.min(1, elapsed / STATE_MS.nod);

  const sink =
    p < 0.62
      ? ease(p / 0.62)
      : p < 0.74
        ? 1 - ease((p - 0.62) / 0.12) * 1.28
        : lerp(-0.28, 0, ease((p - 0.74) / 0.26));

  return {
    ...base,
    headRot: base.headRot + 15 * sink,
    headY: base.headY + 4 * sink,
    bodyY: base.bodyY + 1.6 * sink,
    chest: base.chest - 0.006 * sink,
  };
}

/**
 * The reboot jolt.
 *
 * Two hard, decaying jerks — the machine finding out it has power again before
 * anything else does. Deliberately short and deliberately not smooth.
 */
function twitch(now: number, elapsed: number, droop: number, slump: number): Pose {
  const base = idle(now, droop, slump);
  const p = Math.min(1, elapsed / STATE_MS.twitch);
  const jolt = Math.sin(p * TAU * 2.4) * (1 - p) * (1 - p);

  return {
    ...base,
    headRot: base.headRot - 11 * jolt,
    headY: base.headY - 2 * jolt,
    bodyY: base.bodyY - 1.4 * jolt,
    bodySy: base.bodySy + 0.012 * jolt,
    armL: base.armL - 4 * jolt,
    armR: base.armR + 4 * jolt,
  };
}

/**
 * The waking stretch: arms overhead, back arched, chin up, held and released.
 *
 * Longer and slower than the yawn it precedes, and built on the drooped idle for
 * the same reason — she is stretching *out of* a slump, not from standing.
 */
function stretch(now: number, elapsed: number, droop: number, slump: number): Pose {
  const base = idle(now, droop, slump);
  const p = Math.min(1, elapsed / STATE_MS.stretch);
  const s = p < 0.3 ? ease(p / 0.3) : p > 0.7 ? ease((1 - p) / 0.3) : 1;

  return {
    ...base,
    armL: lerp(base.armL, 152, s),
    armR: lerp(base.armR, -152, s),
    foreL: lerp(base.foreL, 15, s),
    foreR: lerp(base.foreR, -15, s),
    bodyY: base.bodyY - 5 * s,
    bodySx: base.bodySx - 0.02 * s,
    bodySy: base.bodySy + 0.036 * s,
    chest: base.chest + 0.03 * s,
    headRot: base.headRot - 7 * s,
    headY: base.headY - 2 * s,
  };
}

/** Raise from the shoulder, flap from the elbow, lower. */
function wave(now: number, elapsed: number, intensity: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.wave);
  const lift = 1 + intensity * 0.15;

  // Up over the first fifth, hold, down over the last fifth.
  const raise = p < 0.18 ? ease(p / 0.18) : p > 0.82 ? ease((1 - p) / 0.18) : 1;
  const flap = Math.sin((p - 0.18) * TAU * 2.6) * 22 * raise;

  return {
    ...base,
    armR: lerp(base.armR, -142 * lift, raise),
    foreR: flap,
    bodyRot: base.bodyRot - 1.5 * raise,
  };
}

/** Hips wiggle, both arms up and swinging. */
function dance(now: number, elapsed: number, intensity: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.dance);
  const amp = 1 + intensity * 0.45;

  // Ramps so the wiggle grows and settles rather than starting at full tilt.
  const env = p < 0.3 ? ease(p / 0.3) : p > 0.75 ? ease((1 - p) / 0.25) : 1;
  const swing = Math.sin(p * TAU * 2.5);

  return {
    ...base,
    armL: lerp(base.armL, (124 + swing * 14) * amp, env),
    armR: lerp(base.armR, (-124 + swing * 14) * amp, env),
    foreL: swing * 12 * env,
    foreR: -swing * 12 * env,
    bodyRot: swing * 5.5 * amp * env,
    bodyY: base.bodyY - 2 * env,
  };
}

/**
 * "I'm back!" — a fast side-to-side wiggle with the arms loose.
 *
 * Shorter and snappier than the dance on purpose: this isn't a celebration she
 * chose, it's the shake of something coming back online.
 */
function shake(now: number, elapsed: number, intensity: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.shake);
  const amp = 1 + intensity * 0.3;

  const env = p < 0.14 ? ease(p / 0.14) : p > 0.7 ? ease((1 - p) / 0.3) : 1;
  const w = Math.sin(p * TAU * 4.2);

  return {
    ...base,
    armL: base.armL + w * 28 * amp * env,
    armR: base.armR + w * 28 * amp * env,
    foreL: -w * 15 * env,
    foreR: -w * 15 * env,
    bodyRot: w * 7 * amp * env,
    bodyY: base.bodyY - 2.5 * env,
    headRot: -w * 5 * env,
  };
}

/** Crouch, launch, land with a squash. */
function hop(now: number, elapsed: number, intensity: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.hop);
  const height = 34 * (1 + intensity * 0.35);

  let y = 0;
  let sx = 1;
  let sy = 1;

  if (p < 0.16) {
    // Anticipation — the crouch is what sells the jump.
    const k = ease(p / 0.16);
    y = 4 * k;
    sx = 1 + 0.05 * k;
    sy = 1 - 0.06 * k;
  } else if (p < 0.72) {
    // Airborne: a parabola, so it decelerates up and accelerates down.
    const k = (p - 0.16) / 0.56;
    y = -height * 4 * k * (1 - k);
    sx = 1 - 0.03 * Math.sin(k * Math.PI);
    sy = 1 + 0.05 * Math.sin(k * Math.PI);
  } else {
    // Landing squash, recovering to neutral.
    const k = ease((p - 0.72) / 0.28);
    y = 5 * Math.sin(k * Math.PI);
    sx = 1 + 0.07 * Math.sin(k * Math.PI);
    sy = 1 - 0.08 * Math.sin(k * Math.PI);
  }

  const armLift = -18 * Math.sin(Math.min(1, p / 0.72) * Math.PI);

  return {
    ...base,
    armL: base.armL + armLift,
    armR: base.armR - armLift,
    bodyY: base.bodyY + y,
    bodySx: sx,
    bodySy: sy,
  };
}

/** Idle, but pleased — the face carries this one, the body just lifts a little. */
function happy(now: number, _elapsed: number, intensity: number): Pose {
  const base = idle(now);
  return { ...base, bodyY: base.bodyY - 1.5 * (0.5 + intensity * 0.5) };
}

/**
 * The pose a state wants right now.
 *
 * `droop` and `slump` only reach the states that can play on a flat battery. The
 * celebrations can't — she refuses them below 20% — so threading them into those
 * would be describing a pose that never renders. `shake` is the exception among
 * the happy moves: it fires at exactly the moment she clears 20%, by which point
 * both are on their way to nothing anyway.
 */
export function poseFor(
  state: NovaState,
  now: number,
  elapsed: number,
  intensity: number,
  droop = 0,
  slump = 0,
): Pose {
  switch (state) {
    case "wave":
      return wave(now, elapsed, intensity);
    case "dance":
      return dance(now, elapsed, intensity);
    case "hop":
      return hop(now, elapsed, intensity);
    case "happy":
      return happy(now, elapsed, intensity);
    case "shake":
      return shake(now, elapsed, intensity);
    case "yawn":
      return yawn(now, elapsed, droop, slump);
    case "nod":
      return nod(now, elapsed, droop, slump);
    case "twitch":
      return twitch(now, elapsed, droop, slump);
    case "stretch":
      return stretch(now, elapsed, droop, slump);
    default:
      return idle(now, droop, slump);
  }
}

export const restingPose = idle;
