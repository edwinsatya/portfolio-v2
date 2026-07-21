"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { profile } from "@/content/profile";
import { sceneFromSegment } from "@/content/scenes";
import { HeroChat } from "@/components/nova/HeroChat";

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
    <div className="stage">
      {/* Identity, top-left. */}
      <header className="stage-identity">
        <h1 className="font-display text-lg font-semibold tracking-tight lowercase sm:text-xl">
          {profile.name.toLowerCase()}.
        </h1>
        <p className="mono-label mt-1.5 text-faint">
          {profile.role} · {profile.location}
        </p>
      </header>

      {/* Giant blurred wordmark, behind everything, on NOVA's centre line. */}
      <div aria-hidden className="stage-wordmark-wrap">
        <span className="hero-wordmark font-display font-semibold whitespace-nowrap">
          edwin.dev
        </span>
      </div>

      {/* NOVA's landing spot. She's rendered on the fixed stage layer, not here;
          this only reserves the space she's pinned over. */}
      <div className="stage-nova" data-compact={!isHome}>
        <div data-nova-slot className="stage-nova-slot" />
      </div>

      {/* Scene content lives around NOVA and owns its own scroll. */}
      {children}

      {/* Bottom band. */}
      <div className="stage-foot">
        <HeroChat
          sceneId={scene.id}
          line={scene.line}
          chips={scene.chips}
        />

        <div aria-hidden className="stage-status">
          <div className="stage-status-bar">
            <div />
          </div>
          <p className="mono-label mt-2 text-center text-faint">Nova online</p>
        </div>
      </div>
    </div>
  );
}
