/**
 * A one-message channel between the hero's suggestion chips and the chat panel.
 *
 * The chips live in the page flow and the panel lives on a fixed overlay, so
 * nothing useful wraps both — the same reason `onForget` exists in `memory.ts`.
 * A module-level listener set is smaller and clearer than threading a context
 * provider around the whole tree for one interaction.
 */

import { isDead } from "./power";

type AskListener = (question?: string) => void;

const listeners = new Set<AskListener>();

export function onAskNova(listener: AskListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Opens the chat. With a `question`, also sends it as if the visitor had typed
 * it; without one, just opens the panel — which is what the nav's chat button
 * wants.
 */
export function askNova(question?: string): void {
  listeners.forEach((listener) => listener(question));
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

const bootListeners = new Set<() => void>();
let hasBooted = false;

/**
 * Fires when the boot screen finishes, so NOVA can greet on arrival.
 *
 * Late subscribers are called immediately: the stage and the boot screen mount
 * in the same tick and there's no guaranteed order between them, so a listener
 * that arrives after the event would otherwise miss the only greeting.
 */
export function onNovaBooted(listener: () => void): () => void {
  if (hasBooted) {
    listener();
    return () => {};
  }
  bootListeners.add(listener);
  return () => {
    bootListeners.delete(listener);
  };
}

export function novaBooted(): void {
  if (hasBooted) return;
  hasBooted = true;
  bootListeners.forEach((listener) => listener());
  emitStatus();
}

/* -------------------------------------------------------------------------- */
/* Likes                                                                       */
/* -------------------------------------------------------------------------- */

/** Where the burst should originate, in viewport pixels. */
export type LikeOrigin = { x: number; y: number } | null;

type LikeListener = (origin: LikeOrigin) => void;

const likeListeners = new Set<LikeListener>();

export function onLike(listener: LikeListener): () => void {
  likeListeners.add(listener);
  return () => {
    likeListeners.delete(listener);
  };
}

/**
 * Fires a love burst. `origin` is optional — without one the hearts launch from
 * NOVA's head, which is what the L key and a tap on the robot both want.
 *
 * Locked at 0%. The guard is here rather than at the four things that can like
 * — the key, the counter, the tagline, the robot herself — because they all
 * mean the same thing, and a lock that lives at the chokepoint can't be walked
 * around by a fifth caller later. Silent by design: the hearts are NOVA
 * reacting, and there is nothing there to react.
 */
export function fireLike(origin: LikeOrigin = null): void {
  if (isDead()) return;
  likeListeners.forEach((listener) => listener(origin));
}

/* -------------------------------------------------------------------------- */
/* No power                                                                    */
/* -------------------------------------------------------------------------- */

/*
 * Something was clicked that a flat battery can't do.
 *
 * One channel for every locked feature, so the answer is the same wherever the
 * visitor pokes: a brief dark toast and nothing else. Kept separate from the
 * power store because it isn't state — it's the *refusal*, and two refusals in
 * a row have to read as two.
 */

const noPowerListeners = new Set<() => void>();

export function onNoPower(listener: () => void): () => void {
  noPowerListeners.add(listener);
  return () => {
    noPowerListeners.delete(listener);
  };
}

export function noPower(): void {
  noPowerListeners.forEach((listener) => listener());
}

/* -------------------------------------------------------------------------- */
/* Celebrations                                                                */
/* -------------------------------------------------------------------------- */

/** The three things NOVA does when she's pleased. */
export type Celebration = "wave" | "dance" | "hop";

type CelebrateListener = (kind: Celebration) => void;

const celebrateListeners = new Set<CelebrateListener>();

export function onCelebrate(listener: CelebrateListener): () => void {
  celebrateListeners.add(listener);
  return () => {
    celebrateListeners.delete(listener);
  };
}

/** Picks one at random unless a specific one is asked for. */
export function celebrate(kind?: Celebration): void {
  const pick: Celebration =
    kind ?? (["wave", "dance", "hop"] as const)[Math.floor(Math.random() * 3)];
  celebrateListeners.forEach((listener) => listener(pick));
}

/* -------------------------------------------------------------------------- */
/* Charging port                                                               */
/* -------------------------------------------------------------------------- */

/*
 * Where the cable plugs in, in viewport pixels — NOVA's chest lamp.
 *
 * Written by the stage loop, which already computes her transform every frame,
 * and read by the charger overlay. A plain module variable rather than a CSS
 * custom property (the pattern the love burst uses) because the charger needs
 * the number in JS to draw a bezier through it, and `getComputedStyle` every
 * frame would be a synchronous style flush per frame.
 */

let portX = 0;
let portY = 0;

export function setNovaPort(x: number, y: number): void {
  portX = x;
  portY = y;
}

export function getNovaPort(): { x: number; y: number } {
  return { x: portX, y: portY };
}

/* -------------------------------------------------------------------------- */
/* Resume window                                                               */
/* -------------------------------------------------------------------------- */

/* The nav's resume icon opens the live resume, and the two live on opposite
   sides of the tree — same reason `onAskNova` exists. */

const resumeListeners = new Set<() => void>();

export function onOpenResume(listener: () => void): () => void {
  resumeListeners.add(listener);
  return () => {
    resumeListeners.delete(listener);
  };
}

export function openResume(): void {
  resumeListeners.forEach((listener) => listener());
}

/* -------------------------------------------------------------------------- */
/* Stage occupancy                                                             */
/* -------------------------------------------------------------------------- */

/* The tagline rotation pauses and NOVA steps aside while a window has the
   visitor's attention. Keyed rather than a single boolean: the terminal and the
   resume can both be up, and either closing must not clear the other's claim. */

const busyKeys = new Set<string>();
const busyListeners = new Set<() => void>();

export function setWindowOpen(key: string, open: boolean): void {
  const was = busyKeys.size > 0;
  if (open) busyKeys.add(key);
  else busyKeys.delete(key);
  if (was === busyKeys.size > 0) return;
  busyListeners.forEach((listener) => listener());
  emitStatus();
}

export function subscribeStageBusy(listener: () => void): () => void {
  busyListeners.add(listener);
  return () => {
    busyListeners.delete(listener);
  };
}

export function getStageBusy(): boolean {
  return busyKeys.size > 0;
}

/** The server never has a window open. */
export function getServerStageBusy(): boolean {
  return false;
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

/* The readout along the bottom of the stage. Derived rather than stored: boot
   and occupancy are already tracked above, so the only new input is whether an
   answer is in flight. Ordered by what the visitor most needs to see — a reply
   being composed outranks a window merely being open. */

export type NovaStatus = "booting" | "online" | "engaged" | "thinking";

let isThinking = false;
const statusListeners = new Set<() => void>();

function emitStatus(): void {
  statusListeners.forEach((listener) => listener());
}

/** Called by the chat around a question, so the readout tracks real work. */
export function setNovaThinking(thinking: boolean): void {
  if (isThinking === thinking) return;
  isThinking = thinking;
  emitStatus();
}

export function subscribeNovaStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function getNovaStatus(): NovaStatus {
  if (isThinking) return "thinking";
  if (busyKeys.size > 0) return "engaged";
  return hasBooted ? "online" : "booting";
}

/** The server renders her mid-boot, which is where every visit starts. */
export function getServerNovaStatus(): NovaStatus {
  return "booting";
}
