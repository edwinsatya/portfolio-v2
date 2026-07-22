"use client";

import { useEffect, useRef, useState } from "react";
import {
  fireLike,
  onCelebrate,
  onNovaBooted,
  setNovaPort,
  type Celebration,
} from "@/lib/nova-bus";
import { getPower } from "@/lib/power";
import {
  blendPose,
  ease as easeBlend,
  poseFor,
  restingPose,
  STATE_MS,
  type NovaState,
  type Pose,
} from "@/lib/nova-pose";

/** The anchor's CSS width. Everything scales from this to hero or dock size. */
const BASE_WIDTH = 380;
const ASPECT = 320 / 240;
const BASE_HEIGHT = BASE_WIDTH * ASPECT;

const DOCK_WIDTH = 118;
const DOCK_WIDTH_SMALL = 86;
const DOCK_MARGIN = 20;
const SMALL_SCREEN = 640;
/** Size NOVA steps aside to when the terminal is up — about 45% of full. */
const SIDELINE_WIDTH = 172;
const SIDELINE_MARGIN = 28;
/** Length of the step aside and back. */
const SIDELINE_MS = 400;

/** Vertical position of NOVA's eyes and antenna within the viewBox, 0–1. */
const EYE_LINE = 109 / 320;
const HEAD_TOP = 19 / 320;
/** Her chest lamp, which doubles as the charging port. */
const PORT_LINE = 215 / 320;

/** Clearance the bubble keeps from every viewport edge. */
const EDGE_PAD = 12;
/** Gap between the bubble and NOVA herself. */
const BUBBLE_GAP = 10;
/** Fallback nav height, used only if the header can't be measured. */
const NAV_FALLBACK = 64;
/** How far in from the bubble's corner the tail sits. */
const TAIL_INSET = 20;

const clamp = (value: number, min: number, max: number) =>
  // Guards the case where the bubble is taller than the space it has to fit in:
  // min wins, so it stays below the nav rather than sliding under it.
  Math.max(min, Math.min(max, value));

/** How far the pointer travels, in px, before the gaze is fully committed. */
const REACH = 380;
/** Silence after which NOVA stops tracking and starts looking around alone. */
const IDLE_AFTER = 3200;
/** Length of the flight between hero and dock; matches the CSS transition. */
const FLY_MS = 800;
/** Randomised gap between idle waves. */
const WAVE_MIN_MS = 15000;
const WAVE_MAX_MS = 30000;
/** Randomised gap between yawns, once the battery is flat. Rarer than a wave —
    a yawn every fifteen seconds reads as a tic rather than as tiredness. */
const YAWN_MIN_MS = 18000;
const YAWN_MAX_MS = 34000;
/** How long the joyful face lingers after the last like. */
const JOY_MS = 1400;
/** Crossfade into a new move, from whatever pose is on screen. */
const BLEND_IN_MS = 200;
/** Longer on the way back, so settling reads as relaxing rather than stopping. */
const BLEND_IDLE_MS = 400;
/** Ceiling once the distance scaling is applied. */
const BLEND_MAX_MS = 520;
/** Intensity added per like while already celebrating, and its decay. */
const INTENSITY_STEP = 0.34;
const INTENSITY_DECAY_MS = 2600;

/**
 * Owns every per-frame concern in one requestAnimationFrame loop: where NOVA
 * sits (hero slot or corner dock), where she's looking, when she blinks, and
 * where the speech bubble hangs.
 *
 * Deliberately one loop rather than several. The gaze origin is derived from
 * the dock position computed the same frame instead of measuring the SVG, so
 * each frame is a single layout read followed only by writes — reading back
 * after a write would force a synchronous reflow every frame.
 */
