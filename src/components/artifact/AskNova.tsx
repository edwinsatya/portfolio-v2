"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Nova } from "@/components/nova/Nova";
import { caseStudyFor } from "@/content/case-studies";
import { workBySlug } from "@/content/work";
import { scriptedResponder } from "@/lib/nova-brain";

/**
 * ASK NOVA, scoped to one project.
 *
 * The stage's terminal answers about Edwin in general; this answers about the
 * thing you are currently reading. The three chips are the three questions
 * everyone actually has, and their answers are written per project in
 * `case-studies.ts` — a real answer about *this* build rather than the general
 * matcher's best guess.
 *
 * Anything typed goes to the same brain the terminal uses, so the fallback is
 * never a dead end: ask about the stack, the rates, or another project entirely
 * and she still answers, and a question that names another project comes back
 * with a link to it.
 *
 * No terminal chrome. This is a card in a sidebar on a reading page — the
 * window, the traffic lights and the prompt line would be a costume.
 */

/** The three, in the order they get asked in real life. */
const CHIPS = [
  { id: "did", label: "What did he actually do here?" },
  { id: "hardest", label: "What was the hardest part?" },
  { id: "stack", label: "What's the stack?" },
] as const;

type Exchange = {
  id: number;
  question: string;
  answer: string;
  /** A project she named that isn't this one — offered as a link. */
  link?: { slug: string; name: string };
};

let nextId = 0;

export function AskNova({ slug, index }: { slug: string; index: number }) {
  const study = caseStudyFor(slug);
  const card = workBySlug(slug);
  const [log, setLog] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const busy = useRef(false);

  const push = useCallback((entry: Omit<Exchange, "id">) => {
    setLog((current) => [...current, { id: nextId++, ...entry }]);
  }, []);

  /** A chip: the scripted answer for this project, no round trip. */
  const askScripted = useCallback(
    (chip: (typeof CHIPS)[number]) => {
      if (busy.current) return;
      const answer = study?.ask[chip.id];
      push({
        question: chip.label,
        answer:
          answer ??
          // No case study yet, so she says what she does know rather than
          // pretending — the card blurb is hers to quote.
          `I haven't been briefed on the details of ${card?.name ?? "this one"} yet. What I can tell you: ${card?.blurb ?? ""}`,
      });
    },
    [study, card, push],
  );

  /** Anything typed. Same responder as the terminal. */
  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || busy.current) return;
      busy.current = true;
      setDraft("");
      setThinking(true);

      void (async () => {
        try {
          const reply = await scriptedResponder(question, { name: null });
          const named =
            reply.project && reply.project !== slug
              ? workBySlug(reply.project)
              : undefined;
          push({
            question,
            answer: reply.text,
            link: named ? { slug: named.slug, name: named.name } : undefined,
          });
        } finally {
          setThinking(false);
          busy.current = false;
        }
      })();
    },
    [push, slug],
  );

  return (
    <section
      className="artifact-card artifact-ask"
      data-reveal
      style={{ "--i": index } as React.CSSProperties}
    >
      <h2 className="mono-label artifact-card-head">
        <i className="artifact-ask-live" aria-hidden />
        Ask NOVA
      </h2>

      <div className="artifact-ask-intro">
        <span className="artifact-ask-avatar" aria-hidden>
          <Nova mood="warm" />
        </span>
        <p>
          Curious about this project or Edwin&apos;s role in it? Ask away.
        </p>
      </div>

      {log.length > 0 && (
        <ol className="artifact-ask-log">
          {log.map((entry) => (
            <li key={entry.id}>
              <p className="artifact-ask-q">{entry.question}</p>
              <p className="artifact-ask-a">{entry.answer}</p>
              {entry.link && (
                <Link
                  className="artifact-ask-link"
                  href={`/work/${entry.link.slug}`}
                >
                  Open {entry.link.name} <span aria-hidden>→</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}

      {thinking && (
        <p className="artifact-ask-thinking mono-label" role="status">
          thinking<span aria-hidden>…</span>
        </p>
      )}

      <ul className="artifact-ask-chips">
        {CHIPS.map((chip) => (
          <li key={chip.id}>
            <button type="button" onClick={() => askScripted(chip)}>
              {chip.label}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="artifact-ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <span className="artifact-ask-prompt" aria-hidden>
          $
        </span>
        <input
          className="artifact-ask-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="ask anything…"
          aria-label={`Ask NOVA about ${card?.name ?? "this project"}`}
          autoComplete="off"
        />
        <button
          type="submit"
          className="artifact-ask-send"
          aria-label="Send"
          disabled={!draft.trim()}
        >
          <span aria-hidden>↑</span>
        </button>
      </form>
    </section>
  );
}
