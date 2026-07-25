"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { profile } from "@/content/profile";
import { sceneFromSegment } from "@/content/scenes";
import { HeroChat } from "@/components/nova/HeroChat";
import { LikeCounter } from "@/components/nova/LikeCounter";
import { StageStatus } from "@/components/stage/StageStatus";
import { batteryCells } from "@/lib/power";
import { usePower } from "@/hooks/usePower";

/**
 * The constant frame around every scene: identity top-left, blurred wordmark
 * behind NOVA, NOVA's slot dead centre, her typed line and chips bottom-left,
 * and the machine readout bottom-centre.
 *
 * Rendered from the stage layout, so it survives scene changes untouched — only
 * `children` swaps. The segment tells it which scene's line and chips to show.
 */
export function StageFrame({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const scene = sceneFromSegment(segment);
  const isHome = scene.id === "home";

  return (
    <div className="stage" data-scene={scene.id}>
      <LikeCounter />

      {/* Identity, top-left. */}
      <header className="stage-identity">
        <h1 className="font-display text-lg font-semibold tracking-tight lowercase sm:text-xl">
          {profile.name.toLowerCase()}.
        </h1>
        <p className="mono-label mt-1.5 text-faint">
          {profile.role} · {profile.location}
        </p>
        {/* Machine readout under the identity, phones only — desktop already
            has the NOVA ONLINE strip along the bottom. */}
        <StatusLine />
      </header>

      {/* Giant blurred wordmark, behind everything, on NOVA's centre line. */}
      <div aria-hidden className="stage-wordmark-wrap">
        <span className="hero-wordmark font-display font-semibold whitespace-nowrap">
          edwin.dev
        </span>
      </div>

      {/* NOVA's landing spot. She's rendered on the fixed stage layer, not here;
          this only reserves the space she's pinned over. */}
      <div className="stage-nova" data-compact={!isHome} data-scene={scene.id}>
        <div data-nova-slot className="stage-nova-slot" />
      </div>

      {/* Scene content lives around NOVA and owns its own scroll. */}
      {children}

      {/* Bottom band. */}
      <div className="stage-foot">
        <div>
          <HeroChat
            sceneId={scene.id}
            line={scene.line}
            taglines={scene.taglines}
            chips={scene.chips}
          />
          {/* Two phrasings: "press L" is meaningless without a keyboard, so
              touch devices get the tap wording instead. CSS picks. */}
          <p className="stage-hint">
            <span className="stage-hint-key">
              Press <kbd>L</kbd> to like — or click NOVA
            </span>
            <span className="stage-hint-tap">
              <kbd>Double tap</kbd> to like — or tap NOVA
            </span>
          </p>
        </div>

        <StageStatus />
      </div>
    </div>
  );
}

/**
 * The phone-only readout under the identity.
 *
 * Split into its own component so the battery's per-percent updates re-render
 * one line rather than the whole frame — `StageFrame` also owns the wordmark,
 * the scene slot, and the foot, none of which care about the battery.
 */
function StatusLine() {
  const power = usePower();

  return (
    <p className="stage-status-line" data-power={power.state} aria-hidden>
      <i />
      {power.charging ? "Charging " : ""}
      {batteryCells(power.level)} {power.level}%
    </p>
  );
}
