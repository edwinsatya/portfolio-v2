/**
 * A one-message channel between the hero's suggestion chips and the chat panel.
 *
 * The chips live in the page flow and the panel lives on a fixed overlay, so
 * nothing useful wraps both — the same reason `onForget` exists in `memory.ts`.
 * A module-level listener set is smaller and clearer than threading a context
 * provider around the whole tree for one interaction.
 */

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
 */
export function fireLike(origin: LikeOrigin = null): void {
  likeListeners.forEach((listener) => listener(origin));
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
/* Chat open state                                                             */
/* -------------------------------------------------------------------------- */

/* The tagline rotation pauses while the chat is up, and the two live on
   opposite sides of the tree — same reason the rest of this file exists. */

let chatOpen = false;
const chatListeners = new Set<() => void>();

export function setChatOpen(open: boolean): void {
  if (chatOpen === open) return;
  chatOpen = open;
  chatListeners.forEach((listener) => listener());
}

export function subscribeChatOpen(listener: () => void): () => void {
  chatListeners.add(listener);
  return () => {
    chatListeners.delete(listener);
  };
}

export function getChatOpen(): boolean {
  return chatOpen;
}

/** The server never has a chat open. */
export function getServerChatOpen(): boolean {
  return false;
}
