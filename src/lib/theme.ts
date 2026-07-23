/**
 * The site's light/dark theme.
 *
 * Two values, deliberately separate:
 *
 *   `chosen`    — what the visitor asked for, persisted. Only `/dark-mode` and
 *                 `/light-mode` ever change it.
 *   `effective` — what's actually painted. Equal to `chosen` except when the
 *                 battery is low, which forces dark the way a phone's battery
 *                 saver does.
 *
 * Keeping them apart is what makes the rule in the spec fall out for free:
 * charging back up lifts the *forcing*, so a visitor who chose dark stays dark
 * and one who chose light returns to light, with nobody storing a "theme before
 * the battery died" to restore.
 */

import { getPower, subscribePower } from "./power";

const STORAGE_KEY = "nova.theme.v1";

export type Theme = "light" | "dark";

/** Length of the crossfade between themes. Mirrored in `globals.css`. */
export const THEME_MS = 400;

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

function readStored(): Theme | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "dark" || raw === "light" ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Blocked storage just means the choice doesn't survive the tab.
  }
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

let chosen: Theme = "light";
let loaded = false;

/**
 * How hard the battery is dimming the page.
 *
 * Three steps rather than one boolean, because the low-power states aren't
 * degrees of the same thing: `saver` is a phone in battery saver, `critical` is
 * a phone at 1% with the panel turned down, and `dead` is a screen with nothing
 * left to light it. Each is a token block in `globals.css`.
 */
type Tone = "none" | "saver" | "critical" | "dead";

type Snapshot = { chosen: Theme; effective: Theme; saver: boolean; tone: Tone };

let snapshot: Snapshot = {
  chosen: "light",
  effective: "light",
  saver: false,
  tone: "none",
};

const listeners = new Set<() => void>();

/** Low battery forces dark and dims it, unless she's plugged in and recovering. */
function toneFor(): Tone {
  switch (getPower().state) {
    case "dead":
      return "dead";
    case "critical":
      return "critical";
    case "low":
      return "saver";
    default:
      return "none";
  }
}

function compute(): Snapshot {
  const tone = toneFor();
  const saver = tone !== "none";
  return { chosen, effective: saver ? "dark" : chosen, saver, tone };
}

/**
 * Writes the theme onto `<html>`.
 *
 * Two attributes rather than one: `data-theme` picks the palette, `data-power`
 * layers the battery dimming on top. A manually chosen dark theme is therefore
 * full-contrast dark, and a forced one is one of the dimmed variants — which is
 * exactly the difference the spec draws.
 *
 * `data-power` is also what the feature locks key off at `dead`, so a single
 * attribute carries both the palette and the fact that nothing is clickable.
 */
function apply(next: Snapshot): void {
  const root = document.documentElement;
  root.dataset.theme = next.effective;
  if (next.saver) root.dataset.power = next.tone;
  else delete root.dataset.power;

  // Address bar and form controls follow the page.
  root.style.colorScheme = next.effective;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next.effective === "dark" ? "#0a0b10" : "#ecedf4");
}

function emit(animate: boolean): void {
  const next = compute();
  if (
    snapshot.chosen === next.chosen &&
    snapshot.effective === next.effective &&
    snapshot.tone === next.tone
  ) {
    return;
  }

  const changed =
    snapshot.effective !== next.effective || snapshot.tone !== next.tone;
  snapshot = next;

  if (changed) {
    if (animate) runTransition();
    apply(next);
  }

  listeners.forEach((listener) => listener());
}

/**
 * Lets every colour on the page cross-fade for one beat.
 *
 * A blunt `*` rule with `!important`, deliberately: the alternative is adding a
 * colour transition to a hundred selectors that don't otherwise want one, and
 * this only exists for the 400ms the swap takes. Skipped entirely under reduced
 * motion — there the theme snaps, which is the right answer there anyway.
 */
let transitionTimer = 0;

function runTransition(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.documentElement;
  root.dataset.themeShift = "true";
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => {
    delete root.dataset.themeShift;
  }, THEME_MS + 60);
}

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  chosen = readStored() ?? "light";
  snapshot = compute();
  apply(snapshot);

  // The battery can force dark on its own, so the theme has to follow it.
  subscribePower(() => emit(true));
}

/**
 * Wakes the theme store up.
 *
 * Everything else here is lazy, initialising on the first read — but nothing
 * *reads* the theme during a normal visit. The theme is applied by writing an
 * attribute onto `<html>`, so components pick it up through the cascade rather
 * than by subscribing, and `setTheme` only runs if the visitor types a command.
 * Without this call the store would sit dormant, and with it the subscription to
 * the battery that forces dark at 20% — which is precisely the case where
 * nobody has typed anything.
 */
export function initTheme(): void {
  load();
}

export function subscribeTheme(listener: () => void): () => void {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTheme(): Snapshot {
  load();
  return snapshot;
}

/* Hoisted for the same reason as `SERVER_POWER`: a server snapshot is compared
   by identity, so a fresh object every render loops forever. */
const SERVER_THEME: Snapshot = {
  chosen: "light",
  effective: "light",
  saver: false,
  tone: "none",
};

/** The server always renders light; the head script corrects it before paint. */
export function getServerTheme(): Snapshot {
  return SERVER_THEME;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Result of a theme command, so the terminal can print the right line.
 * `refused` is the low-battery case: she hasn't the power to light back up.
 */
export type ThemeResult = "changed" | "already" | "refused";

export function setTheme(next: Theme): ThemeResult {
  load();

  // Going *back* to light while running on fumes is the one refusal. Choosing
  // dark is always allowed — it costs her nothing.
  if (next === "light" && toneFor() !== "none") return "refused";

  const was = chosen;
  chosen = next;
  writeStored(next);
  emit(true);
  return was === next ? "already" : "changed";
}

export function getChosenTheme(): Theme {
  load();
  return chosen;
}

/**
 * The blocking script in `<head>`.
 *
 * Runs before first paint so a returning dark-theme visitor never sees a white
 * flash. It only has to consider the chosen theme: the battery is floored at
 * 60% on load, so a page can never *open* in battery saver — that only ever
 * arrives later, with a transition, once the store is running.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
var e=t==="dark"?"dark":"light";
var r=document.documentElement;
r.dataset.theme=e;r.style.colorScheme=e;
}catch(e){}})();`;
