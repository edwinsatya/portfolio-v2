"use client";

import { useCallback, useEffect, useState } from "react";
import {
  noPower,
  onOpenResume,
  setWindowOpen,
  type ResumeSection,
} from "@/lib/nova-bus";
import { isDead, onPowerEvent } from "@/lib/power";

/** How the resume window is presented. Mirrors the traffic lights. */
export type WindowState = "normal" | "minimized" | "maximized";

/** The window's own light/dark, independent of the page's. */
export type ResumeTheme = "light" | "dark";

/**
 * Window state for the live resume.
 *
 * Deliberately its own hook rather than a second copy of `useNovaChat`: the
 * resume has no conversation, no brain, and no transcript — it is a document in
 * a window. What it does share is the traffic-light vocabulary, so the state
 * names match the terminal's exactly and both feed the same stage-occupancy key
 * space, which is what lets NOVA step aside for either one.
 */
export function useResumeWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [theme, setTheme] = useState<ResumeTheme>("light");
  /**
   * A section the window should jump to on open, and a nonce so asking for the
   * *same* section twice still fires — reopening at Experience after having
   * scrolled away must move again. The window clears it once consumed.
   */
  const [focusSection, setFocusSection] = useState<{
    id: ResumeSection;
    nonce: number;
  } | null>(null);

  const open = useCallback((section?: ResumeSection) => {
    // Locked at 0%, same as the terminal: the resume is NOVA rendering a
    // document, and she has nothing to render it with.
    if (isDead()) {
      noPower();
      return;
    }
    setIsOpen(true);
    // Reopening from the dock restores the window rather than leaving it
    // collapsed, which would look like the click did nothing.
    setWindowState((w) => (w === "minimized" ? "normal" : w));
    if (section) setFocusSection({ id: section, nonce: Date.now() });
  }, []);

  const consumeFocusSection = useCallback(() => setFocusSection(null), []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Next open starts at a normal window; a maximised one left behind would be
    // a surprise. The theme is *not* reset — that's a preference, not a mode.
    setWindowState("normal");
  }, []);

  /** Yellow light. Collapses to a pill in the dock strip. */
  const minimize = useCallback(() => setWindowState("minimized"), []);

  /** Green light. Toggles between near-full-viewport and normal. */
  const toggleMaximize = useCallback(
    () => setWindowState((w) => (w === "maximized" ? "normal" : "maximized")),
    [],
  );

  /** Clicking the dock pill. */
  const restore = useCallback(() => setWindowState("normal"), []);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    [],
  );

  useEffect(() => onOpenResume(open), [open]);

  // Shuts with everything else when she runs out. See the note in `useNovaChat`.
  useEffect(
    () =>
      onPowerEvent((event) => {
        if (event === "died") close();
      }),
    [close],
  );

  /**
   * "Occupying the visitor" — drives NOVA stepping aside and the tagline
   * rotation pausing. A minimised window is docked out of the way, so it doesn't
   * count even though it's still open.
   */
  const isEngaged = isOpen && windowState !== "minimized";

  useEffect(() => setWindowOpen("resume", isEngaged), [isEngaged]);

  return {
    isOpen,
    windowState,
    isEngaged,
    theme,
    focusSection,
    consumeFocusSection,
    open,
    close,
    minimize,
    toggleMaximize,
    restore,
    toggleTheme,
  };
}
