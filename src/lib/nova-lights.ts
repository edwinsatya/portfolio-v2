/**
 * "Anyone home?" — the light-switch gag.
 *
 * The one thing NOVA does that isn't a reaction. Everything else on this page
 * answers something the visitor did; this happens because they *stopped*. After
 * a minute of nothing she goes looking for them, finds the stage lights instead,
 * and works out that flicking the whole site on and off might get their
 * attention. It usually does — which is the joke, because the moment they come
 * back she is standing perfectly still with her hands behind her back.
 *
 * Once per session, and never twice: it's a bit, and a bit told twice is a tic.
 *
 * Three consumers, and the split between them is deliberate:
 *
 *   the store   — the props. Where the lamp is, whether it's glowing, whether
 *                 the panel is on stage. Rendered by `StageLights`.
 *   the beats   — her body and her face, driven by `useNovaStage`, which owns
 *                 the pose engine and is the only thing allowed to move her.
 *   the theme   — `setThemeOverride`, which paints over the visitor's choice
 *                 without ever becoming it. See `theme.ts`.
 *
 * Nothing here touches `localStorage`. The whole event is visual, and the
 * restore at the end is "stop painting over it" rather than anything remembered.
 */

import { getBootComplete, getNovaVibing, getStageBusy } from "./nova-bus";
import { getTemper } from "./nova-temper";
import { getPower, spendOnMischief } from "./power";
import { getChosenTheme, setThemeOverride, type Theme } from "./theme";

/* -------------------------------------------------------------------------- */
/* Timing                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Silence before she gives up on being watched.
 *
 * Deliberately far past the idle repertoire's 20–40s, and measured from the last
 * *input* rather than the last pointer move: the repertoire is what she does
 * while you're reading, and this is what she does once she's fairly sure you've
 * gone. A visitor scrolling slowly through the work section is still there.
 */
const DEEP_IDLE_MS = 60000;

/** Looking around, and asking. */
const WONDER_MS = 2000;
/** The idea, and the props arriving. */
const IDEA_MS = 1500;
/** Gap between the two careful flicks, and before the scheming line. */
const TEST_BEAT_MS = 1000;
/** How long the flicking is allowed to accelerate for. */
const CRESCENDO_MS = 3500;
/**
 * Each gap is this much of the last one: 1s, 0.72, 0.52, then the floor.
 *
 * Tuned so she *reaches* top speed with a third of the budget still to spend,
 * rather than being cut off mid-acceleration — a crescendo that stops before its
 * loudest note is just a ramp. The last four flicks all land on the floor, which
 * is the bit that reads as somebody who has completely lost the plot.
 */
const FLICK_DECAY = 0.72;
/**
 * The hard floor between toggles — about 2.8 a second.
 *
 * Not a tuning knob. Below this the page stops reading as a light being flicked
 * and starts reading as a strobe, which is a genuine hazard rather than a joke,
 * and the 150ms cross-fade would no longer have time to land between flips.
 */
const FLICK_FLOOR_MS = 350;
/** Caught, and the props leaving. */
const CAUGHT_MS = 2000;

/** The cross-fade each flick gets. Comfortably inside the floor above. */
const FADE_MS = 150;

/* The reduced-motion version: the bubble, one slow swap, and back. */
const CALM_FADE_MS = 600;
const CALM_HOLD_MS = 1800;

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

export type LightsPhase =
  | "off"
  | "wondering"
  | "idea"
  | "testing"
  | "crescendo"
  | "caught"
  /** The reduced-motion version, which has no props and no phases of its own. */
  | "calm";

export type Lights = {
  phase: LightsPhase;
  /** The props are on stage. Drives whether `StageLights` renders at all. */
  present: boolean;
  /** The lamp is being hoisted back up and the panel fading out. */
  leaving: boolean;
  /**
   * The lamp is glowing.
   *
   * Always equal to "the page is currently light", which is what keeps the prop
   * honest: a lamp that was lit over a dark page would be a lamp lighting
   * nothing. For a visitor who chose dark it therefore descends already out,
   * and her first flick turns it *on* — the gag reads identically either way.
   */
  lit: boolean;
  /** Increments per flick, so the panel can replay its click. */
  flicks: number;
};

/**
 * One beat of the gag, for the things that can't be derived from the store.
 *
 * Her poses are one-shots — a pop, a snap, a freeze — and a snapshot can only
 * say what is true now, not that something just happened. Same split as
 * `power.ts`, which pairs a level with a `PowerEvent` for exactly this reason.
 */
export type LightsBeat =
  /** Looking around. "hello? still there?" */
  | "wonder"
  /** The lightbulb moment. */
  | "idea"
  /** One flick, just landed. */
  | "flick"
  /** "hm. maybe this'll wake them up." */
  | "scheme"
  /** Hands behind back. "...you saw nothing." */
  | "caught"
  /** Over. Props gone, theme restored, back to her own business. */
  | "over";

