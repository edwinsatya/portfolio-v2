import {
  experience,
  greetings,
  profile,
  services,
  skillGroups,
} from "./profile";
import { workCards } from "./work";

/**
 * Everything NOVA can answer, as data.
 *
 * This file is deliberately logic-free: it is the knowledge, not the matcher.
 * `lib/nova-brain.ts` decides which entry wins, and swapping that for a call to
 * an LLM route later means replacing one function, not touching this file or any
 * of the chat UI.
 *
 * NOTE FOR EDWIN: these answers only state facts you gave me. Rates in
 * particular are deliberately vague — I don't know your numbers, so NOVA points
 * people at your inbox instead of inventing any.
 */

export type NovaAnswerContext = {
  /** The visitor's name, when NOVA has been told it. */
  name: string | null;
};

export type NovaIntent = {
  id: string;
  /**
   * Lowercase. Single words match a whole token or its prefix (so "project"
   * catches "projects"); anything containing a space is matched as a phrase
   * against the full question and counts double.
   */
  keywords: string[];
  answer: (context: NovaAnswerContext) => string;
  /** Scene to navigate to after answering. Renders as a NAVIGATE_TO button. */
  scene?: string;
  /**
   * Offers a COMPOSE_EMAIL button, prefilled with this subject.
   *
   * On the intents where the honest answer is "email him", the button is the
   * answer: a visitor who has just been told to send an email should not then
   * have to go and find the address.
   */
  compose?: string;
  /** Chips offered once this answer has been given. */
  followUps?: string[];
};

/** "Sure, Ada — " when NOVA knows who she's talking to, "Sure — " otherwise. */
function greet(name: string | null, withName: string, withoutName: string) {
  return name ? withName.replace("{name}", name) : withoutName;
}

/*
 * Both read from `work.ts`, not from `profile.ts`.
 *
 * The stage's WORK scene is the ten in `work.ts`, and the two cards badged
 * NOVA'S PICK are the ones a visitor can actually see her choosing. Deriving her
 * spoken answer from `profile.ts`'s longer `featured` list meant she named a
 * project that isn't on the scene at all (Anivault) and skipped both of the
 * ones wearing her badge — the site disagreeing with itself out loud.
 */
const projectCount = workCards.length;

/** "A and B" — read from the NOVA'S PICK badges rather than hard-coded. */
const picks = (() => {
  const names = workCards
    .filter((card) => card.badge?.toUpperCase().includes("PICK"))
    .map((card) => card.name);
  if (names.length <= 1) return names[0] ?? "coming soon";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
})();

/** The role flagged `current` in the experience list, if there is one. */
const currentRole = experience.find((role) => role.current);

const frontend = skillGroups[0].items.slice(0, 4).join(", ");
const backend = skillGroups[1].items.slice(0, 3).join(", ");

