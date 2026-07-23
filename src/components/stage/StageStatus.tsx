"use client";

import { useSyncExternalStore } from "react";
import {
  getNovaStatus,
  getServerNovaStatus,
  subscribeNovaStatus,
  type NovaStatus,
} from "@/lib/nova-bus";
import { batteryCells } from "@/lib/power";
import { usePower } from "@/hooks/usePower";

/**
 * The machine readout along the bottom of the stage.
 *
 * Decorative in shape but honest in content: the bar and the caption both come
 * from NOVA's actual state on the bus — booting until the boot screen clears,
 * engaged while a window has the visitor, thinking while an answer is in flight
 * — and the caption now carries her battery beside it.
 */

/** Caption, and how much of the bar fills. */
const READOUT: Record<NovaStatus, { label: string; fill: string }> = {
  booting: { label: "Nova booting", fill: "12%" },
  online: { label: "Nova online", fill: "33%" },
  engaged: { label: "Nova engaged", fill: "66%" },
  thinking: { label: "Nova thinking", fill: "100%" },
};

/**
 * 0% overrides all four.
 *
 * Applied here rather than added to `NovaStatus` on the bus: the bus tracks what
 * she is *doing*, and nothing is doing anything. Wiring the battery into it
 * would give two stores one answer to agree on, where this component already
 * reads both.
 */
const OFFLINE = { label: "Nova offline", fill: "0%" };

export function StageStatus() {
  const status = useSyncExternalStore(
    subscribeNovaStatus,
    getNovaStatus,
    getServerNovaStatus,
  );
  const power = usePower();
  const { label, fill } =
    power.state === "dead" ? OFFLINE : READOUT[status];

  return (
    <div
      aria-hidden
      className="stage-status"
      data-status={status}
      data-power={power.state}
      data-charging={power.charging}
    >
      <div className="stage-status-bar">
        <div style={{ width: fill }} />
      </div>
      <p className="mono-label stage-status-read mt-2 text-center text-faint">
        {label} · {power.charging && <span className="stage-status-bolt">⚡</span>}
        {batteryCells(power.level)} {power.level}%
      </p>

      {/* The one place the page admits it has a shell. Dropped at 0%, where the
          key does nothing but produce the no-power toast. */}
      {power.state !== "dead" && (
        <p className="stage-term-hint">
          Press <kbd>/</kbd> for terminal
        </p>
      )}
    </div>
  );
}
