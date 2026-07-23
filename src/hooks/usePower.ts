"use client";

import { useSyncExternalStore } from "react";
import { getPower, getServerPower, subscribePower, type Power } from "@/lib/power";

/**
 * NOVA's battery, as React sees it.
 *
 * A one-line wrapper on purpose — the store in `lib/power.ts` is the real thing,
 * and everything that isn't rendering (the drain clock, the pose engine's tired
 * idle, the charger's draw loop) reads it directly rather than through here.
 *
 * There is deliberately no `useTheme` beside it. The theme is applied by writing
 * an attribute onto `<html>`, so every component already reacts to it through
 * the cascade; a hook would only invite someone to branch on it in JS and get a
 * second, slower source of truth.
 */
export function usePower(): Power {
  return useSyncExternalStore(subscribePower, getPower, getServerPower);
}
