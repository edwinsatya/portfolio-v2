import { workCards, type WorkCard } from "./work";

/**
 * The long form behind each card — what `/work/<slug>` prints.
 *
 * Seven numbered sections, the same seven every time, because a case study that
 * changes shape per project stops being comparable and starts being a brochure.
 * Everything here is derived from what Edwin told me about the project: the card
 * blurb, the stack, the role it came out of, and the live site where there is
 * one. Nothing is measured, because I have no measurements — where a real case
 * study would put a number, these describe what changed instead.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NOTE FOR EDWIN — READ BEFORE PUBLISHING
 *
 * This is draft copy. It is honest — it invents no metrics, no clients, no team
 * sizes and no outcomes — but it is written from the outside, and the details
 * only you know are exactly the ones that make a case study worth reading.
 * Every entry carries a `review` list naming the specific lines I had to infer.
 * Rewrite those, delete the list, and this is yours.
 *
 * Three rules I held to, so you know what you're editing:
 *
 *  1. No dates on the side projects. `timeline` is optional and left off every
 *     personal build, because I was never told when they were made and a wrong
 *     year is worse than no year. The company projects take their dates from
 *     the career list in `work.ts`, which you gave me.
 *  2. No claims about team size or ownership inside a company. Where the honest
 *     statement is "he worked across the stack on it for two years", that is
 *     what it says.
 *  3. No feature invented to fill a section. Where your card blurb was the only
 *     source, the copy describes the *shape* of the problem rather than
 *     pretending to details — DeskLab and Happy Farm are the two to look at
 *     first for that reason.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type CaseStudy = {
  slug: string;
  /** Printed beside the year in the header, and in AT A GLANCE. */
  role: string;
  /**
   * Printed verbatim. Omitted where the date isn't known — the header and the
   * glance row both drop it rather than printing a guess.
   */
  timeline?: string;
  /**
   * AT A GLANCE's third row. The label changes per project because the
   * interesting fact does — a live side project reports its status, a company
   * product reports whose it was.
   */
  glance?: { label: string; value: string };
  /** The sidebar chips. Longer than the card's two tags. */
  stack: string[];
  /**
   * Work that can't be fully shown. Prints the monospace note under the hero.
   * On for the three that shipped inside a company.
   */
  confidential?: boolean;
  /** The paragraph under the hero, before the numbered sections. */
  lede: string;
  sections: {
    context: string;
    problem: string;
    /** "03 · EDWIN'S ROLE" — what he personally did. */
    contribution: string;
    build: string;
    /** "05 · KEY DECISIONS", as a numbered list. */
    decisions: string[];
    /** "06 · STACK & CONSTRAINTS", as chips beside the stack. */
    constraints: string[];
    outcome: string;
  };
  /** The three scripted answers behind the ASK NOVA chips. */
  ask: {
    did: string;
    hardest: string;
    stack: string;
  };
  /** Lines I inferred rather than was told. Delete as you rewrite them. */
  review: string[];
};

/** Said the same way on every solo build, so they read as one body of work. */
const SOLO = "Solo build · design + code";

