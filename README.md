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
| Fonts     | Space Grotesk (display) + Inter (body) |
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
- [ ] **5** — `localStorage` memory and return-visitor greeting
- [ ] **6** — Scripted chat
- [ ] **7** — Optional: LLM-backed chat
- [ ] **8** — Polish, responsive, accessibility, deploy

Steps 5–6 have hooks waiting for them already: `chatIntents[]` in `profile.ts`
holds the scripted answers, and `useSectionReactions` is where a remembered
visitor's greeting would slot in.

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
same frame rather than measured off the SVG, so every frame is a single layout
read followed only by writes. Reading back after a write would force a
synchronous reflow 60 times a second.

Under `prefers-reduced-motion` every autonomous animation stops — float, blink,
wander, wave, the flight to the corner — but the gaze still tracks, because it
answers the visitor's own input, and the speech bubbles still appear, because
they carry meaning. They just fade instead of springing.

## Accessibility and motion

- `prefers-reduced-motion` removes transforms and disables smooth scrolling.
- Scroll reveals fall back to visible with JavaScript disabled.
- Skip link, focus rings, and labelled sections throughout.
