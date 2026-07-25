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
  /** Hip rotations, degrees. Foot taps and standing on one leg. */
  legL: number;
  legR: number;
  /**
   * How far she has turned her back on you, 0–1.
   *
   * A 2D cheat, and deliberately so: a real Y-rotation on an SVG is a 3D
   * transform Firefox won't honour, and the alternative — drawing a second set
   * of geometry for her back — is a lot of shapes for a state she is in for
   * twenty seconds. Narrowing her towards the centre line and dropping the face
   * reads as a turn at every size she's ever drawn at. The width lives on
   * `.nova-lean` rather than in `bodySx`, because the legs hang outside the
   * group `bodySx` scales and a torso that turns while the feet don't is worse
   * than no turn at all.
   */
  turn: number;
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
  | "shake"
  /* --- Music ------------------------------------------------------------- */
  /** Headphones on, in the zone. Runs until the player closes. */
  | "vibe"
  /* --- Idle repertoire --------------------------------------------------- */
  /** Head cocked at something off-screen. */
  | "tilt"
  /** Turning her own hand over and looking at it. */
  | "inspect"
  /** The absent-minded sway of someone humming to themselves. */
  | "hum"
  /** Brushing something off a shoulder. */
  | "dust"
  /** Up on one foot, wobbling. */
  | "balance"
  /** A slow look back over her shoulder, and around again. */
  | "peek"
  /** A curious lean toward the right edge — she noticed the classic-build tab. */
  | "lean"
  /* --- The light-switch gag ---------------------------------------------- */
  /** "hello? still there?" — a look around, ending on the camera. */
  | "wonder"
  /** The idea landing. A pop, and she's up on her toes. */
  | "idea"
  /** One flick of the switch. Re-entered per flick; the arm stays out. */
  | "flick"
  /** Caught. Stops dead, hands behind her back, all innocence. */
  | "caught"
  /* --- Overstimulation --------------------------------------------------- */
  /** Hand on hip, and a shake of the head. Stage two. */
  | "annoyed"
  /** The turn itself. Stage three's entrance. */
  | "turnAway"
  /** Back turned, arms crossed. Runs until the cooldown is served. */
  | "sulk"
  /** Poked mid-sulk: a look over the shoulder, and back to ignoring you. */
  | "glance"
  /** Turning round again, a beat of side-eye, and softening. */
  | "forgive";

/**
 * The states that run until something else ends them, rather than for a set
 * time. The engine gives these no end timestamp, and nothing queues behind
 * them — they are left by being replaced.
 */
export const SUSTAINED: ReadonlySet<NovaState> = new Set<NovaState>([
  "idle",
  "happy",
  "vibe",
  "sulk",
]);

export type TimedState = Exclude<
  NovaState,
  "idle" | "happy" | "vibe" | "sulk"
>;

/** How long each move runs at rest intensity. */
export const STATE_MS: Record<TimedState, number> = {
  wave: 2100,
  dance: 1900,
  hop: 1050,
  yawn: 2200,
  nod: 1500,
  twitch: 720,
  stretch: 2600,
  shake: 1100,
  tilt: 2200,
  inspect: 2800,
  hum: 2600,
  dust: 1800,
  balance: 2400,
  peek: 3000,
  lean: 1700,
  wonder: 2000,
  idea: 1500,
  /* Longer than the gap between flicks on purpose. Every flick re-enters this
     state, so the reach only ever runs down when one *doesn't* arrive — which
     is the beat in the middle of the gag where she stands back and admires the
     work, and the end, where her hand comes off the switch for good. */
  flick: 1200,
  caught: 2000,
  annoyed: 1600,
  turnAway: 900,
  glance: 1000,
  forgive: 1900,
};

/**
 * The tempo she grooves at, in milliseconds per beat.
 *
 * 112bpm — the middle of the range where a nod reads as *keeping* time rather
 * than as either fighting it or falling asleep in it. Generic on purpose:
 * nothing here knows what is actually playing in the YouTube iframe, and a bob
 * synced to the wrong track is worse than one synced to none.
 */
const BEAT_MS = 60000 / 112;

/**
 * How long a move actually runs, given how flat she is.
 *
 * Only the yawn stretches: on a dying battery it plays in slow motion, which is
 * the difference between a sleepy yawn and a system running out of clock. Both
 * the engine's timer and the pose function below read this, so the animation
 * always finishes exactly when the state does.
 */
