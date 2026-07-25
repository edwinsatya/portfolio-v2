"use client";

import { Nova } from "./Nova";
import "./boot-nova.css";

/**
 * The robot the boot screen is describing, on routes that have no stage.
 *
 * The splash is NOVA powering on: the POST log is her memory mounting, the
 * "SELECT BUILD" menu is hers, and every stage of it animates her plates, her
 * visor and her eyes. On the stage she's already there, lifted above the
 * overlay. On a project page she isn't — that layout deliberately has no robot
 * in it — so a direct link to a case study booted to an empty screen with a
 * readout narrating a robot that wasn't on it.
 *
 * This is her for the length of the splash and nothing more: no rAF loop, no
 * gaze, no pose engine, no hit area. The boot's own CSS (`html[data-boot-stage]`
 * in `nova.css`) drives the whole power-on, so a static SVG in the right place
 * is the entire fix. When the boot attribute goes, she fades with it — which is
 * honest, because the page underneath genuinely doesn't keep her.
 */
export function BootNova() {
  return (
    <div className="boot-nova" aria-hidden>
      <Nova mood="greeting" />
    </div>
  );
}
