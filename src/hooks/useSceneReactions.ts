"use client";

import { useEffect, useRef, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { greetings, type NovaMood } from "@/content/profile";
import { sceneFromSegment } from "@/content/scenes";
import { celebrate } from "@/lib/nova-bus";
import { onForget } from "@/lib/memory";
import { useNovaMemory } from "./useNovaMemory";

/** Beat before the face changes, so a fast click-through doesn't strobe. */
const MOOD_DELAY = 160;
/** How long the returning-visitor bubble stays up. */
const BUBBLE_MS = 4200;
/** Long enough for the boot screen to clear first. */
const GREETING_DELAY = 1200;

/**
 * NOVA's reaction to the current scene.
 *
 * Replaces the old scroll-triggered version: the stage doesn't scroll, so the
 * trigger is now the route. Her per-scene *line* lives in the bottom-left block
 * (see `HeroChat`); the speech bubble here is reserved for the one thing that
 * isn't about the scene — welcoming a returning visitor back on HOME.
 */
export function useSceneReactions() {
  const segment = useSelectedLayoutSegment();
  const scene = sceneFromSegment(segment);
  const { visit, markSectionSeen } = useNovaMemory();

  const [mood, setMood] = useState<NovaMood>("greeting");
  const [line, setLine] = useState("");
  const [open, setOpen] = useState(false);

  const dismissTimer = useRef<number | undefined>(undefined);
  const greeted = useRef(false);

  const previous = visit.previous;

  // Face follows the scene.
  useEffect(() => {
    const timer = window.setTimeout(() => setMood(scene.mood), MOOD_DELAY);
    return () => window.clearTimeout(timer);
  }, [scene.mood]);

  // Remember which scenes they've visited, so NOVA can reference them later.
  useEffect(() => {
    markSectionSeen(scene.id);
  }, [scene.id, markSectionSeen]);

  // Welcome a returning visitor back, once, on HOME.
  useEffect(() => {
    if (!previous || greeted.current || scene.id !== "home") return;
    if (previous.visitCount === 0) return;

    greeted.current = true;
    const visits = previous.visitCount;
    const timer = window.setTimeout(() => {
      // Third visit onward, NOVA is visibly glad to see them.
      if (visits >= 2 && Math.random() < 0.7) celebrate("wave");

      const name = previous.visitorName;
      setLine(
        previous.sectionsSeen.includes("work")
          ? greetings.backForProjects(name)
          : name
            ? greetings.backNamed(name)
            : greetings.backAnonymous,
      );
      setOpen(true);
      dismissTimer.current = window.setTimeout(() => setOpen(false), BUBBLE_MS);
    }, GREETING_DELAY);

    return () => window.clearTimeout(timer);
  }, [previous, scene.id]);

  // Memory wiped from the chat or elsewhere: say so, and allow greeting again.
  useEffect(
    () =>
      onForget(() => {
        greeted.current = false;
        window.clearTimeout(dismissTimer.current);
        setLine(greetings.forgotten);
        setOpen(true);
        dismissTimer.current = window.setTimeout(() => setOpen(false), BUBBLE_MS);
      }),
    [],
  );

  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);

  return { mood, line, open };
}
