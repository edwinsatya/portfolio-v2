/**
 * The WORK scene's content — the career column, the selected projects, and
 * the stack marquee along the bottom.
 *
 * Kept apart from `profile.ts` on purpose. That file is the *classic* build's
 * source of truth; this one is the stage's WORK scene as Edwin specified it — a
 * fixed list, in a fixed order, each with the card copy, the category, and the
 * badge it should show.
 *
 * On stacks, though, `profile.ts` wins. Edwin has confirmed the chips in the
 * classic build, so `tags` here is always a two-item *shortening* of the stack
 * over there — the two most informative entries, never a different technology.
 * If you edit one, edit the other; an inferred tag on this side is what put
 * PostgreSQL on a Web3 project and a Node backend on a client-only app.
 *
 * NOTE FOR EDWIN — two things to confirm:
 *  1. `org` is what the career column filters on. I've put MileApp under
 *     `personal`: a public client *and* server repo, with a mocked data layer,
 *     read like a build of your own rather than something shipped inside a
 *     company. Move it if that's wrong.
 *  2. BRI, homecare24.id and Telkom have no public projects attached, so
 *     selecting one says so rather than emptying the list. If any of them
 *     produced something shippable, give a card that `org` and it lights up.
 */

/** Which career stop a project came out of. `personal` is Edwin's own time. */
export type WorkOrg =
  | "bri"
  | "tola"
  | "magloft"
  | "bountie"
  | "homecare24"
  | "telkom"
  | "personal";

export type WorkCard = {
  /** Route segment: `/work/<slug>`. Matches `profile.ts` where both have it. */
  slug: string;
  /** Rank in the list, and the number printed on the card. */
  no: string;
  /** The small uppercase kicker beside the number. */
  category: string;
  name: string;
  /** Two lines on the card. The detail page carries the long version. */
  blurb: string;
  /** Exactly two, so the chip row never wraps in the column. */
  tags: [string, string];
  /**
   * Filename in `public/projects/`. Omitted where there is no interface to
   * show — a smart-contract project has no screen, and a screenshot of a block
   * explorer would be someone else's UI — so the card and the detail page draw
   * a placeholder instead.
   */
  image?: string;
  /** Top-right of the card. Only where there's something true to say. */
  badge?: string;
  org: WorkOrg;
  live?: string;
  /**
   * Overrides the "Visit live" button on the detail page. Set where the live
   * thing isn't a site — a published package's home is its registry page, and
   * "Visit live" would be the wrong promise about what the click does.
   */
  liveLabel?: string;
  /**
   * The repository. On a full-stack build this is the front end, and
   * `sourceApi` carries the other half — the sidebar labels them "Front-end"
   * and "API" rather than printing "Source" twice with no way to tell which
   * is which.
   */
  source?: string;
  /** The back-end repository. Only ever set alongside `source`. */
  sourceApi?: string;
  /**
   * Built front to back by Edwin. Drives the FULL-STACK chip on the card and
   * the repo labels on the detail page. Set it even where the repos are
   * private — Happy Farm is full-stack work whether or not you can read it.
   */
  fullstack?: boolean;
  /**
   * Why there is no repository, where there deliberately isn't one. Printed
   * under the links, so client work reads as owned rather than as missing.
   */
  sourceNote?: string;
  /**
   * Extra words the terminal's search should accept for this project.
   *
   * The name and the slug are matched already, prefixes and one-character typos
   * included — these are for the words someone would reach for *instead* of the
   * name ("pokemon", "nutrition"). Kept short on purpose: every alias is a
   * chance to hijack a question that wasn't about a project at all.
   *
   * NOTE FOR EDWIN: these are my guesses at what a recruiter types. Add or cut
   * freely — nothing else reads them.
   */
  aliases?: string[];
};

/**
 * The list, in Edwin's order.
 *
 * No invented metrics: a badge appears only where there is a real status to
 * report ("LIVE" — it is, and the URL is below) or a real opinion to give
 * ("NOVA'S PICK", which is mine).
 *
 * Written without `no` — see `workCards` below, which numbers them.
 */
