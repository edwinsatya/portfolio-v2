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
  /* 01 · Dryrun                                                         */
  /* ------------------------------------------------------------------ */
  dryrun: {
    slug: "dryrun",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "Express", "TypeScript", "Groq", "Gemini", "Upstash Redis"],
    lede: "A mock technical interview that reads your code before it asks you anything. Dryrun pulls a candidate's public repositories, builds a technical profile out of what is actually in them, and interviews against that — including the parts it could not find.",
    sections: {
      context:
        "Interview prep is a library of question banks: the same hundred questions, asked of everyone, answerable by anyone who has read the same hundred questions. None of it is about the code the candidate has actually written — which is the one thing an interviewer will open the moment the call starts.",
      problem:
        "Turning a stranger's GitHub into an interview is harder than it sounds. Public repositories are uneven — some are finished products, most are half-finished experiments, and the interesting questions live in the gaps rather than in the README. So the profile has to be built from evidence and the questions have to hold when the evidence runs out, without the model filling the silence with something it invented.",
      contribution:
        "Solo, both halves. The GitHub analysis, the profile model, the interview and scoring, the API, the front end, and both deploys.",
      build:
        "Two codebases talking over HTTP. A Next.js front end is the view layer only; an Express and TypeScript API does the reading — it calls GitHub, builds a CandidateProfile, and makes every LLM call, so no provider key is ever in the browser. The interview is eight questions derived from that profile, scored at the end with study recommendations attached. Groq answers first with Gemini behind it as a fallback, Upstash Redis holds the caching, the rate limits and the token budget, and Cloudinary carries the attachments an answer can bring with it.",
      decisions: [
        "Two repositories rather than one. The front end is a view layer and nothing else — every key, every model call and every piece of GitHub reading sits behind the API, which is the difference between a demo and something you can put a URL to.",
        "Two model providers with automatic failover behind a circuit breaker. A free-tier LLM will rate-limit you eventually, and an interview that dies at question five is worse than one that never started.",
        "Rate limits and a token budget in Redis, from the beginning. A public AI toy with no ceiling is a bill waiting to happen — cost control here is a feature of the build, not something bolted on after the first invoice.",
        "The profile comes first, the questions second. Nothing is asked that isn't grounded in something the analysis actually found — and where it found nothing, that absence is the question.",
        "Interview parameters — temperature, top-p, persona, difficulty — live in the URL query string, so a run can be reproduced and handed to someone else exactly as it was.",
      ],
      constraints: [
        "A team of one",
        "Free-tier quotas on every model in the chain",
        "Only what GitHub makes public",
        "Serverless request limits on both halves",
      ],
      outcome:
        "It's live, both repositories are public, and it will interview anyone with a GitHub username — try it on your own. It's the strongest piece on this list for one reason: it's an AI product with the unglamorous parts attached. Failover, rate limiting, budgets and a server that keeps the keys are what separate a thing that works in a demo from a thing that works when strangers use it.",
    },
    ask: {
      did: "All of it, solo — the GitHub analysis, the interview and scoring, the Express API, the Next.js front end, and both deployments.",
      hardest:
        "Keeping it honest. A model handed a half-finished repository will happily invent what it thinks should be there, so the questions are grounded in what the analysis actually found — and the gaps are asked about as gaps rather than papered over.",
      stack:
        "Next.js and TypeScript on the front, an Express API behind it, Groq for the model calls with Gemini as the fallback, Upstash Redis for caching and rate limits, and Cloudinary for attachments.",
    },
    review: [
      "The framing of the eight-question interview and the scoring — I read that off the repositories rather than being told it. Correct it if the shape has moved since.",
      "I've called Groq the primary and Gemini the fallback. If that order has flipped, this page and the WORK card tags both need it.",
      "Whether you want the specific model names on the page. I've left them off on purpose — they churn faster than the portfolio does.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 02 · Weathernime                                                    */
  /* ------------------------------------------------------------------ */
  weathernime: {
    slug: "weathernime",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "Open-Meteo API", "Tailwind CSS", "Claude"],
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
  /* 03 · Food Analyzer                                                  */
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
  /* 04 · Happy Farm                                                     */
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
  /* 05 · Magloft                                                        */
  /* ------------------------------------------------------------------ */
  magloft: {
    slug: "magloft",
    role: "Full Stack Developer",
    timeline: "2023 — 2025",
    glance: { label: "Built at", value: "Magloft" },
    stack: [
      "Next.js",
      "Node.js",
      "Express",
      "GraphQL",
      "PostgreSQL",
      "OpenAI",
      "Angular",
    ],
    confidential: true,
    lede: "One publishing platform, many magazines. Each publisher gets their own domain, their own content and their own look — all of it served by one codebase and set from one admin — worked on across the stack for nearly two years.",
    sections: {
      context:
        "Magloft is a publishing platform: publishers bring their issues, and the platform turns them into apps and web readers their audience can actually read. The magazine in the screenshot is one of them, on its own domain, with its own branding — there are others, and they all run on the same software. Edwin spent close to two years on it as a full-stack developer, the longest single stretch on this list.",
      problem:
        "Every publisher wants their own product: their content, their brand, their address on the internet. The fast answer is to fork the app per client, and it works right up until there are a dozen of them, at which point a platform company has quietly become an agency maintaining a dozen codebases. The platform answer is one codebase that can be told what to be — and the difficulty is that it has to be told by the publisher, not by an engineer.",
      contribution:
        "Two years across the stack — the Next.js publisher-facing sites, the GraphQL API on Node and Express behind them, the PostgreSQL underneath, and the Angular admin the publishers use themselves.",
      build:
        "One Next.js application serving many magazines. A publisher signs into an Angular admin and sets both halves of their product there: the content of an issue, and the styling of the web around it — so the same deployment renders one publisher's coastal lifestyle magazine and the next publisher's something else entirely, each on its own domain, each looking nothing like the other. Behind that sits a GraphQL API on Node and Express over PostgreSQL, carrying issues, subscriptions and who is entitled to read what. OpenAI powers the assistant in the corner of a publisher's site, answering the questions a reader actually arrives with — what a subscription costs, whether there's a free issue, who to talk to about advertising.",
      decisions: [
        "One codebase, many tenants. A build per client is the quickest way to ship the second magazine and the surest way to stop being a platform company.",
        "Styling as data rather than as a fork. The publisher changes their own look from the admin, so a new brand is a configuration change and not a deploy.",
        "GraphQL as the contract. A reader app, a web reader and the admin all want different slices of the same issue; one schema serves all three without three endpoints drifting apart.",
        "PostgreSQL under the whole thing. Issues, subscriptions and entitlements are relational, and who is allowed to read what is not a question you want answered eventually.",
        "The reader assistant is scoped to the magazine it sits on, so it's support for that publication rather than one generic bot bolted onto every site.",
        "The publisher's domain, not the platform's. A reader should never learn what Magloft is — it's the thing underneath, not the brand on the page.",
      ],
      constraints: [
        "A live platform with paying publishers",
        "One codebase that has to be several products at once",
        "Content and branding owned by the customer, not the team",
        "Two front ends and an admin to keep in step",
      ],
      outcome:
        "The platform is live and public at magloft.com, and the magazines running on it sit on their own domains — the shot on this page is one of them. For Edwin it's the two years that turned him from someone who could build a feature into someone who could work inside a product other people already depended on — a different skill, and the one most of the rest of this list rests on.",
    },
    ask: {
      did: "Nearly two years as a full-stack developer on the platform — the Next.js publisher sites, the GraphQL API on Node and Express, PostgreSQL underneath, and the Angular admin publishers use to run their own magazine.",
      hardest:
        "Multi-tenancy. One codebase has to be a different product for every publisher — their content, their styling, their domain — without collapsing into a pile of per-client special cases, and while somebody's issue goes out on it tonight.",
      stack:
        "Next.js on the publisher-facing side, Angular for the admin, a GraphQL API on Node and Express, PostgreSQL underneath, and OpenAI behind the reader assistant.",
    },
    review: [
      "Which surfaces you actually worked on — the publisher sites, the API, the admin, or all three. I've said all three; narrow it if that's generous.",
      "Contentful and Tailwind went to the Magloft Web card, which is where they belong now that the marketing site is its own project. If any of that is also in the platform, add it back here.",
      "The assistant being scoped to each publisher's own magazine is my reading of the screenshot's suggested questions, not something you told me.",
      "Whether 'nearly two years' is right. I read it off Jun 2023 – Feb 2025.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 06 · Magloft Web                                                    */
  /* ------------------------------------------------------------------ */
  "magloft-web": {
    slug: "magloft-web",
    role: "Full Stack Developer",
    timeline: "2023 — 2025",
    glance: { label: "Built at", value: "Magloft" },
    stack: ["Next.js", "Tailwind CSS", "Contentful CMS", "Node.js"],
    lede: "The public front door for the publishing platform — everything a publisher reads before they ever sign in.",
    sections: {
      context:
        "The platform has to sell itself to publishers, and magloft.com is where that happens: what the product does, who already runs on it, what it costs, and a free way in. Edwin built it alongside the platform itself.",
      problem:
        "A marketing site belongs to the people who change it most, and those people are not engineers. If every price change, customer story and blog post needs a developer and a deploy, the site goes stale — not because anyone decided to neglect it, but because updating it costs more than the update is worth.",
      contribution:
        "Built and kept running by Edwin alongside the platform work.",
      build:
        "Next.js and Tailwind on the front, with Contentful holding everything that has words in it — the pages, the pricing copy, the customer stories, the blog. Marketing edits in the CMS and the site follows; publishing a post involves no developer at all.",
      decisions: [
        "A CMS for all of the copy, not just the blog. The test for a marketing site is whether the person who wants a change can make it without asking anyone.",
        "Next.js for pages that render fast and land properly in search — this is a site whose entire job is being found by publishers who haven't heard of it.",
        "Kept separate from the platform. The thing that sells the product and the product itself have different audiences, different release rhythms, and no reason to share a deploy.",
      ],
      constraints: [
        "A non-technical team owning the content",
        "Search traffic as the point, not a bonus",
        "Built beside the real product, never instead of it",
      ],
      outcome:
        "It's live at magloft.com. It's the smaller half of the same job: the platform had to be built, and it also had to be explained to the publishers paying for it — and explaining it well is what fills the platform.",
    },
    ask: {
      did: "He built the platform's own marketing site alongside the platform — Next.js and Tailwind, with Contentful behind the content.",
      hardest:
        "Handing it over. The useful version of a marketing site is one the marketing team can change without a developer, which means the engineering decision is mostly about what to give away.",
      stack:
        "Next.js and Tailwind CSS on the front, Node.js behind it, and Contentful holding the copy.",
    },
    review: [
      "Whether you built it alone or alongside a marketing team.",
      "Whether Contentful runs the whole site or only the blog — I've said everything with words in it.",
      "Whether it ran the full two years or arrived partway through.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 07 · MileApp                                                        */
  /* ------------------------------------------------------------------ */
  mileapp: {
    slug: "mileapp",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Vue.js", "Node.js", "Express", "JWT"],
    lede: "Field operations for delivery teams — assigning the work, routing it, and proving it arrived — built front to back in the shape of a real logistics product.",
    sections: {
      context:
        "Last-mile logistics is a well-understood problem with a lot of moving parts: someone assigns the work, a driver carries it, and somebody has to be able to prove it arrived. Edwin built a working version of that loop to hold the whole shape of it in one codebase.",
      problem:
        "The interesting difficulty in field ops is that the two halves of the product want opposite things. The dispatcher wants density — every task, every driver, one screen. The driver wants one thing at a time, large enough to tap while holding a parcel. Serve either one properly and you've made the other worse.",
      contribution:
        "Solo, front to back — the task model, the API, the dispatcher view and the driver flow.",
      build:
        "A Vue front end over a Node and Express API, in two repositories. The API owns accounts and tasks — registration and login on JWTs held in http-only cookies, bcrypt on the passwords, Zod validating what comes in, and middleware making sure a user only ever reaches their own work. Tasks carry state through assignment, transit and completion, and the data layer underneath is mocked on purpose: the point of the build was the model and the two interfaces over it, not the storage.",
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
        "Vue.js on the front, Node and Express behind it — JWT auth in http-only cookies, bcrypt, and Zod on the way in. The store itself is mocked, deliberately.",
    },
    review: [
      "IMPORTANT: I've filed this as a personal build (`org: personal` in `work.ts`). If it was work you shipped inside a company, change that and this page should be rewritten as company work.",
      "RESOLVED — the old conflict here (card said MongoDB, `profile.ts` said Mockapi) is settled the way `mileapp-server` describes itself: a mock API, no database. Every page now says that. If you have since put a real database behind it, this is the paragraph to change.",
      "Whether proof of delivery is really in it, or whether I've promoted a feature you only planned.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 08 · Bountie                                                        */
  /* ------------------------------------------------------------------ */
  bountie: {
    slug: "bountie",
    role: "Software Engineer",
    timeline: "2022 — 2023",
    glance: { label: "Built at", value: "Bountie" },
    stack: ["Next.js", "Tailwind CSS", "Web3", "Metamask"],
    confidential: true,
    lede: "A competitive gaming platform where the matches players are already playing pay out in real rewards — a year on the product as a software engineer.",
    sections: {
      context:
        "Bountie turns ordinary competitive play into something that pays: the matches happen anyway, and the platform is what makes them count. Edwin joined as a software engineer and spent about a year on it.",
      problem:
        "The moment a leaderboard pays out, all of it becomes a trust problem. A result stops being a number on a page and becomes a claim about money — and it has to survive people who are motivated to argue with it, game it, or manufacture it outright.",
      contribution:
        "A year as a software engineer on the platform, in Next.js on the front, with the Web3 wallet side of the rewards.",
      build:
        "Next.js on the front, with Metamask connecting the player's own wallet on the reward side. That connection is what makes a reward real rather than a number in an account: what was earned, by whom, for which match, and where it lands when it pays.",
      decisions: [
        "Pay into a wallet the player already owns rather than a balance the platform holds for them. A reward you can check yourself asks for no trust in the scoreboard that produced it.",
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
      did: "About a year as a software engineer on the platform — Next.js on the front, and the Web3 wallet side of the rewards.",
      hardest:
        "Anything attached to a payout. Once a leaderboard is worth money, results stop being numbers and become claims people will argue with — so correctness stops being a quality bar and becomes the product.",
      stack:
        "Next.js and Tailwind on the front, with Metamask and Web3 wallet connection on the reward side.",
    },
    review: [
      "How much of the reward and payout side you personally touched — I've written around it rather than claiming it.",
      "RESOLVED — you confirmed the classic build's chips, so this page is Next.js with Metamask/Web3 on the rewards, and the invented PostgreSQL ledger is gone. What the back end actually was is still yours to add if you want it named.",
      "Whether 'about a year' is right (May 2022 – Jun 2023), and whether the platform is still live.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 09 · DeskLab                                                        */
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
  /* 10 · Tola Web                                                       */
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
  /* 11 · Pokedex                                                        */
  /* ------------------------------------------------------------------ */
  pokedex: {
    slug: "pokedex",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Zustand", "PokéAPI", "PokéWallet"],
    lede: "All 1,025 of them, and then some — search and type filters, stats and evolutions, a catch list with real catch rates, a quiz, and live trading-card prices.",
    sections: {
      context:
        "The PokéAPI is the standard playground for anyone learning to consume a REST API, which makes a Pokédex the most-built app on the internet. That is exactly what makes it a useful thing to build well: everyone has already seen a slow one, and almost nobody has seen one that keeps going after the list renders.",
      problem:
        "The API hands you a list of names and then makes you fetch every creature separately for anything worth showing. Done naively that's hundreds of requests and a page that fills in one card at a time — so the exercise is really about request strategy and caching, dressed up as a toy. The card prices bring the same problem from the other end: that data is live, it comes from someone else's service, and the free plan allows a hundred requests an hour.",
      contribution:
        "Solo — the fetching strategy, the filtering, the detail and evolution pages, the catch and collection state, the quiz, and the card market.",
      build:
        "A Next.js app on the App Router in TypeScript, with Zustand holding everything the visitor accumulates — the catch list, the collection, the quiz streak. Two services feed it: the PokéAPI for the creatures, stats and evolutions, and PokéWallet for live TCG prices out of TCGplayer and Cardmarket. Price lookups are cached on the server, because a marketplace page can spend an hourly quota in a minute.",
      decisions: [
        "Fetch strategy first, interface second. The felt speed of this app is entirely a data-loading decision.",
        "Filter and search over what's already loaded, so typing never waits on the network.",
        "Keep the detail view a separate read — the list shouldn't pay for information only one card needs.",
        "Cache the price lookups server-side. A hundred requests an hour is a real ceiling, and the honest way to live inside it is to stop asking the same question twice.",
        "Go past the exercise. The catch list, the collection tracker and the quiz are what turn a well-known API demo into something with a reason to come back to it.",
      ],
      constraints: [
        "A team of one",
        "An API that returns one creature per request",
        "A hundred price requests an hour, free tier",
      ],
      outcome:
        "It's live and open. It started as the most-built app on the internet and didn't stay there — the fetch strategy is the craft, and the catch list, the quiz and the card market are the reason anyone is still on it after the first page.",
    },
    ask: {
      did: "All of it, solo — the data loading, the filtering, the detail and evolution pages, the catch and collection state, the quiz and the card market.",
      hardest:
        "Making it feel instant on an API that gives you one creature per request, then doing it again for live card prices on a hundred-requests-an-hour quota. Everything pleasant about this app is a decision about what to fetch, when, and what to keep.",
      stack:
        "Next.js and TypeScript with Tailwind and Zustand, the PokéAPI for the creatures, and PokéWallet for live TCG prices — cached server-side to stay inside the free tier.",
    },
    review: [
      "RESOLVED — PokéWallet is back in the stack now that I know what it is (live TCG card pricing from TCGplayer and Cardmarket), and the WORK card no longer says React/REST.",
      "The feature list, the 1,025 count and the hundred-an-hour quota are read off the README. The client-side filtering claim is still my inference from how it behaves — that's the one technical line here worth checking.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 12 · Anivault                                                       */
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
  /* 13 · Mini-Google                                                    */
  /* ------------------------------------------------------------------ */
  "mini-google": {
    slug: "mini-google",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: ["React", "Tailwind CSS", "Serper.dev", "Context + useReducer"],
    lede: "A Google-style search client on the Serper API, where the whole craft is in the tenth of a second between typing and seeing something.",
    sections: {
      context:
        "Search is the interface everyone uses and nobody examines. Edwin built one to take the front of it apart — the results come from Serper.dev, so none of this is about crawling the web; all of it is about what happens between a keystroke and a rendered result.",
      problem:
        "A search page is judged on things that never show up in a screenshot. Whether autocomplete keeps up with typing without firing a request per character. Whether the keyboard can drive the whole thing. Whether moving from the home page to the results feels like one page or two. And what you get when there is nothing to show. Get those wrong and it feels cheap no matter how good the results are.",
      contribution:
        "Solo — the Serper integration, the autocomplete and query pipeline, the results handling, and the interface around them.",
      build:
        "A React front end in Tailwind, calling Serper.dev for web, image and news results behind three routes. The query, its results, its loading state and its errors live in one useContext plus useReducer store rather than being threaded through props, so the whole page reads one thing. Autocomplete is debounced, recent searches are kept, and the move from home to results animates — the query travels up the page instead of the page being swapped underneath it.",
      decisions: [
        "Borrow the index. Serper answers the queries, which is what makes it possible to spend the entire budget of a side project on the part that is actually interesting — the interface.",
        "Debounce the autocomplete. The naive version fires a request per keystroke: quick to write, expensive to run, and worse to use than the version that waits.",
        "One reducer for the search. Query, results, loading and error are a single piece of state, not four that can quietly disagree with each other.",
        "Keyboard first. A search box you have to reach for the mouse to finish using has missed the point of being a search box.",
        "The empty result and the error are designed screens rather than fallbacks — between them they are a good share of what a search interface actually shows people.",
      ],
      constraints: [
        "A team of one",
        "Somebody else's results, on somebody else's quota",
        "A blank page that has to feel fast before it can be judged at all",
      ],
      outcome:
        "It's live, it's open, and it carries a Jest and React Testing Library suite — unusual for something this size. It's the smallest thing on this list and the one most about feel: three routes, one API, and a pile of small decisions that add up to whether it seems quick.",
    },
    ask: {
      did: "All of it, solo — the Serper integration, the autocomplete and query pipeline, the results handling and the interface.",
      hardest:
        "Making typing feel instant without hammering the API. Debounce too little and every keystroke is a request; too much and autocomplete feels broken — and the right answer is a feel rather than a number you can look up.",
      stack:
        "React with Tailwind, Serper.dev for the web, image and news results, and useContext plus useReducer holding the search state.",
    },
    review: [
      "RESOLVED — the old 'crawl, index, rank' framing is gone. The repository describes a Serper.dev client, you confirmed the classic build's chips, and nothing on this page claims a crawler or an index any more. The WORK card blurb was rewritten to match.",
      "The interface details — debounced autocomplete, search history, keyboard navigation, the home-to-results transition — are read off the README rather than told to me. Cut anything that has since changed.",
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
