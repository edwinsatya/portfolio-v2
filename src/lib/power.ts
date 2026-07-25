/**
 * NOVA's battery.
 *
 * A plain module store, read through `useSyncExternalStore` like `memory.ts` —
 * the level is genuinely external state (it keeps moving whether or not anything
 * is rendering, and it outlives the tab), so React owns a snapshot of it rather
 * than the value itself.
 *
 * Two numbers matter and only one is exposed. `raw` is the real, fractional
 * level the clock integrates; the snapshot rounds it. That split is what keeps
 * listeners quiet: draining a whole percent takes ~13s, so a 250ms clock emits
 * roughly once every fifty ticks instead of on every one.
 *
 * The *shape* of her body — how drooped, how collapsed — is deliberately not in
 * the snapshot. Those are read once per animation frame by the stage loop, which
 * wants the fractional level: rounding them into the snapshot would quantise a
 * collapse that plays out over five percent into five visible steps.
 */

const STORAGE_KEY = "nova.power.v1";

/** Returning visitors never land on a drained robot. */
const LOAD_FLOOR = 60;

/** Battery saver kicks in here. */
export const LOW_AT = 20;
/** Running on fumes: she can barely stand. */
export const CRITICAL_AT = 5;

/**
 * Where the body starts to collapse, a few percent above `CRITICAL_AT`.
 *
 * Offset for the same reason `droop` starts above `LOW_AT`: a posture that
 * arrives exactly with the state it belongs to reads as a switch flipping, and
 * a beat of warning is what makes the state change feel earned.
 */
const SLUMP_FROM = 8;

/**
 * Passive drain, tuned so a ~17-minute browse takes 100% down to 20%.
 * Expressed per millisecond because the clock integrates real elapsed time
 * rather than counting ticks — a throttled background timer must not bank
 * drain it didn't earn.
 */
const DRAIN_PER_MS = 80 / (17 * 60 * 1000);

/** Roughly 3%/sec, so a full charge from empty is a satisfying ~30s. */
const CHARGE_PER_MS = 3 / 1000;

/** What a dance/hop/wave costs on top of the passive drain. */
const CELEBRATION_MIN = 1;
const CELEBRATION_MAX = 2;
/**
 * What the light-switch gag costs.
 *
 * Flat rather than the celebration's range: it's one scripted event of a known
 * length that happens at most once a visit, so there is nothing for a random
 * cost to vary *with*. Priced at the top of a celebration — it runs twelve
 * seconds and drives the whole page, which is more than a wave.
 */
const MISCHIEF_COST = 2;
/** Window after a completed charge in which celebrating is on the house. */
const CHARGE_GRACE_MS = 4000;

/** Clock period. Fine enough that charging reads as a fill, not a staircase. */
const TICK_MS = 250;
/** A tick longer than this means the timer was throttled; don't bank it all. */
const MAX_STEP_MS = 1000;
/** How often the level is written back to storage. */
const PERSIST_MS = 5000;

export type PowerState = "normal" | "low" | "critical" | "dead";

export type Power = {
  /** 0–100, rounded. */
  level: number;
  charging: boolean;
  /** The plug is in the visitor's hand. Drives NOVA's port glowing. */
  dragging: boolean;
  state: PowerState;
};

/**
 * The one-shot beats worth animating.
 *
 * Everything continuous — the sag, the dimming, the vignette — falls out of the
 * level on its own. These are the moments that need a *gesture*, and a gesture
 * can't be derived from a number that's already moved past it.
 */
export type PowerEvent =
  /** Hit 0%. Powers down. */
  | "died"
  /** Charging lifted her off 0%. The revival spark. */
  | "spark"
  /** Charging crossed out of critical. She starts genuinely waking up. */
  | "waking"
  /** Charging crossed back over `LOW_AT`. "I'm back!" */
  | "revived";

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

/* Same defensive shape as `memory.ts`: Safari's private mode hands you a
   localStorage that throws the moment you write to it. */

function readStored(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(level: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, level.toFixed(2));
  } catch {
    // Blocked storage just means every visit starts full.
  }
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function stateFor(level: number): PowerState {
  if (level <= 0) return "dead";
  if (level <= CRITICAL_AT) return "critical";
  if (level <= LOW_AT) return "low";
  return "normal";
}

/**
 * How tired she looks, 0–1.
 *
 * Continuous rather than derived from `state` so charging reads as
 * *progressively* waking up rather than a switch flipping at 20%. Starts
 * creeping in a little above the low threshold, which gives the battery-saver
 * switch a beat of warning.
 */
function droopFor(level: number): number {
  return clamp((28 - level) / 20, 0, 1);
}

/**
 * How far the body has collapsed, 0–1: 0 at `SLUMP_FROM`, 1 at flat.
 *
 * Distinct from `droop`, which has already saturated by the time this starts.
 * Tiredness is a posture she can hold; this is her losing the ability to hold
 * it, and it's what the revival walks back out of percent by percent.
 */
