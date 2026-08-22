/**
 * Single source of truth for every piece of content on the site.
 *
 * Sections, the nav, and (from step 4 onward) NOVA's speech bubbles all read
 * from here — so changing a fact in this file changes it everywhere.
 *
 * NOTE FOR EDWIN: entries marked `needsReview: true` have a blurb/stack that was
 * inferred from the project name rather than given to me. Rewrite those lines and
 * drop the flag — they are the only invented copy in this file.
 */

export const profile = {
  name: "Edwin Satya Yudistira",
  firstName: "Edwin",
  role: "Full-Stack Web Developer",
  location: "Lumajang, Indonesia",
  tagline: "Code. Create. Reimagine.",
  bio: "Passionate web developer based in Indonesia, crafting high-quality digital experiences — from pixel-perfect interfaces to scalable back-end systems. Currently focused on shipping AI-powered web apps.",
  availability: {
    open: true,
    headline: "Available for new projects",
    detail: "Accepting new projects and roles. Average reply under 24 hours.",
  },
  email: "edwinsatyayudistira@gmail.com",
  links: {
    github: "https://github.com/edwinsatya",
    linkedin: "https://www.linkedin.com/in/edwin-satya-yudistira/",
    resume:
      "https://drive.google.com/file/d/1lVwiO2EFELfN9PNNiT_h7xVXcecw5r7H/view",
  },
} as const;

/**
 * What's been on repeat while building this.
 *
 * Played through YouTube's official embed — nothing is hosted here, and the
 * artwork is YouTube's own thumbnail for the same video, so the widget has no
 * assets of its own to keep in sync. First in the list is the one the resting
 * card shows; the rest are reachable from the player.
 *
 * NOTE FOR EDWIN: `life-will-change` points at a translation channel's upload
 * rather than an official one, so it can disappear without warning. Swap the id
 * if you find it on a "- Topic" channel.
 */
export type Jam = {
  title: string;
  /** The game, not the vocalist — that's what a visitor recognises. */
  artist: string;
  youtubeId: string;
};

export const jams: Jam[] = [
  {
    title: "Full Moon Full Life",
    artist: "Persona 3 Reload",
    youtubeId: "hWhgrA2dhrk",
  },
  {
    title: "Life Will Change",
    artist: "Persona 5",
    youtubeId: "CGwH6rZk7VM",
  },
  {
    title: "I Believe",
    artist: "Persona 5 Royal",
    youtubeId: "LkuyO0cU3tQ",
  },
];

export function jamThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

export const stats = [
  { value: "6+", label: "Years building" },
  { value: "10+", label: "Projects shipped" },
  { value: "5", label: "Teams joined" },
] as const;

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every mood is a visibly different face — see `nova.css`, where each one sets
 * its own eye shape, mouth, tint, and pose. Adding a mood means adding a block
 * there too, otherwise it falls back to `greeting`.
 */
export type NovaMood =
  | "greeting"
  | "warm"
  | "thinking"
  | "excited"
  | "proud"
  | "focused"
  | "waving";

/**
 * The guided journey. When a section scrolls into view NOVA switches to its
 * mood and speaks its line, so the whole tour script is editable here without
 * touching component code.
 */
export type SectionMeta = {
  id: string;
  label: string;
  mood: NovaMood;
  line: string;
  /**
   * Shorter variants used once the visitor has already heard the full line on a
   * previous visit. One is picked at random, so a third visit isn't a rerun of
   * the second.
   */
  altLines?: string[];
};

export const sections: SectionMeta[] = [
  {
    id: "intro",
    label: "Intro",
    mood: "greeting",
    line: "Hi there. I’m NOVA — I look after this place. Let me introduce Edwin.",
  },
  {
    id: "about",
    label: "About",
    mood: "warm",
    line: "Small town, big web. Let me introduce him.",
    altLines: ["Same guy, still building.", "You’ve met him."],
  },
  {
    id: "skills",
    label: "Skills",
    mood: "thinking",
    line: "His tech arsenal — everything here has shipped something real.",
    altLines: ["The toolkit again.", "Still all battle-tested."],
  },
  {
    id: "projects",
    label: "Projects",
    mood: "excited",
    line: "These are my favorites — the top three have my pick badge.",
    altLines: ["The good stuff.", "Back for these, then."],
  },
  {
    id: "experience",
    label: "Experience",
    mood: "proud",
    line: "Six years, five teams. Here’s where they went.",
    altLines: ["The timeline, again.", "Still five teams."],
  },
  {
    id: "services",
    label: "Services",
    mood: "focused",
    line: "Three ways to work with him. Pick your problem.",
    altLines: ["Same three options.", "Pick a lane."],
  },
  {
    id: "contact",
    label: "Contact",
    mood: "waving",
    line: "He usually replies within 24 hours. Go on, say hi.",
    altLines: ["Still under 24 hours.", "Go on, this time."],
  },
];