const CARDS: Omit<WorkCard, "no">[] = [
  {
    slug: "dryrun",
    category: "AI",
    name: "Dryrun",
    blurb:
      "A mock technical interview that reads your code first — it profiles your public repos, then asks about what's in them, and what isn't.",
    tags: ["Next.js", "Groq"],
    image: "dryrun.webp",
    badge: "LIVE",
    /* Deliberately not "interview": it's an ordinary word in the questions
       people actually ask NOVA ("is he open to an interview?"), and an alias
       that common hijacks the answer — the same way "work" once cost the
       CONTACT flow. The slug already matches "dryrun". */
    aliases: ["dry run"],
    org: "personal",
    fullstack: true,
    live: "https://dryrun.touchsimpledev.site",
    source: "https://github.com/edwinsatya/dryrun",
    sourceApi: "https://github.com/edwinsatya/dryrun-api",
  },
  {
    slug: "llm-output-guard",
    category: "Open source",
    name: "llm-output-guard",
    blurb:
      "An npm package for the model failures that arrive as 200 OK — loops, empty answers, truncation, wrong language — scored in under a millisecond, with zero dependencies.",
    tags: ["TypeScript", "Zero deps"],
    image: "llm-output-guard.webp",
    badge: "ON NPM",
    /* Not "llm": it's a word people use to ask what he works with, and an alias
       that broad would answer a general question with a single package. */
    aliases: ["npm package", "guardrails"],
    org: "personal",
    live: "https://www.npmjs.com/package/llm-output-guard",
    liveLabel: "View on npm",
    source: "https://github.com/edwinsatya/llm-output-guard",
  },
  {
    slug: "iron-arena",
    category: "Game",
    name: "Iron Arena",
    blurb:
      "A pixel-art duelling game for the browser — send a friend a link and fight over rollback netcode, so a match between two cities plays like the same couch.",
    tags: ["Next.js", "WebRTC"],
    image: "iron-arena.webp",
    badge: "LIVE",
    aliases: ["brawler", "rollback", "netcode"],
    org: "personal",
    fullstack: true,
    live: "https://iron-arena.touchsimpledev.site",
    source: "https://github.com/edwinsatya/iron-arena",
  },
  {
    slug: "3d-spaceship",
    category: "Game",
    name: "Space Explorer 3D",
    blurb:
      "Fly your own ship around the solar system in the browser — warp to every planet, land on the Moon and Mars, race timed missions, and learn the real facts on the way.",
    tags: ["Three.js", "Supabase"],
    image: "3d-spaceship.webp",
    badge: "LIVE",
    /* "space explorer" carries the name when it's typed without the "3D":
       "space" and "explorer" are too common to match by themselves (see
       GENERIC_NAME_WORDS in nova-brain). Not "planets" or "solar system":
       their words prefix-match "plan" and "system". */
    aliases: ["space explorer", "spaceship"],
    org: "personal",
    live: "https://3d-spaceship.touchsimpledev.site",
    source: "https://github.com/edwinsatya/3D-spaceship",
  },
  {
    slug: "sushiflush-dapp",
    category: "Web3",
    name: "SushiFlush dApp",
    blurb:
      "A staking interface for the SFLUSH token on Sepolia — stake, watch rewards tick up, claim, and read your history back off the chain. No React, no wagmi.",
    tags: ["Astro", "viem"],
    image: "sushiflush-dapp.webp",
    badge: "LIVE",
    aliases: ["staking", "dapp"],
    org: "personal",
    live: "https://sushiflush-dapp.touchsimpledev.site",
    source: "https://github.com/edwinsatya/sushiflush-dapp",
  },
  {
    slug: "sushiflush-token",
    category: "Smart contracts",
    name: "SushiFlush Token",
    blurb:
      "A fixed-supply ERC-20 and the staking contract that pays out in it — written in Solidity, fuzz-tested, and verified on the Sepolia testnet.",
    tags: ["Solidity", "Hardhat"],
    badge: "ON SEPOLIA",
    /* Not "smart contract": "contract" is one typo from "contact", and that
       word belongs to the CONTACT flow. Not "solidity" either — "solid" is a
       prefix of it. */
    aliases: ["erc20", "erc 20", "sflush"],
    org: "personal",
    live: "https://sepolia.etherscan.io/address/0xeB45F6b8Cbfe0B988a22a98C750CeFfe1f875b12#code",
    liveLabel: "View on Etherscan",
    source: "https://github.com/edwinsatya/sushiflush-token",
  },
  {
    slug: "crypto-galaxy",
    category: "Crypto",
    name: "Crypto Galaxy",
    blurb:
      "The crypto market as a star map — every coin a star, placed by rank, sized by market cap, coloured by momentum — on top of every free CoinGecko endpoint.",
    tags: ["Astro", "CoinGecko API"],
    image: "crypto-galaxy.webp",
    badge: "LIVE",
    aliases: ["coingecko", "cryptocurrency"],
    org: "personal",
    live: "https://crypto-galaxy.touchsimpledev.site",
    source: "https://github.com/edwinsatya/crypto-galaxy",
  },
  {
    slug: "weathernime",
    category: "Side project",
    name: "Weathernime",
    blurb:
      "An anime-styled weather app, built end to end with vibe coding — forecast, mood, and art direction in one.",
    tags: ["Next.js", "Open-Meteo"],
    image: "weathernime.webp",
    badge: "LIVE",
    aliases: ["weather", "forecast"],
    org: "personal",
    live: "https://weathernime.touchsimpledev.site",
    source: "https://github.com/edwinsatya/weathernime",
  },
  {
    slug: "food-analyzer",
    category: "AI",
    name: "Food Analyzer",
    blurb:
      "Snap a meal and get the nutrition back instantly — an AI vision model doing the reading, not a lookup table.",
    tags: ["Next.js", "AI Vision"],
    image: "food-analyzer.webp",
    badge: "NOVA'S PICK",
    aliases: ["nutrition", "calories"],
    org: "personal",
    live: "https://food-analyzer.touchsimpledev.site",
    source: "https://github.com/edwinsatya/food-analyzer",
  },
  {
    slug: "happy-farm",
    category: "Agritech",
    name: "Happy Farm",
    blurb:
      "A farm operations platform: growing cycles, stock, and what actually happened in the field that day.",
    tags: ["Next.js", "PostgreSQL"],
    image: "happy-farm.webp",
    badge: "NOVA'S PICK",
    aliases: ["farm", "agritech"],
    org: "tola",
    fullstack: true,
    sourceNote: "Client-owned — both repositories are private",
  },
  {
    slug: "magloft",
    category: "Publishing",
    name: "Magloft",
    blurb:
      "One platform behind many magazines — each publisher on their own domain, with their own content, styling and apps, run from one admin.",
    tags: ["Next.js", "GraphQL"],
    image: "magloft-app.webp",
    aliases: ["publishing", "magazine"],
    org: "magloft",
    fullstack: true,
    live: "https://www.magloft.com",
    sourceNote: "Company-owned — the platform's repositories are private",
  },
  {
    slug: "magloft-web",
    category: "Web",
    name: "Magloft Web",
    blurb:
      "The platform's front door — solutions, pricing and the blog, with a CMS behind them so marketing can change the words without shipping code.",
    tags: ["Next.js", "Contentful"],
    image: "magloft.webp",
    org: "magloft",
    live: "https://www.magloft.com",
  },
  {
    slug: "mileapp",
    category: "Logistics",
    name: "MileApp",
    blurb:
      "Field operations SaaS for delivery teams — task assignment, routing, and proof of delivery from a phone.",
    tags: ["Vue.js", "Express"],
    image: "mile-app.webp",
    aliases: ["logistics", "delivery"],
    org: "personal",
    live: "https://mileapp-tasks.touchsimpledev.site",
    fullstack: true,
    source: "https://github.com/edwinsatya/mileapp-client",
    sourceApi: "https://github.com/edwinsatya/mileapp-server",
  },
  {
    slug: "bountie",
    category: "Gaming",
    name: "Bountie",
    blurb:
      "A competitive gaming platform where the matches players already play pay out in real rewards.",
    tags: ["Next.js", "Web3"],
    image: "bountie-hunter.webp",
    aliases: ["gaming", "esports"],
    org: "bountie",
    live: "https://bountiehunter.io",
  },
  {
    slug: "desklab",
    category: "Productivity",
    name: "DeskLab",
    blurb:
      "A workspace tool built to take the repetitive parts out of the day, so the work left is the work worth doing.",
    tags: ["Next.js", "OpenRouter"],
    image: "desklab.webp",
    aliases: ["workspace", "productivity"],
    org: "personal",
    live: "https://desklab.touchsimpledev.site",
    source: "https://github.com/edwinsatya/DeskLab",
  },
  {
    slug: "tola-web",
    category: "Web",
    name: "Tola Web",
    blurb:
      "The company site for the studio behind Happy Farm — the front door for the platform he was building inside.",
    tags: ["Next.js", "Tailwind"],
    image: "tola.webp",
    org: "tola",
    live: "https://www.tola.solutions",
  },
  {
    slug: "pokedex",
    category: "Fun",
    name: "Pokedex",
    blurb:
      "All 1,025 of them — search, type filters, evolutions and stats, plus a catch list, a quiz, and live TCG card prices.",
    tags: ["Next.js", "PokéAPI"],
    image: "pokedex.webp",
    aliases: ["pokemon"],
    org: "personal",
    live: "https://pokedex.touchsimpledev.site",
    source: "https://github.com/edwinsatya/pokedex",
  },
  {
    slug: "anivault",
    category: "Media",
    name: "Anivault",
    blurb:
      "An anime and manga database with the tracking on top — search it, keep a watchlist, and get told what to watch next.",
    tags: ["Next.js", "AniList API"],
    image: "anivault.webp",
    aliases: ["anime", "manga", "anilist"],
    org: "personal",
    live: "https://anivault.touchsimpledev.site",
    source: "https://github.com/edwinsatya/AniVault",
  },
  {
    slug: "mini-google",
    category: "Experiment",
    name: "Mini-Google",
    blurb:
      "A Google-style search client on the Serper API — debounced autocomplete, keyboard navigation, and a home-to-results transition that carries the query with it.",
    tags: ["React", "Serper API"],
    image: "mini-google.webp",
    aliases: ["search engine", "crawler"],
    org: "personal",
    live: "https://mini-google.touchsimpledev.site",
    source: "https://github.com/edwinsatya/mini-google",
  },
];