export const caseStudies: Record<string, CaseStudy> = {
  /* ------------------------------------------------------------------ */
  /* 01 · Weathernime                                                    */
  /* ------------------------------------------------------------------ */
  weathernime: {
    slug: "weathernime",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "Open-Meteo API", "Tailwind CSS", "Claude", "Vercel"],
    lede: "A weather app that looks like an anime still — built end to end with vibe coding, where the whole thing was described, steered, and shipped rather than hand-typed line by line.",
    sections: {
      context:
        "Weather is the most solved problem on the web: every platform ships one, and every one of them looks the same. Edwin built this as a side project to answer a different question — not whether he could fetch a forecast, but whether an app could be carried from idea to deployed with an AI as the pair, and still come out with a point of view.",
      problem:
        "Weather interfaces tend to fall into one of two holes. Either they are dashboards — dense grids of numbers that answer a question nobody asked — or they are pretty and useless, all illustration and no data. The interesting version is one where the art direction carries the reading: where you know the weather from the mood of the screen before you have read a single figure.",
      contribution:
        "All of it. There was no team on this one: the concept, the art direction, the API integration, the front end, and the deploy are all his. The AI was a pair, not a contractor — it wrote at his direction, and every decision about what the thing should be stayed with him.",
      build:
        "A Next.js app on the Open-Meteo API, which needs no key and no billing account, so the whole thing stays free to run and free to fork. Conditions and time of day drive the treatment rather than sitting beside it — the screen changes character between a clear afternoon and a cold night, and the forecast, the temperature and the trend chart are laid over that rather than boxed away from it.",
      decisions: [
        "Art direction first. The interface was designed around how the weather should feel, and the data was fitted into that — the opposite of the usual order, and the reason it doesn't look like every other forecast.",
        "Open-Meteo over the better-known APIs: no key, no quota, no sign-up. A side project that needs a billing account to run is a side project nobody else can run.",
        "Vibe coding as the actual method, not a novelty. The job became describing intent precisely and rejecting what came back until it was right — which is a design skill, not a typing one.",
        "Shipped in public, source open. It is live at a real URL with the repository beside it, because a side project that only exists on localhost proves nothing.",
      ],
      constraints: [
        "A team of one",
        "A free-tier API with no key",
        "An AI pair that is confident whether or not it is correct",
      ],
      outcome:
        "It's live, it's public, and the source is open — you can read every decision in the repository. As a piece of work it's the clearest example of how Edwin builds now: he directs, an AI drafts, and he keeps the taste. That workflow is the thing the project was really testing, and it holds.",
    },
    ask: {
      did: "Everything. Concept, art direction, the Open-Meteo integration, the front end, the deploy — solo, with an AI pair he steered rather than followed.",
      hardest:
        "Knowing when to stop accepting what the AI handed back. Vibe coding gets you to \"working\" fast; getting from working to right is still all taste, and that part never got automated.",
      stack:
        "Next.js and Tailwind on the front, the Open-Meteo API for the data — no key, no quota — and Claude as the pair. Deployed and live.",
    },
    review: [
      "Whether the treatment really does change with time of day, or only with conditions.",
      "Whether Vercel is the host, and whether Tailwind is in it — I read both off your other projects.",
      "The 'hardest part' answer is my read on AI-assisted work generally, not a story you told me.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 02 · Food Analyzer                                                  */
  /* ------------------------------------------------------------------ */
  "food-analyzer": {
    slug: "food-analyzer",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "OpenRouter AI", "Vision model", "Cloudinary", "Tailwind CSS"],
    lede: "Photograph a plate and get the nutrition back. The reading is done by a vision model looking at the food, not by a database of dishes somebody typed in first.",
    sections: {
      context:
        "Every calorie tracker makes you its librarian: search for the food, pick the nearest match, guess the portion, repeat three times a day. Edwin built this to cut that out — the input is a photo, and the app does the identifying.",
      problem:
        "A lookup table can only answer for food someone has already entered, which is why those apps fall apart on home cooking and on anything regional. A model that actually looks at the plate has no list to be missing from — so the hard part stops being coverage and becomes trust: an answer arrives for every photo, whether or not it is a good one.",
      contribution:
        "Solo, front to back: the upload path, the prompt, the parsing of a model's reply into something a UI can lay out, and the interface around it.",
      build:
        "A Next.js app. The image goes to Cloudinary, the URL goes to a vision model through OpenRouter, and the reply is parsed into a breakdown the page can render. Most of the real work is in that last step — a language model asked for numbers will occasionally answer in prose, and the app has to stay standing when it does.",
      decisions: [
        "OpenRouter rather than one vendor's SDK, so the model underneath can be swapped without rewriting the app around it.",
        "Cloudinary for the image rather than a database blob: the model needs a URL, and a photo of somebody's lunch is not a thing to be keeping.",
        "Treat the model's answer as untrusted input. It is parsed and validated like anything else arriving over the network, because that is exactly what it is.",
        "One screen, one action. The whole product is: pick a photo, read the answer.",
      ],
      constraints: [
        "A team of one",
        "A model whose output shape isn't guaranteed",
        "Free-tier budgets on every service in the chain",
      ],
      outcome:
        "It's live, and it works on a photograph of real food rather than on a curated demo image. As a portfolio piece it's the one that shows an AI feature shipped rather than prototyped: the interesting engineering is in what happens when the model is vague, and that part is handled.",
    },
    ask: {
      did: "All of it, solo — the upload, the prompt, the parsing, and the interface. His own project, not client work.",
      hardest:
        "Making a language model's answer safe to render. Ask for numbers and you sometimes get a paragraph, so the reply is parsed and validated rather than trusted — and the screen still has to say something useful when it isn't sure.",
      stack:
        "Next.js and Tailwind, Cloudinary for the image, and a vision model reached through OpenRouter so it can be swapped later.",
    },
    review: [
      "Which vision model it actually calls, and whether OpenRouter is still in front of it.",
      "Whether portion size is estimated or assumed — I avoided claiming either.",
      "Whether Cloudinary is still the upload path.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 03 · Happy Farm                                                     */
  /* ------------------------------------------------------------------ */
  "happy-farm": {
    slug: "happy-farm",
    role: "Full Stack Developer",
    timeline: "2025 — 2026",
    glance: { label: "Built at", value: "Tola Solution" },
    stack: ["Next.js", "Node.js", "PostgreSQL", "Prisma", "Tailwind CSS"],
    confidential: true,
    lede: "A farm operations platform: the growing cycles, the stock, and a record of what actually happened in the field that day — kept by the people who were standing in it.",
    sections: {
      context:
        "Built at Tola Solution, where Edwin worked across the stack. Farms of this size run on paper and memory: what went in the ground and when, how much stock is left, who did what today. It reconciles weeks later, if it reconciles at all.",
      problem:
        "The hard part of farm software isn't the schema, it's who is typing. Field records are entered by people who are outdoors, holding something else, and nowhere near a desk — so anything that assumes a careful operator at a keyboard collects nothing, and a system nobody fills in is worse than the notebook it replaced.",
      contribution:
        "A full-stack role on the platform through the 2025–2026 engagement — the Next.js front end, and the Node and PostgreSQL behind it.",
      build:
        "Next.js on the front, Node with PostgreSQL through Prisma behind it. The growing cycle is the spine the rest hangs off: stock movements and daily activity are recorded against a cycle rather than floating free, which is what makes a season's records add up at the end of it.",
      decisions: [
        "Model the cycle first. Every other record — stock, activity, cost — belongs to one, so a season can be read back as a whole rather than reassembled from fragments.",
        "Write the entry screens for a phone held in a field: short forms, few taps, nothing that needs two hands or a good signal.",
        "PostgreSQL, because farm records are relational and get audited — what was applied, to which cycle, by whom, on what date.",
        "Prisma for the data layer, so the schema is one file the whole team can read rather than folklore spread across queries.",
      ],
      constraints: [
        "An internal product",
        "Users outdoors, on phones, mid-task",
        "Records that have to reconcile at the end of a season",
      ],
      outcome:
        "The platform runs inside Tola Solution, which is why the visuals here are limited to what can be shown. What it demonstrates is the least glamorous and most valuable thing on this list: domain software for people whose job is not software, built to survive being used properly.",
    },
    ask: {
      did: "He worked across the stack on it at Tola Solution through 2025 and into 2026 — the Next.js front end, and the Node and PostgreSQL behind it.",
      hardest:
        "Data entry that survives the field. The users are outdoors and busy, so every screen had to be short enough to actually get filled in — a form nobody completes leaves you with worse records than the notebook did.",
      stack:
        "Next.js and Tailwind on the front, Node with PostgreSQL through Prisma behind it.",
    },
    review: [
      "IMPORTANT: whether the growing cycle really is the spine of the data model — I inferred that from your card blurb, and it's the strongest claim on the page.",
      "What you personally owned versus what the team did. I've said 'worked across the stack' rather than claiming ownership of the schema.",
      "Whether it's in production, and whether any of it can be shown publicly.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 04 · Magloft                                                        */
  /* ------------------------------------------------------------------ */
  magloft: {
    slug: "magloft",
    role: "Full Stack Developer",
    timeline: "2023 — 2025",
    glance: { label: "Built at", value: "Magloft" },
    stack: ["Vue.js", "Node.js", "GraphQL", "Tailwind CSS"],
    confidential: true,
    lede: "Digital publishing at scale — the platform that turns magazines and long-form issues into apps and web readers — worked on across the stack for nearly two years.",
    sections: {
      context:
        "Magloft is a publishing platform: publishers bring their issues, and the platform turns them into apps and web readers their audience can actually read. Edwin spent close to two years on it as a full-stack developer, the longest single stretch on this list.",
      problem:
        "Publishers have layouts, deadlines and audiences. What they don't have is an engineer on hand for every issue — so the platform has to take content someone else owns, in a shape someone else chose, and get it onto a phone reliably enough that nobody has to call for help at 2am before a release.",
      contribution:
        "Two years across the stack — Vue on the front, Node behind it, GraphQL between the two — on a product that already had customers when he arrived.",
      build:
        "Vue front ends over a GraphQL API on Node. GraphQL earns its place here: a reader app, a web reader and the publisher's own tooling all want different slices of the same issue, and one endpoint that answers all three beats three endpoints that drift apart.",
      decisions: [
        "GraphQL as the contract between one body of content and several very different readers of it.",
        "Platform tooling over bespoke per-customer work — either it gets better for every publisher, or the company quietly becomes an agency.",
        "Ship into a product with live customers: changes stay additive and reversible, because somebody's issue goes out tonight either way.",
      ],
      constraints: [
        "Real publishers on real deadlines",
        "Content the platform doesn't own",
        "An existing product with existing customers",
      ],
      outcome:
        "The platform is live and public at magloft.com. For Edwin it's the two years that turned him from someone who could build a feature into someone who could work inside a product other people already depended on — a different skill, and the one most of the rest of this list rests on.",
    },
    ask: {
      did: "Nearly two years as a full-stack developer on the platform — Vue on the front, Node and GraphQL behind it — on a product that already had paying publishers.",
      hardest:
        "Shipping into something people were already using. There's no clean slate on a live publishing platform: every change has to be additive and reversible, because somebody's issue goes out tonight.",
      stack: "Vue.js on the front, Node.js behind it, GraphQL between them.",
    },
    review: [
      "Which surfaces you actually worked on — the reader apps, the web reader, the publisher tooling, or all three.",
      "STACK CONFLICT: `profile.ts` lists Next.js and Contentful for Magloft; your career entry and the WORK card both say Vue/Node/GraphQL, so I used those. One of the two files is wrong — fix whichever it is.",
      "Whether 'nearly two years' is right. I read it off Jun 2023 – Feb 2025.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 05 · MileApp                                                        */
  /* ------------------------------------------------------------------ */
  mileapp: {
    slug: "mileapp",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Vue.js", "Node.js", "Express", "MongoDB"],
    lede: "Field operations for delivery teams — assigning the work, routing it, and proving it arrived — built front to back in the shape of a real logistics product.",
    sections: {
      context:
        "Last-mile logistics is a well-understood problem with a lot of moving parts: someone assigns the work, a driver carries it, and somebody has to be able to prove it arrived. Edwin built a working version of that loop to hold the whole shape of it in one codebase.",
      problem:
        "The interesting difficulty in field ops is that the two halves of the product want opposite things. The dispatcher wants density — every task, every driver, one screen. The driver wants one thing at a time, large enough to tap while holding a parcel. Serve either one properly and you've made the other worse.",
      contribution:
        "Solo, front to back — the task model, the API, the dispatcher view and the driver flow.",
      build:
        "A Vue front end over a Node and Express API. Tasks carry state through assignment, transit and completion, and proof of delivery is what closes one: the record ends with evidence rather than with a checkbox.",
      decisions: [
        "Two interfaces off one task model, rather than one interface trying to serve a dispatcher and a driver at the same time.",
        "State on the task itself, so a delivery's history reads off the record instead of being reconstructed from logs.",
        "Proof of delivery as the closing step, not an optional extra — an unproven delivery is an open question however the app was marked.",
      ],
      constraints: [
        "A team of one",
        "Two users with opposite needs",
        "A phone in a moving vehicle",
      ],
      outcome:
        "It runs, it's public, and the source is open. It's the piece on this list that best shows Edwin thinking in systems rather than screens: the value is in the task model, and both interfaces fall out of getting that right.",
    },
    ask: {
      did: "He built it front to back on his own — the task model, the API, and both sides of the interface.",
      hardest:
        "Serving a dispatcher and a driver from one model. One wants everything on screen at once; the other wants a single large button while holding a parcel — and the moment you optimise for either, you've hurt the other.",
      stack:
        "Vue.js on the front, Node and Express behind it, with MongoDB holding the task records.",
    },
    review: [
      "IMPORTANT: I've filed this as a personal build (`org: personal` in `work.ts`). If it was work you shipped inside a company, change that and this page should be rewritten as company work.",
      "STACK CONFLICT: the WORK card says MongoDB, `profile.ts` says Mockapi. If it's Mockapi the data-layer line above has to go — that's a mocked backend, not a database, and it's the kind of thing an interviewer will ask about.",
      "Whether proof of delivery is really in it, or whether I've promoted a feature you only planned.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 06 · Bountie                                                        */
  /* ------------------------------------------------------------------ */
  bountie: {
    slug: "bountie",
    role: "Software Engineer",
    timeline: "2022 — 2023",
    glance: { label: "Built at", value: "Bountie" },
    stack: ["React", "Node.js", "PostgreSQL", "Web3"],
    confidential: true,
    lede: "A competitive gaming platform where the matches players are already playing pay out in real rewards — a year on the product as a software engineer.",
    sections: {
      context:
        "Bountie turns ordinary competitive play into something that pays: the matches happen anyway, and the platform is what makes them count. Edwin joined as a software engineer and spent about a year on it.",
      problem:
        "The moment a leaderboard pays out, all of it becomes a trust problem. A result stops being a number on a page and becomes a claim about money — and it has to survive people who are motivated to argue with it, game it, or manufacture it outright.",
      contribution:
        "A year as a software engineer on the platform, in React on the front with Node and PostgreSQL behind it.",
      build:
        "React on the front over a Node API, with PostgreSQL holding anything payout-shaped. Rewards are what stop the database being a convenience and make it a ledger: what was earned, by whom, for which match, and whether it has been paid.",
      decisions: [
        "PostgreSQL for everything a payout depends on. Money-shaped records want transactions and constraints, not eventual consistency.",
        "Treat results as claims to be verified rather than as facts to be displayed.",
        "Keep the reward mechanics legible to players — a system that pays you but can't explain why loses that argument every single time.",
      ],
      constraints: [
        "Real value attached to results",
        "Users motivated to find the edges",
        "A live platform with an existing player base",
      ],
      outcome:
        "The platform is public at bountiehunter.io. What the year gave Edwin is experience of building where a bug isn't cosmetic: on a product that pays out, correctness is the feature and everything else is decoration on top of it.",
    },
    ask: {
      did: "About a year as a software engineer on the platform — React on the front, Node and PostgreSQL behind it.",
      hardest:
        "Anything attached to a payout. Once a leaderboard is worth money, results stop being numbers and become claims people will argue with — so correctness stops being a quality bar and becomes the product.",
      stack:
        "React on the front, Node.js and PostgreSQL behind it, with Web3 wallet connection on the reward side.",
    },
    review: [
      "How much of the reward and payout side you personally touched — I've written around it rather than claiming it.",
      "STACK CONFLICT: `profile.ts` lists Next.js, Metamask and Web3; your career entry says React, Node, PostgreSQL. I used the career entry and kept Web3 as a chip. Confirm which is right.",
      "Whether 'about a year' is right (May 2022 – Jun 2023), and whether the platform is still live.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 07 · DeskLab                                                        */
  /* ------------------------------------------------------------------ */
  desklab: {
    slug: "desklab",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "Tailwind CSS", "OpenRouter AI", "Zustand"],
    lede: "A workspace tool aimed at the repetitive half of the day — the small, dull, every-single-time tasks that quietly eat a working week.",
    sections: {
      context:
        "Most productivity tools give you another place to put your work. This one starts from the opposite end: the parts of the day that are identical every time, and that nobody would miss if they stopped needing a person.",
      problem:
        "Repetitive work is hard to automate precisely because it's small. Each individual task is too minor to justify building a tool for, so it never gets one — and the cost only shows up in aggregate, at the end of a week, as a vague sense of having been busy.",
      contribution:
        "Solo — the concept, the interface, the state model, and the AI plumbing behind it.",
      build:
        "Next.js with Zustand holding the workspace state, and an AI layer through OpenRouter for the steps worth handing over. Zustand rather than something heavier because the interesting state here is small, local and changes constantly — the tool has to feel immediate rather than transactional.",
      decisions: [
        "Start from the tasks, not from a workspace metaphor. The product is a set of things you stop doing by hand.",
        "OpenRouter in front of the model, so what the tool uses can change without the tool changing.",
        "Local, immediate state. Anything that makes you wait on a round trip to do something small has already failed the brief.",
      ],
      constraints: [
        "A team of one",
        "Tasks too small to justify a tool — which is the point",
        "An AI layer that has to stay optional, not central",
      ],
      outcome:
        "It's live and open. Of the side projects it's the most opinionated: not a demo of a technology but an argument about where a working day actually goes, built far enough to be used.",
    },
    ask: {
      did: "All of it, solo — the idea, the interface, the state model and the AI layer.",
      hardest:
        "Scoping it. Everything repetitive is a candidate, so the difficulty isn't building the automation — it's deciding which dull things are worth taking over and which ones you should just do.",
      stack:
        "Next.js and Tailwind, Zustand for the workspace state, and OpenRouter in front of the AI so the model can be swapped.",
    },
    review: [
      "IMPORTANT — the whole page: what DeskLab actually does. Your card blurb is deliberately abstract, so this describes the shape of the product rather than its features. Two concrete examples from you would turn it into a real case study.",
      "STACK CONFLICT: the WORK card says React/Node; `profile.ts` says Next.js/Tailwind/OpenRouter/Zustand. I used the fuller one.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 08 · Tola Web                                                       */
  /* ------------------------------------------------------------------ */
  "tola-web": {
    slug: "tola-web",
    role: "Full Stack Developer",
    timeline: "2025 — 2026",
    glance: { label: "Built at", value: "Tola Solution" },
    stack: ["Next.js", "Tailwind CSS"],
    lede: "The company site for the studio behind Happy Farm — the public front door for a product being built behind it.",
    sections: {
      context:
        "While Edwin was building the Happy Farm platform inside Tola Solution, the studio itself needed a front door: something to send a client to that explained who they were and what they made.",
      problem:
        "A studio site has one job and fails it constantly. It has to be credible to someone who has never heard of you, load instantly on a bad connection, and stay true as the work changes — which is why so many of them are three years out of date and slower than the products they advertise.",
      contribution: "Built and shipped by Edwin alongside the platform work.",
      build:
        "Next.js and Tailwind, kept deliberately small. A marketing site is the one place where the right engineering decision is usually to add nothing: static where it can be static, and no dependency that will need justifying in a year.",
      decisions: [
        "Static and small. The site's whole job is to be fast and true; everything else is weight.",
        "The same stack as the platform, so the studio has one thing to maintain rather than two.",
        "Written to survive neglect — nothing on it needs a person to keep it current week to week.",
      ],
      constraints: [
        "A side task beside the real product",
        "A client audience, not a developer one",
        "Has to stay true with no ongoing attention",
      ],
      outcome:
        "It's live at tola.solutions. It's the smallest thing on this list and it's here for an honest reason: not every job is a platform, and turning out a fast, accurate, low-maintenance site quickly is part of the work too.",
    },
    ask: {
      did: "He built the studio's site alongside the Happy Farm platform work — Next.js and Tailwind, kept small on purpose.",
      hardest:
        "Restraint, mostly. The temptation on a company site is to make it a showcase for the stack; the useful version is fast, accurate, and boring enough to survive nobody touching it for a year.",
      stack: "Next.js and Tailwind CSS. Deliberately nothing else.",
    },
    review: [
      "Whether you built it alone or with the team.",
      "Whether it was during the Happy Farm engagement — I've assumed so, and dated it to match.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 09 · Pokedex                                                        */
  /* ------------------------------------------------------------------ */
  pokedex: {
    slug: "pokedex",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "Tailwind CSS", "PokéAPI", "REST"],
    lede: "A fast, searchable Pokédex on the PokéAPI — type filters, detail views, and no waiting around between them.",
    sections: {
      context:
        "The PokéAPI is the standard playground for anyone learning to consume a REST API, which makes a Pokédex the most-built app on the internet. That's exactly what makes it a useful thing to build *well*: everyone has already seen a slow one.",
      problem:
        "The API hands you a list of names and then makes you fetch every creature separately for anything worth showing. Done naively that's hundreds of requests and a page that fills in one card at a time — so the whole exercise is really about request strategy and caching, dressed up as a toy.",
      contribution:
        "Solo — the fetching strategy, the filtering, the detail views, and the interface around them.",
      build:
        "A Next.js front end over the PokéAPI, with search and type filters that stay responsive because the work is done up front rather than per keystroke. The detail view is a separate read, so the list stays cheap.",
      decisions: [
        "Fetch strategy first, interface second. The felt speed of this app is entirely a data-loading decision.",
        "Filter and search over what's already loaded, so typing never waits on the network.",
        "Keep the detail view a separate read — the list shouldn't pay for information only one card needs.",
      ],
      constraints: [
        "A public API that returns one creature at a time",
        "No key, no budget, no server of his own",
        "A category of app everyone has already seen done badly",
      ],
      outcome:
        "It's live and open. It's on this list as the small honest one: a well-known exercise done properly, which says more about how someone works than an ambitious thing left half-finished.",
    },
    ask: {
      did: "All of it, solo — the data loading, the filtering, the detail views and the interface.",
      hardest:
        "Making it feel instant. The PokéAPI gives you a list of names and one creature per request, so everything pleasant about this app is a decision about what to fetch, when, and what to keep.",
      stack:
        "Next.js and Tailwind on the front, the public PokéAPI over REST for the data.",
    },
    review: [
      "STACK CONFLICT: the WORK card says React/REST; `profile.ts` says Next.js/Tailwind/PokéAPI/PokeWallet. I used the latter and dropped 'PokeWallet' because I don't know what it is — tell me and it goes back in.",
      "Whether the search really is client-side over preloaded data. That's my inference from how it behaves, and it's the main technical claim here.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 10 · Anivault                                                       */
  /* ------------------------------------------------------------------ */
  anivault: {
    slug: "anivault",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "AniList API", "GraphQL", "Tailwind CSS"],
    lede: "An anime and manga database with the tracking on top — search it, keep a watchlist, and get told what to watch next.",
    sections: {
      context:
        "Anime catalogues are enormous, seasonal, and split across a dozen services. AniList already holds that data and exposes it properly, so the interesting project isn't another database — it's what you build once the data is a given.",
      problem:
        "Browsing a catalogue that size isn't a search problem, it's a deciding problem. What a viewer actually wants is a shortlist: what's airing, what they already follow, and what to start next — and most interfaces answer the first question and abandon them at the third.",
      contribution:
        "Solo — the AniList integration, the browsing and search interface, the watchlist, and the recommendations on top of it.",
      build:
        "Next.js against the AniList GraphQL API. GraphQL is what makes this tractable: a card, a detail page and a watchlist row each need a different slice of the same title, and one query per view keeps that from becoming a dozen round trips.",
      decisions: [
        "Take the data as given. AniList maintains the catalogue better than a side project ever could; the value being added is everything above it.",
        "The watchlist is the product. Search is how things get into it — the returning visit is about what to watch tonight.",
        "A query per view rather than one shared blob, so a page asks for what it draws and nothing else.",
      ],
      constraints: [
        "A team of one",
        "Someone else's API, with its rate limits and its shape",
        "A catalogue too large to browse by scrolling",
      ],
      outcome:
        "It's live and open. Alongside the Pokédex it makes a pair worth reading together: both are third-party APIs, and the difference between them is what happens when the API is GraphQL and the product has state of its own to keep.",
    },
    ask: {
      did: "All of it, solo — the AniList integration, the browsing and search, the watchlist, and the recommendations on top.",
      hardest:
        "Turning a catalogue into a shortlist. The data is the easy part when AniList already has it; deciding what to put in front of someone who just wants to know what to watch tonight is the actual product.",
      stack: "Next.js and Tailwind, with the AniList GraphQL API behind it.",
    },
    review: [
      "How the recommendations work — I say they exist because your blurb does, but not how, because I don't know.",
      "Whether the watchlist persists locally or against an AniList account.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 11 · Mini-Google                                                    */
  /* ------------------------------------------------------------------ */
  "mini-google": {
    slug: "mini-google",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["React", "Node.js", "Express", "Context API"],
    lede: "A search engine in miniature behind a deliberately plain page — the whole point being how much of the experience is the part nobody looks at.",
    sections: {
      context:
        "Search is the interface everyone uses and nobody examines. Edwin built a small one to take it apart: a query goes in, results come back, and everything interesting happens in between.",
      problem:
        "A search page is judged almost entirely on things that are invisible — how fast the first result appears, whether the ranking matches what you meant, and what happens when there's nothing to show. None of that is design work, which is why a plain interface is the honest way to present it: there's nowhere for the page to hide.",
      contribution:
        "Solo — the query pipeline, the results handling, and the interface.",
      build:
        "A React front end with the query pipeline behind it and Context holding the search state, so a query, its results and its loading state are one thing the whole page can read rather than props threaded down through every level.",
      decisions: [
        "A deliberately plain page. Any visual interest would be answering a question nobody asked about a search engine.",
        "Search state in one place — the query, the results and the in-between are a single piece of state, not three.",
        "Treat the empty result and the error as first-class screens. They're most of what a search engine actually shows you.",
      ],
      constraints: [
        "A team of one",
        "An experiment, not a product",
        "Nowhere for the interface to hide",
      ],
      outcome:
        "It's live and open. It's the smallest and most curious thing on the list — the one built to understand something rather than to ship something — which is why it closes the set.",
    },
    ask: {
      did: "All of it, solo — the query pipeline, the results handling and the interface.",
      hardest:
        "Everything worth judging in a search engine is invisible: speed to the first result, whether the ranking matches what you meant, and what the page does when there's nothing to show.",
      stack:
        "React with the Context API holding the search state, and Node and Express behind it.",
    },
    review: [
      "IMPORTANT — the biggest thing to check on any of these pages: your card blurb says 'crawl, index, rank', but `profile.ts` lists serper.dev, which is a search API. Those are very different projects. I've written this to describe a query pipeline and have deliberately not claimed a crawler or an index anywhere, because claiming one you don't have is exactly what unravels in an interview. If it really does crawl and index, tell me — that's a much better story and I'll write it.",
      "STACK CONFLICT: the WORK card says Node/Express; `profile.ts` says React/serper.dev/Context API. I've listed both sides.",
    ],
  },
};

/** The case study for a project, if it has been written yet. */
export const caseStudyFor = (slug: string): CaseStudy | undefined =>
  caseStudies[slug];

/* -------------------------------------------------------------------------- */
/* Ordering — the pagination and the NEXT ARTIFACT link                        */
/* -------------------------------------------------------------------------- */

/** Where this project sits in the list, 1-based. */
export function positionOf(slug: string): number {
  return workCards.findIndex((card) => card.slug === slug) + 1;
}

/** The neighbours, wrapping at both ends so the list is a loop, not a wall. */
export function neighboursOf(slug: string): {
  previous: WorkCard;
  next: WorkCard;
} {
  const at = workCards.findIndex((card) => card.slug === slug);
  const count = workCards.length;
  return {
    previous: workCards[(at - 1 + count) % count],
    next: workCards[(at + 1) % count],
  };
}