const OFF: Lights = {
  phase: "off",
  present: false,
  leaving: false,
  lit: true,
  flicks: 0,
};

let snapshot: Lights = OFF;

const listeners = new Set<() => void>();
const beatListeners = new Set<(beat: LightsBeat) => void>();

function set(patch: Partial<Lights>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

function beat(next: LightsBeat): void {
  beatListeners.forEach((listener) => listener(next));
}

export function subscribeLights(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLights(): Lights {
  return snapshot;
}

/* Hoisted for the same reason as `SERVER_POWER`: `useSyncExternalStore` compares
   server snapshots by identity, and a fresh object every render loops forever. */
export function getServerLights(): Lights {
  return OFF;
}

export function onLightsBeat(listener: (beat: LightsBeat) => void): () => void {
  beatListeners.add(listener);
  return () => {
    beatListeners.delete(listener);
  };
}

/* -------------------------------------------------------------------------- */
/* The sequence                                                                */
/* -------------------------------------------------------------------------- */

/** Once a session. Set the moment it commits, not when it ends. */
let spent = false;
let running = false;

/** The theme she flips *to*. Fixed at the start — see `flip`. */
let opposite: Theme = "dark";
/** Whether the override is currently applied. */
let flipped = false;

let idleTimer = 0;
const timers = new Set<number>();

const later = (fn: () => void, ms: number) => {
  const id = window.setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
};

const clearTimers = () => {
  timers.forEach(window.clearTimeout);
  timers.clear();
};

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Whether now is a moment for a joke.
 *
 * Read at the instant the timer fires rather than tracked, because every one of
 * these can change during the minute of silence that got us here — a track can
 * start playing, a battery can cross 20%, a charge can finish.
 *
 * The battery check covers `low`, `critical` and `dead` at once: she cannot
 * afford it, and a robot too flat to stand up straight staging a prank about the
 * lights would undo the whole power arc. Charging is out for the opposite
 * reason — she is plugged into the wall and going nowhere.
 *
 * Temper is the strictest of the lot: anything short of `delighted` means the
 * visitor has already worn her patience out, and mischief is something you do
 * for someone you like.
 */
function allowed(): boolean {
  const power = getPower();
  return (
    getBootComplete() &&
    !getStageBusy() &&
    !getNovaVibing() &&
    !power.charging &&
    !power.dragging &&
    power.state === "normal" &&
    getTemper() === "delighted"
  );
}

/**
 * Flip the page, and the lamp with it.
 *
 * `opposite` is fixed when the sequence starts rather than recomputed per flick:
 * `chosen` can only move via a terminal command, which needs a keystroke, which
 * ends the gag — so this can't go stale, and pinning it means an interrupted
 * flick always has exactly one thing to undo.
 */
function flip(): void {
  flipped = !flipped;
  setThemeOverride(flipped ? opposite : null, { ms: FADE_MS });
  set({
    lit: (flipped ? opposite : getChosenTheme()) === "light",
    flicks: snapshot.flicks + 1,
  });
  beat("flick");
}

/** Puts the visitor's own theme back, whatever state the flicking was in. */
function restore(): void {
  if (!flipped) return;
  flipped = false;
  setThemeOverride(null, { ms: FADE_MS });
}

function finish(): void {
  clearTimers();
  running = false;
  restore();
  set({ phase: "off", present: false, leaving: false, lit: true });
  beat("over");
  // No re-arming. That's the whole of "at most once per session".
}

/**
 * Caught in the act — the ending, and the best part of it.
 *
 * Reached two ways and they are the same code on purpose: the sequence running
 * out on its own, and the visitor coming back mid-flick. The second is what the
 * whole gag is built for, so it cannot be a lesser version of the first.
 */
function caught(): void {
  if (!running || snapshot.phase === "caught") return;

  // The calm version has nothing to be caught *doing*: no props to hoist, no
  // flicking to stop, and a robot protesting her innocence over a page that
  // merely dimmed once would be a punchline without its joke. It just ends.
  if (snapshot.phase === "calm") {
    finish();
    return;
  }

  clearTimers();

  // The theme goes back first, on the same beat the hands go behind the back.
  restore();
  set({
    phase: "caught",
    leaving: true,
    lit: getChosenTheme() === "light",
  });
  beat("caught");
  later(finish, CAUGHT_MS);
}

/**
 * The calm version, for anyone who asked not to watch things move.
 *
 * Not a trimmed-down sequence — a different one. The flicking *is* the gag, and
 * there is no version of it at any speed that a visitor with that preference set
 * should be shown, so what's left is the half that was never motion: she asks
 * whether anyone's there, the page dims once and comes back.
 *
 * The fade is forced on rather than inherited. `theme.ts` skips its cross-fade
 * under reduced motion because a snap is the right answer for a swap the visitor
 * asked for and is watching for; here the swap is the entire event, and snapping
 * it twice would read as the page glitching rather than as a light being turned
 * down. A slow colour fade is not the kind of motion the preference is about.
 */
function runCalm(): void {
  set({ phase: "calm" });
  beat("wonder");

  later(() => {
    flipped = true;
    setThemeOverride(opposite, { ms: CALM_FADE_MS, fade: true });
    set({ lit: opposite === "light" });
  }, WONDER_MS);

  later(() => {
    flipped = false;
    setThemeOverride(null, { ms: CALM_FADE_MS, fade: true });
    set({ lit: getChosenTheme() === "light" });
  }, WONDER_MS + CALM_HOLD_MS);

  later(finish, WONDER_MS + CALM_HOLD_MS + CALM_FADE_MS);
}

/**
 * The flicking, accelerating.
 *
 * The gap is used before it is shrunk, so the first one still matches the beat
 * of the careful flicks that came before and the acceleration is something the
 * visitor hears start rather than arrives at. Rounded because it's a timeout,
 * and a schedule of 8072.5ms is only ever a number nobody rounded.
 */
function runCrescendo(): void {
  set({ phase: "crescendo" });

  let gap = TEST_BEAT_MS;
  let elapsed = 0;

  const step = () => {
    flip();
    elapsed += gap;
    later(elapsed > CRESCENDO_MS ? caught : step, gap);
    gap = Math.max(FLICK_FLOOR_MS, Math.round(gap * FLICK_DECAY));
  };

  step();
}

/** Two careful flicks with a beat either side. She's testing it works. */
function runTesting(): void {
  set({ phase: "testing" });

  flip();
  later(flip, TEST_BEAT_MS);
  later(() => beat("scheme"), TEST_BEAT_MS * 2);
  later(runCrescendo, TEST_BEAT_MS * 3);
}

function runFull(): void {
  set({ phase: "wondering" });
  beat("wonder");

  later(() => {
    // The props arrive on the idea, not before it: the lamp coming down while
    // she is still looking around would give away where this is going.
    set({
      phase: "idea",
      present: true,
      leaving: false,
      lit: getChosenTheme() === "light",
    });
    beat("idea");
    later(runTesting, IDEA_MS);
  }, WONDER_MS);
}

function begin(): void {
  if (spent || running) return;
  if (!allowed()) {
    // Not now. Nothing has been spent, so wait out another minute of silence
    // and ask again — the reason it was refused is usually temporary.
    arm();
    return;
  }

  spent = true;
  running = true;
  flipped = false;
  opposite = getChosenTheme() === "light" ? "dark" : "light";
  spendOnMischief();

  if (reduced()) runCalm();
  else runFull();
}

function arm(): void {
  window.clearTimeout(idleTimer);
  if (spent) return;
  idleTimer = window.setTimeout(begin, DEEP_IDLE_MS);
}

/* -------------------------------------------------------------------------- */
/* Watching for silence                                                        */
/* -------------------------------------------------------------------------- */

/*
 * Ref-counted like `startPowerClock`, so StrictMode's double-mount can't leave
 * two watchers racing each other to start the same one-shot.
 */

let watchers = 0;
let detach: (() => void) | null = null;

/**
 * Every way a visitor can prove they're still there.
 *
 * Wider than the stage loop's pointer tracking, and it has to be: someone
 * reading with the keyboard, or scrolling a phone with a thumb, never moves a
 * pointer at all, and a robot who decided they'd left and started flicking the
 * lights at them would be the exact opposite of charming.
 */
const INPUTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

/**
 * Starts watching for the silence that triggers the gag. Returns a stop.
 *
 * Called from `NovaStage` alongside the power and temper clocks, and for the
 * same reason: it's a side effect on the whole page rather than on anything that
 * happens to render.
 */
export function startLightsWatch(): () => void {
  if (typeof window === "undefined") return () => {};

  if (watchers++ === 0) {
    const onInput = () => {
      // Mid-gag, any input at all is the punchline rather than an interruption
      // to be handled — see `caught`.
      if (running) {
        caught();
        return;
      }
      arm();
    };

    INPUTS.forEach((type) =>
      window.addEventListener(type, onInput, { passive: true }),
    );
    detach = () =>
      INPUTS.forEach((type) => window.removeEventListener(type, onInput));

    arm();
  }

  return () => {
    if (--watchers > 0) return;
    detach?.();
    detach = null;
    window.clearTimeout(idleTimer);
    clearTimers();
    // Whatever it was in the middle of, the visitor's own theme goes back. A
    // page that unmounted the stage mid-flick must not be left painted dark.
    running = false;
    restore();
    snapshot = OFF;
    listeners.forEach((listener) => listener());
  };
}
