import { profile } from "@/content/profile";
import { HeroChat } from "@/components/nova/HeroChat";

/**
 * The landing screen.
 *
 * NOVA is the subject here, so this file deliberately renders almost nothing
 * visible: a name block, a blurred wordmark for depth, an empty slot the fixed
 * NOVA stage pins the robot over, and the chat entry point. Everything is
 * positioned around the slot rather than in a document flow, which is what keeps
 * the robot optically centred without the copy pushing it off-centre.
 */
export function Hero() {
  return (
    <section
      id="intro"
      data-section="intro"
      aria-labelledby="intro-heading"
      className="relative flex min-h-svh w-full flex-col overflow-hidden px-6 pt-24 pb-10 sm:px-8 sm:pt-28"
    >
      {/* Name block, top-left. */}
      <header className="relative z-10 shrink-0">
        <h1
          id="intro-heading"
          className="font-display text-lg font-semibold tracking-tight lowercase sm:text-xl"
        >
          {profile.name.toLowerCase()}.
        </h1>
        <p className="mono-label mt-1.5 text-faint">
          {profile.role} · {profile.location}
        </p>
      </header>

      {/* Giant blurred wordmark, sitting behind NOVA for depth. Pinned to the
          same centre line as the robot so the two read as one composition. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 flex -translate-y-1/2 justify-center"
      >
        <span className="hero-wordmark font-display font-semibold whitespace-nowrap">
          edwin.dev
        </span>
      </div>

      {/* NOVA's landing spot. She isn't rendered here — NovaStage pins her over
          this box from a fixed layer so she can fly to the corner on scroll.
          This only reserves the space. */}
      <div className="relative z-[1] flex flex-1 items-center justify-center py-4">
        <div
          data-nova-slot
          className="aspect-[240/264] w-full max-w-[min(15rem,38svh)] sm:max-w-[min(19rem,44svh)] lg:max-w-[min(24rem,50svh)]"
        />
      </div>

      {/* Bottom band: chat entry left, machine readout centre. On small screens
          the readout drops away rather than crowding the chips. */}
      <div className="relative z-10 shrink-0">
        <HeroChat />

        <div
          aria-hidden
          className="mx-auto mt-8 hidden w-full max-w-xs sm:block"
        >
          <div className="h-px w-full bg-line">
            <div className="h-px w-1/3 bg-chrome/50" />
          </div>
          <p className="mono-label mt-2 text-center text-faint">Nova online</p>
        </div>
      </div>
    </section>
  );
}
