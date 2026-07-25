import { profile } from "./profile";

/**
 * The CONTACT scene's content — where to find him, what he's good for, and the
 * three things a visitor is usually here to say.
 *
 * Everything routes to the same inbox in the end. The intents exist because
 * "email him" is a worse instruction than a button that has already written the
 * subject line: the three below are the three reasons anyone opens this page,
 * and each one hands the terminal a question NOVA has a real answer for.
 */

export type ContactLink = {
  id: string;
  label: string;
  /** The address itself, printed under the label. */
  detail: string;
  href: string;
  /** Which glyph `ContactScene` draws. */
  icon: "mail" | "github" | "linkedin" | "file";
  /** `mailto:` and the CV open differently from an external profile. */
  external?: boolean;
};

export const contactLinks: ContactLink[] = [
  {
    id: "email",
    label: "Email",
    detail: profile.email,
    href: `mailto:${profile.email}`,
    icon: "mail",
  },
  {
    id: "github",
    label: "GitHub",
    detail: "github.com/edwinsatya",
    href: profile.links.github,
    icon: "github",
    external: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    detail: "linkedin.com/in/edwin-satya-yudistira",
    href: profile.links.linkedin,
    icon: "linkedin",
    external: true,
  },
  {
    id: "resume",
    label: "Resume",
    detail: "Download CV",
    href: profile.links.resume,
    icon: "file",
    external: true,
  },
];

/** The identity card's mini-list. Two letters and a line each. */
export const goodFor = [
  { key: "FE", text: "Front-end with React, Next.js, Vue" },
  { key: "FS", text: "Full-stack apps, database to deploy" },
  { key: "AI", text: "AI-integrated product features" },
] as const;

export const whereLine = "Lumajang, Indonesia · working remotely / GMT+7";

/* -------------------------------------------------------------------------- */
/* Intents                                                                     */
/* -------------------------------------------------------------------------- */

export type ContactIntent = {
  id: string;
  title: string;
  subtitle: string;
  icon: "case" | "spark" | "chat";
  /**
   * What gets typed into the terminal on the visitor's behalf.
   *
   * Phrased as something a person would actually type, because it appears in
   * the transcript as *their* line — and it has to be a question the matcher
   * already answers, so the intents are worded to land on the availability and
   * contact entries in `nova-qa.ts` rather than needing their own.
   */
  says: string;
};

export const contactIntents: ContactIntent[] = [
  {
    id: "hiring",
    title: "Hiring",
    subtitle: "Full-time or contract role",
    icon: "case",
    says: "i'm hiring — is he open to work?",
  },
  {
    id: "project",
    title: "A project",
    subtitle: "Freelance — build or ship something",
    icon: "spark",
    says: "i have a freelance project for him",
  },
  {
    id: "hi",
    title: "Just say hi",
    subtitle: "Anything else on your mind",
    icon: "chat",
    says: "how do i contact him?",
  },
];

/* -------------------------------------------------------------------------- */
/* Local time                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Edwin's wall clock, for the availability strip.
 *
 * Formatted in his timezone rather than the visitor's, because the point of the
 * line is "here is what time it is where he is" — a recruiter in London seeing
 * 04:00 WIB knows not to expect an instant reply, which is a more honest signal
 * than "replies in 24 hours" on its own.
 */
export const NOVA_TZ = "Asia/Jakarta";

export function localTime(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NOVA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}
