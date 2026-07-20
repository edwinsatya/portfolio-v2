"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  beginVisit,
  getMemorySnapshot,
  getServerMemorySnapshot,
  rememberSection,
  setVisitorName,
  subscribeMemory,
} from "@/lib/memory";

/**
 * Subscribes to NOVA's memory and records the current visit.
 *
 * `useSyncExternalStore` rather than state-plus-effect: localStorage genuinely
 * is an external store, and this is the primitive built for reading one without
 * tearing during hydration. The server snapshot is empty, so the first client
 * render matches the server exactly and memory-dependent copy only appears once
 * `beginVisit` has run.
 */
export function useNovaMemory() {
  const visit = useSyncExternalStore(
    subscribeMemory,
    getMemorySnapshot,
    getServerMemorySnapshot,
  );

  // Writing to an external system on mount, which is what effects are for.
  useEffect(() => beginVisit(), []);

  return { visit, saveName: setVisitorName, markSectionSeen: rememberSection };
}
