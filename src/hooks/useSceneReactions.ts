"use client";

import { useEffect, useRef, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { greetings, type NovaMood } from "@/content/profile";
import {
  ANNOYED_LINES,
  FORGIVEN_LINE,
  SULK_LINES,
} from "@/content/nova-qa";
import { sceneFromSegment } from "@/content/scenes";
import {
  celebrate,
  getStageBusy,
  onLike,
  subscribeStageBusy,
} from "@/lib/nova-bus";
import { getTemper, onTemperChange, resetTemper } from "@/lib/nova-temper";
import { onForget } from "@/lib/memory";
import { useBootComplete } from "./useBootComplete";
import { useNovaMemory } from "./useNovaMemory";

/** Beat before the face changes, so a fast click-through doesn't strobe. */
const MOOD_DELAY = 160;
/** How long the returning-visitor bubble stays up. */
const BUBBLE_MS = 4200;
/**
 * Beat between the stage being revealed and NOVA speaking into it.
 *
 * Measured from the boot completing, not from mount. It used to be 1200ms from
 * mount and described as "long enough for the boot screen to clear" — which it
 * never was: the first-visit boot runs ten seconds and the returning visitor's
 * three, and it's the returning visitor who gets this bubble. The greeting was
 * opening on top of the POST log every time.
 */
const GREETING_DELAY = 800;

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
  const bootComplete = useBootComplete();

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

  // Welcome a returning visitor back, once, on HOME — and only once the boot
  // overlay is gone and the stage she's greeting them onto is actually there.
  useEffect(() => {
    if (!bootComplete) return;
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
  }, [bootComplete, previous, scene.id]);

  /*
   * Opening the terminal retires the bubble for good.
   *
   * It used to be merely hidden while the terminal was up, which meant closing
   * the terminal within the bubble's four seconds brought it back for whatever
   * time was left — a flash of a greeting the visitor had already read. Once
   * something else has their attention the greeting has been missed; cancelling
   * it is the honest outcome.
   */
  useEffect(
    () =>
      subscribeStageBusy(() => {
        if (!getStageBusy()) return;
        window.clearTimeout(dismissTimer.current);
        setOpen(false);
      }),
    [],
  );

  /*
   * The overstimulation arc, in words.
   *
   * Through the bubble rather than the tagline rotation, deliberately: the
   * rotation is ambient narration about Edwin's work, and a line about what the
   * visitor is doing right now has to come *from* her *at* them. It reuses the
   * greeting's dismiss timer, so a line about being clicked at and a "welcome
   * back" can never end up on screen fighting over the same bubble.
   *
   * No boot gate here: the clicks that drive this can't happen before boot —
   * `fireLike` refuses them — so the temper can't change before the stage is up.
   */
  useEffect(() => {
    const say = (text: string) => {
      window.clearTimeout(dismissTimer.current);
      setLine(text);
      setOpen(true);
      dismissTimer.current = window.setTimeout(() => setOpen(false), BUBBLE_MS);
    };

    // Cycled rather than random: being snubbed three times in a row with the
    // identical two words reads as a broken string, not as a mood.
    let snub = 0;
    const nextSulkLine = () => SULK_LINES[snub++ % SULK_LINES.length];

    const offTemper = onTemperChange((next) => {
      if (next === "annoyed") {
        say(ANNOYED_LINES[Math.floor(Math.random() * ANNOYED_LINES.length)]);
      } else if (next === "mad") {
        say(nextSulkLine());
      }
    });

    const offLike = onLike((event) => {
      // The one click that's worth double is the one that gets the apology.
      if (event.burst > 1) {
        say(FORGIVEN_LINE);
        return;
      }
      // Still poking a turned back.
      if (!event.counts && getTemper() === "sulking") say(nextSulkLine());
    });

    return () => {
      offTemper();
      offLike();
    };
  }, []);

  // Memory wiped from the chat or elsewhere: say so, and allow greeting again.
  useEffect(
    () =>
      onForget(() => {
        greeted.current = false;
        // Being asked to forget them clears the grudge too. She's meeting a
        // stranger — carrying on a sulk about what the last one did with the
        // mouse would be the one thing a wiped memory shouldn't remember.
        resetTemper();
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