function slumpFor(level: number): number {
  return clamp((SLUMP_FROM - level) / SLUMP_FROM, 0, 1);
}

let raw = 100;
let charging = false;
let dragging = false;
let loaded = false;
/** When the last charge finished. See `spendOnCelebration`. */
let chargedAt = -Infinity;

/* The snapshot has to be referentially stable between changes or
   `useSyncExternalStore` re-renders forever. Rebuilt only when something in it
   actually differs. */
let snapshot: Power = {
  level: 100,
  charging: false,
  dragging: false,
  state: "normal",
};

const listeners = new Set<() => void>();

function emit(): void {
  const level = Math.round(raw);
  const state = stateFor(level);

  if (
    snapshot.level === level &&
    snapshot.charging === charging &&
    snapshot.dragging === dragging
  ) {
    return;
  }

  const was = snapshot.state;
  snapshot = { level, charging, dragging, state };
  listeners.forEach((listener) => listener());

  // After the store listeners, so anything reacting to an event already sees
  // the new level rather than the one it just left.
  if (was !== state) announce(was, state);
}

/** Turns a state change into the one-shot beat it deserves, if any. */
function announce(was: PowerState, now: PowerState): void {
  if (now === "dead") {
    fireEvent("died");
    return;
  }
  // Every other beat is part of the revival, and only means anything on the
  // way up — `/set-battery-40` is a jump, not a resurrection.
  if (!charging) return;
  if (was === "dead") fireEvent("spark");
  else if (was === "critical") fireEvent("waking");
  else if (was === "low" && now === "normal") fireEvent("revived");
}

/**
 * Restores the stored level, floored at 60%.
 *
 * Lazy rather than at module load: this runs on the server too, where there is
 * no storage, and a snapshot taken before hydration must match what the server
 * rendered.
 *
 * The floor is the safety rail on the whole death arc — a first-time or
 * returning visitor can never *land* on a dead or critical NOVA, however flat
 * she was when they closed the tab. She only ever dies live, in front of them.
 */
function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  raw = stored === null ? 100 : clamp(Math.max(stored, LOAD_FLOOR), 0, 100);
  emit();
}

