"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  greetings,
  sections,
  type NovaMood,
  type SectionMeta,
} from "@/content/profile";
import { onForget, type NovaMemory } from "@/lib/memory";
import { useActiveSection } from "./useActiveSection";
import { useNovaMemory } from "./useNovaMemory";

const SECTION_IDS = sections.map((section) => section.id);

/** How long a section must hold the viewport before NOVA changes face. */
const MOOD_DELAY = 260;
/** …and the longer wait before she says anything about it. */
const SPEAK_DELAY = 700;
/** How long a bubble stays up. */
const BUBBLE_MS = 4200;

/** Full line the first time, a shorter variant once they've heard it. */
function lineFor(section: SectionMeta, previous: NovaMemory): string {
  const heardBefore = previous.sectionsSeen.includes(section.id);
  const alternatives = section.altLines;

  if (!heardBefore || !alternatives?.length) return section.line;

  return alternatives[Math.floor(Math.random() * alternatives.length)];
}

/**
 * Turns "which section am I looking at" plus "what do I remember about you"
 * into NOVA's reaction.
 *
 * Both the mood change and the speech are debounced, which is what stops a fast
 * scroll from strobing through six faces and stacking six bubbles: a section has
 * to actually hold the viewport before NOVA responds to it. A line that never
 * fired is not marked as said, so scrolling back to a section you flew past
 * still gets its introduction.
 */
export function useSectionReactions() {
  const active = useActiveSection(SECTION_IDS);
  const { visit, markSectionSeen } = useNovaMemory();

  const [mood, setMood] = useState<NovaMood>("greeting");
  const [line, setLine] = useState("");
  const [open, setOpen] = useState(false);

  // One bubble at a time: showing a new line always cancels the old dismissal.
  const dismissTimer = useRef<number | undefined>(undefined);
  const said = useRef(new Set<string>());

  // Kept in sync from an effect so the forget handler, which fires long after
  // render, can see where the visitor currently is.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const speak = useCallback((text: string) => {
    window.clearTimeout(dismissTimer.current);
    setLine(text);
    setOpen(true);
    dismissTimer.current = window.setTimeout(() => setOpen(false), BUBBLE_MS);
  }, []);

  const previous = visit.previous;

  useEffect(() => {
    // Nothing is said until memory has loaded — the greeting depends on it.
    if (!previous) return;

    const section = sections.find((item) => item.id === active);
    if (!section) return;

    const moodTimer = window.setTimeout(() => setMood(section.mood), MOOD_DELAY);

    // The hero has its own typewriter line and chat entry now, so NOVA still
    // changes face there but stays quiet rather than talking over them.
    let speakTimer: number | undefined;
    if (section.id !== "intro" && !said.current.has(section.id)) {
      speakTimer = window.setTimeout(() => {
        said.current.add(section.id);
        markSectionSeen(section.id);
        speak(lineFor(section, previous));
      }, SPEAK_DELAY);
    }

    return () => {
      window.clearTimeout(moodTimer);
      window.clearTimeout(speakTimer);
    };
  }, [active, previous, speak, markSectionSeen]);

  // Memory wiped from the footer. Everything becomes unheard again, except the
  // section we're standing in — re-introducing that on the spot would be noise.
  useEffect(
    () =>
      onForget(() => {
        said.current = new Set([activeRef.current]);
        speak(greetings.forgotten);
      }),
    [speak],
  );

  // The dismissal timer outlives section changes on purpose, so it needs its
  // own teardown rather than riding along with the effect above.
  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);

  return { mood, line, open };
}
