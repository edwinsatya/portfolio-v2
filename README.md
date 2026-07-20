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

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` once the
domain is live — canonical links, `robots.txt`, `sitemap.xml`, and the Open
Graph card all derive their absolute URLs from it.

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
- [ ] **3** — NOVA: idle animation and cursor tracking
- [ ] **4** — Section-triggered reactions and speech bubbles
- [ ] **5** — `localStorage` memory and return-visitor greeting
- [ ] **6** — Scripted chat
- [ ] **7** — Optional: LLM-backed chat
- [ ] **8** — Polish, responsive, accessibility, deploy

Steps 3–6 have hooks waiting for them already: `sections[]` in `profile.ts`
carries a `mood` and `line` per section, `chatIntents[]` holds the scripted
answers, and `useActiveSection` reports the current section.

## Accessibility and motion

- `prefers-reduced-motion` removes transforms and disables smooth scrolling.
- Scroll reveals fall back to visible with JavaScript disabled.
- Skip link, focus rings, and labelled sections throughout.
