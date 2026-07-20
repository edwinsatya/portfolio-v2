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

export const stats = [
  { value: "6+", label: "Years building" },
  { value: "10+", label: "Projects shipped" },
  { value: "5", label: "Teams joined" },
] as const;

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The guided journey. `mood` and `line` drive NOVA: when a section scrolls into
 * view the robot switches to that mood and speaks that line. They live here so
 * the tour script is editable without touching component code.
 */
export type SectionMeta = {
  id: string;
  label: string;
  mood: "greeting" | "thinking" | "excited" | "proud" | "focused" | "warm";
  line: string;
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
    line: "This is the human I work for. Six years of building, and still curious.",
  },
  {
    id: "skills",
    label: "Skills",
    mood: "thinking",
    line: "His toolkit. I’ve seen him reach for most of these before breakfast.",
  },
  {
    id: "projects",
    label: "Projects",
    mood: "excited",
    line: "My favourite part — things he actually shipped. Ask me which one I like best.",
  },
  {
    id: "experience",
    label: "Experience",
    mood: "proud",
    line: "Where he’s been. Five teams, one habit: finish what you start.",
  },
  {
    id: "services",
    label: "Services",
    mood: "focused",
    line: "Three ways he can help. Pick the one that sounds like your problem.",
  },
  {
    id: "contact",
    label: "Contact",
    mood: "warm",
    line: "You made it to the end. Say hello — he usually replies within a day.",
  },
];

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
  source?: string;
  /** NOVA recommends these when asked to show its favourites. */
  featured?: boolean;
  /** Blurb/stack inferred from the project name — confirm before publishing. */
  needsReview?: boolean;
};

export const projects: Project[] = [
  {
    slug: "weathernime",
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
    name: "Food Analyzer",
    blurb:
      "Upload a meal and get an instant nutrition breakdown back, powered by an AI vision model.",
    stack: ["Next.js", "AI Vision", "Node.js"],
    featured: true,
    needsReview: true,
  },
  {
    slug: "happy-farm",
    name: "Happy Farm",
    blurb:
      "Farm operations platform for Tola Solution — tracking cycles, stock, and daily field activity.",
    stack: ["Next.js", "Node.js", "PostgreSQL"],
    featured: true,
    needsReview: true,
  },
  {
    slug: "magloft",
    name: "Magloft",
    blurb:
      "Digital publishing platform that turns magazines and long-form content into apps and web readers.",
    stack: ["Vue.js", "Node.js", "GraphQL"],
    needsReview: true,
  },
  {
    slug: "mileapp",
    name: "MileApp",
    blurb:
      "Field operations SaaS for logistics teams — task assignment, routing, and proof of delivery.",
    stack: ["Vue.js", "Node.js", "MongoDB"],
    needsReview: true,
  },
  {
    slug: "bountie",
    name: "Bountie",
    blurb:
      "Competitive gaming platform where players earn rewards for the matches they play.",
    stack: ["React", "Node.js", "PostgreSQL"],
    needsReview: true,
  },
  {
    slug: "desklab",
    name: "DeskLab",
    blurb: "A workspace tool built to take the repetitive parts out of the day.",
    stack: ["React", "Node.js"],
    needsReview: true,
  },
  {
    slug: "tola-web",
    name: "Tola Web",
    blurb:
      "Company site for Tola Solution — the studio behind the Happy Farm platform.",
    stack: ["Next.js", "Tailwind CSS"],
    needsReview: true,
  },
  {
    slug: "pokedex",
    name: "Pokedex",
    blurb:
      "A fast, searchable Pokédex built on the PokéAPI, with type filters and detail views.",
    stack: ["React", "REST API"],
    needsReview: true,
  },
  {
    slug: "mini-google",
    name: "Mini-Google",
    blurb:
      "A search engine in miniature — crawling, indexing, and ranking behind a deliberately plain UI.",
    stack: ["Node.js", "Express"],
    needsReview: true,
  },
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
};

export const experience: Role[] = [
  {
    company: "Tola Solution",
    project: "Happy Farm Project",
    title: "Full Stack Developer",
    period: "Nov 2025 – Mar 2026",
  },
  {
    company: "Magloft",
    title: "Full Stack Developer",
    period: "Jun 2023 – Feb 2025",
  },
  {
    company: "Bountie",
    title: "Software Engineer",
    period: "May 2022 – Jun 2023",
  },
  {
    company: "homecare24.id",
    title: "Front-end Developer",
    period: "Mar 2020 – May 2022",
  },
  {
    company: "Telkom Indonesia",
    title: "Network Fiber Optic Internship",
    period: "Sep 2013 – Jan 2014",
  },
];

export const certifications = [
  "Hacktiv8 Full Stack Web Developer",
  "AWS Certified Solutions Architect",
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

/* -------------------------------------------------------------------------- */
/* NOVA — scripted chat (wired up in step 6)                                   */
/* -------------------------------------------------------------------------- */

export type ChatIntent = {
  id: string;
  /** Shown as a suggestion chip under the chat input. */
  prompt: string;
  /** Lowercase keywords matched against whatever the visitor types. */
  keywords: string[];
  answer: string;
  /** Optional section to scroll to after answering. */
  scrollTo?: string;
};

export const chatIntents: ChatIntent[] = [
  {
    id: "who",
    prompt: "Who is Edwin?",
    keywords: ["who", "about", "edwin", "yourself", "him"],
    answer: profile.bio,
    scrollTo: "about",
  },
  {
    id: "build",
    prompt: "What can he build?",
    keywords: ["build", "do", "skill", "stack", "tech", "make"],
    answer:
      "Front-end, full-stack, and AI integration. React and Next.js on the front, Node and Express behind it, and increasingly AI woven through the middle.",
    scrollTo: "skills",
  },
  {
    id: "available",
    prompt: "Is he available?",
    keywords: ["available", "hire", "hiring", "free", "work", "open"],
    answer:
      "Yes — accepting new projects and roles. Average reply under 24 hours.",
    scrollTo: "contact",
  },
  {
    id: "contact",
    prompt: "How do I contact him?",
    keywords: ["contact", "reach", "email", "message", "talk", "linkedin"],
    answer: `Easiest is email: ${profile.email}. He’s also on LinkedIn and GitHub — all three are monitored.`,
    scrollTo: "contact",
  },
  {
    id: "work",
    prompt: "Show me his best work",
    keywords: ["best", "work", "project", "portfolio", "favourite", "favorite"],
    answer:
      "Take a look at Weathernime, Food Analyzer, and Happy Farm — those are the three I’d lead with. Scrolling you there now.",
    scrollTo: "projects",
  },
];
