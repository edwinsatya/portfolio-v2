"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { celebrate, onNovaBooted } from "@/lib/nova-bus";

/**
 * How the player is presented. `mini` keeps the embed mounted and playing in a
 * small bar; `closed` tears it down. Same distinction the terminal and the
 * resume draw between minimising and closing.
 */
export type MusicMode = "closed" | "open" | "mini";

/** Long enough that the card arrives after the stage has settled, not with it. */
const ENTRANCE_MS = 2600;

/* Its own key rather than a field in `nova.memory.v1`: that object is what NOVA
   knows about the visitor, and "forget me" wipes it. Being told to hide a widget
   is a UI preference, not something she remembers about them. */
const DISMISS_KEY = "nova.music.dismissed.v1";

/** Same defensive shape as `memory.ts` — Safari private mode throws on write. */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/*
 * A one-boolean store rather than state seeded in an effect: storage is genuinely
 * external, and `useSyncExternalStore` is how the rest of the site reads it (see
 * `memory.ts`). Cached because a snapshot must be referentially stable — hitting
 * localStorage on every render would also be a synchronous read per frame.
 */
let cache: boolean | null = null;
const listeners = new Set<() => void>();

function getDismissed(): boolean {
  if (cache === null) cache = readDismissed();
  return cache;
}

/** The server can't know, and a card that flashes in then vanishes is worse. */
function getServerDismissed(): boolean {
  return true;
}

function subscribeDismissed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function markDismissed(): void {
  cache = true;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Blocked storage just means they'll see it again next visit.
  }
  listeners.forEach((listener) => listener());
}

/**
 * The "last jammed to" card in the bottom-right corner.
 *
 * Four pieces of state, deliberately separate: `shown` is the entrance (it waits
 * for boot, so the card doesn't slide in underneath the boot screen), `dismissed`
 * is the visitor's standing answer, `mode` is the player, and `track` is which
 * jam is loaded.
 *
 * `mode` is three-way rather than a boolean because minimising and closing have
 * to mean different things here. The panel stays mounted while minimised, which
 * is what keeps the music playing — closing unmounts the iframe, and that is the
 * only way to actually stop YouTube without reaching for their JS API.
 */
export function useMusicWidget() {
  const [shown, setShown] = useState(false);
  const [mode, setMode] = useState<MusicMode>("closed");
  const [track, setTrack] = useState(0);

  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissed,
    getServerDismissed,
  );

  useEffect(() => {
    let timer = 0;
    const off = onNovaBooted(() => {
      timer = window.setTimeout(() => setShown(true), ENTRANCE_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  const open = useCallback(() => {
    // Only a fresh open is worth a reaction — she shouldn't hop every time the
    // panel is restored from its mini bar. Read outside the updater: a state
    // updater has to stay pure, and StrictMode runs it twice.
    if (mode === "closed") celebrate("hop");
    setMode("open");
  }, [mode]);

  /** Collapses to the mini bar. The iframe survives, so playback carries on. */
  const minimize = useCallback(() => setMode("mini"), []);

  const close = useCallback(() => setMode("closed"), []);

  const dismiss = useCallback(() => {
    setMode("closed");
    markDismissed();
  }, []);

  /** Picking another jam swaps the embed; the panel stays where it is. */
  const selectTrack = useCallback((index: number) => {
    setTrack(index);
    setMode("open");
  }, []);

  return {
    visible: shown && !dismissed,
    mode,
    track,
    open,
    minimize,
    close,
    dismiss,
    selectTrack,
  };
}
