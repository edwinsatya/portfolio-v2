/**
 * What NOVA remembers between visits.
 *
 * Two layers live here. The bottom half is plain localStorage access, safe to
 * call anywhere including during SSR: when storage is blocked, reads return an
 * empty memory and writes quietly do nothing, which lands the visitor in the
 * first-visit experience rather than an error. The top half is a tiny store that
 * React subscribes to through `useSyncExternalStore`, so components re-render
 * when the memory changes without anyone reaching for an effect.
 */

import { clearLikes } from "./likes";

const STORAGE_KEY = "nova.memory.v1";
const MAX_NAME_LENGTH = 24;

export type NovaMemory = {
  /**
   * Running total of visits. Read from a `VisitState.previous` snapshot it is
   * therefore the number of visits *before* this one — which is what makes
   * `visitCount === 0` the test for a first-time visitor.
   */
  visitCount: number;
  visitorName: string | null;
  /** Section ids whose introduction NOVA has already given, ever. */
  sectionsSeen: string[];
  /** Epoch ms of the previous visit. */
  lastVisit: number | null;
};

export const EMPTY_MEMORY: NovaMemory = {
  visitCount: 0,
  visitorName: null,
  sectionsSeen: [],
  lastVisit: null,
};

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Safari's private mode exposes `localStorage` but throws the moment you write
 * to it, so feature-detecting the object is not enough — only a round trip
 * proves it works.
 */
function getStore(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    const store = window.localStorage;
    const probe = "__nova_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function isMemoryAvailable(): boolean {
  return getStore() !== null;
}

/** Control characters stripped, whitespace trimmed, length capped. */
export function sanitizeName(raw: string): string | null {
  const clean = Array.from(raw)
    // Filtered by code point rather than a regex, so the source stays free of
    // literal control characters.
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join("")
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  return clean.length > 0 ? clean : null;
}

/** Anything could be sitting under our key, so nothing is trusted on the way in. */
function coerce(raw: unknown): NovaMemory {
  if (typeof raw !== "object" || raw === null) return EMPTY_MEMORY;

  const value = raw as Record<string, unknown>;
  const visitCount = Number(value.visitCount);
  const lastVisit = Number(value.lastVisit);

  return {
    visitCount:
      Number.isFinite(visitCount) && visitCount > 0 ? Math.floor(visitCount) : 0,
    visitorName:
      typeof value.visitorName === "string"
        ? sanitizeName(value.visitorName)
        : null,
    sectionsSeen: Array.isArray(value.sectionsSeen)
      ? value.sectionsSeen.filter((id): id is string => typeof id === "string")
      : [],
    lastVisit: Number.isFinite(lastVisit) && lastVisit > 0 ? lastVisit : null,
  };
}

export function readMemory(): NovaMemory {
  const store = getStore();
  if (!store) return EMPTY_MEMORY;

  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? coerce(JSON.parse(raw)) : EMPTY_MEMORY;
  } catch {
    // Corrupt JSON — treat them as new rather than blowing up.
    return EMPTY_MEMORY;
  }
}

function writeMemory(patch: Partial<NovaMemory>): void {
  const store = getStore();
  if (!store) return;

  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...readMemory(), ...patch }));
  } catch {
    // Quota exceeded or storage revoked mid-session. Nothing here is important
    // enough to interrupt the visit over.
  }
}

function clearStoredMemory(): void {
  try {
    getStore()?.removeItem(STORAGE_KEY);
  } catch {
    // Best effort, same as above.
  }
}

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

export type VisitState = {
  /**
   * Memory as it stood when this page load began — every greeting decision
   * reads from here, not from live storage, which already counts this visit.
   * Null until `beginVisit` has run.
   */
  previous: NovaMemory | null;
  /** The name in play right now, including one given seconds ago. */
  name: string | null;
  /** False in private mode or wherever storage is blocked. */
  available: boolean;
  /** Bumped when the visitor is forgotten, so consumers can reset. */
  generation: number;
};

const INITIAL_STATE: VisitState = {
  previous: null,
  name: null,
  available: false,
  generation: 0,
};

// Replaced wholesale on every change, never mutated — `useSyncExternalStore`
// compares snapshots by identity.
let state: VisitState = INITIAL_STATE;
const listeners = new Set<() => void>();

function emit(next: VisitState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeMemory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMemorySnapshot(): VisitState {
  return state;
}

/** The server has no memory, and this reference never changes. */
export function getServerMemorySnapshot(): VisitState {
  return INITIAL_STATE;
}

/**
 * Captures the pre-visit snapshot and records that this visit happened.
 *
 * Safe to call more than once — React StrictMode deliberately runs mount effects
 * twice in development, and the guard is what keeps that from counting the visit
 * twice.
 */
export function beginVisit(): void {
  if (state.previous) return;

  const previous = readMemory();

  emit({
    previous,
    name: previous.visitorName,
    available: isMemoryAvailable(),
    generation: 0,
  });

  writeMemory({
    visitCount: previous.visitCount + 1,
    lastVisit: Date.now(),
  });
}

/** Returns the stored name, or null if what they typed was empty. */
export function setVisitorName(raw: string): string | null {
  const name = sanitizeName(raw);
  writeMemory({ visitorName: name });
  emit({ ...state, name });
  return name;
}

/** Adds a section to the seen list, keeping it unique. */
export function rememberSection(id: string): void {
  const seen = readMemory().sectionsSeen;
  if (seen.includes(id)) return;
  writeMemory({ sectionsSeen: [...seen, id] });
}

// Separate from the store subscription above: the store says *what* the memory
// now is, this says *that a wipe just happened* — which is what NOVA reacts to.
const forgetListeners = new Set<() => void>();

export function onForget(listener: () => void): () => void {
  forgetListeners.add(listener);
  return () => {
    forgetListeners.delete(listener);
  };
}

/** Wipes everything and drops back to the first-visit state. */
export function forgetVisitor(): void {
  clearStoredMemory();
  // Likes are visitor data too — "forget me" that leaves a like count behind
  // would be a lie.
  clearLikes();

  emit({
    previous: EMPTY_MEMORY,
    name: null,
    available: state.available,
    generation: state.generation + 1,
  });

  forgetListeners.forEach((listener) => listener());
}
