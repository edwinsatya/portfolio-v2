"use client";

import { useEffect, useState } from "react";
import { onVibeChange } from "@/lib/nova-bus";
import { getPower } from "@/lib/power";

/** How long one note lives. Matches the keyframes in nova.css. */
const NOTE_MS = 2600;
/** Randomised gap between notes. Sparse on purpose — see the note below. */
const MIN_GAP_MS = 1100;
const MAX_GAP_MS = 2400;
/** Ceiling on live notes, the same guard the hearts have. */
const MAX_LIVE = 12;

const GLYPHS = ["♪", "♫", "♬"] as const;

type Note = {
  id: number;
  glyph: string;
  x: number;
  y: number;
  drift: number;
  scale: number;
  spin: number;
};

let nextId = 0;

/**
 * The notes that drift up off NOVA's headphones while something is playing.
 *
 * Deliberately sparse: one every second or two, not a stream. A steady fountain
 * of quavers reads as a "now playing" badge, which the widget in the corner is
 * already being — these are meant to read as her, occasionally, rather than as
 * an indicator that stays on.
 *
 * Lives on the stage layer rather than inside NOVA's anchor for the same reason
 * the hearts do: the anchor scales to about a third in the corner dock, and
 * notes inheriting that would be specks. They read her head position off the
 * two custom properties the stage loop publishes each frame instead.
 *
 * Each note is a self-contained CSS animation on transform and opacity, so
 * nothing here runs per frame and a note can never touch layout.
 */
export function MusicNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;

    const spawn = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const headX = parseFloat(style.getPropertyValue("--nova-head-x") || "0");
      const headY = parseFloat(style.getPropertyValue("--nova-head-y") || "0");
      const footY = parseFloat(style.getPropertyValue("--nova-foot-y") || "0");

      /* How big she is on screen right now, antenna to floor. Derived from the
         two positions the stage loop already publishes rather than measuring
         anything: she is about a third of her hero size once docked in the
         corner, and notes launched at fixed pixel offsets would spray out
         either side of a robot the size of a thumbnail. */
      const height = Math.max(1, footY - headY);

      const note: Note = {
        id: nextId++,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        // Off one ear or the other, which is where the sound is coming from.
        x:
          headX +
          (Math.random() < 0.5 ? -1 : 1) * height * (0.17 + Math.random() * 0.04),
        y: headY + height * (0.3 + Math.random() * 0.05),
        drift: (Math.random() * 2 - 1) * 34,
        scale: 0.75 + Math.random() * 0.5,
        spin: (Math.random() * 2 - 1) * 22,
      };

      setNotes((current) => [...current, note].slice(-MAX_LIVE));
      window.setTimeout(
        () => setNotes((current) => current.filter((n) => n.id !== note.id)),
        NOTE_MS + 120,
      );
    };

    const loop = () => {
      timer = window.setTimeout(
        () => {
          /* Read at spawn time rather than subscribed to: this loop is already
             waking up every second or two, and a subscription would re-render
             the whole layer on every percent the battery drops.

             Low battery is lazier vibing, and the notes are the first thing to
             go — she's still nodding along, she just hasn't the energy to
             broadcast about it. */
          if (getPower().state === "normal") spawn();
          loop();
        },
        MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS),
      );
    };

    const off = onVibeChange((on) => {
      window.clearTimeout(timer);
      // Notes are movement across the screen, which is the category the
      // preference is about. The headphones still go on; these don't.
      if (!on || reduced.matches) {
        setNotes([]);
        return;
      }
      loop();
    });

    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  if (notes.length === 0) return null;

  return (
    <div className="note-layer" aria-hidden>
      {notes.map((note) => (
        <span
          key={note.id}
          className="music-note"
          style={
            {
              left: `${note.x}px`,
              top: `${note.y}px`,
              "--drift": `${note.drift}px`,
              "--scale": note.scale,
              "--spin": `${note.spin}deg`,
            } as React.CSSProperties
          }
        >
          {note.glyph}
        </span>
      ))}
    </div>
  );
}
