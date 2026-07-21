# Portfolio — Edwin Satya Yudistira

An interactive portfolio built around **NOVA**, a robot companion that greets
visitors, follows the cursor, reacts to where they are on the page, remembers
them between visits, and answers questions about Edwin.

The site is built so the content works completely on its own — NOVA is an
enhancement layered on top, never a dependency.

## Stack

| Concern   | Choice                               |
| --------- | ------------------------------------ |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling   | Tailwind CSS v4                      |
| Fonts     | Space Grotesk (display) + Inter (body) + JetBrains Mono (UI labels) |
| Deploy    | Vercel                               |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

The site's absolute origin — used by canonical links, `robots.txt`,
`sitemap.xml`, and the Open Graph card — is resolved in
[`lib/site.ts`](src/lib/site.ts): `NEXT_PUBLIC_SITE_URL` if set, otherwise
Vercel's own `VERCEL_PROJECT_PRODUCTION_URL`, otherwise localhost. **Set
`NEXT_PUBLIC_SITE_URL` only if you point a custom domain at the site**;
a plain Vercel deploy already resolves to its real production URL.

## Where things live

```
src/
  content/profile.ts        every fact on the site, in one file
  app/
    layout.tsx              fonts, metadata, Open Graph
    page.tsx                section order
    opengraph-image.tsx     social card, generated at build time
    globals.css             design tokens and base styles
  components/
    layout/                 Nav, Footer
    sections/               Hero, About, Skills, Projects, Experience, Services, Contact
    ui/                     Section, Reveal, Icons
  hooks/useActiveSection.ts which section owns the viewport
```

**Editing content:** `src/content/profile.ts` is the single source of truth.
Change a fact there and it updates everywhere, including NOVA's dialogue.

Projects flagged `needsReview: true` have a description inferred from the
project name rather than written from source material — rewrite those and drop
the flag.

## Build progress

- [x] **1** — Scaffold, theme, fonts, layout
- [x] **2** — Static sections with real content
- [x] **3** — NOVA: idle animation and cursor tracking
- [x] **4** — Section-triggered reactions and speech bubbles
- [x] **5** — `localStorage` memory and return-visitor greeting
- [x] **6** — Scripted chat
- [ ] **7** — Optional: LLM-backed chat
- [ ] **8** — Polish, responsive, accessibility, deploy

Step 7 is a one-function change — see the chat section below.

## Theme and type

Light throughout: a lavender-white page (`--color-bg`) with a CSS-only particle
field, dark ink, and cyan reserved for NOVA's glow. Two accent tokens exist on
purpose — `--color-accent` is the glow, `--color-accent-ink` is the darkened
version for text and icons, because raw cyan on a light surface fails contrast
at small sizes. Primary buttons and the nav's active pill use `--color-chrome`
(near-black) for the same reason.

`faint` is deliberately darker than a dark theme would allow: existing sections
use it for real content — skill captions, dates, contact copy — not just
decoration, so it has to clear 4.5:1 rather than merely look subtle.

JetBrains Mono carries every UI label via the `.mono-label` class: nav, chips,
status readouts, boot messages, eyebrows. Body copy stays Inter.

## Landing

NOVA is the subject, so [`Hero.tsx`](src/components/sections/Hero.tsx) renders
almost nothing visible — a name block, a blurred `edwin.dev` wordmark for depth,
the empty slot the fixed stage pins the robot over, and the chat entry. Stats
moved to About, where the surrounding copy gives them context.

[`BootSequence.tsx`](src/components/nova/BootSequence.tsx) plays a monospace
power-on before the hero: ~2.6s first visit, ~0.9s on a return
("RESUMING SESSION — WELCOME BACK, <NAME>"). It's an overlay, not a gate — the
page beneath is fully rendered the whole time, it dismisses on any input, and a
deep link skips it entirely. While it runs, `html[data-booting]` lifts NOVA
above it and hides the nav, so you watch the robot boot rather than a blank page.

[`HeroChat.tsx`](src/components/nova/HeroChat.tsx) types NOVA's line out with a
blinking caret; the full sentence is always in the DOM for screen readers and
reduced motion. Its chips call `askNova()` from
[`lib/nova-bus.ts`](src/lib/nova-bus.ts), which opens the panel and sends the
question. Opening *with* a question skips the name ask — otherwise NOVA would
ask your name and then immediately talk over herself answering the chip.

## NOVA

Drawn as inline SVG in [`components/nova/Nova.tsx`](src/components/nova/Nova.tsx) —
no asset to load and nothing that can fail to arrive. She is rendered **once**,
on a fixed stage, and moves between two homes: pinned over the
`[data-nova-slot]` box the hero reserves, then flying down to the bottom-right
corner when that scrolls away. One instance rather than a hero copy and a dock
copy means her gaze, blink timing, and mood can never disagree mid-handoff.

Four files:

| File | Does |
| --- | --- |
| [`nova/Nova.tsx`](src/components/nova/Nova.tsx) | The drawing. Renders every facial part it could need and lets `data-mood` pick. |
| [`nova/NovaStage.tsx`](src/components/nova/NovaStage.tsx) | The fixed layer holding NOVA and her speech bubble. |
| [`hooks/useNovaStage.ts`](src/hooks/useNovaStage.ts) | One `requestAnimationFrame` loop: dock position, gaze easing, idle wander, blinks, click reaction, bubble placement. |
| [`hooks/useSectionReactions.ts`](src/hooks/useSectionReactions.ts) | Turns the active section into a mood and a debounced, once-per-visit line. |
| [`nova/nova.css`](src/components/nova/nova.css) | All choreography — how far each part moves, and what every mood looks like. |

