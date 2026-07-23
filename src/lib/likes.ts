/**
 * The like counter behind the ♥ readout.
 *
 * Split deliberately into "how many other people liked this" and "how many
 * times *you* did". Today the first number is a constant and the second lives in
 * localStorage; swapping in a real backend means replacing `loadBaseCount` and
 * `pushLike` with fetches and leaving every component untouched — the store
 * shape, the subscription, and the optimistic increment all stay as they are.
 */

const STORAGE_KEY = "nova.likes.v1";
/** Stands in for a server-side total until there is one. */
const BASE_COUNT = 1284;
/** Sanity ceiling, so a stuck key can't render a nonsense number. */
const MAX_VISITOR_LIKES = 9999;

export type LikeState = {
  /** Everyone else's likes. Server-owned once there's a server. */
  base: number;
  /** This visitor's own, from storage. */
  mine: number;
  /** What the counter renders. */
  total: number;
  /** False until the client has read storage — the server can't know `mine`. */
  ready: boolean;
};

const INITIAL: LikeState = {
  base: BASE_COUNT,
  mine: 0,
  total: BASE_COUNT,
  ready: false,
};

let state: LikeState = INITIAL;
const listeners = new Set<() => void>();

function emit(next: LikeState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function readMine(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = Number(window.localStorage.getItem(STORAGE_KEY));
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(Math.floor(raw), MAX_VISITOR_LIKES);
  } catch {
    // Private mode. Likes just don't persist; everything else still works.
    return 0;
  }
}

function writeMine(value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Best effort — never worth interrupting a visit over.
  }
}

/** Replace with a fetch when there's an endpoint. */
async function loadBaseCount(): Promise<number> {
  return BASE_COUNT;
}

/** Replace with a POST when there's an endpoint. Fire-and-forget by design. */
async function pushLike(): Promise<void> {}

export function subscribeLikes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLikesSnapshot(): LikeState {
  return state;
}

/** Server render has no storage and no fetch; this reference never changes. */
export function getServerLikesSnapshot(): LikeState {
  return INITIAL;
}

let started = false;

/** Reads storage and the base count. Safe to call more than once. */
export function initLikes(): void {
  if (started) return;
  started = true;

  const mine = readMine();
  emit({ base: state.base, mine, total: state.base + mine, ready: true });

  void loadBaseCount().then((base) => {
    if (base === state.base) return;
    emit({ ...state, base, total: base + state.mine });
  });
}

/**
 * Records one like. Increments optimistically so the counter answers the
 * keypress immediately rather than waiting on a round trip it doesn't yet make.
 */
export function addLike(): void {
  if (state.mine >= MAX_VISITOR_LIKES) return;

  const mine = state.mine + 1;
  writeMine(mine);
  emit({ ...state, mine, total: state.base + mine, ready: true });
  void pushLike();
}

/** Wired to the footer's "NOVA forgets you" — likes are visitor data too. */
export function clearLikes(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best effort.
  }
  emit({ ...state, mine: 0, total: state.base, ready: true });
}
