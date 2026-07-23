/**
 * How much affection NOVA will take before she's had enough.
 *
 * A store rather than component state, for the same reason `power.ts` is one:
 * four different things can like her — the `L` key, the counter, the tagline,
 * the robot herself — and they all route through `fireLike`, which is not a
 * React tree. The escalation has to live where that chokepoint can reach it.
 *
 * Deliberately in-memory only. A visitor who reloads gets a robot who has
 * forgotten the whole thing, which is the right amount of grudge for a
 * portfolio: the joke is worth finding once, not worth being punished for on
 * arrival tomorrow.
 *
 * The stages, and what each one takes away:
 *
 *   delighted  hearts, celebrations, the counter — everything, as before.
 *   annoyed    no hearts, no celebrations. The like still counts: she is
 *              exasperated, not withholding, and a counter that silently
 *              stopped moving would read as a bug rather than as a mood.
 *   mad        the turn, then `sulking`.
 *   sulking    nothing lands at all, counter included. This is the strike.
 *   thawing    one grace click, worth a double burst, and back to delighted.
 *
 * Only the like path is affected. The terminal, the scenes, the charger and
 * the music all work normally throughout — she is on strike about one thing.
 */

export type Temper =
  | "delighted"
  | "annoyed"
  | "mad"
  | "sulking"
  | "thawing";

/** Clicks inside `WINDOW_MS` that tip her from delighted into exasperated. */
const ANNOYED_AT = 9;
/** And from exasperated into turning her back. */
const MAD_AT = 15;

/**
 * How long a click stays on the tally.
 *
 * The counter is a rolling window rather than a total, which is what makes the
 * "stop clicking for ten seconds and she forgets" rule fall out for free: at
 * one click every ten seconds the window never holds more than one, so a
 * visitor who is simply enjoying the hearts can never reach stage two. It takes
 * genuine spam, which is the only thing worth having a boundary about.
 */
const WINDOW_MS = 10000;

/** The strike, randomised so a second run isn't a rerun of the first. */
const SULK_MIN_MS = 20000;
const SULK_MAX_MS = 30000;

/**
 * How long the thaw stays open.
 *
 * Generous, because it exists to be spent: the double burst is the payoff for
 * the whole arc, and a visitor who wandered off mid-sulk should still get it
 * when they come back rather than finding a robot who has quietly reset.
 */
const THAW_MS = 60000;

/** What a single like is allowed to do, decided at the chokepoint. */
export type Affection = {
  /** Hearts fly. */
  hearts: boolean;
  /** It counts towards the public total. */
  counts: boolean;
  /** She reacts with a move. */
  celebrate: boolean;
  /** Hearts per burst, multiplied. Two only for the forgiveness burst. */
  burst: number;
};

const NOTHING: Affection = {
  hearts: false,
  counts: false,
  celebrate: false,
  burst: 1,
};

let temper: Temper = "delighted";
/** Timestamps of every click still inside the window. */
let recent: number[] = [];
/** When the sulk is served, and when the thaw expires. Both `performance.now`. */
let until = 0;
/** When she turned. Only the backstop in `settle` reads it. */
let madAt = 0;

/**
 * How long `mad` is allowed to last before the store moves her on by itself.
 *
 * `mad` is a single beat — the trigger for the turn — and the stage normally
 * calls `beginSulk` the moment the turn lands. This is the backstop for it
 * never arriving: if the stage unmounted mid-turn, an arc stuck in `mad` would
 * leave every like refused for the rest of the session with no way out. Well
 * clear of the turn's own length, so the normal path always wins the race.
 */
const MAD_GRACE_MS = 2000;

type TemperListener = (next: Temper) => void;
const changeListeners = new Set<TemperListener>();

function setTemper(next: Temper): void {
  if (temper === next) return;
  temper = next;
  changeListeners.forEach((listener) => listener(next));
}

/**
 * Advance the clock.
 *
 * Deliberately *not* called from the snapshot getter, tempting as that is: a
 * getter that mutates and notifies runs during render, and React is right to
 * object. It is driven from the two places a change can legitimately originate
 * — a click, and the clock below.
 */
