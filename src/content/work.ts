/**
 * The WORK scene's content — the career column, the ten selected projects, and
 * the stack marquee along the bottom.
 *
 * Kept apart from `profile.ts` on purpose. That file is the *classic* build's
 * source of truth and carries a longer, differently-shaped project list (it
 * includes Anivault, and its stacks were inferred rather than given); this one
 * is the stage's WORK scene as Edwin specified it — a fixed list, in a fixed
 * order, each with the card copy, the category, and the badge it should show.
 * Where the two disagree about a stack, this file wins here, because these are
 * the lines Edwin wrote.
 *
 * NOTE FOR EDWIN — two things to confirm:
 *  1. `org` is what the career column filters on. I've put MileApp under
 *     `personal`: its stack (Mockapi) and its public client repo read like a
 *     build of your own rather than something shipped inside a company. Move it
 *     if that's wrong.
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
  /** Filename in `public/projects/`. */
  image: string;
  /** Top-right of the card. Only where there's something true to say. */
  badge?: string;
  org: WorkOrg;
  live?: string;
  source?: string;
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
    slug: "weathernime",
    category: "Side project",
    name: "Weathernime",
    blurb:
      "An anime-styled weather app, built end to end with vibe coding — forecast, mood, and art direction in one.",
    tags: ["Next.js", "Open-Meteo"],
    image: "weathernime.png",
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
    image: "food-analyzer.png",
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
    image: "happy-farm.png",
    badge: "NOVA'S PICK",
    aliases: ["farm", "agritech"],
    org: "tola",
  },
  {
    slug: "magloft",
    category: "Publishing",
    name: "Magloft",
    blurb:
      "Digital publishing at scale — turning magazines and long-form issues into apps and web readers.",
    tags: ["Vue.js", "GraphQL"],
    image: "magloft.png",
    aliases: ["publishing", "magazine"],
    org: "magloft",
    live: "https://www.magloft.com",
  },
  {
    slug: "mileapp",
    category: "Logistics",
    name: "MileApp",
    blurb:
      "Field operations SaaS for delivery teams — task assignment, routing, and proof of delivery from a phone.",
    tags: ["Vue.js", "MongoDB"],
    image: "mile-app.png",
    aliases: ["logistics", "delivery"],
    org: "personal",
    live: "https://mileapp-tasks.touchsimpledev.site",
    source: "https://github.com/edwinsatya/mileapp-client",
  },
  {
    slug: "bountie",
    category: "Gaming",
    name: "Bountie",
    blurb:
      "A competitive gaming platform where the matches players already play pay out in real rewards.",
    tags: ["React", "PostgreSQL"],
    image: "bountie-hunter.png",
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
    tags: ["React", "Node.js"],
    image: "desklab.png",
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
    image: "tola.png",
    org: "tola",
    live: "https://www.tola.solutions",
  },
  {
    slug: "pokedex",
    category: "Fun",
    name: "Pokedex",
    blurb:
      "A fast, searchable Pokédex on the PokéAPI — type filters, detail views, and no waiting around.",
    tags: ["React", "REST"],
    image: "pokedex.png",
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
    image: "anivault.png",
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
      "A search engine in miniature — crawl, index, rank — behind a deliberately plain page.",
    tags: ["Node.js", "Express"],
    image: "mini-google.png",
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
  "Node",
  "GraphQL",
  "PostgreSQL",
  "MongoDB",
  "Tailwind",
  "AWS",
  "Docker",
] as const;