/* -------------------------------------------------------------------------- */
/* NOVA — greetings                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Everything NOVA says that depends on what she remembers. The logic that picks
 * between these lives in `useSceneReactions`.
 */
export const greetings = {
  /** First visit — shown alongside the name input. */
  first: "Hi there. I’m NOVA, I look after this place. What should I call you?",
  namePlaceholder: "Your name",
  nameSubmit: "Nice to meet you",
  nameSkip: "Skip",
  /** Once a name is given. */
  named: (name: string) => `Nice to meet you, ${name}. Come on in.`,
  /** They skipped the question — never asked again. */
  skipped: "No problem. Let me show you around.",
  /** Return visits. */
  backNamed: (name: string) => `Welcome back, ${name}!`,
  backAnonymous: "Hey, you again! Good to see you.",
  /** Return visit where they reached the projects last time. */
  backForProjects: (name: string | null) =>
    name ? `Welcome back, ${name} — back for the projects?` : "Back for the projects?",
  /** After the visitor asks to be forgotten. */
  forgotten: "Memory wiped. Nice to meet you, stranger.",
} as const;

/* -------------------------------------------------------------------------- */
/* Skills                                                                      */
/* -------------------------------------------------------------------------- */

export type SkillGroup = {
  title: string;
  caption: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    title: "Frontend",
    caption: "Interfaces people actually enjoy using",
    items: [
      "React",
      "Next.js",
      "TypeScript",
      "Vue.js",
      "Angular.js",
      "Tailwind CSS",
    ],
  },
  {
    title: "Backend",
    caption: "The part nobody sees until it breaks",
    items: ["Node.js", "Express", "REST API", "GraphQL"],
  },
  {
    title: "Database",
    caption: "Where the truth is kept",
    items: ["MongoDB", "PostgreSQL", "MySQL"],
  },
  {
    title: "Tools",
    caption: "Everything around the code",
    items: ["Git", "Docker", "AWS", "Figma", "VS Code"],
  },
];

/* -------------------------------------------------------------------------- */
/* Projects                                                                    */
/* -------------------------------------------------------------------------- */

export type Project = {
  slug: string;
  name: string;
  blurb: string;
  stack: string[];
  live?: string;
  /** Overrides the "Live site" link label — a package lives on a registry. */
  liveLabel?: string;
  /** The repository — the front end where the project has two. */
  source?: string;
  /** The back-end repository, on the full-stack builds that ship both. */
  sourceApi?: string;
  /** Built front to back. Shows the FULL-STACK chip on the card. */
  fullstack?: boolean;
  /** Why there's no repo to link, where there deliberately isn't one. */
  sourceNote?: string;
  /**
   * Screenshot filename inside `public/projects/`. Stated per project rather
   * than derived from the slug, because several files don't match their slug
   * (mile-app / mileapp, bountie-hunter / bountie, tola / tola-web) — a derived
   * path would 404 on those silently. Omit it and the card draws a placeholder.
   */
  image?: string;
  /** NOVA recommends these when asked to show its favourites. */
  featured?: boolean;
  /** Blurb/stack inferred from the project name — confirm before publishing. */
  needsReview?: boolean;
};

