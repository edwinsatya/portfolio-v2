import {
  DEFAULT_SUGGESTIONS,
  NOVA_FALLBACK,
  novaIntents,
  type NovaAnswerContext,
  type NovaIntent,
} from "@/content/nova-qa";
import { workCards, type WorkCard } from "@/content/work";

export type NovaReply = {
  text: string;
  /** Scene to offer navigation to once the reply lands. */
  scene?: string;
  /** Project slug to offer an OPEN_[…] button for. */
  project?: string;
  /** Chips to offer next. */
  suggestions: string[];
};

/**
 * The one seam between NOVA's chat UI and whatever is answering.
 *
 * Async on purpose even though the scripted brain is instant: a route handler
 * calling an LLM satisfies this same signature, so switching to one means
 * writing a second responder and passing it to `useNovaChat` — no changes to the
 * panel, the history, the chips, or the scroll actions.
 */
export type NovaResponder = (
  question: string,
  context: NovaAnswerContext,
) => Promise<NovaReply>;

/** Lowercase, punctuation stripped, whitespace collapsed. */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Below this, NOVA admits she doesn't know rather than guessing. */
const MIN_SCORE = 3;

/**
 * Weighted keyword overlap. Longer keywords count for more, because matching
 * "availability" says far more about intent than matching "is", and phrases
 * count double since a whole phrase landing is rarely a coincidence.
 */
function scoreIntent(text: string, tokens: string[], intent: NovaIntent): number {
  let score = 0;

  for (const keyword of intent.keywords) {
    if (keyword.includes(" ")) {
      if (text.includes(keyword)) score += keyword.length * 2;
      continue;
    }

    if (tokens.includes(keyword)) {
      // A whole word matching is a strong signal regardless of how short the
      // word is — "cv" pins down the question as precisely as "curriculum"
      // does, so short keywords get a floor rather than their raw length.
      score += Math.max(keyword.length, MIN_SCORE + 1);
      continue;
    }

    // Prefix match covers plurals and inflections — "project" finds "projects"
    // — but only for keywords long enough not to collide by accident.
    if (keyword.length >= 4 && tokens.some((token) => token.startsWith(keyword))) {
      score += keyword.length;
    }
  }

  return score;
}

export function matchIntent(question: string): NovaIntent | null {
  const text = normalize(question);
  if (!text) return null;

  const tokens = text.split(" ");
  let best: NovaIntent | null = null;
  let bestScore = 0;

  for (const intent of novaIntents) {
    const score = scoreIntent(text, tokens, intent);
    // Strictly greater, so ties fall to whichever intent is listed first.
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  return bestScore >= MIN_SCORE ? best : null;
}

/* -------------------------------------------------------------------------- */
/* Projects — the palette half of the terminal                                 */
/* -------------------------------------------------------------------------- */

/**
 * Shortest token that may name a project.
 *
 * Three would let "app", "web" and "the" start hijacking questions that were
 * never about a project; four is the length at which a word is specific enough
 * to have been typed on purpose.
 */
const NAME_MIN = 4;
/** Below this, the guess isn't confident enough to answer with. */
const PROJECT_MIN_SCORE = 55;

/** Distance between two short strings, capped — this is only ever typo-sized. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * "Did they just type a project's name?"
 *
 * Deliberately conservative, because this runs *before* the intent matcher and
 * whatever it claims wins: a false positive turns "what's his tech stack?" into
 * a project card. So a hit needs a token of at least four characters that is the
 * name, starts the name, is started by it, or is one keystroke away from it —
 * which is what makes "weather", "maglot" and "pokedex" all land, while "best",
 * "work" and "built" go nowhere.
 *
 * Full names are also matched as a phrase, so "food analyzer" and "mini google"
 * beat their own individual tokens.
 */
export function matchProject(question: string): WorkCard | null {
  const text = normalize(question);
  if (!text) return null;

  const tokens = text.split(" ").filter((token) => token.length >= NAME_MIN);
  if (!tokens.length) return null;

  let best: WorkCard | null = null;
  let bestScore = 0;

  const consider = (card: WorkCard, score: number) => {
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  };

  for (const card of workCards) {
    const names = [
      normalize(card.name),
      card.slug.replace(/-/g, " "),
      ...(card.aliases ?? []).map(normalize),
    ];

    for (const name of names) {
      if (name.length < NAME_MIN) continue;
      // The whole name, said as a phrase. Strongest signal there is.
      if (text.includes(name)) consider(card, 90);

      const compact = name.replace(/\s+/g, "");
      for (const token of tokens) {
        if (token === compact) consider(card, 100);
        // A prefix, and the closer to the whole word the better: "weather"
        // beats "weat" for Weathernime, and neither is confused for anything.
        else if (compact.startsWith(token)) {
          consider(card, 80 - Math.min(20, compact.length - token.length));
        } else if (token.startsWith(compact)) consider(card, 70);
        else if (token.length >= 5 && editDistance(token, compact) <= 1) {
          consider(card, 60);
        }
      }
    }
  }

  return bestScore >= PROJECT_MIN_SCORE ? best : null;
}

/** Her one-liner about a project, and the button that opens it. */
export function projectReply(card: WorkCard): NovaReply {
  return {
    text: `${card.name} — ${card.blurb}`,
    project: card.slug,
    suggestions: PROJECT_FOLLOW_UPS,
  };
}

/** Offered after a project card: the two things people ask next. */
const PROJECT_FOLLOW_UPS = ["/projects", "which is his best?", "what's his tech stack?"];

/** The keyword-matching brain. Swap for an API-backed one when ready. */
export const scriptedResponder: NovaResponder = async (question, context) => {
  // Before the intents: someone typing a project name is searching, not asking,
  // and the answer they want is that project rather than a paragraph about the
  // work in general.
  const card = matchProject(question);
  if (card) return projectReply(card);

  const intent = matchIntent(question);

  if (!intent) {
    return { text: NOVA_FALLBACK, suggestions: DEFAULT_SUGGESTIONS };
  }

  return {
    text: intent.answer(context),
    scene: intent.scene,
    suggestions: intent.followUps ?? DEFAULT_SUGGESTIONS,
  };
};
