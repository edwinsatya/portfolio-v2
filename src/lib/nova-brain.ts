import {
  DEFAULT_SUGGESTIONS,
  NOVA_FALLBACK,
  novaIntents,
  type NovaAnswerContext,
  type NovaIntent,
} from "@/content/nova-qa";

export type NovaReply = {
  text: string;
  /** Section id to smooth-scroll to once the reply lands. */
  scrollTo?: string;
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

/** The keyword-matching brain. Swap for an API-backed one when ready. */
export const scriptedResponder: NovaResponder = async (question, context) => {
  const intent = matchIntent(question);

  if (!intent) {
    return { text: NOVA_FALLBACK, suggestions: DEFAULT_SUGGESTIONS };
  }

  return {
    text: intent.answer(context),
    scrollTo: intent.scrollTo,
    suggestions: intent.followUps ?? DEFAULT_SUGGESTIONS,
  };
};