export function stateMs(state: TimedState, slump = 0): number {
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
    legL: lerp(from.legL, to.legL, t),
    legR: lerp(from.legR, to.legR, t),
    turn: lerp(from.turn, to.turn, t),
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
    legL: 0,
    legR: 0,
    turn: 0,
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

/* -------------------------------------------------------------------------- */
/* Music                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * In the zone: nodding on the beat, swaying on the bar, tapping a foot.
 *
 * Three rates rather than one, which is the whole difference between grooving
 * and ticking — the head takes the beat, the body takes the bar underneath it,
 * and the foot lands on the beat but spends most of it on the floor.
 *
 * Tiredness doesn't swap this for another move, it plays the same one slower
 * and smaller: `lazy` stretches the beat, `amp` shrinks everything reading off
 * it. At 20% she still nods along, just without the enthusiasm.
 */
function vibe(now: number, elapsed: number, droop: number): Pose {
  const base = idle(now, droop, 0);
  const lazy = 1 + droop * 1.1;
  const amp = 1 - droop * 0.55;
  const beat = (now / (BEAT_MS * lazy)) * TAU;

  // Finds the groove over the first bar rather than snapping onto the one.
  const env = ease(Math.min(1, elapsed / (BEAT_MS * 4))) * amp;

  const bob = Math.sin(beat);
  const sway = Math.sin(beat / 2);
  // Cubed and clipped: a raw sine would drift the foot continuously, which is
  // a shuffle. This lifts briefly and puts it back down.
  const tap = Math.max(0, Math.sin(beat)) ** 3;

  return {
    ...base,
    armL: base.armL + (6 + sway * 9) * env,
    armR: base.armR - (6 - sway * 9) * env,
    foreL: base.foreL - bob * 5 * env,
    foreR: base.foreR + bob * 5 * env,
    bodyY: base.bodyY + bob * 1.7 * env,
    bodyRot: base.bodyRot + sway * 3 * env,
    bodySy: base.bodySy - bob * 0.008 * env,
    chest: base.chest + Math.abs(bob) * 0.01 * env,
    headRot: base.headRot + sway * 5 * env,
    headY: base.headY + bob * 2.3 * env,
    legR: tap * 7 * env,
  };
}

/* -------------------------------------------------------------------------- */
/* Idle repertoire                                                             */
/* -------------------------------------------------------------------------- */

/*
 * Six small things to do when nobody is watching.
 *
 * All built on the resting pose and all shaped the same way — in, hold, out —
 * because they have to be able to end early: the engine cuts back to idle the
 * moment the pointer moves, and a move whose interesting part is its last frame
 * would only ever be seen by someone who had already left.
 */

/** Head cocked at something off-screen, with a second look partway through. */
function tilt(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.tilt);
  const k = p < 0.22 ? ease(p / 0.22) : p > 0.72 ? ease((1 - p) / 0.28) : 1;
  const again = Math.sin(Math.min(1, Math.max(0, (p - 0.4) / 0.3)) * Math.PI);

  return {
    ...base,
    headRot: base.headRot - (13 + again * 5) * k,
    headY: base.headY - k,
    bodyRot: base.bodyRot - 1.6 * k,
    armL: base.armL - 3 * k,
    armR: base.armR - 2 * k,
  };
}

/** Turning her own hand over and looking at it, as if she'd never seen it. */
function inspect(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.inspect);
  const raise = p < 0.24 ? ease(p / 0.24) : p > 0.78 ? ease((1 - p) / 0.22) : 1;

  // The wrist roll, windowed to the hold so the hand isn't still turning on
  // the way back down.
  const held = Math.min(1, Math.max(0, (p - 0.24) / 0.54));
  const roll = Math.sin(held * TAU) * Math.sin(held * Math.PI);

  return {
    ...base,
    armR: lerp(base.armR, -104, raise),
    foreR: lerp(base.foreR, -46, raise) + roll * 26,
    headRot: base.headRot + 9 * raise,
    headY: base.headY + 1.5 * raise,
    bodyRot: base.bodyRot + 1.2 * raise,
  };
}

/**
 * The absent sway of someone humming to themselves.
 *
 * The one idle that takes `droop` and `slump`, because it's the one that
 * survives into the low-battery pool — a tired robot can still sway.
 */
