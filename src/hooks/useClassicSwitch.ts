"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { goToLegacy, SWITCH_DELAY_MS } from "@/lib/legacy";

/**
 * The "leave for the classic build" action, shared by the edge ribbon and the
 * phone footer link.
 *
 * `start()` prints the loading beat then redirects — the same one-source flow as
 * the terminal's `/v1`. The `pageshow` reset is the fix for the back button:
 * `goToLegacy` is a full navigation, so pressing Back restores this page from
 * the bfcache with `loading` still `true`, which used to wedge the control shut.
 * `pageshow` fires on that restore and clears it, so it's clickable again.
 */
export function useClassicSwitch() {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const reset = () => {
      busy.current = false;
      setLoading(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const start = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    window.setTimeout(goToLegacy, SWITCH_DELAY_MS);
  }, []);

  return { loading, start };
}
