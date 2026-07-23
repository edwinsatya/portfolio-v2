/**
 * The previous portfolio, still online.
 *
 * Three places offer it — the boot selector, NOVA's rotating lines, and the
 * terminal's `/v1` — so the URL and the beat before the redirect live here
 * rather than being written out three times.
 */
export const LEGACY_URL = "https://edwin.touchsimpledev.site";

/**
 * Long enough for "switching…" to be read as a sentence rather than a flash.
 *
 * The line is the whole feedback for the choice — there's no spinner and no
 * second screen — so leaving before it lands would make the click look ignored.
 */
export const SWITCH_DELAY_MS = 900;

/** Leaves for the classic build. Not a router push: it's a different site. */
export function goToLegacy() {
  window.location.href = LEGACY_URL;
}

/*
 * Whether NOVA still owes the visitor her one mention of the classic build.
 *
 * Module state rather than storage, deliberately: "once per session" here means
 * once per page session, and a reload is a fresh conversation. It also matches
 * how the build choice itself works — nothing about v1 is ever persisted, so a
 * visitor who looked at it once is not nudged towards it forever after.
 */
let hintShown = false;

export const classicHintPending = () => !hintShown;

export function markClassicHintShown() {
  hintShown = true;
}
