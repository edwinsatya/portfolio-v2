"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sections, type NovaMood } from "@/content/profile";
import { useActiveSection } from "./useActiveSection";

const SECTION_IDS = sections.map((section) => section.id);

/** How long a section must hold the viewport before NOVA changes face. */
const MOOD_DELAY = 260;
/** …and the longer wait before she says anything about it. */
const SPEAK_DELAY = 700;
/** The opening greeting waits longer, so it doesn't land mid page-reveal. */
const INTRO_DELAY = 1500;
/** How long a bubble stays up. */
const BUBBLE_MS = 4200;

/**
 * Turns "which section am I looking at" into NOVA's reaction.
 *
 * Both the mood change and the speech are debounced, which is what stops a fast
 * scroll from strobing through six faces and stacking six bubbles: a section has
 * to actually hold the viewport before NOVA responds to it. A line that never
 * fired is not marked as said, so scrolling back to a section you flew past
 * still gets its introduction.
 */
export function useSectionReactions() {
  const active = useActiveSection(SECTION_IDS);

  const [mood, setMood] = useState<NovaMood>("greeting");
  const [line, setLine] = useState("");
  const [open, setOpen] = useState(false);

  // One bubble at a time: showing a new line always cancels the old dismissal.
  const dismissTimer = useRef<number | undefined>(undefined);
  const said = useRef(new Set<string>());

  const speak = useCallback((text: string) => {
    window.clearTimeout(dismissTimer.current);
    setLine(text);
    setOpen(true);
    dismissTimer.current = window.setTimeout(() => setOpen(false), BUBBLE_MS);
  }, []);

  useEffect(() => {
    const section = sections.find((item) => item.id === active);
    if (!section) return;

    const moodTimer = window.setTimeout(() => setMood(section.mood), MOOD_DELAY);

    let speakTimer: number | undefined;
    if (!said.current.has(section.id)) {
      speakTimer = window.setTimeout(
        () => {
          said.current.add(section.id);
          speak(section.line);
        },
        section.id === "intro" ? INTRO_DELAY : SPEAK_DELAY,
      );
    }

    return () => {
      window.clearTimeout(moodTimer);
      window.clearTimeout(speakTimer);
    };
  }, [active, speak]);

  // The dismissal timer outlives section changes on purpose, so it needs its
  // own teardown rather than riding along with the effect above.
  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);

  return { mood, line, open };
}