function hum(now: number, elapsed: number, droop: number, slump: number): Pose {
  const base = idle(now, droop, slump);
  const p = Math.min(1, elapsed / STATE_MS.hum);
  // In and out with no hold: it's a drift, not a gesture.
  const env = Math.sin(ease(p) * Math.PI) * (1 - droop * 0.4);
  const w = Math.sin((elapsed / 780) * TAU);

  return {
    ...base,
    bodyRot: base.bodyRot + w * 2.6 * env,
    bodyY: base.bodyY - Math.abs(w) * 0.9 * env,
    headRot: base.headRot + w * 4.5 * env,
    armL: base.armL + w * 4 * env,
    armR: base.armR + w * 4 * env,
  };
}

/** Three brisk strokes at a shoulder that didn't have anything on it. */
function dust(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.dust);
  const reach = p < 0.26 ? ease(p / 0.26) : p > 0.72 ? ease((1 - p) / 0.28) : 1;

  const held = Math.min(1, Math.max(0, (p - 0.26) / 0.46));
  const brush = Math.sin(held * TAU * 3) * Math.sin(held * Math.PI);

  return {
    ...base,
    armR: lerp(base.armR, -68, reach),
    foreR: lerp(base.foreR, -96, reach) + brush * 16,
    armL: base.armL - 4 * reach,
    headRot: base.headRot + 4 * reach,
    bodyRot: base.bodyRot + 1.4 * reach,
  };
}

/** Up on one foot. The wobble is the joke — she isn't good at this. */
function balance(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.balance);
  const up = p < 0.2 ? ease(p / 0.2) : p > 0.76 ? ease((1 - p) / 0.24) : 1;
  const wobble = Math.sin((elapsed / 420) * TAU) * up;

  return {
    ...base,
    legL: -16 * up,
    armL: lerp(base.armL, 46, up) + wobble * 9,
    armR: lerp(base.armR, -46, up) - wobble * 9,
    foreL: base.foreL + wobble * 7,
    foreR: base.foreR - wobble * 7,
    bodyY: base.bodyY - 2.5 * up,
    bodyRot: base.bodyRot + wobble * 3.4 - 2 * up,
    headRot: base.headRot - wobble * 3,
  };
}

/** Round, a pause at the far end — the pause is the looking — and back. */
function peek(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.peek);
  const t =
    p < 0.38 ? ease(p / 0.38) : p < 0.62 ? 1 : 1 - ease((p - 0.62) / 0.38);

  return {
    ...base,
    turn: 0.82 * t,
    bodyRot: base.bodyRot + 3 * t,
    headRot: base.headRot - 7 * t,
    armL: base.armL + 8 * t,
    armR: base.armR + 8 * t,
  };
}

/**
 * A lean toward the right edge, and a curious craning of the head.
 *
 * Triggered when the classic-build ribbon over there is hovered — she leans out
 * to see what caught the visitor's eye. Positive `bodyRot` tips her towards
 * screen-right (see `.nova-lean` in `nova.css`), and the gaze is aimed the same
 * way from `GAZE_BIAS`. Eases in, holds, eases back, so it reads as a look
 * rather than a jolt.
 */
function lean(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.lean);
  const t = p < 0.3 ? ease(p / 0.3) : p > 0.82 ? ease((1 - p) / 0.18) : 1;

  return {
    ...base,
    bodyRot: base.bodyRot + 6 * t,
    bodyY: base.bodyY - 1.5 * t,
    headRot: base.headRot + 4 * t,
    armR: base.armR + 5 * t,
    foreR: base.foreR - 6 * t,
  };
}

/* -------------------------------------------------------------------------- */
/* The light-switch gag                                                        */
/* -------------------------------------------------------------------------- */

/*
 * Four beats of "anyone home?", in order. The props — the switch on the wall and
 * the lamp overhead — are DOM, not geometry: they have to fade in beside a robot
 * who is a third of her size when docked, and drawing them into her viewBox
 * would shrink them with her. What's here is only her half of it.
 *
 * The gaze is not here either. `useNovaStage` scripts it for `wonder` and biases
 * it for the rest, the same way it does for the idle repertoire.
 */

/**
 * The look around: one way, then the other, then straight down the lens.
 *
 * The damping over the last quarter is what makes it land on the camera rather
 * than sweep past it — without it she is still turning when the bubble opens,
 * and "hello? still there?" reads as being said to the wall.
 */