export function useNovaStage({
  /** Terminal is up and has the visitor's attention: NOVA steps aside. */
  sidelined = false,
}: { sidelined?: boolean } = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Mirrored into React state only so the bubble can switch which corner it
  // points from; the loop itself reads the ref.
  const [docked, setDocked] = useState(false);

  // Read by the loop, which is set up once and never re-created.
  const sidelinedRef = useRef(sidelined);
  useEffect(() => {
    sidelinedRef.current = sidelined;
  }, [sidelined]);

  useEffect(() => {
    const stage = stageRef.current;
    const anchor = anchorRef.current;
    const svg = svgRef.current;
    if (!stage || !anchor || !svg) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const gaze = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };

    let pointerSeen = false;
    let lastPointerAt = 0;
    let nextWanderAt = 0;
    let isDocked = false;
    let isSidelined = false;
    let ready = false;
    let slot: HTMLElement | null = null;
    let nav: HTMLElement | null = null;
    let frame = 0;
    /* --- Animation state machine ---------------------------------------
     * NOVA is always in exactly one state. A new trigger never hard-cuts the
     * current pose: `blendFrom` snapshots whatever is on screen and the engine
     * crossfades out of it, so entering *and* leaving a move are continuous.
     */
    let state: NovaState = "idle";
    let stateStartedAt = 0;
    let stateEndsAt = 0;
    /** At most one follow-up; further likes only add hearts and intensity. */
    let queued: NovaState | null = null;
    /** Snapshot of the live pose when the last state change happened. */
    let blendFrom: Pose = restingPose(0);
    let blendStartedAt = 0;
    let blendMs = BLEND_IN_MS;
    /** 0–1. Rises with rapid likes, decays back down. */
    let intensity = 0;
    let intensityAt = 0;
    /** The pose actually on screen this frame. */
    let pose: Pose = restingPose(0);
    let joyTimer: number | undefined;

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    /* ---------------------------------------------------------------- */
    /* Pointer                                                           */
    /* ---------------------------------------------------------------- */

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointerSeen = true;
      lastPointerAt = performance.now();
    };

    // Pointer gone from the window: let idle behaviour take back over.
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) lastPointerAt = 0;
    };

    // Somewhere plausible to look when nobody's driving. Biased shorter on the
    // vertical axis so NOVA glances sideways more than up and down.
    const pickWanderTarget = (now: number) => {
      target.x = (Math.random() * 2 - 1) * 0.85;
      target.y = (Math.random() * 2 - 1) * 0.55;
      nextWanderAt = now + 2000 + Math.random() * 2000;
    };

    /* ---------------------------------------------------------------- */
    /* Frame                                                             */
    /* ---------------------------------------------------------------- */

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // The reads of the frame, batched. Everything after this is a write —
      // reading back after a write would force a synchronous reflow.
      if (!slot?.isConnected) {
        slot = document.querySelector<HTMLElement>("[data-nova-slot]");
      }
      if (!nav?.isConnected) {
        nav = document.querySelector<HTMLElement>("[data-site-nav]");
      }
      const slotRect = slot?.getBoundingClientRect() ?? null;
      const navBottom = nav?.getBoundingClientRect().bottom ?? NAV_FALLBACK;

      // Measured every frame, open or not. The bubble hides with `visibility`,
      // which keeps its layout box, so these are real numbers throughout —
      // and treating a closed bubble as zero-sized made the placement below
      // solve to a different spot, so it visibly jumped at both ends of the
      // fade. It's the same batched read either way.
      const bubble = bubbleRef.current;
      const speech = bubble?.firstElementChild as HTMLElement | null;
      const bubbleWidth = speech?.offsetWidth ?? 0;
      const bubbleHeight = speech?.offsetHeight ?? 0;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Dock once the hero slot has scrolled up into the top quarter — or
      // immediately if the hero isn't on this page at all.
      const shouldDock = !slotRect || slotRect.bottom < vh * 0.28;

      // Stepping aside for the terminal is desktop-only: on phones the terminal
      // is a full-screen sheet, so there is nowhere to step aside *to*, and
      // lifting her above it would float a robot over the transcript.
      const shouldSideline = sidelinedRef.current && vw >= SMALL_SCREEN;

      let centerX: number;
      let centerY: number;
      let scale: number;

      if (shouldSideline) {
        scale = SIDELINE_WIDTH / BASE_WIDTH;
        centerX = vw - SIDELINE_MARGIN - SIDELINE_WIDTH / 2;
        centerY = vh - SIDELINE_MARGIN - (SIDELINE_WIDTH * ASPECT) / 2;
      } else if (shouldDock || !slotRect) {
        const dockWidth = vw < SMALL_SCREEN ? DOCK_WIDTH_SMALL : DOCK_WIDTH;
        scale = dockWidth / BASE_WIDTH;
        centerX = vw - DOCK_MARGIN - dockWidth / 2;
        centerY = vh - DOCK_MARGIN - (dockWidth * ASPECT) / 2;
      } else {
        scale = slotRect.width / BASE_WIDTH;
        centerX = slotRect.left + slotRect.width / 2;
        centerY = slotRect.top + slotRect.height / 2;
      }

      // Only transition on the flight itself. While tracking the hero slot the
      // transform is rewritten every frame, and a transition would read as lag.
      if (shouldDock !== isDocked) {
        isDocked = shouldDock;
        setDocked(shouldDock);
        anchor.dataset.flying = "true";
        later(() => {
          anchor.dataset.flying = "false";
        }, FLY_MS);
      }

      // Stepping aside gets its own, shorter transition.
      if (shouldSideline !== isSidelined) {
        isSidelined = shouldSideline;
        anchor.dataset.sideline = String(shouldSideline);
        anchor.dataset.stepping = "true";
        later(() => {
          anchor.dataset.stepping = "false";
        }, SIDELINE_MS);
      }

      anchor.style.transform = `translate(${centerX - BASE_WIDTH / 2}px, ${
        centerY - BASE_HEIGHT / 2
      }px) scale(${scale})`;

      if (!ready) {
        ready = true;
        stage.dataset.ready = "true";
      }

      /* --- Pose -------------------------------------------------------
       * Head and eyes are deliberately *not* part of this: they track the
       * cursor from their own values below, so NOVA keeps watching you while
       * her body dances.
       */
      intensity = Math.max(
        0,
        intensity - (now - intensityAt) / INTENSITY_DECAY_MS,
      );
      intensityAt = now;

      // A finished move hands over to whatever is queued, else back to idle.
      if (state !== "idle" && now >= stateEndsAt) {
        enterState(queued ?? "idle", now);
        queued = null;
      }

      /* How tired the body reads, updated every frame so a charge walks her
         back upright continuously rather than in steps. */
      const power = getPower();
      const droop = power.droop;

      if (svg.dataset.power !== power.state) svg.dataset.power = power.state;
      svg.style.setProperty("--nova-droop", droop.toFixed(2));

      // The port shows itself the moment a plug is picked up, so the visitor
      // can see where they're aiming before they get there.
      if (power.dragging || power.charging) svg.dataset.port = "true";
      else delete svg.dataset.port;
      if (power.charging) svg.dataset.charging = "true";
      else delete svg.dataset.charging;

      if (reducedMotion.matches) {
        // Held at a fixed rest pose — the engine's idle still breathes and
        // sways, which is motion the visitor asked not to see. Evaluated at a
        // constant time so nothing oscillates. The slump still applies: it's a
        // posture, not a movement.
        pose = restingPose(0, droop);
      } else {
        const wantPose = poseFor(
          state,
          now,
          now - stateStartedAt,
          intensity,
          droop,
        );
        const blend = easeBlend(Math.min(1, (now - blendStartedAt) / blendMs));
        pose = blendPose(blendFrom, wantPose, blend);
      }

      svg.style.setProperty("--pose-arm-l", pose.armL.toFixed(2));
      svg.style.setProperty("--pose-arm-r", pose.armR.toFixed(2));
      svg.style.setProperty("--pose-fore-l", pose.foreL.toFixed(2));
      svg.style.setProperty("--pose-fore-r", pose.foreR.toFixed(2));
      svg.style.setProperty("--pose-body-y", pose.bodyY.toFixed(2));
      svg.style.setProperty("--pose-body-rot", pose.bodyRot.toFixed(2));
      svg.style.setProperty("--pose-sx", pose.bodySx.toFixed(3));
      svg.style.setProperty("--pose-sy", pose.bodySy.toFixed(3));
      svg.style.setProperty("--pose-chest", pose.chest.toFixed(3));

      /* Gaze — origin derived from the transform above, not measured. */
      const halfHeight = (BASE_HEIGHT * scale) / 2;
      const boxTop = centerY - halfHeight;
      const eyeY = boxTop + BASE_HEIGHT * scale * EYE_LINE;

      const idle = !pointerSeen || now - lastPointerAt > IDLE_AFTER;

      if (idle) {
        if (reducedMotion.matches) {
          target.x = 0;
          target.y = 0;
        } else if (now > nextWanderAt) {
          pickWanderTarget(now);
        }
      } else {
        const dx = (pointer.x - centerX) / REACH;
        const dy = (pointer.y - eyeY) / REACH;
        // Clamp to the unit circle, so a diagonal pointer doesn't push the gaze
        // further than a straight-on one.
        const distance = Math.hypot(dx, dy);
        const limit = distance > 1 ? 1 / distance : 1;
        target.x = dx * limit;
        target.y = dy * limit;
        nextWanderAt = 0;
      }

      // Drift lazily when idling, follow crisply when being led.
      const ease = idle ? 0.035 : 0.12;
      gaze.x += (target.x - gaze.x) * ease;
      gaze.y += (target.y - gaze.y) * ease;

      svg.style.setProperty("--nova-look-x", gaze.x.toFixed(3));
      svg.style.setProperty("--nova-look-y", gaze.y.toFixed(3));

      // Where the hearts launch from. Written to the root rather than the
      // stage so the burst layer can read it without threading refs around.
      const antennaTop = boxTop + BASE_HEIGHT * scale * HEAD_TOP;
      document.documentElement.style.setProperty(
        "--nova-head-x",
        `${Math.round(centerX)}`,
      );
      document.documentElement.style.setProperty(
        "--nova-head-y",
        `${Math.round(antennaTop)}`,
      );

      // Where the charging cable lands. Published in JS rather than as a custom
      // property: the charger draws a curve through it and would otherwise have
      // to read back computed style every frame.
      setNovaPort(centerX, boxTop + BASE_HEIGHT * scale * PORT_LINE);

      /* Bubble — placed by collision, not by fixed offsets.
         Prefers sitting above NOVA's antenna. Where that would put it under the
         navbar or off the top of the screen — which is exactly what happens in
         the hero on a phone — it flips below her instead and the tail flips with
         it. Both axes are then clamped into the safe area, so the bubble can
         never render outside the viewport or beneath the nav. */
      if (bubble) {
        const novaHeight = BASE_HEIGHT * scale;
        const antennaY = boxTop + novaHeight * HEAD_TOP;
        const novaBottom = boxTop + novaHeight;

        // Top and bottom of the region the bubble is allowed to occupy.
        const safeTop = navBottom + EDGE_PAD;
        const safeBottom = vh - EDGE_PAD;

        const above = antennaY - BUBBLE_GAP - bubbleHeight;
        const below = novaBottom + BUBBLE_GAP;

        // Flip only when there genuinely isn't room above — otherwise every
        // desktop bubble would move too.
        const placeBelow =
          above < safeTop && below + bubbleHeight <= safeBottom;

        const top = clamp(
          placeBelow ? below : above,
          safeTop,
          Math.max(safeTop, safeBottom - bubbleHeight),
        );

        // Docked, NOVA hugs the right edge, so the bubble hangs from her right
        // side rather than centring on her and overflowing.
        const preferredLeft = shouldDock
          ? centerX + (BASE_WIDTH * scale) / 2 - bubbleWidth
          : centerX - bubbleWidth / 2;

        const left = clamp(
          preferredLeft,
          EDGE_PAD,
          Math.max(EDGE_PAD, vw - EDGE_PAD - bubbleWidth),
        );

        // The tail tracks NOVA even after the body has been clamped away from
        // her, so it keeps pointing at the robot rather than into space.
        const tailX = clamp(
          centerX - left,
          TAIL_INSET,
          Math.max(TAIL_INSET, bubbleWidth - TAIL_INSET),
        );

        bubble.style.setProperty("--nova-bubble-x", `${Math.round(left)}px`);
        bubble.style.setProperty("--nova-bubble-y", `${Math.round(top)}px`);
        bubble.style.setProperty("--nova-tail-x", `${Math.round(tailX)}px`);
        speech!.dataset.place = placeBelow ? "below" : "above";
      }
    };

    /* ---------------------------------------------------------------- */
    /* Blinking and clicks                                               */
    /* ---------------------------------------------------------------- */

    const blink = () => {
      svg.dataset.blink = "true";
      later(() => {
        svg.dataset.blink = "false";
      }, 110);
    };

    const scheduleBlink = () => {
      later(
        () => {
          blink();
          // Every so often, a double blink. Perfectly even blinking reads
          // robotic in the wrong way.
          if (Math.random() < 0.22) later(blink, 260);
          scheduleBlink();
        },
        2400 + Math.random() * 3800,
      );
    };

    /* ---------------------------------------------------------------- */
    /* Moves                                                             */
    /* ---------------------------------------------------------------- */

    /**
     * Switch state, blending out of the pose currently on screen.
     *
     * Nothing here reads a "current animation frame" — `pose` already holds
     * exactly what's rendered, so starting the crossfade from it is what
     * guarantees no teleport, whichever move is interrupted and whenever.
     */
    const enterState = (next: NovaState, now: number) => {
      blendFrom = pose;
      blendStartedAt = now;

      // Distance-aware: a big swing gets longer to wind up than a small one.
      // A fixed blend makes "hanging arms to overhead" cover 120° in the same
      // time as a 5° adjustment, which is what still read as a lurch.
      const first = poseFor(next, now, 0, intensity);
      const travel = Math.max(
        Math.abs(first.armL - pose.armL),
        Math.abs(first.armR - pose.armR),
        Math.abs(first.bodyRot - pose.bodyRot) * 3,
      );
      const base = next === "idle" ? BLEND_IDLE_MS : BLEND_IN_MS;
      blendMs = Math.min(BLEND_MAX_MS, base + travel * 1.7);

      state = next;
      stateStartedAt = now;
      stateEndsAt =
        next === "idle" || next === "happy"
          ? Infinity
          : now + STATE_MS[next] * (1 - intensity * 0.12);
      svg.dataset.state = next;
    };

    const busy = () => state !== "idle";

    /**
     * A like landed.
     *
     * Free: the face and the hearts. Rationed: the body. Spamming should read
     * as NOVA getting more and more delighted, so extra likes raise `intensity`
     * — bigger, slightly faster moves — rather than starting a second animation
     * on limbs that are already swinging.
     */
    const runCelebration = (kind: Celebration) => {
      const now = performance.now();

      // Flat battery: no delight, no dance. A tired robot that still beams and
      // grins on every click would undo the whole state — the like still lands
      // and still throws hearts, she just hasn't the power to react to it.
      if (getPower().state !== "normal") return;

      // Face first, always, however fast they click. Pure opacity, so it can
      // retrigger endlessly without ever snapping.
      window.clearTimeout(joyTimer);
      svg.dataset.joy = "true";
      joyTimer = later(() => {
        delete svg.dataset.joy;
      }, JOY_MS);

      if (reducedMotion.matches) return;

      if (!busy()) {
        enterState(kind, now);
        return;
      }

      // Already moving: intensify, and hold at most one follow-up.
      intensity = Math.min(1, intensity + INTENSITY_STEP);
      // Stretch the current move a touch so the extra energy has somewhere to
      // go rather than queueing a pile of animations.
      stateEndsAt = Math.min(stateEndsAt + 90, now + 2600);
      if (!queued && kind !== state) queued = kind;
    };

    /** The idle wave. Never interrupts a celebration, or a flat battery. */
    const wave = () => {
      if (reducedMotion.matches || busy()) return;
      if (getPower().state !== "normal") return;
      enterState("wave", performance.now());
    };

    // Idle waves, at a randomised interval so they never feel metronomic.
    const scheduleWave = () => {
      later(
        () => {
          // Only when nobody's driving — waving mid-cursor-track reads as a
          // twitch rather than a greeting.
          if (!pointerSeen || performance.now() - lastPointerAt > IDLE_AFTER) {
            wave();
          }
          scheduleWave();
        },
        WAVE_MIN_MS + Math.random() * (WAVE_MAX_MS - WAVE_MIN_MS),
      );
    };

    /*
     * The yawn — the low-battery counterpart to the wave, and it runs on the
     * same one-shot schedule for the same reason: a fixed interval would read
     * as a mechanism rather than as a robot getting sleepy.
     *
     * Only in `low`. In `reserve` she's asleep on her feet, and a stretch would
     * undo the nap; while charging she's on her way back up.
     */
    const scheduleYawn = () => {
      later(
        () => {
          const power = getPower();
          if (power.state === "low" && !power.charging && !busy()) {
            enterState("yawn", performance.now());
          }
          scheduleYawn();
        },
        YAWN_MIN_MS + Math.random() * (YAWN_MAX_MS - YAWN_MIN_MS),
      );
    };

    // Hello, once, after the boot screen clears.
    const greetOnBoot = () => later(wave, 400);

    /* ---------------------------------------------------------------- */
    /* Liking                                                            */
    /* ---------------------------------------------------------------- */

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "l" && event.key !== "L") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Never steal the key from someone typing into the chat or a form.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      fireLike();
    };

    const handlePointerDown = () => {
      if (reducedMotion.matches) return;
      svg.dataset.react = "true";
      blink();
      later(() => {
        svg.dataset.react = "false";
      }, 420);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    const offBooted = onNovaBooted(greetOnBoot);
    const offCelebrate = onCelebrate(runCelebration);
    window.addEventListener("keydown", handleKeyDown);

    frame = requestAnimationFrame(tick);
    // Blinking survives reduced motion on purpose: it's a change of expression
    // in place, not movement across the screen, and without it NOVA reads as
    // switched off. The wave loop does not.
    scheduleBlink();
    if (!reducedMotion.matches) {
      scheduleWave();
      scheduleYawn();
    }

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      offBooted();
      offCelebrate();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return { stageRef, anchorRef, svgRef, bubbleRef, docked };
}
