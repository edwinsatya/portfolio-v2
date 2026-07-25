"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isApplePlatform } from "@/hooks/useNovaChat";
import { useBootComplete } from "@/hooks/useBootComplete";
import { openSearch } from "@/lib/nova-bus";
import "./search.css";

/** The keyboard a visitor has doesn't change mid-session. */
const subscribeNever = () => () => {};

/**
 * The Search pill — the terminal's front door.
 *
 * The terminal has always been reachable by `/`, by `T`, and by the nav's chat
 * icon, none of which say so. This is the affordance: a command-palette pill in
 * the bottom-right corner that names its own shortcut, so a visitor who has
 * never pressed `/` on a website still finds the one control that searches the
 * work.
 *
 * WORK only, and desktop only. WORK because that is the scene with ten things
 * to search — offering a search box on a page with one paragraph on it is an
 * invitation to a dead end — and because it sits in the corner of that scene's
 * bottom strip, which is the only scene that flies one. ⌘K still works
 * everywhere; this is the sign, not the door.
 *
 * Below `lg` it isn't rendered at all: the phone has the chat icon in the tab
 * bar and the chips under NOVA's line, and a floating pill down there would
 * land on the music widget, the tab bar, or her.
 *
 * The click goes out on the bus rather than calling the chat hook: the hook
 * lives inside `NovaStage`, this lives out in the layout, and nothing wraps both
 * — the same reason `askNova` exists.
 */
export function SearchPill() {
  const bootComplete = useBootComplete();
  const segment = useSelectedLayoutSegment();
  /*
   * `⌘K` or `Ctrl K`.
   *
   * The platform is an external system with no events, so it's read through
   * `useSyncExternalStore` with a subscribe that never fires: that's the shape
   * React wants for "a value the server can't know". The server snapshot says
   * Mac and the client corrects it during hydration, so Windows and Linux see
   * the right key from the first painted frame rather than a swap.
   */
  const mac = useSyncExternalStore(subscribeNever, isApplePlatform, () => true);

  /*
   * `/work` and `/work/<slug>` share this segment.
   *
   * Right for now — Part B's detail pages are a full-page takeover with their
   * own furniture, and when they land they'll opt this and the stack ticker out
   * together rather than each inventing its own test. Below every hook, so the
   * scene change can't reorder them.
   */
  if (segment !== "work") return null;

  return (
    <button
      type="button"
      className="stage-search"
      data-ready={bootComplete || undefined}
      onClick={() => openSearch()}
      /* The shortcut is decoration in the label — a screen reader reading
         "command k" out of a `kbd` mid-sentence is noise, and the button's own
         name has to say what it does. */
      aria-label={`Search projects and commands (${mac ? "Command" : "Control"} K)`}
      aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
      tabIndex={bootComplete ? 0 : -1}
    >
      <span className="stage-search-label" aria-hidden>
        Search
      </span>

      <kbd className="stage-search-key" aria-hidden>
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
