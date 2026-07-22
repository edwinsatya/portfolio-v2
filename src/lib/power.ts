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
 */

const STORAGE_KEY = "nova.power.v1";

/** Returning visitors never land on a drained robot. */
const LOAD_FLOOR = 60;
/** She runs down but never dies — 0% would just be a broken-looking page. */
const RESERVE_FLOOR = 5;

/** Battery saver kicks in here. */
export const LOW_AT = 20;
/** Standing nap here. */
export const RESERVE_AT = 5;

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
/** Window after a completed charge in which celebrating is on the house. */
const CHARGE_GRACE_MS = 4000;

/** Clock period. Fine enough that charging reads as a fill, not a staircase. */
const TICK_MS = 250;
/** A tick longer than this means the timer was throttled; don't bank it all. */
const MAX_STEP_MS = 1000;
/** How often the level is written back to storage. */
const PERSIST_MS = 5000;

export type PowerState = "normal" | "low" | "reserve";

export type Power = {
  /** 5–100, rounded. */
  level: number;
  charging: boolean;
  /** The plug is in the visitor's hand. Drives NOVA's port glowing. */
  dragging: boolean;
  state: PowerState;
  /**
   * 0–1, how tired she looks. Continuous rather than derived from `state` so
   * charging reads as *progressively* waking up rather than a switch flipping
   * at 20%. Starts creeping in a little above the low threshold, which gives
   * the battery-saver switch a beat of warning.
   */
  droop: number;
};

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
  if (level <= RESERVE_AT) return "reserve";
  if (level <= LOW_AT) return "low";
  return "normal";
}

/** 0 at 28%, 1 at 8%. See the note on `Power.droop`. */
function droopFor(level: number, state: PowerState): number {
  if (state === "reserve") return 1;
  return clamp((28 - level) / 20, 0, 1);
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
  droop: 0,
};

const listeners = new Set<() => void>();

function emit(): void {
  const level = Math.round(raw);
  const state = stateFor(level);
  const droop = Math.round(droopFor(level, state) * 100) / 100;

  if (
    snapshot.level === level &&
    snapshot.charging === charging &&
    snapshot.dragging === dragging &&
    snapshot.droop === droop
  ) {
    return;
  }

  snapshot = { level, charging, dragging, state, droop };
  listeners.forEach((listener) => listener());
}

/**
 * Restores the stored level, floored at 60%.
 *
 * Lazy rather than at module load: this runs on the server too, where there is
 * no storage, and a snapshot taken before hydration must match what the server
 * rendered.
 */
function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  raw = stored === null ? 100 : clamp(Math.max(stored, LOAD_FLOOR), RESERVE_FLOOR, 100);
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
  droop: 0,
};

/** The server can't read storage, and a full battery is the honest default. */
export function getServerPower(): Power {
  return SERVER_POWER;
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
  raw = Math.max(RESERVE_FLOOR, raw - cost);
  emit();
}

/**
 * Jumps the battery straight to a level.
 *
 * A development affordance, reached only from the hidden `/set-battery-N`
 * terminal command — the drain is tuned to ~17 minutes, and waiting that out to
 * look at the low-power states is not a workflow. Clamped to the same 5–100
 * range the clock respects, so it can't put the store somewhere the clock
 * couldn't, and it persists like any other change.
 *
 * Returns the level actually applied, which is what the caller echoes back.
 */
export function setLevel(next: number): number {
  load();
  raw = clamp(next, RESERVE_FLOOR, 100);
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
    raw = Math.max(RESERVE_FLOOR, raw - step * DRAIN_PER_MS);
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

/** Five cells, e.g. `[▮▮▮▮▯]`. Never empty above the reserve floor. */
export function batteryCells(level: number): string {
  const filled = clamp(Math.max(1, Math.round(level / 20)), 0, 5);
  return `[${"▮".repeat(filled)}${"▯".repeat(5 - filled)}]`;
}