function settle(now: number): void {
  recent = recent.filter((at) => now - at < WINDOW_MS);

  if (temper === "sulking" && now >= until) {
    // Served. The thaw is its own stage rather than a return to normal, so the
    // first click after it can be worth double — see `registerLike`.
    until = now + THAW_MS;
    recent = [];
    setTemper("thawing");
    return;
  }

  if (temper === "thawing" && now >= until) {
    setTemper("delighted");
    return;
  }

  if (temper === "mad" && now - madAt > MAD_GRACE_MS) {
    setTemper("sulking");
    return;
  }

  /* Stage two decays by being left alone: once the window has emptied there's
     nothing left to have been annoyed about, which is the ten-second reset.
     `mad` is excluded on purpose — it's a doorway into the sulk, and the sulk
     is served on its own clock rather than on the visitor's patience. */
  if (temper === "annoyed" && recent.length === 0) setTemper("delighted");
}

/**
 * A like happened. Returns what it's allowed to do.
 *
 * The single place the arc advances, so the four things that can like her can't
 * disagree about which stage she's in.
 */
export function registerLike(now = performance.now()): Affection {
  settle(now);

  switch (temper) {
    case "sulking":
      // Not talking to you right now. The glance is a pose, not a reward, and
      // it's the caller's business — see `useNovaStage`.
      return NOTHING;

    case "thawing":
      // "...fine. i missed you too." Spent immediately: a second double burst
      // would make the apology a mechanic rather than a moment.
      setTemper("delighted");
      recent = [now];
      return { hearts: true, counts: true, celebrate: true, burst: 2 };

    default:
      break;
  }

  recent.push(now);

  if (recent.length >= MAD_AT) {
    until = now + SULK_MIN_MS + Math.random() * (SULK_MAX_MS - SULK_MIN_MS);
    madAt = now;
    setTemper("mad");
    // The click that tips her over is the last one that does nothing but tip
    // her over. No hearts for it — the turn is the answer.
    return NOTHING;
  }

  if (recent.length >= ANNOYED_AT) {
    setTemper("annoyed");
    return { hearts: false, counts: true, celebrate: false, burst: 1 };
  }

  setTemper("delighted");
  return { hearts: true, counts: true, celebrate: true, burst: 1 };
}

/**
 * `mad` is a single frame of state — the trigger for the turn — and the caller
 * moves her into the sulk once the turn has actually played, so the pose and
 * the store can't disagree about whether she has finished turning round.
 */
export function beginSulk(): void {
  if (temper === "mad") setTemper("sulking");
}

/**
 * Fires the moment she changes her mind about you.
 *
 * An edge rather than a store, because nothing renders from this: the stage
 * loop changes pose on it and reads the current value straight off `getTemper`
 * each frame, and the bubble says a line on it. A `useSyncExternalStore` trio
 * would be exports nobody calls.
 */
export function onTemperChange(listener: TemperListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function getTemper(): Temper {
  return temper;
}

/**
 * Drives the recovery without anything having to poll it.
 *
 * A sulk has to end on its own: nothing else is guaranteed to happen at the
 * twenty-second mark, and a visitor who has stopped clicking — which is exactly
 * what she wanted — would otherwise sit in front of a robot waiting for them to
 * click again to be forgiven. Half a second is far finer than the tens of
 * seconds anything here turns on; the interval is an array filter.
 *
 * Started by the stage, alongside the power clock and for the same reason: it's
 * an effect on the whole app, not on whoever happens to read the store.
 */
export function startTemperClock(): () => void {
  const id = window.setInterval(() => settle(performance.now()), 500);
  return () => window.clearInterval(id);
}

/**
 * Wipes the grudge.
 *
 * Called when the visitor asks to be forgotten: she is meeting a stranger, and
 * carrying on a sulk about what the last one did with the mouse would be the
 * one thing a wiped memory shouldn't remember.
 */
export function resetTemper(): void {
  recent = [];
  until = 0;
  setTemper("delighted");
}