function wonder(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.wonder);
  const damp = p < 0.72 ? 1 : Math.max(0, ease((1 - p) / 0.28));
  const sweep = Math.sin(p * TAU) * damp;
  // She straightens up as she gives up on looking and just asks.
  const settle = ease(Math.max(0, (p - 0.72) / 0.28));

  return {
    ...base,
    headRot: base.headRot + sweep * 10,
    bodyRot: base.bodyRot + sweep * 2.6,
    armL: base.armL + sweep * 3.5,
    armR: base.armR + sweep * 3.5,
    bodyY: base.bodyY - 1.4 * settle,
    chest: base.chest + 0.008 * settle,
  };
}

/**
 * The idea.
 *
 * One sharp pop and then nothing — she holds, up on her toes, while the props
 * arrive around her. The stillness after the pop is the point: an idea that
 * keeps bouncing is excitement, and this is a plan.
 */
function idea(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.idea);
  const pop = Math.sin(ease(Math.min(1, p / 0.2)) * Math.PI);
  const held = ease(Math.min(1, p / 0.3));

  return {
    ...base,
    bodyY: base.bodyY - 6 * pop - 1.6 * held,
    bodySx: base.bodySx - 0.03 * pop,
    bodySy: base.bodySy + 0.045 * pop,
    chest: base.chest + 0.018 * held,
    headRot: base.headRot - 4 * pop,
    headY: base.headY - 2.4 * pop,
    armL: base.armL + 18 * pop + 7 * held,
    armR: base.armR - 18 * pop - 7 * held,
  };
}

/**
 * One flick.
 *
 * Two envelopes on different clocks, which is the whole trick. `reach` runs on
 * the state's own progress and holds the arm out at the switch for the length of
 * the state; `snap` runs on raw elapsed time and is over in a fifth of a second.
 * Re-entering per flick therefore restarts the wrist without the arm ever coming
 * down — at the crescendo's fastest she is flicking, not reaching again.
 *
 * The switch is drawn to her left on screen, so it's the left arm that goes out.
 */
function flick(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.flick);
  const reach = p > 0.86 ? ease((1 - p) / 0.14) : ease(Math.min(1, p / 0.12));
  const snap = Math.sin(Math.min(1, elapsed / 220) * Math.PI);

  return {
    ...base,
    armL: lerp(base.armL, 88, reach) - snap * 5,
    foreL: lerp(base.foreL, -14, reach) + snap * 26,
    armR: base.armR + 5 * reach,
    // The shoulders bouncing with each one — the tell that she's enjoying this.
    bodyY: base.bodyY - 1.2 * reach - snap * 1.8,
    bodyRot: base.bodyRot - 2 * reach - snap * 1.4,
    headRot: base.headRot - 5 * reach,
  };
}

/**
 * Caught.
 *
 * The freeze is the first sixteenth and it is *nothing* — no pose change at all,
 * so the blend out of whatever she was mid-way through stops dead rather than
 * easing. Only then do the arms go.
 *
 * Hands behind her back is a 2D cheat, like the turn: the arms are drawn behind
 * the torso, so folding the forearms hard inward puts the hands out of sight
 * without needing a hand to hide. The small sway afterwards is someone standing
 * very still and hoping it's enough.
 */
function caught(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.caught);
  const hide = ease(Math.min(1, Math.max(0, (p - 0.06) / 0.2)));
  const innocent = Math.sin((elapsed / 900) * TAU) * 0.9 * hide;

  return {
    ...base,
    armL: lerp(base.armL, 10, hide),
    armR: lerp(base.armR, -10, hide),
    foreL: lerp(base.foreL, -104, hide),
    foreR: lerp(base.foreR, 104, hide),
    bodyY: base.bodyY + 1.5 * hide,
    bodyRot: base.bodyRot + innocent,
    headRot: base.headRot + innocent * 1.7,
    // Chin up. Nothing to see here.
    headY: base.headY - 1.2 * hide,
  };
}

/* -------------------------------------------------------------------------- */
/* Overstimulation                                                             */
/* -------------------------------------------------------------------------- */

/** Arms folded, `k` of the way. Shared by the turn, the sulk, and the thaw. */
function crossArms(base: Pose, k: number): Pose {
  return {
    ...base,
    armL: lerp(base.armL, 74, k),
    armR: lerp(base.armR, -74, k),
    foreL: lerp(base.foreL, -68, k),
    foreR: lerp(base.foreR, 68, k),
  };
}

