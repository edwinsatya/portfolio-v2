import type { NovaMood } from "./profile";

/**
 * The stage's scenes.
 *
 * Each is a real route, so URLs, the back button, and direct links all work
 * without anything custom — but they share one layout, which is what keeps NOVA
 * mounted and mid-blink across a scene change instead of remounting her.
 *
 * `line` and `chips` drive the bottom-left block; `mood` drives NOVA's face.
 * These replace the old scroll-triggered reactions.
 */
export type SceneId = "home" | "work" | "about" | "contact";

export type Scene = {
  id: SceneId;
  /** Route path. `home` is the index. */
  href: string;
  label: string;
  mood: NovaMood;
  /** Typed out bottom-left when the scene opens. */
  line: string;
  /** Shown under the line. Three, to fit one row on desktop. */
  chips: string[];
};

export const scenes: Scene[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    mood: "greeting",
    line: "i'm nova — edwin's ai. ask me anything about his work.",
    chips: ["what has he built?", "is he available?", "show me his best work"],
  },
  {
    id: "work",
    href: "/work",
    label: "Work",
    mood: "excited",
    line: "eleven shipped projects, the stack behind them, and where it all happened.",
    chips: ["what's his tech stack?", "show me his best work", "where has he worked?"],
  },
  {
    id: "about",
    href: "/about",
    label: "About",
    mood: "warm",
    line: "small town, big web. here's the human i work for.",
    chips: ["who is edwin?", "where is he based?", "is he available?"],
  },
  {
    id: "contact",
    href: "/contact",
    label: "Contact",
    mood: "waving",
    line: "he usually replies within 24 hours. go on, say hi.",
    chips: ["how do i contact him?", "is he available?", "can i see his cv?"],
  },
];

export const sceneById = (id: SceneId): Scene =>
  scenes.find((scene) => scene.id === id) ?? scenes[0];

/** Maps the App Router segment to a scene. `null` is the index route. */
export function sceneFromSegment(segment: string | null): Scene {
  if (!segment) return scenes[0];
  return scenes.find((scene) => scene.id === segment) ?? scenes[0];
}
