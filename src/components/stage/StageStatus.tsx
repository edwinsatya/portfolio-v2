"use client";

import { useSyncExternalStore } from "react";
import {
  getNovaStatus,
  getServerNovaStatus,
  subscribeNovaStatus,
  type NovaStatus,
} from "@/lib/nova-bus";

/**
 * The machine readout along the bottom of the stage.
 *
 * Decorative in shape but honest in content: the bar and the caption both come
 * from NOVA's actual state on the bus — booting until the boot screen clears,
 * engaged while a window has the visitor, thinking while an answer is in flight.
 */

/** Caption, and how much of the bar fills. */
const READOUT: Record<NovaStatus, { label: string; fill: string }> = {
  booting: { label: "Nova booting", fill: "12%" },
  online: { label: "Nova online", fill: "33%" },
  engaged: { label: "Nova engaged", fill: "66%" },
  thinking: { label: "Nova thinking", fill: "100%" },
};

export function StageStatus() {
  const status = useSyncExternalStore(
    subscribeNovaStatus,
    getNovaStatus,
    getServerNovaStatus,
  );
  const { label, fill } = READOUT[status];

  return (
    <div aria-hidden className="stage-status" data-status={status}>
      <div className="stage-status-bar">
        <div style={{ width: fill }} />
      </div>
      <p className="mono-label mt-2 text-center text-faint">{label}</p>
    </div>
  );
}
