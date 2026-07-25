"use client";

import { peekRibbon } from "@/lib/nova-bus";
import { useClassicSwitch } from "@/hooks/useClassicSwitch";
import "./ribbon.css";

/**
 * The classic-build portal — an awwwards-style nominee ribbon tucked into the
 * right edge, on every scene.
 *
 * Rests slightly tucked; hover slides it fully out with a soft spring and a
 * tooltip. Clicking prints the same "// loading classic build…" line the
 * terminal's `/v1` does, then leaves for the previous portfolio after the same
 * beat — one source of truth in `lib/legacy.ts`. Hovering it also nudges NOVA to
 * lean over and look (`peekRibbon`).
 */
export function ClassicRibbon() {
  const { loading, start } = useClassicSwitch();

  return (
    <div className="classic-ribbon" data-loading={loading || undefined}>
      <button
        type="button"
        className="classic-ribbon-tab"
        onClick={start}
        // Mouse hover asks NOVA to peek; touch just taps through to navigate.
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") peekRibbon();
        }}
        aria-label="Visit the previous portfolio — the classic build"
      >
        <span className="classic-ribbon-mono" aria-hidden>
          E.
        </span>
        <span className="classic-ribbon-vert" aria-hidden>
          Classic ▾ v1
        </span>
      </button>

      <span className="classic-ribbon-tip" role="status">
        {loading ? "// loading classic build…" : "visit the previous portfolio"}
      </span>
    </div>
  );
}