/** Hand on hip, and a shake of the head. Sharper the harder she's leaned on. */
function annoyed(now: number, elapsed: number, intensity: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.annoyed);
  const set = p < 0.2 ? ease(p / 0.2) : p > 0.78 ? ease((1 - p) / 0.22) : 1;
  // Decaying, so the last shake is a twitch rather than a fourth full swing.
  const shakes = Math.sin(p * TAU * (3 + intensity)) * (1 - p) * set;

  return {
    ...base,
    armL: lerp(base.armL, 52, set),
    foreL: lerp(base.foreL, -74, set),
    armR: base.armR + 4 * set,
    headRot: base.headRot + shakes * 9,
    bodyY: base.bodyY - set,
    bodyRot: base.bodyRot - shakes * 2.6 - 1.2 * set,
  };
}

/** The flounce: she leads with a shoulder and lands a little heavier. */
function turnAway(now: number, elapsed: number): Pose {
  const base = idle(now);
  const t = ease(Math.min(1, elapsed / STATE_MS.turnAway));

  return {
    ...crossArms(base, t),
    turn: t,
    bodyRot: base.bodyRot - 4 * Math.sin(t * Math.PI),
    bodyY: base.bodyY + 1.2 * t,
    headRot: base.headRot + 3 * t,
  };
}

/**
 * Back turned, arms crossed, for as long as the cooldown lasts.
 *
 * The huff runs on absolute time like the idle it's built on. A sulk outlives
 * whatever poked her halfway through it, and a breath that restarted on every
 * poke would read as flinching rather than as ignoring you.
 */
function sulk(now: number): Pose {
  const base = idle(now);
  const huff = Math.sin((now / 3400) * TAU);

  return {
    ...crossArms(base, 1),
    turn: 1,
    bodyY: base.bodyY + 1.4 + huff * 0.7,
    bodyRot: base.bodyRot + huff * 0.9,
    headRot: base.headRot + 4,
  };
}

/**
 * Poked mid-sulk. Out and back with no hold, and never far enough round to
 * show the face — the whole point is that she isn't staying.
 */
function glance(now: number, elapsed: number): Pose {
  const base = sulk(now);
  const k = Math.sin(ease(Math.min(1, elapsed / STATE_MS.glance)) * Math.PI);

  return {
    ...base,
    turn: base.turn - 0.28 * k,
    headRot: base.headRot - 11 * k,
    bodyRot: base.bodyRot - 2.4 * k,
  };
}

/**
 * The thaw, in three beats: round most of the way, a held side-eye, and only
 * then the arms. Turning and unfolding at once would be someone who was never
 * really cross.
 */
function forgive(now: number, elapsed: number): Pose {
  const base = idle(now);
  const p = Math.min(1, elapsed / STATE_MS.forgive);

  const turn =
    p < 0.45
      ? lerp(1, 0.3, ease(p / 0.45))
      : p < 0.63
        ? 0.3
        : lerp(0.3, 0, ease((p - 0.63) / 0.37));
  const soften = ease(Math.min(1, Math.max(0, (p - 0.63) / 0.37)));

  return {
    ...crossArms(base, 1 - soften),
    turn,
    headRot: base.headRot - 8 * (1 - soften),
    bodyRot: base.bodyRot + 2 * (1 - soften),
    bodyY: base.bodyY + 1.2 * (1 - soften),
  };
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
    case "vibe":
      return vibe(now, elapsed, droop);
    case "tilt":
      return tilt(now, elapsed);
    case "inspect":
      return inspect(now, elapsed);
    case "hum":
      return hum(now, elapsed, droop, slump);
    case "dust":
      return dust(now, elapsed);
    case "balance":
      return balance(now, elapsed);
    case "peek":
      return peek(now, elapsed);
    case "lean":
      return lean(now, elapsed);
    case "wonder":
      return wonder(now, elapsed);
    case "idea":
      return idea(now, elapsed);
    case "flick":
      return flick(now, elapsed);
    case "caught":
      return caught(now, elapsed);
    case "annoyed":
      return annoyed(now, elapsed, intensity);
    case "turnAway":
      return turnAway(now, elapsed);
    case "sulk":
      return sulk(now);
    case "glance":
      return glance(now, elapsed);
    case "forgive":
      return forgive(now, elapsed);
    default:
      return idle(now, droop, slump);
  }
}

export const restingPose = idle;
