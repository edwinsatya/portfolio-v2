"use client";

import { useState, useSyncExternalStore } from "react";
import {
  forgetVisitor,
  getMemorySnapshot,
  getServerMemorySnapshot,
  subscribeMemory,
} from "@/lib/memory";

/**
 * Lets the visitor wipe everything NOVA has stored about them.
 *
 * Renders nothing on the server, nothing before the visit has been recorded,
 * and nothing at all where storage is blocked — offering to delete data that was
 * never saved would be a lie.
 */
export function ForgetMe() {
  const visit = useSyncExternalStore(
    subscribeMemory,
    getMemorySnapshot,
    getServerMemorySnapshot,
  );
  const [justForgot, setJustForgot] = useState(false);

  if (!visit.available || !visit.previous) return null;

  return (
    <button
      type="button"
      onClick={() => {
        forgetVisitor();
        setJustForgot(true);
      }}
      disabled={justForgot}
      className="text-xs text-faint underline-offset-4 transition-colors hover:text-muted hover:underline disabled:no-underline disabled:opacity-60"
    >
      {justForgot ? "NOVA forgot you" : "NOVA forgets you"}
    </button>
  );
}
