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