/**
 * The list as everything else reads it, numbered from its own order.
 *
 * Derived rather than written per card: the number is printed on the card, in
 * the terminal's `/projects` listing, and in the detail page's pager, and a
 * hand-typed one that disagreed with the order is exactly the sort of thing
 * nobody notices until a recruiter is looking at it. Insert a project anywhere
 * and the numbering follows.
 */
export const workCards: WorkCard[] = CARDS.map((card, index) => ({
  ...card,
  no: String(index + 1).padStart(2, "0"),
}));

export const workBySlug = (slug: string): WorkCard | undefined =>
  workCards.find((card) => card.slug === slug);

/* -------------------------------------------------------------------------- */
/* Career                                                                      */
/* -------------------------------------------------------------------------- */

export type CareerStop = {
  org: WorkOrg;
  company: string;
  title: string;
  /**
   * Printed verbatim as `from — to`, so "Present" and a closing year both read
   * the way they were written. The scene doesn't substitute a "NOW" of its own:
   * two stops currently carry `current`, and a made-up label would have claimed
   * the 2025–2026 one was still running.
   */
  from: string;
  to: string;
  /** Lights the dot. Not a claim about the dates — those are `from`/`to`. */
  current?: boolean;
};

/** Most recent first, the way a CV reads. */
export const career: CareerStop[] = [
  {
    org: "bri",
    company: "PT. Bank Rakyat Indonesia (Persero) Tbk",
    title: "Front-end Developer",
    from: "2026",
    to: "Present",
    current: true,
  },
  {
    org: "tola",
    company: "Tola Solution",
    title: "Full Stack Developer",
    from: "2025",
    to: "2026",
  },
  {
    org: "magloft",
    company: "Magloft",
    title: "Full Stack Developer",
    from: "2023",
    to: "2025",
  },
  {
    org: "bountie",
    company: "Bountie",
    title: "Software Engineer",
    from: "2022",
    to: "2023",
  },
  {
    org: "homecare24",
    company: "homecare24.id",
    title: "Front-end Developer",
    from: "2020",
    to: "2022",
  },
  {
    org: "telkom",
    company: "Telkom Indonesia",
    title: "Internship",
    from: "2013",
    to: "2014",
  },
];

/** The projects a career stop is credited with, in list order. */
export function projectsFor(org: WorkOrg): WorkCard[] {
  return workCards.filter((card) => card.org === org);
}

/* -------------------------------------------------------------------------- */
/* Stack marquee                                                               */
/* -------------------------------------------------------------------------- */

/**
 * What's actually in the list above — the bottom strip's whole content.
 * Ordered roughly by how much of the work it carries.
 */
export const stackInTheWild = [
  "Next.js",
  "React",
  "Vue",
  "Angular",
  "TypeScript",
  "Node",
  "Express",
  "GraphQL",
  "PostgreSQL",
  "Tailwind",
  "Astro",
  "Three.js",
  "Solidity",
  "AWS",
  "Docker",
] as const;