export const projects: Project[] = [
  {
    slug: "dryrun",
    image: "dryrun.webp",
    name: "Dryrun",
    blurb:
      "AI mock interviews that read your code first — it profiles your public GitHub repos, then asks eight questions about what's actually in them.",
    stack: ["Next.js", "Express", "Groq", "Upstash Redis"],
    live: "https://dryrun.touchsimpledev.site",
    source: "https://github.com/edwinsatya/dryrun",
    sourceApi: "https://github.com/edwinsatya/dryrun-api",
    fullstack: true,
    featured: true,
  },
  {
    slug: "llm-output-guard",
    image: "llm-output-guard.webp",
    name: "llm-output-guard",
    blurb:
      "An npm package for the model failures that arrive as 200 OK — loops, empty answers, truncation, wrong language. Zero dependencies, sub-millisecond, MIT.",
    stack: ["TypeScript", "Node.js", "Zero dependencies", "npm"],
    live: "https://www.npmjs.com/package/llm-output-guard",
    liveLabel: "View on npm",
    source: "https://github.com/edwinsatya/llm-output-guard",
  },
  {
    slug: "weathernime",
    image: "weathernime.webp",
    name: "Weathernime",
    blurb:
      "Weather forecast web app wrapped in an anime concept — built end to end through vibe coding.",
    stack: ["Next.js", "Open-Meteo API", "Claude"],
    live: "https://weathernime.touchsimpledev.site",
    source: "https://github.com/edwinsatya/weathernime",
    featured: true,
  },
  {
    slug: "food-analyzer",
    image: "food-analyzer.webp",
    name: "Food Analyzer",
    blurb:
      "Upload a meal and get an instant nutrition breakdown back, powered by an AI vision model.",
    stack: ["Next.js", "AI Vision", "Open Router AI", "Cloudinary"],
    live: "https://food-analyzer.touchsimpledev.site",
    source: "https://github.com/edwinsatya/food-analyzer",
    needsReview: true,
  },
  {
    slug: "happy-farm",
    image: "happy-farm.webp",
    name: "Happy Farm",
    blurb:
      "Farm operations platform for Tola Solution — tracking cycles, stock, and daily field activity.",
    stack: ["Next.js", "Node.js", "PostgreSQL", "Tailwind CSS", "Prisma"],
    fullstack: true,
    sourceNote: "Client-owned — both repositories are private",
    needsReview: true,
  },
  {
    slug: "magloft",
    image: "magloft-app.webp",
    name: "Magloft",
    blurb:
      "One publishing platform behind many magazines — each publisher on their own domain, with their own content, styling and apps.",
    stack: [
      "Next.js",
      "Node.js",
      "Express",
      "GraphQL",
      "PostgreSQL",
      "OpenAI",
      "Angular",
    ],
    live: "https://www.magloft.com",
    fullstack: true,
    sourceNote: "Company-owned — the platform's repositories are private",
    needsReview: true,
  },
  {
    slug: "magloft-web",
    image: "magloft.webp",
    name: "Magloft Web",
    blurb:
      "The platform's own site — solutions, pricing and the blog, run out of a CMS so marketing can change it without a deploy.",
    stack: ["Next.js", "Tailwind CSS", "Contentful CMS", "Node.js"],
    live: "https://www.magloft.com",
    needsReview: true,
  },
  {
    slug: "mileapp",
    image: "mile-app.webp",
    name: "MileApp",
    blurb:
      "Field operations SaaS for logistics teams — task assignment, routing, and proof of delivery.",
    stack: ["Vue.js", "Node.js", "Express", "JWT"],
    live: "https://mileapp-tasks.touchsimpledev.site",
    source: "https://github.com/edwinsatya/mileapp-client",
    sourceApi: "https://github.com/edwinsatya/mileapp-server",
    fullstack: true,
    needsReview: true,
  },
  {
    slug: "bountie",
    image: "bountie-hunter.webp",
    name: "Bountie",
    blurb:
      "Competitive gaming platform where players earn rewards for the matches they play.",
    stack: ["Next.js", "Tailwind CSS", "Metamask", "Web3"],
    live: "https://bountiehunter.io",
    needsReview: true,
  },
  {
    slug: "desklab",
    image: "desklab.webp",
    name: "DeskLab",
    blurb: "A workspace tool built to take the repetitive parts out of the day.",
    stack: ["Next.js", "Tailwind CSS", "Open Router AI", "Zustand"],
    live: "https://desklab.touchsimpledev.site",
    source: "https://github.com/edwinsatya/DeskLab",
    needsReview: true,
  },
  {
    slug: "tola-web",
    image: "tola.webp",
    name: "Tola Web",
    blurb:
      "Company site for Tola Solution — the studio behind the Happy Farm platform.",
    stack: ["Next.js", "Tailwind CSS"],
    live: "https://www.tola.solutions",
    needsReview: true,
  },
  {
    slug: "pokedex",
    image: "pokedex.webp",
    name: "Pokedex",
    blurb:
      "All 1,025 of them — search and type filters, stats and evolutions, a catch list, a quiz, and live TCG card prices.",
    stack: ["Next.js", "Tailwind CSS", "PokéAPI", "PokeWallet"],
    live: "https://pokedex.touchsimpledev.site",
    source: "https://github.com/edwinsatya/pokedex",
    needsReview: true,
  },
  {
    slug: "mini-google",
    image: "mini-google.webp",
    name: "Mini-Google",
    blurb:
      "A Google-style search client on the Serper API — debounced autocomplete, search history, keyboard navigation, and an animated home-to-results transition.",
    stack: ["React.js", "serper.dev", "context api"],
    live: "https://mini-google.touchsimpledev.site",
    source: "https://github.com/edwinsatya/mini-google",
    needsReview: true,
  },
  {
    slug: "anivault",
    image: "anivault.webp",
    name: "Anivault",
    blurb: "Anime / Manga database and tracker with search, watchlist, and recommendations.",
    stack: ["Next.js", "Tailwind.css", "anilist api"],
    live: "https://anivault.touchsimpledev.site",
    source: "https://github.com/edwinsatya/AniVault",
    featured: true,
    needsReview: true,
  }
];