**Editing the tour:** `sections[]` in `profile.ts` carries a `mood` and a `line`
per section. Change the line and NOVA says something else; change the mood and
she pulls a different face. Adding a new mood means adding a `[data-mood="…"]`
block to `nova.css`, otherwise it falls back to `greeting`.

**Why one loop:** the gaze origin is derived from the dock position computed the
same frame rather than measured off the SVG, so every frame's reads are batched
up front and everything after them is a write. Reading back after a write would
force a synchronous reflow 60 times a second.

**Bubble placement** is computed, not fixed. Each frame the loop measures the
bubble, the navbar, and NOVA, then prefers to sit above her antenna — flipping
below her (tail flipped too) when above would collide with the navbar, which is
what happens in the hero on a phone. Both axes are then clamped into the safe
area, so a bubble can never render off screen or under the nav, and the tail
keeps tracking NOVA even when the body has been clamped away from her. Tune
`EDGE_PAD`, `BUBBLE_GAP`, and `TAIL_INSET` in `useNovaStage.ts`.

## Project screenshots

Screenshots live in `public/projects/` and are wired up per project via the
`image` field in `profile.ts`. That field names the file explicitly rather than
deriving it from the slug, because several filenames don't match their slug
(`mile-app` / `mileapp`, `bountie-hunter` / `bountie`, `tola` / `tola-web`) — a
derived path would 404 on those silently.

[`ui/ProjectShot.tsx`](src/components/ui/ProjectShot.tsx) renders them through
`next/image` in a fixed 2:1 box with `object-cover`, so the grid stays even no
matter what the source images do. A project with no `image` gets a gradient
placeholder with its initial instead — same box, no ragged layout.

Nothing here is `priority`: the grid never sits above the fold, so all eleven
stay lazy. The `sizes` attribute mirrors the grid's breakpoints; if you change
the column counts in `Projects.tsx`, change `sizes` to match or the optimizer
will ship files at the wrong width.

## Memory

[`lib/memory.ts`](src/lib/memory.ts) stores `visitCount`, `visitorName`,
`sectionsSeen`, and `lastVisit` under one localStorage key, and exposes them as a
store that React reads through `useSyncExternalStore` — localStorage genuinely is
an external store, and that is the primitive for reading one without tearing
during hydration.

What changes with what NOVA remembers:

| | |
| --- | --- |
| First visit | Short intro, plus an inline name field with a Skip button. |
| Return visit | `Welcome back, <name>!`, or `Hey, you again!` without a name. Reached the projects last time? `Back for the projects?` |
| Sections heard before | A shorter `altLines` variant, picked at random so a third visit isn't a rerun of the second. |
| Forgotten | The footer's "NOVA forgets you" wipes the key and drops straight back to first-visit behaviour. |

Nothing is ever required. The name prompt is the only part of the stage that
accepts clicks at all, and scrolling past it dismisses it like any other bubble.

**Storage blocked** (private mode, disabled cookies): reads return an empty
memory, writes are no-ops, the forget button hides itself, and every visitor is
simply treated as new. Verified against both failure shapes — storage that throws
on write, and storage that throws on property access.

## Chat

Clicking NOVA opens "Talk to NOVA" — a card above her on desktop, a bottom sheet
on phones. Opening it also pulls her down to the corner, so the panel is always
beside the robot rather than stranded across the page.

Three layers, split so the answering can be replaced without touching the UI:

| File | Does |
| --- | --- |
| [`content/nova-qa.ts`](src/content/nova-qa.ts) | The knowledge, as data. Keywords, answers, follow-up chips. No logic. |
| [`lib/nova-brain.ts`](src/lib/nova-brain.ts) | The `NovaResponder` contract, and the keyword matcher that currently implements it. |
| [`hooks/useNovaChat.ts`](src/hooks/useNovaChat.ts) | Conversation state, the thinking beat, and scroll actions. |

**Swapping in an LLM (step 7):** write a second `NovaResponder` that POSTs to an
API route, and pass it as `useNovaChat({ name, respond: apiResponder })`. The
type is already async and already returns `{ text, scrollTo?, suggestions }`, so
the panel, the history, the chips, and the scroll actions all keep working
unchanged. Keep the key server-side in the route.

**Matching:** weighted keyword overlap — longer keywords count for more, phrases
count double, and a whole-word match gets a floor so short-but-specific terms
like "cv" aren't drowned out. Below a confidence threshold NOVA says she doesn't
know rather than guessing, and offers three chips instead.

Answers use the visitor's remembered name where it reads naturally. Rates are
deliberately vague — NOVA points people at the inbox rather than quoting numbers
nobody gave her.

Under `prefers-reduced-motion` every autonomous animation stops — float, blink,
wander, wave, the flight to the corner — but the gaze still tracks, because it
answers the visitor's own input, and the speech bubbles still appear, because
they carry meaning. They just fade instead of springing.

## Accessibility and motion

- `prefers-reduced-motion` removes transforms and disables smooth scrolling.
- Scroll reveals fall back to visible with JavaScript disabled.
- Skip link, focus rings, and labelled sections throughout.
