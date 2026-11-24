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
  /* 02 · llm-output-guard                                               */
  /* ------------------------------------------------------------------ */
  "llm-output-guard": {
    slug: "llm-output-guard",
    role: SOLO,
    glance: { label: "Published", value: "npm · MIT" },
    stack: [
      "TypeScript",
      "Node 18+",
      "Zero dependencies",
      "Standard Schema",
      "CLI",
    ],
    lede: "A retry layer watches for 429s, 5xx and timeouts. It cannot see a model that looped until max_tokens, returned an empty object, stopped mid-sentence or answered in the wrong language — because every one of those arrives as a successful request. This is the signal that layer is missing.",
    sections: {
      context:
        "Anything built on a language model inherits two kinds of failure. The transport kind — rate limits, server errors, timeouts — is solved: every SDK retries, every team has a fallback. The other kind arrives with a 200 OK and a body that is technically a response and practically useless, and almost nothing in the stack is looking for it.",
      problem:
        "The obvious way to catch a bad answer is to ask a model whether it's bad, which doubles your cost and your latency to check work you already paid for. The cheap way is to look at the shape of what came back — but shape checks are where false positives live, and a guard that flags good answers gets switched off inside a week. So the real problem isn't detection; it's being trustworthy enough to stay switched on.",
      contribution:
        "Solo, and published — the detectors, the scoring, the adapters, the CLI, the benchmarks, the docs and the release discipline.",
      build:
        "Nine detectors that measure shape rather than truth: empty and punctuation-only replies, output too short to be useful, looping n-grams, a tail that gets stuck after a good beginning, character-level entropy collapse, truncation from unbalanced fences or a missing stop token, invalid JSON or a schema mismatch, and two opt-in language checks for the wrong alphabet and the wrong language. Each returns a score between 0 and 1 rather than a verdict. It is synchronous and pure — no network, no clock, no randomness — so it can sit on a hot path: roughly 0.4 ms on 500 bytes and 1 ms on 32 KB. Four presets ship with it (chat, strictJson, longForm, lenient), along with adapters for the OpenAI, Anthropic and Vercel AI SDKs and a CLI that scores your existing logs.",
      decisions: [
        "Scores, not booleans. A detector that announces \"this is degenerate\" has made the caller's decision for them; one that reports 0.94 lets them decide what their own tolerance is.",
        "Shape, not truth. It cannot tell you the model was wrong — that's a different and far harder product — and the README says so out loud rather than letting someone discover it in production.",
        "Zero runtime dependencies, enforced in CI. A reliability library that drags a supply chain in behind it is arguing against itself; that's why the compression check is a hand-rolled LZ77 rather than a call into zlib.",
        "Synchronous and pure, so it's safe to run on every response. A check that has to be awaited is a check that gets skipped on the path that matters.",
        "Calibration as a shipped tool, not advice. Thresholds tuned on someone else's traffic are a guess, so the CLI scores your logs and sets them against a false-positive budget you pick.",
        "Strict semver from 1.0.0 with the rule written down: threshold changes are major, new opt-in options are minor. Anything a user can build an alert on is part of the contract.",
      ],
      constraints: [
        "Zero dependencies, enforced in CI",
        "Sub-millisecond on a hot path",
        "False positives cost more than misses",
        "Someone else's production traffic on the other end",
      ],
      outcome:
        "It's on npm under MIT with TypeScript types, and it's the least screen-shaped thing on this list: a small, sharp tool aimed at a problem he hit himself while building the AI work above it. The part worth reading is the limitations section — repetition detection is off for CJK, the language check is unreliable under 25 words, and echo detection can't tell a legitimate rewrite from a degenerate one. Publishing the edges of your own tool is a better signal about how someone builds than any feature list.",
    },
    ask: {
      did: "All of it, solo — the detectors, the scoring model, the SDK adapters, the calibration CLI, the benchmarks and the release discipline. It's published under his name on npm.",
      hardest:
        "False positives. A guard that flags good answers gets turned off within a week, so the entire design pushes the threshold decision to the caller and ships a tool to calibrate it — rather than shipping confident defaults and hoping they fit somebody else's traffic.",
      stack:
        "TypeScript, Node 18 and up, zero runtime dependencies, Standard Schema for the JSON validation so it works with Zod, Valibot or ArkType, and a CLI for scoring and calibration.",
    },
    review: [
      "Everything here is read off the README and the npm registry rather than told to me — the nine detectors, the presets, the benchmark timings, the semver rule. Correct anything that has moved.",
      "I've deliberately kept version numbers and download counts out of the copy: they age badly on a page that's built once. The screenshot shows 1.4.1 while the registry is on 1.7.0 — grab a fresh shot when you next want it updated.",
      "Whether this came out of the Dryrun work or stands on its own — I've said he hit the problem himself, which is an assumption.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 03 · Iron Arena                                                     */
  /* ------------------------------------------------------------------ */
  "iron-arena": {
    slug: "iron-arena",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: [
      "Next.js",
      "TypeScript",
      "WebRTC",
      "Rollback netcode",
      "Cloudflare Workers",
      "Durable Objects",
      "Canvas 2D",
      "Playwright",
    ],
    lede: "A 1v1 fantasy brawler that runs in a browser tab. Pick a hero, send a friend the link, and fight on a walled stage — over GGPO-style rollback netcode, so two players in different cities get a match that feels like they're sharing a couch.",
    sections: {
      context:
        "Fighting games live and die on input latency. The genre's answer is rollback: each side simulates the fight locally, predicts the other player's input, and quietly rewinds and replays when a real input arrives that disagrees. It's the standard on consoles. It's rare in a browser, because it only works if two different machines compute exactly the same fight from the same inputs — every frame, forever.",
      problem:
        "Determinism is the whole problem. One floating-point difference between two browsers, one piece of state that isn't rolled back, one random number drawn in a different order, and the two screens drift apart while both players think they're winning. On top of that sits the network: home and mobile connections that can't reach each other directly, packets that arrive late or out of order, and a room that has to be found before any of it starts.",
      contribution:
        "Solo — the game design, the deterministic simulation, the rollback netcode, the lobby, the renderer and HUD, the test tooling and both deploys. The pixel-art heroes come from free packs by elie automata, credited in the game; the names, skills, stages, effects and code are his.",
      build:
        "A pnpm monorepo split along the lines that matter. The simulation is its own package — pure TypeScript, integer math, a fixed 60 Hz step and zero dependencies — so it can run identically in two browsers and in a test harness. The netcode package owns the rollback session, a compact binary packet format and three transports. Only inputs travel, around sixty tiny packets a second, over a WebRTC data channel peer to peer, falling back to Cloudflare TURN and then to a WebSocket relay when a network won't allow a direct connection. A lobby on Cloudflare Workers with one Durable Object per room handles room codes, character select, signaling and TURN credentials, and refuses to pair two tabs running different builds. The fight itself is drawn on Canvas 2D with painted parallax backdrops; Next.js carries the menus and the HUD. There are 27 heroes, each with a combo, dash, air and charged attacks, three skills and an ultimate, plus versus CPU, local versus and a training mode.",
      decisions: [
        "Netcode before art. Rollback is notoriously hard to bolt onto a finished game, so capsules were fighting online before any hero had a face. It paid off twice: the game changed shape from a 3D fighter to a 3D arena brawler to a 2D side-view brawler, and the simulation, netcode and lobby came through every change untouched.",
        "Integer math and no physics engine. Floating point is the classic way two machines disagree about the same fight; a simulation built on integers can't.",
        "No game logic on a server. The lobby introduces two players and steps aside — the fight runs peer to peer, which keeps latency down and the hosting bill on a free tier.",
        "Three transports, tried in order. Direct WebRTC first, TURN second, a plain WebSocket relay last — a friend behind a strict network still gets a match instead of an error.",
        "Desyncs are hunted by tools, not by playtesting. A synctest runs every hero pair for 10,000 frames with an eight-frame rollback on every frame; a soak test throws 300 simulated bad networks at it; Playwright drives two real browsers through a whole online match over both WebRTC and the relay.",
      ],
      constraints: [
        "A team of one",
        "Two browsers that must agree on every frame",
        "Networks that can't always reach each other",
        "Free hosting tiers only",
      ],
      outcome:
        "It's live and open — create a room and send the link. The soak test compares 1,718,067 frames across its 300 simulated networks with zero mismatches, and the end-to-end tests fight matches frame for frame over both transports. It's the most technically demanding thing on this list, and the reason is in the order it was built: the invisible part first, so that the visible part could be thrown away twice without breaking anything.",
    },
    ask: {
      did: "All of it, solo — the game design, the deterministic simulation, the rollback netcode, the Cloudflare lobby, the renderer and the test tooling. The hero sprites are free pixel-art packs, credited in the game; everything else is his.",
      hardest:
        "Determinism. Rollback only works if two browsers compute exactly the same fight from the same inputs, so the simulation runs on integer math with no physics engine, and every change is checked by a synctest and a soak test that hunt for a single frame of disagreement.",
      stack:
        "A pnpm monorepo in TypeScript: a zero-dependency deterministic simulation, a rollback netcode package over WebRTC with TURN and WebSocket fallbacks, a lobby on Cloudflare Workers and Durable Objects, and a Next.js app that draws the fight on Canvas 2D. Vitest and Playwright test it.",
    },
    review: [
      "The 3D-fighter → 3D-arena → 2D-brawler history is read off docs/PLAN.md and docs/GAME.md. If you'd rather not tell that story publicly, cut the first decision.",
      "The hero count (27) and the soak figure (1,718,067 frames) are from the README — both will drift as you add heroes and rerun the tools.",
      "I've marked it full-stack because the lobby is a real server you wrote, even though it lives in the same repository as the game. Unset `fullstack` if you only count builds with two repos.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 04 · Space Explorer 3D                                              */
  /* ------------------------------------------------------------------ */
  "3d-spaceship": {
    slug: "3d-spaceship",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: [
      "Next.js",
      "Three.js",
      "React Three Fiber",
      "Zustand",
      "Supabase",
      "Howler.js",
      "Vitest",
      "PWA",
    ],
    lede: "A 3D space game that runs straight in the browser, on a desktop or a phone, with nothing to install. Fly your own ship around the solar system, warp between planets, land on the Moon and Mars, race timed missions — and pick up real facts about where you are along the way.",
    sections: {
      context:
        "Most browser games are small on purpose: a 2D canvas, one screen, one mechanic. A real-time 3D world with a flight model, a scene per planet, a hangar and accounts is the kind of thing people reach for a game engine and an app store to ship. The interesting question was how much of that a web page could carry without anyone having to install anything.",
      problem:
        "The solar system doesn't fit. Real distances are too large to fly and real sizes too small to see, and positions far from the origin start to jitter in 32-bit floats. Then it has to stay smooth on a mid-range phone, steer well with a mouse, a touch stick, a gamepad and a tilted handset, and keep a leaderboard honest when the timer runs in a browser the player controls.",
      contribution:
        "Solo — the game design, the flight model, every scene, the audio, the UI, the Supabase schema and functions, and the tests. The planet textures are Solar System Scope's under CC BY 4.0; the ships, terrain, sky and sound are generated in code.",
      build:
        "Next.js with React Three Fiber on three.js, built in four phases. The core loop is a flight model, a ring-race mission around Earth and procedural audio. Then a solar-system map with a warp tunnel to every planet, orbiting with an info card, an encyclopedia, landings on the Moon and Mars as their own small scenes behind a fade, and a hangar of four ships with paint, decals and engine trails. Then seven missions on five routes, a photo mode with a local gallery, star-based unlocks and eleven badges, optional Supabase accounts that merge guest progress on first sign-in, and best-time leaderboards. Last, the settings: separate volumes, graphics presets with sun shadows, key remapping, gamepad and tilt steering, reduced motion, a colour-blind palette, English and Indonesian, and an installable PWA that plays offline.",
      decisions: [
        "Artistic scale with a floating origin. Earth is 200 units across and real numbers only appear as text; the world is rebased around the ship when it travels far, so nothing shakes at the edge of the map.",
        "One loop per frame, and nothing allocated in it. Input, flight, collisions, missions, camera and HUD run in a single useFrame, and the HUD writes straight to the DOM rather than setting React state sixty times a second.",
        "Leaderboard times are checked on the server. A run asks for a ticket when it starts and hands it back at the finish; Postgres functions refuse a time faster than the mission's plausible minimum, longer than its own clock allows, or on a reused ticket.",
        "Balance is tested by an autopilot. It flies every mission with every ship through the real flight model, and the tests fail if a clean pilot stops earning two stars — or if three stars stop needing the boost.",
        "Procedural first, files second. Ships, terrain, sky and sound are generated in code, so the game starts without waiting on downloads, and every asset has a slot ready for a real file later.",
      ],
      constraints: [
        "A team of one",
        "A browser tab and a mid-range phone",
        "WebGL2 and a 60 fps frame budget",
        "A timer the player's own machine is running",
      ],
      outcome:
        "It's live and open, and all four phases of its spec are done. It's the widest thing on this list — real-time 3D, input across four kinds of device, server-checked scores, accounts, offline play and two languages — and the tests are what hold it together: the flight and scoring logic, the progress merge, and an autopilot that keeps the missions fair.",
    },
    ask: {
      did: "All of it, solo — the game design, the flight model and scenes, the procedural audio, the UI, the Supabase accounts and leaderboards, and the tests. The planet textures are licensed from Solar System Scope; the rest is generated in code.",
      hardest:
        "Making the solar system fit a browser. That meant an artistic scale with a floating origin so nothing jitters far from home, and a frame loop that allocates nothing and never sets React state, so it still runs smoothly on a phone.",
      stack:
        "Next.js with React Three Fiber and three.js, Zustand for game state, Howler for the audio mix, Supabase for accounts and server-checked leaderboards, Vitest for the game logic, and a service worker for offline play.",
    },
    review: [
      "I've used the English title, Space Explorer 3D, as the name and kept the repository's 3d-spaceship as the slug and URL.",
      "The feature list is read off the README and the PRD; the ship, terrain and sound being procedural comes from ASSETS.md. Correct anything that has changed since.",
      "Supabase is optional in the code — I've assumed the live build has accounts and leaderboards switched on.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 05 · SushiFlush dApp                                                */
  /* ------------------------------------------------------------------ */
  "sushiflush-dapp": {
    slug: "sushiflush-dapp",
    role: SOLO,
    glance: { label: "Network", value: "Sepolia testnet" },
    stack: ["Astro", "viem", "TypeScript", "Tailwind CSS", "EIP-6963", "Vercel"],
    lede: "The staking interface for the SushiFlush token: connect a wallet on Sepolia, stake SFLUSH, watch rewards accrue, claim them, and read your history back off the chain. One screen of numbers and four buttons, built without React or wagmi.",
    sections: {
      context:
        "The other half of the SushiFlush Token project — a personal project for learning Solidity and the EVM. The contracts were written and tested first; this is what a holder actually touches. It runs on the Sepolia testnet, and the page says plainly that the token has no value.",
      problem:
        "A staking UI looks simple and isn't. Rewards accrue every second but can only be read every few seconds. Every write can revert, and a wallet popup that says \"transaction failed\" tells nobody why. Event history has to come from a public RPC that refuses wide log queries. And because this is a page that asks for a wallet signature, it has to be careful about what it asks to sign and where it can be embedded.",
      contribution:
        "Solo — the interface, the wallet connection, the chain reads and writes, the activity history, the first-visit guide and the deploy. The contracts it talks to are his too.",
      build:
        "Astro renders one static HTML page; a single vanilla TypeScript module boots in the browser and drives it. viem handles everything on-chain: reads are batched through Multicall3, so one tick's eight calls become one round trip, and every write is simulated before the wallet opens. Wallets are discovered through EIP-6963 with a window.ethereum fallback, and a reload reconnects without a popup. The activity list walks the logs backwards in thousand-block chunks from the chain head to the staking contract's deploy block, matching the connected account client-side, with a \"load earlier\" that resumes the walk.",
      decisions: [
        "No UI framework. wagmi is React-bound and Astro gives each island its own React root, so sharing wallet state means one giant island or a store outside React anyway. For one screen of numbers, the framework was carrying no weight — five runtime dependencies in total.",
        "Simulate every write first. A revert then surfaces as the contract's own error name, InsufficientStake or ZeroAmount, instead of an opaque wallet failure.",
        "Approve the exact amount. Staking asks for precisely what is being staked, so no standing allowance survives the transaction.",
        "Project the rewards, then reconcile. The claimable figure ticks every second from the account's share of the reward rate, stops at the period's end, and is corrected by each five-second poll.",
        "Owner functions are deliberately missing. A reward-funding form on the same page stakers use is how owner keys get phished, so funding runs from a script in the contracts repository instead — and frame-ancestors 'none' keeps the page out of other people's iframes.",
      ],
      constraints: [
        "A team of one",
        "A public RPC that caps log queries at 1,000 blocks",
        "Injected wallets only",
        "One chain, Sepolia",
      ],
      outcome:
        "It's live on Sepolia and open. Read it next to the contracts it drives: together they're a whole dApp from Solidity to the screen, and this half is a good example of choosing less — no framework, no wallet library, and a security header that matters more than any feature.",
    },
    ask: {
      did: "All of it, solo — the interface, the wallet connection, the reads and writes, the on-chain activity history and the deploy. He wrote the contracts it talks to as well.",
      hardest:
        "Making on-chain numbers feel live and failures readable. Rewards are extrapolated every second and reconciled on every poll, and every write is simulated first, so a revert shows the contract's own error instead of a wallet's.",
      stack:
        "Astro for a single static page, viem for the chain, TypeScript throughout, Tailwind CSS 4 for the styling, and EIP-6963 for finding the wallet. No React and no wagmi. Deployed on Vercel.",
    },
    review: [
      "Everything here is read off the README. The five-second poll and the thousand-block chunks are the numbers it gives — correct them if they've moved.",
      "I've written it as the front end of one project with SushiFlush Token rather than marking both full-stack, because they're separate entries on the list. Merge them into one card with `source` and `sourceApi` if you'd rather show it as one build.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 06 · SushiFlush Token                                               */
  /* ------------------------------------------------------------------ */
  "sushiflush-token": {
    slug: "sushiflush-token",
    role: SOLO,
    glance: { label: "Network", value: "Sepolia · verified" },
    stack: ["Solidity", "Hardhat 3", "OpenZeppelin", "viem", "TypeScript", "forge-std"],
    lede: "A fixed-supply ERC-20 and a staking contract that pays its rewards in the same token, written in Solidity, fuzz-tested, deployed and verified on the Sepolia testnet. A learning project, labelled as one: nothing here is audited, and the token has no value.",
    sections: {
      context:
        "A personal project for learning Solidity and the EVM properly — not just deploying a token from a tutorial, but writing the contract that holds other people's tokens, testing it until it can be trusted, and shipping it to a public testnet with verified source. The SushiFlush dApp is the front end for it.",
      problem:
        "Paying out staking rewards sounds like a loop over the stakers, and on-chain that loop is a time bomb: as stakers grow it eventually exceeds the block gas limit and the contract stops working for everyone. There's a subtler trap when the stake and the reward are the same token — the contract's balance mixes principal and rewards, so careless accounting can pay one staker's rewards out of another staker's deposit.",
      contribution:
        "Solo — both contracts, the Solidity and TypeScript test suites, the deployment modules, the verification, the setup script and the CI.",
      build:
        "SushiFlush is the simplest possible token: OpenZeppelin's ERC-20, a million SFLUSH minted to the deployer in the constructor, no mint function and no owner, so the supply is fixed for good. SushiFlushStaking implements the Synthetix StakingRewards accumulator: one global reward-per-token counter, and each account remembers its value at its last interaction, so what anyone has earned is a subtraction and every operation is O(1) however many stakers there are. The owner funds a period and rewards stream linearly across it, split by share of the pool. Both are deployed with Hardhat Ignition and verified on Etherscan, Blockscout and Sourcify.",
      decisions: [
        "No loops, ever. The accumulator makes rewards a constant-time calculation, so the contract can't be bricked by its own success.",
        "Principal is ring-fenced. totalStaked is tracked separately from the balance, so rewards can only come from tokens the owner deposited as rewards — never from another staker's deposit.",
        "Trust what arrived, not what was asked for. Deposits measure the balance change, effects come before interactions, and every state-changing function is nonReentrant.",
        "Test the maths in Solidity. Time-dependent rewards are tested in-EVM, where vm.warp can jump through a reward period; a fuzzed invariant checks the contract never owes more than it holds. The TypeScript suite covers the viem path the front end uses.",
        "The setup script is safe to rerun. It checks ownership and balance first, skips what's already done, checks every receipt's status — a reverted transaction is still mined and still costs gas — and pads gas estimates by 30%.",
      ],
      constraints: [
        "Testnet only, unaudited, by design",
        "Gas on every operation",
        "Immutable once deployed",
        "Stake and reward in the same token",
      ],
      outcome:
        "Both contracts are live and verified on Sepolia, with 33 tests, 100% line coverage on the token and 98.25% on the staking contract — the one uncovered line is a defensive guard the README explains. It's labelled honestly as a learning project, and the README reads like one worth learning from: why the accumulator, why the ring-fence, and why verification fails without the production build profile.",
    },
    ask: {
      did: "All of it, solo — the token, the staking contract, the Solidity and TypeScript tests, the deployment and verification on Sepolia, and the setup script. The dApp in front of it is his too.",
      hardest:
        "Paying rewards without a loop, and without touching anyone's principal. The Synthetix accumulator makes every operation constant-time, and tracking total staked apart from the balance means rewards can only come from the reward pool.",
      stack:
        "Solidity 0.8 on OpenZeppelin Contracts 5, Hardhat 3 with Ignition for deployment, Solidity tests with forge-std including fuzzing, and a TypeScript suite on viem. Verified on Etherscan, Blockscout and Sourcify.",
    },
    review: [
      "The test count and coverage figures are the README's. They'll drift if you add tests.",
      "\"View on Etherscan\" links the token contract, while the screenshot shows the staking contract's verified source — it's the more interesting of the two. Swap either if you'd rather they matched.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 07 · Crypto Galaxy                                                  */
  /* ------------------------------------------------------------------ */
  "crypto-galaxy": {
    slug: "crypto-galaxy",
    role: SOLO,
    glance: { label: "Status", value: "LIVE" },
    stack: [
      "Astro",
      "TypeScript",
      "Web Components",
      "Canvas 2D",
      "CoinGecko API",
      "GeckoTerminal",
      "Tailwind CSS",
      "Vercel",
    ],
    lede: "A live star map of the crypto markets. Every coin is a star — its orbit set by market-cap rank, its size by market cap, its colour by momentum — and behind the picture is a full implementation of every endpoint CoinGecko offers on its free plan.",
    sections: {
      context:
        "Crypto dashboards all look the same: a table sorted by market cap, a sparkline per row, and a lot of red and green. CoinGecko's free plan exposes far more than that table — exchanges, derivatives, NFTs, company treasuries, on-chain pools — and almost nothing shows it.",
      problem:
        "The free plan is generous with endpoints and stingy with calls: about 30 a minute, 10,000 a month, and only the last year of history. Ten thousand calls is roughly 330 a day, for a site with dozens of pages that each want several of them — so caching isn't an optimisation here, it's what keeps the site up. And the API key has to stay on the server while all of it is still interactive in the browser.",
      contribution:
        "Solo — the CoinGecko client, the caching layers, the server routes, the galaxy visual, the charts, the client-side tools and the deploy.",
      build:
        "Astro rendering on demand on Vercel, with vanilla Web Components for the interactive parts, so no UI framework runtime reaches the browser. All 61 free-plan endpoints are wrapped and reachable from the UI, from the coin pages and the time machine to the on-chain explorer. Browser code never talks to CoinGecko: custom elements call the site's own API routes, which go through a cached client that is the only place the key is read. The galaxy is hand-written Canvas 2D — around 8 kB with no dependencies — that pans, zooms, culls off-screen stars and pauses when the tab is hidden. Portfolio, watchlist, compare and converter all run in localStorage, with no accounts and nothing leaving the device.",
      decisions: [
        "Four layers of caching, in order: single-flight de-duplication of concurrent requests, a stale-while-revalidate cache that serves instantly and refreshes behind, CDN headers so many visitors in one window cost one upstream call, and graceful fallback to stale data on a 429 or a 5xx. Measured locally, 155 page reads cost 53 upstream calls.",
        "The key is a server-only secret. It's declared through astro:env and read in one file, and the build is grepped to prove it never reaches the client.",
        "Rebuild what the plan doesn't include. Top gainers and losers, a market pulse gauge and near-all-time-high rankings are derived from free market data — and the pulse is labelled as a heuristic, not a signal.",
        "Let the plan shape the interface. Charts stop at one year and the time machine is clamped to the last 365 days, because a \"Max\" button that can only ever fail shouldn't be there.",
        "A visual encoding, not decoration. Orbit radius is rank, size is market cap on a log scale, colour is 24-hour change and twinkle is volume — and under reduced motion the orbits freeze but the map stays fully usable.",
      ],
      constraints: [
        "A team of one",
        "About 330 API calls a day",
        "A year of history, at most",
        "A secret key behind an interactive front end",
      ],
      outcome:
        "It's live and open. It's the most data-heavy thing on this list and the one where the constraint did the designing: a rate limit turned into a caching architecture, a missing endpoint turned into a derived metric, and a capped history turned into an interface that only offers what it can deliver.",
    },
    ask: {
      did: "All of it, solo — the CoinGecko client and its caching, the server routes, the galaxy, the charts and tools, and the Vercel deploy.",
      hardest:
        "Running a site this size on 10,000 API calls a month. Four layers of caching — de-duplication, stale-while-revalidate, CDN headers and stale fallback on errors — are what let many visitors share one upstream call.",
      stack:
        "Astro with server rendering on Vercel, vanilla Web Components instead of a UI framework, hand-written Canvas 2D for the galaxy, lightweight-charts for price charts, Tailwind CSS 4, and CoinGecko and GeckoTerminal for the data.",
    },
    review: [
      "The endpoint count, the cache measurements and the plan limits are read off the README — CoinGecko changes its free plan from time to time, so check the numbers before you lean on them.",
      "\"Crypto\" as the category is my choice; \"Data viz\" would fit too.",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 08 · Weathernime                                                    */
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
  /* 09 · Food Analyzer                                                  */
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
  /* 10 · Happy Farm                                                     */
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
  /* 11 · Magloft                                                        */
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
  /* 12 · Magloft Web                                                    */
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
  /* 13 · MileApp                                                        */
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
  /* 14 · Bountie                                                        */
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
  /* 15 · DeskLab                                                        */
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
  /* 16 · Tola Web                                                       */
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
  /* 17 · Pokedex                                                        */
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
  /* 18 · Anivault                                                       */
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
  /* 19 · Mini-Google                                                    */
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