export function subscribePower(listener: () => void): () => void {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPower(): Power {
  load();
  return snapshot;
}

/* Hoisted rather than built per call: `useSyncExternalStore` compares server
   snapshots by identity, and a fresh object every render is an infinite loop. */
const SERVER_POWER: Power = {
  level: 100,
  charging: false,
  dragging: false,
  state: "normal",
};

/** The server can't read storage, and a full battery is the honest default. */
export function getServerPower(): Power {
  return SERVER_POWER;
}

/**
 * Nothing on the page answers while she's flat.
 *
 * One predicate rather than four `state === "dead"` comparisons scattered
 * around, so the feature locks all read as the same rule — and all lift the
 * moment the level does.
 */
export function isDead(): boolean {
  return getPower().state === "dead";
}

/* -------------------------------------------------------------------------- */
/* Body shape — per-frame, fractional                                          */
/* -------------------------------------------------------------------------- */

/* Read by the stage loop every frame rather than through the snapshot: these
   want the un-rounded level. Returned as two scalars rather than one object so
   sixty frames a second allocate nothing. */

/** 0–1, how tired the body reads. See `droopFor`. */
export function getDroop(): number {
  load();
  return droopFor(raw);
}

/** 0–1, how far the body has collapsed. See `slumpFor`. */
export function getSlump(): number {
  load();
  return slumpFor(raw);
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

const eventListeners = new Set<(event: PowerEvent) => void>();

export function onPowerEvent(
  listener: (event: PowerEvent) => void,
): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

function fireEvent(event: PowerEvent): void {
  eventListeners.forEach((listener) => listener(event));
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A celebration's extra cost.
 *
 * Free while plugged in, and free for a beat after a charge completes: hitting
 * 100% fires the victory dance itself, and billing her 2% for it would drop the
 * readout off a full battery in the same second the visitor earned it.
 */
export function spendOnCelebration(): void {
  if (charging) return;
  if (performance.now() - chargedAt < CHARGE_GRACE_MS) return;
  const cost = CELEBRATION_MIN + Math.random() * (CELEBRATION_MAX - CELEBRATION_MIN);
  raw = Math.max(0, raw - cost);
  emit();
}

/**
 * The light-switch gag's cost.
 *
 * The same two guards as a celebration, and for the same reasons — though
 * neither can fire here in practice: the gag refuses to start unless the battery
 * is normal and she is off the mains. They're kept because the rule is "moving
 * costs her something, unless she's plugged in", and a second spender that
 * quietly disagreed with the first would be the bug.
 */
export function spendOnMischief(): void {
  if (charging) return;
  if (performance.now() - chargedAt < CHARGE_GRACE_MS) return;
  raw = Math.max(0, raw - MISCHIEF_COST);
  emit();
}

/**
 * Jumps the battery straight to a level.
 *
 * A development affordance, reached only from the hidden `/set-battery-N`
 * terminal command — the drain is tuned to ~17 minutes, and waiting that out to
 * look at the low-power states is not a workflow. Clamped to the same 0–100
 * range the clock respects, so it can't put the store somewhere the clock
 * couldn't, and it persists like any other change.
 *
 * Returns the level actually applied, which is what the caller echoes back.
 */
export function setLevel(next: number): number {
  load();
  raw = clamp(next, 0, 100);
  writeStored(raw);
  emit();
  return Math.round(raw);
}

export function startCharging(): void {
  if (charging) return;
  charging = true;
  dragging = false;
  emit();
}

export function stopCharging(): void {
  if (!charging) return;
  charging = false;
  writeStored(raw);
  emit();
}

/** The plug has been picked up, or dropped. */
export function setDragging(next: boolean): void {
  if (dragging === next) return;
  dragging = next;
  emit();
}

/* -------------------------------------------------------------------------- */
/* Clock                                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Ref-counted so StrictMode's double-mount can't leave two clocks draining her
 * twice as fast, and so the interval exists only while something is rendering.
 */

let clocks = 0;
let timer = 0;
let lastAt = 0;
let persistedAt = 0;
let offVisibility: (() => void) | null = null;

function tick(): void {
  const now = performance.now();

  // Hidden tabs don't drain at all. The timestamp still moves forward, so
  // coming back doesn't cash in the whole time away in one step.
  if (document.hidden) {
    lastAt = now;
    return;
  }

  const step = Math.min(MAX_STEP_MS, now - lastAt);
  lastAt = now;

  if (charging) {
    raw = Math.min(100, raw + step * CHARGE_PER_MS);
    // Topped up: the cable pops out, and whoever is listening throws a party.
    if (raw >= 100) {
      raw = 100;
      chargedAt = now;
      stopCharging();
      fullListeners.forEach((listener) => listener());
    }
  } else {
    // All the way to zero. The only floor left is the one on `load`, so a
    // session can end in the dark without any later visit opening there.
    raw = Math.max(0, raw - step * DRAIN_PER_MS);
  }

  if (now - persistedAt > PERSIST_MS) {
    persistedAt = now;
    writeStored(raw);
  }

  emit();
}

/** Fires once the charge completes. */
const fullListeners = new Set<() => void>();

export function onCharged(listener: () => void): () => void {
  fullListeners.add(listener);
  return () => {
    fullListeners.delete(listener);
  };
}

/**
 * Starts the drain/charge clock. Returns a stop function.
 *
 * Called from one place (`NovaStage`), because the clock is a side effect on the
 * whole app rather than on any component that happens to read the level.
 */
export function startPowerClock(): () => void {
  load();

  if (clocks++ === 0) {
    lastAt = performance.now();
    persistedAt = lastAt;
    timer = window.setInterval(tick, TICK_MS);

    // A closing tab gets no more ticks, so the last few seconds would be lost.
    const flush = () => writeStored(raw);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    offVisibility = () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }

  return () => {
    if (--clocks > 0) return;
    window.clearInterval(timer);
    offVisibility?.();
    offVisibility = null;
    writeStored(raw);
  };
}

/* -------------------------------------------------------------------------- */
/* Readout                                                                     */
/* -------------------------------------------------------------------------- */

/** Five cells, e.g. `[▮▮▮▮▯]`. Only ever empty at a true zero. */
export function batteryCells(level: number): string {
  const filled = level <= 0 ? 0 : clamp(Math.max(1, Math.round(level / 20)), 0, 5);
  return `[${"▮".repeat(filled)}${"▯".repeat(5 - filled)}]`;
}

/**
 * The band, a few percent below `LOW_AT`, where the gauge turns from amber to
 * red-orange and starts its slow heartbeat.
 */
export const URGENT_AT = 10;

/**
 * How loud the battery readout should be, 0–100.
 *
 * Finer than `PowerState` by design. `PowerState` describes how the *page*
 * dims, where a single `low` covers the whole 5–20 band; the gauge wants one
 * more step inside it, so it can go amber at the battery-saver line and shift to
 * red-orange as ten percent approaches. Kept next to the thresholds it reads so
 * the tiers can't drift from the states they sit inside.
 *
 * Charging outranks every level: a plugged-in robot is recovering, and the
 * gauge says so in green whatever the number reads.
 */
export type BatteryUrgency =
  | "ok"
  | "charging"
  | "warn"
  | "urgent"
  | "critical"
  | "dead";

export function batteryUrgency(
  level: number,
  charging: boolean,
): BatteryUrgency {
  if (charging) return "charging";
  if (level <= 0) return "dead";
  if (level <= CRITICAL_AT) return "critical";
  if (level <= URGENT_AT) return "urgent";
  if (level <= LOW_AT) return "warn";
  return "ok";
}
