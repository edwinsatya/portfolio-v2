import { profile, stats } from "@/content/profile";
import { Reveal } from "@/components/ui/Reveal";
import {
  ArrowDown,
  ArrowUpRight,
  Github,
  Linkedin,
  Mail,
  MapPin,
} from "@/components/ui/Icons";

export function Hero() {
  return (
    <section
      id="intro"
      data-section="intro"
      aria-labelledby="intro-heading"
      className="relative mx-auto flex min-h-svh w-full max-w-6xl items-center px-6 pt-28 pb-20 sm:px-8"
    >
      <div className="grid w-full items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        {/* ---------------------------------------------------------------- */}
        {/* Copy — ordered second on small screens so NOVA does the greeting  */}
        {/* before the pitch, the way she would on desktop.                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="order-2 lg:order-none">
          <Reveal>
            <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs text-muted backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              {profile.availability.headline}
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 id="intro-heading" className="mt-7">
              <span className="block font-display text-base font-medium text-muted sm:text-lg">
                {profile.name}
              </span>
              <span className="mt-2 block text-[clamp(2.6rem,8vw,5.2rem)] leading-[0.95] font-semibold tracking-tighter text-balance">
                <span className="text-gradient">Code.</span>{" "}
                <span className="text-gradient">Create.</span>{" "}
                <span className="text-gradient">Reimagine.</span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted text-pretty sm:text-lg">
              {profile.bio}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#projects"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-bg transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100"
              >
                See the work
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5 motion-reduce:group-hover:translate-y-0" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-3 text-sm text-ink backdrop-blur-sm transition-colors hover:border-accent/50"
              >
                Get in touch
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-faint">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {profile.location}
              </span>
              <span className="hidden h-3 w-px bg-line sm:block" />
              <div className="flex items-center gap-1">
                <a
                  href={profile.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface hover:text-ink"
                >
                  <span className="sr-only">GitHub</span>
                  <Github className="size-4" />
                </a>
                <a
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface hover:text-ink"
                >
                  <span className="sr-only">LinkedIn</span>
                  <Linkedin className="size-4" />
                </a>
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface hover:text-ink"
                >
                  <span className="sr-only">Email</span>
                  <Mail className="size-4" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-2xl font-semibold sm:text-3xl">
                    {stat.value}
                  </dd>
                  <p className="mt-1 text-[0.7rem] leading-snug text-faint">
                    {stat.label}
                  </p>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* NOVA's landing spot. She is not rendered here — NovaStage pins her */}
        {/* over this box from a fixed layer, so she can fly to the corner     */}
        {/* when the hero scrolls away instead of being left behind. All this  */}
        {/* reserves is the space.                                             */}
        {/* ---------------------------------------------------------------- */}
        {/* Right-aligned with auto margins rather than `justify-self: end` —
            that would shrink-wrap the column, and with only an aspect-ratio box
            inside, the slot collapses to the width of the caption below it. */}
        <Reveal delay={0.2} className="order-1 lg:order-none">
          <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[300px] lg:mr-0 lg:ml-auto lg:max-w-[380px]">
            <div data-nova-slot className="aspect-[240/264] w-full" />

            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-faint">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              <span className="font-display tracking-[0.18em] uppercase">
                Nova
              </span>
              {/* Only true where there's actually a cursor to follow. */}
              <span className="hidden [@media(hover:hover)]:inline">
                · watching your cursor
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