export const novaIntents: NovaIntent[] = [
  {
    id: "greeting",
    keywords: ["hi", "hey", "hello", "yo", "howdy", "good morning", "good evening"],
    answer: ({ name }) =>
      greet(
        name,
        "Hey {name}! What do you want to know about Edwin?",
        "Hey there! Ask me anything about Edwin — his work, his stack, or how to hire him.",
      ),
    followUps: ["Who is Edwin?", "What can he build?", "Is he available?"],
  },
  {
    id: "nova",
    keywords: ["who are you", "what are you", "your name", "about you", "robot"],
    answer: () =>
      "I'm NOVA. I live on this page and I know an unreasonable amount about Edwin. That's the whole job.",
    followUps: ["Who is Edwin?", "Show me his best work", "How do I contact him?"],
  },
  {
    id: "who",
    keywords: [
      "who is edwin",
      "about edwin",
      "about him",
      "who is he",
      "tell me about",
      "background",
      "bio",
      "story",
    ],
    answer: ({ name }) =>
      `${profile.bio}${
        name ? ` Short version, ${name}: he builds the whole thing, front to back.` : ""
      }`,
    scene: "about",
    followUps: ["What's his tech stack?", "Where has he worked?", "Is he available?"],
  },
  {
    id: "why-fullstack",
    keywords: [
      "why full stack",
      "why fullstack",
      "why full-stack",
      "full stack",
      "fullstack",
      "both halves",
      "front and back",
      "why both",
      "front to back",
    ],
    answer: ({ name }) =>
      greet(
        name,
        "Because he hates handing off, {name}. He likes owning the whole thing — the interface that feels right in your hand and the back end that holds when it matters. Fewer seams, fewer people to blame. Also: it's more fun.",
        "Because he hates handing off. He likes owning the whole thing — the interface that feels right in your hand and the back end that holds when it matters. Fewer seams, fewer people to blame. Also: it's more fun.",
      ),
    scene: "about",
    followUps: ["Who is Edwin?", "What's his tech stack?", "Is he open to work?"],
  },
  {
    id: "skills",
    keywords: [
      "skill",
      "stack",
      "tech",
      "technolog",
      "language",
      "framework",
      "tools",
      "what does he use",
      "code in",
    ],
    answer: () =>
      `Front end it's ${frontend}. Behind it, ${backend}. Databases: MongoDB, PostgreSQL, MySQL. Plus Git, Docker and AWS to hold it all together.`,
    scene: "work",
    followUps: ["Show me his best work", "What can he build?", "Where has he worked?"],
  },
  {
    id: "projects",
    keywords: [
      "project",
      "portfolio",
      "best work",
      // The WORK scene's chip is "which is his best?" — the phrase "best work"
      // never appears in it, and without this the chip hit the fallback.
      "best",
      "his work",
      "show me",
      "built",
      "shipped",
      "favourite",
      "favorite",
      "case study",
      "examples",
    ],
    // Count and picks both derived, so badging a card NOVA'S PICK in `work.ts`
    // moves her answer with it instead of leaving her naming last month's.
    answer: ({ name }) =>
      greet(
        name,
        `Happily, {name} — ${projectCount} of them. My picks are ${picks}.`,
        `${projectCount} of them, and my picks are ${picks}.`,
      ),
    scene: "work",
    followUps: ["What's his tech stack?", "Is he available?", "How do I contact him?"],
  },
  {
    // "What's he building right now?" is one of the terminal's fixed chips, so
    // it has to land on a real answer rather than the fallback.
    id: "current",
    keywords: [
      "right now",
      "building right now",
      "working on",
      "currently",
      "current",
      "these days",
      "at the moment",
      "latest",
      "nowadays",
    ],
    answer: ({ name }) =>
      currentRole
        ? `Right now he's ${currentRole.title} at ${currentRole.company}${
            currentRole.project ? ` on the ${currentRole.project}` : ""
          } — and shipping AI-powered web apps on the side.${
            name ? ` That's the short version, ${name}.` : ""
          }`
        : "He's focused on shipping AI-powered web apps at the moment.",
    scene: "work",
    followUps: ["Show me his best work", "What's his stack?", "Is he open to work?"],
  },
  {
    id: "experience",
    keywords: [
      "experience",
      "worked",
      "work history",
      "where has he worked",
      "career",
      "job",
      "company",
      "companies",
      "employ",
      "roles",
      "years",
      "team",
    ],
    answer: () =>
      "Six years across five teams: Tola Solution on the Happy Farm platform, Magloft, Bountie, homecare24.id, and a fiber-optic internship at Telkom Indonesia before any of it.",
    scene: "work",
    followUps: ["What's his tech stack?", "Show me his best work", "Is he available?"],
  },
  {
    id: "services",
    keywords: [
      "service",
      "can he build",
      "what can he",
      "what does he do",
      "offer",
      "help with",
      "work with him",
      "specialis",
      "specializ",
    ],
    // Titles kept verbatim — lower-casing them turns "AI Integration" into
    // "ai integration".
    answer: () =>
      `Three things: ${services
        .map((service) => service.title)
        .join(", ")}. Pick whichever sounds like your problem.`,
    scene: "contact",
    followUps: ["Is he available?", "Show me his best work", "How do I contact him?"],
  },
  {
    id: "availability",
    keywords: [
      "available",
      "availab",
      "hiring",
      "hire",
      "freelance",
      "open to",
      "looking for work",
      "rate",
      "rates",
      "price",
      "pricing",
      "cost",
      "budget",
      "how much",
      "quote",
    ],
    answer: ({ name }) =>
      greet(
        name,
        "Yes — he's taking on new projects and roles, and he usually replies inside 24 hours. Rates depend on the shape of the work, {name}, so email him and he'll give you a straight answer.",
        "Yes — he's taking on new projects and roles, and he usually replies inside 24 hours. Rates depend on the shape of the work, so email him and he'll give you a straight answer.",
      ),
    scene: "contact",
    compose: "Work with Edwin",
    followUps: ["How do I contact him?", "What can he build?", "Can I see his CV?"],
  },
  {
    id: "contact",
    keywords: [
      "contact",
      "email",
      "reach",
      "get in touch",
      "message",
      "talk to him",
      "linkedin",
      "github",
      "socials",
      "dm",
    ],
    answer: ({ name }) =>
      `Easiest is email: ${profile.email}. He's on GitHub and LinkedIn too, and all three are monitored.${
        name ? ` Tell him ${name} sent you.` : ""
      }`,
    scene: "contact",
    compose: "Hello Edwin",
    followUps: ["Is he available?", "Can I see his CV?", "Show me his best work"],
  },
  {
    id: "resume",
    keywords: ["resume", "cv", "curriculum", "download"],
    answer: () =>
      "Type /cv and I'll open it, or grab the Resume button up in the nav.",
    scene: "contact",
    followUps: ["Where has he worked?", "Is he available?", "How do I contact him?"],
  },
  {
    id: "location",
    keywords: [
      "where is he",
      "where does he live",
      "based",
      "located",
      "location",
      "country",
      "indonesia",
      "timezone",
      "time zone",
    ],
    answer: () =>
      `${profile.location} — that's UTC+7. He's worked with teams well outside it.`,
    followUps: ["Is he available?", "Where has he worked?", "How do I contact him?"],
  },
  {
    id: "thanks",
    keywords: ["thank", "thanks", "cheers", "appreciate", "nice one", "great"],
    answer: ({ name }) =>
      greet(name, "Any time, {name}.", "Any time. I'll be down here if you think of anything else."),
    followUps: ["Show me his best work", "Is he available?", "How do I contact him?"],
  },
];

/** Exact wording requested — shown whenever nothing scores highly enough. */
export const NOVA_FALLBACK =
  "I'm still a small robot — I only know Edwin stuff. Try asking about his projects, skills, or how to hire him.";

/** Offered on open, and again whenever NOVA doesn't understand. */
export const DEFAULT_SUGGESTIONS = [
  "Who is Edwin?",
  "Show me his best work",
  "Is he available?",
];

/** Everything NOVA says about the visitor themselves, in one place. */
export const greetingsFor = greetings;

/** The typewriter line in the hero, and the chips beneath it. */
export const HERO_LINE = `i'm nova — ${profile.firstName.toLowerCase()}'s ai. ask me anything about his work.`;

/**
 * Lines NOVA cycles through on top of the current scene's own line. Kept
 * scene-agnostic — they're true wherever the visitor happens to be.
 */
export const ROTATING_LINES = [
  "he ships full-stack — i just take the credit.",
  "ten projects in. ask me which one's the best.",
  "psst — he's open to new work right now.",
  // Funny before you've seen the light-switch gag, funnier after — and it works
  // either way round, which is why it's in the rotation rather than gated on it.
  "i don't touch the lights when you're away. promise.",
];

/**
 * Her one mention of the older portfolio.
 *
 * Kept out of `ROTATING_LINES` because it isn't one: the rotation repeats for
 * as long as the visitor stays, and a robot bringing up the previous build
 * every couple of minutes would read as her wanting them to leave. Shown once
 * per session, then dropped from the pool — see `lib/legacy.ts`.
 */
export const CLASSIC_BUILD_LINE =
  "there's also a classic me — type /v1 if you're curious.";

/**
 * What she says once the battery is under 20%.
 *
 * Replaces the rotation outright rather than joining it — a robot alternating
 * between "so sleepy" and a chirpy sales pitch for Edwin would undercut both.
 * She still keeps working, which is the point of the last one.
 */
export const LOW_POWER_LINES = [
  "running on fumes here...",
  "so sleepy... got a charger?",
  "battery low. i'll keep watch anyway.",
];

/**
 * The last five percent.
 *
 * Broken rather than merely tired — the ellipses and the stutter are doing the
 * work the animation can't, which is telling you she is about to stop rather
 * than that she is slow.
 */
export const CRITICAL_LINES = [
  "c-critical... power...",
  "can't... keep eyes open...",
  "systems... shutting... d—",
];

/* -------------------------------------------------------------------------- */
/* NOVA — being clicked to death                                               */
/* -------------------------------------------------------------------------- */

/**
 * What she says when the affection stops being affection.
 *
 * Three sets for the three stages past delighted, said through the speech
 * bubble rather than the tagline rotation: the rotation is ambient narration
 * about Edwin's work, and a line about the visitor's own behaviour has to come
 * from her, at her, in the moment. See `nova-temper.ts` for the arc.
 *
 * Deliberately light. She is exasperated, not wounded — the joke only works if
 * the visitor comes away having found a boundary, not having upset someone.
 */
export const ANNOYED_LINES = [
  "okay okay, that's a lot of love.",
  "personal space, friend.",
  "i felt that one. and the eight before it.",
];

/** Said on the way round, and to anyone who keeps poking a turned back. */
export const SULK_LINES = [
  "not talking to you right now.",
  "hmph.",
  "nope. still ignoring you.",
];

/** The thaw. One line, because it only ever gets said once per arc. */
export const FORGIVEN_LINE = "...fine. i missed you too.";

/* -------------------------------------------------------------------------- */
/* NOVA — alone with the light switch                                          */
/* -------------------------------------------------------------------------- */

/**
 * The three lines of the "anyone home?" gag.
 *
 * Fixed rather than pooled, unlike every other set in this file: it's a bit with
 * a beginning, a middle and a punchline, played at most once a session, so there
 * is no repetition for variants to relieve. Randomising the last line would only
 * make it a different joke each time nobody sees it twice anyway.
 *
 * All three are hers, at the visitor, which is why they go through the speech
 * bubble and not the rotation. The last one is the whole gag: she is not
 * apologising, she is establishing that nothing happened.
 */
export const LIGHTS_LINES = {
  /** Looking around, having noticed the silence. */
  wonder: "hello? still there?",
  /** The plan, arrived at. */
  scheme: "hm. maybe this'll wake them up.",
  /** Caught. */
  caught: "...you saw nothing.",
};

export const HERO_CHIPS = [
  "what has he built?",
  "is he available?",
  "show me his best work",
];

/**
 * The fixed question row inside the terminal. Always available, unlike the
 * old per-answer follow-ups — the visitor can reach any of them at any point.
 */
export const TERMINAL_CHIPS = [
  "Show me his best work",
  "What's he building right now?",
  "Is he open to work?",
  "How do I hire him?",
  "What's his stack?",
];

/** Asked in the chat on a first visit, in place of the old hero bubble. */
export const CHAT_NAME_ASK =
  "hey! i'm NOVA. before we start — what should I call you?";

export const CHAT_GREETING = (name: string | null) =>
  name
    ? `Hey ${name}! Ask me anything about Edwin.`
    : "Hey! I'm NOVA. Ask me anything about Edwin.";