/* -------------------------------------------------------------------------- */
/* Experience                                                                  */
/* -------------------------------------------------------------------------- */

export type Role = {
  company: string;
  project?: string;
  title: string;
  period: string;
  current?: boolean;
  /**
   * Stack and highlights, shown as the monospace tag line on the right of each
   * row in the live resume. The timeline section ignores these — it's a summary,
   * and repeating the stack there would crowd it.
   */
  tags?: string[];
};

export const experience: Role[] = [
  {
    company: "PT. Bank Rakyat Indonesia (Persero) Tbk",
    project: "LMS (Loyalty Management System) Project",
    title: "Frontend Developer",
    period: "Jun 2026 – Present",
    current: true,
    tags: ["Loyalty Management System", "Enterprise Banking Platform"],
  },
  {
    company: "Tola Solution",
    project: "Happy Farm Project",
    title: "Full Stack Developer",
    period: "Nov 2025 – Mar 2026",
    tags: ["Next.js", "Node.js", "PostgreSQL", "Farm Operations Platform"],
  },
  {
    company: "Magloft",
    title: "Full Stack Developer",
    period: "Jun 2023 – Feb 2025",
    tags: ["Vue.js", "Node.js", "GraphQL", "Digital Publishing"],
  },
  {
    company: "Bountie",
    title: "Software Engineer",
    period: "May 2022 – Jun 2023",
    tags: ["React", "Node.js", "PostgreSQL", "Gaming Platform"],
  },
  {
    company: "homecare24.id",
    title: "Front-end Developer",
    period: "Mar 2020 – May 2022",
    tags: ["Healthcare Booking", "Front-End Development"],
  },
  {
    company: "Telkom Indonesia",
    title: "Network Fiber Optic Internship",
    period: "Sep 2013 – Jan 2014",
    tags: ["Fiber Optic Networks", "Field Installation"],
  },
];

export const certifications = [
  "Hacktiv8 Full Stack Web Developer",
  "AWS Certified Solutions Architect",
];

/* -------------------------------------------------------------------------- */
/* Capability stack                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The live resume's card grid.
 *
 * Broader than `skillGroups`, which is the stage's own skills section and stays
 * deliberately short — this is the resume view, where the AI work and the
 * certifications belong alongside the frameworks. `icon` keys the glyph in
 * `ResumeWindow`; adding a group means adding a case there too.
 */
export type Capability = {
  title: string;
  icon: "layers" | "server" | "database" | "sparkle" | "cloud" | "badge";
  items: string[];
};

export const capabilityStack: Capability[] = [
  {
    title: "Frontend",
    icon: "layers",
    items: [
      "React",
      "Next.js",
      "TypeScript",
      "Vue.js",
      "Angular.js",
      "Tailwind CSS",
    ],
  },
  {
    title: "Backend",
    icon: "server",
    items: ["Node.js", "Express", "REST API", "GraphQL"],
  },
  {
    title: "Database",
    icon: "database",
    items: ["MongoDB", "PostgreSQL", "MySQL"],
  },
  {
    title: "AI Integration",
    icon: "sparkle",
    items: [
      "OpenAI & Claude APIs",
      "Chat Interfaces",
      "Workflow Automation",
      "Prompt Engineering",
    ],
  },
  {
    title: "Tools & Cloud",
    icon: "cloud",
    items: ["Git", "Docker", "AWS", "Figma"],
  },
  {
    title: "Certifications",
    icon: "badge",
    items: [...certifications],
  },
];

/* -------------------------------------------------------------------------- */
/* Services                                                                    */
/* -------------------------------------------------------------------------- */

export type Service = {
  title: string;
  summary: string;
  details: string[];
};

export const services: Service[] = [
  {
    title: "Front-End Development",
    summary:
      "Interactive, performant interfaces built with modern JavaScript frameworks.",
    details: [
      "React & Next.js",
      "Vue.js & TypeScript",
      "Modern CSS",
      "Web performance",
    ],
  },
  {
    title: "Full-Stack Engineering",
    summary: "Complete applications, from database schema through to deployment.",
    details: [
      "API development",
      "Database design",
      "Cloud deployment",
      "System architecture",
    ],
  },
  {
    title: "AI Integration",
    summary: "Folding AI into products so the experience gets genuinely better.",
    details: [
      "OpenAI & Claude APIs",
      "Chat interfaces",
      "Workflow automation",
      "Prompt engineering",
    ],
  },
];
