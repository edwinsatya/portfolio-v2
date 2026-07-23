"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { celebrate, noPower, onNovaBooted, setNovaVibing } from "@/lib/nova-bus";
import { isDead, onPowerEvent } from "@/lib/power";
import { usePower } from "./usePower";

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
  // Subscribed rather than read once: the card has to *look* disabled the
  // moment she runs out, and the callbacks below read the store directly.
  const power = usePower();

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
    // Locked at 0%. The player is hers — it lives on her stage and she hops
    // when it starts — so a flat battery takes it with everything else.
    if (isDead()) {
      noPower();
      return;
    }
    // Only a fresh open is worth a reaction — she shouldn't hop every time the
    // panel is restored from its mini bar. Read outside the updater: a state
    // updater has to stay pure, and StrictMode runs it twice.
    if (mode === "closed") celebrate("hop");
    setMode("open");
  }, [mode]);

  /*
   * Tells NOVA there's something to listen to.
   *
   * Keyed off `mode` rather than off `open()`, because the thing she is
   * reacting to is the iframe being mounted, and that is exactly what `mode`
   * describes: `mini` keeps it playing, so she keeps her headphones on while
   * the panel is collapsed, and only `closed` — which unmounts it — takes them
   * off. Published from here rather than from the widget's markup so the one
   * place that owns the player's lifecycle is the one place that announces it.
   */
  useEffect(() => {
    setNovaVibing(mode !== "closed");
  }, [mode]);

  // A player left open when the widget unmounts would leave her wearing
  // headphones for music that stopped with it.
  useEffect(() => () => setNovaVibing(false), []);

  /** Collapses to the mini bar. The iframe survives, so playback carries on. */
  const minimize = useCallback(() => setMode("mini"), []);

  const close = useCallback(() => setMode("closed"), []);

  const dismiss = useCallback(() => {
    setMode("closed");
    markDismissed();
  }, []);

  /** Picking another jam swaps the embed; the panel stays where it is. */
  const selectTrack = useCallback((index: number) => {
    if (isDead()) {
      noPower();
      return;
    }
    setTrack(index);
    setMode("open");
  }, []);

  /*
   * Running out mid-song stops the music.
   *
   * `closed` rather than `mini` deliberately: minimising keeps the iframe
   * mounted and playing, and a robot with no power soundtracking her own
   * shutdown is the one wrong note in the whole sequence.
   */
  useEffect(
    () =>
      onPowerEvent((event) => {
        if (event === "died") setMode("closed");
      }),
    [],
  );

  return {
    visible: shown && !dismissed,
    /** 0%: the card is still there, greyed, and answers with the toast. */
    disabled: power.state === "dead",
    mode,
    track,
    open,
    minimize,
    close,
    dismiss,
    selectTrack,
  };
}
