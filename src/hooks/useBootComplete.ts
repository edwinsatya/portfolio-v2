"use client";

import { useSyncExternalStore } from "react";
import {
  getBootComplete,
  getServerBootComplete,
  subscribeBootComplete,
} from "@/lib/nova-bus";

/**
 * Whether the boot overlay has finished and been dismissed.
 *
 * The single gate every timed entrance on the main stage sits behind. Each of
 * them used to run its own delay from mount and hope the boot had cleared by
 * then — numbers picked against a boot length that has since changed twice, and
 * which the returning visitor's three-second version never matched anyway. The
 * greeting bubble opened over the POST log because of it.
 *
 * `useSyncExternalStore` rather than an effect, so the first client render
 * already knows the answer and nothing has to flash in and back out.
 */
export function useBootComplete(): boolean {
  return useSyncExternalStore(
    subscribeBootComplete,
    getBootComplete,
    getServerBootComplete,
  );
}
