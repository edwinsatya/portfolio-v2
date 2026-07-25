"use client";

import { useSyncExternalStore } from "react";
import {
  getNovaStatus,
  getServerNovaStatus,
  subscribeNovaStatus,
  type NovaStatus,
} from "@/lib/nova-bus";
import { batteryCells, batteryUrgency } from "@/lib/power";
import { usePower } from "@/hooks/usePower";

/**
 * The machine readout along the bottom of the stage.
 *
 * Decorative in shape but honest in content: the caption comes from NOVA's
 * actual state on the bus — booting until the boot screen clears, engaged while
 * a window has the visitor, thinking while an answer is in flight — and it
 * carries her battery beside it.
 */

/** Caption for each of NOVA's four states. */
const READOUT: Record<NovaStatus, string> = {
  booting: "Nova booting",
  online: "Nova online",
  engaged: "Nova engaged",
  thinking: "Nova thinking",
};

/**
 * 0% overrides all four.
 *
 * Applied here rather than added to `NovaStatus` on the bus: the bus tracks what
 * she is *doing*, and nothing is doing anything. Wiring the battery into it
 * would give two stores one answer to agree on, where this component already
 * reads both.
 */
const OFFLINE = "Nova offline";

export function StageStatus() {
  const status = useSyncExternalStore(
    subscribeNovaStatus,
    getNovaStatus,
    getServerNovaStatus,
  );
  const power = usePower();
  const label = power.state === "dead" ? OFFLINE : READOUT[status];
  const urgency = batteryUrgency(power.level, power.charging);

  return (
    <div
      aria-hidden
      className="stage-status"
      data-status={status}
      data-power={power.state}
      data-charging={power.charging}
    >
      {/* The caption still dims with the page; the battery span holds a literal
          colour per urgency tier, so the one number explaining the state opts
          out of the low-power token muting the rest of the line inherits. */}
      <p className="mono-label stage-status-read text-center text-faint">
        {label} ·{" "}
        <span className="battery-gauge" data-batt={urgency}>
          {power.charging && <span className="stage-status-bolt">⚡</span>}
          {batteryCells(power.level)} {power.level}%
        </span>
        {urgency === "critical" && (
          <span className="battery-low-tag">⚠ Low power</span>
        )}
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
