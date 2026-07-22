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
};

export type NovaState = "idle" | "wave" | "dance" | "hop" | "happy" | "yawn";

/** How long each move runs at rest intensity. */
export const STATE_MS: Record<Exclude<NovaState, "idle" | "happy">, number> = {
  wave: 2100,
  dance: 1900,
  hop: 1050,
  yawn: 2200,
};

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
  };
}

/**
 * Resting pose: breathing, and arms hanging with a slow sway.
 *
 * Driven by absolute time rather than time-since-entry, so returning to idle
 * rejoins the breath already in progress instead of restarting it — the body
 * never hitches when a celebration ends.
 *
 * `droop` (0–1) is how flat the battery is. It slows the breath, sinks the body,
 * and lets the arms hang dead rather than swinging — the same idle, tired. It's
 * a continuous parameter rather than a separate "tired" state so that charging
 * back up walks her out of it frame by frame instead of snapping her upright.
 */
function idle(now: number, droop = 0): Pose {
  // The whole clock slows down, so the bob and the sway stretch together.
  const slow = 1 + droop * 1.35;
  const breath = Math.sin((now / (4600 * slow)) * TAU);
  const sway = 1 - droop * 0.75;

  return {
    armL: 1.5 + Math.sin((now / (5200 * slow)) * TAU) * 2 * sway + droop * 3,
    armR:
      1.5 + Math.sin((now / (5900 * slow)) * TAU + Math.PI) * 2 * sway - droop * 3,
    foreL: droop * 5,
    foreR: -droop * 5,
    // Sinks on her legs, and the breath shallows out.
    bodyY: -2 + breath * 2 * (1 - droop * 0.55) + droop * 4,
    bodyRot: 0,
    bodySx: 1 + droop * 0.012,
    bodySy: 1 - droop * 0.02,
    chest: 1 + ((breath + 1) / 2) * 0.018 * (1 - droop * 0.4),
  };
}

/**
 * The yawn: a slow stretch up, a hold, and a heavier slump than she started in.
 *
 * Only ever played on a low battery, where the arms are already hanging — which
 * is why it's built on the drooped idle rather than the upright one.
 */
function yawn(now: number, elapsed: number, droop: number): Pose {
  const base = idle(now, droop);
  const p = Math.min(1, elapsed / STATE_MS.yawn);

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
 * `droop` only reaches the states that can play on a flat battery. The
 * celebrations can't — she refuses them below 20% — so threading it into them
 * would be describing a pose that never renders.
 */
export function poseFor(
  state: NovaState,
  now: number,
  elapsed: number,
  intensity: number,
  droop = 0,
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
    case "yawn":
      return yawn(now, elapsed, droop);
    default:
      return idle(now, droop);
  }
}

export const restingPose = idle;
