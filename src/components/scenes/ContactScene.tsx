"use client";

import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import { SceneShell } from "@/components/stage/SceneShell";
import { Nova } from "@/components/nova/Nova";
import {
  contactIntents,
  contactLinks,
  goodFor,
  localTime,
  whereLine,
  type ContactLink,
} from "@/content/contact";
import { profile } from "@/content/profile";
import { askNova, celebrate, getBootComplete } from "@/lib/nova-bus";
import "./contact.css";

/**
 * CONTACT — the one scene with a job.
 *
 * Everything else on this site is Edwin showing his work; this is the page where
 * a visitor decides to do something about it, so it is laid out as three cards
 * around one action: where to find him, who he is, and a way to start talking
 * without leaving the page.
 *
 * The message card is deliberately *not* a second chat. It hands its intents to
 * the terminal — the same window, the same brain, the same transcript — because
 * two conversational UIs on one site is one too many, and the terminal already
 * knows how to route someone to an email.
 */

/* -------------------------------------------------------------------------- */
/* The clock                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Edwin's local time, ticking.
 *
 * Through `useSyncExternalStore` rather than an interval writing state: the
 * server has no business guessing what time it is in Lumajang, and this is the
 * shape React wants for a value it can't render on the server. The snapshot is
 * a string, so an unchanged minute compares equal and nothing re-renders.
 */
const subscribeClock = (onChange: () => void) => {
  const id = window.setInterval(onChange, 20_000);
  return () => window.clearInterval(id);
};
const clockSnapshot = () => localTime();
/** The server can't know, so it says nothing and the client fills it in. */
const clockServerSnapshot = () => "";

export function ContactScene() {
  const time = useSyncExternalStore(
    subscribeClock,
    clockSnapshot,
    clockServerSnapshot,
  );

  /*
   * A wave on arrival — but only when navigating *in*. On a direct load the
   * boot sequence's own greeting covers it, and two waves in a row read as a
   * tic. Same guard as ABOUT, for the same reason.
   */
  useEffect(() => {
    if (!getBootComplete()) return;
    const timer = window.setTimeout(() => celebrate("wave"), 520);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <SceneShell side="full" flow="page">
      <div className="contact">
        <header className="contact-lede">
          <p className="contact-crumb" data-reveal style={cssIndex(0)}>
            04 / CONTACT
          </p>
          {/* Phones only — on desktop the breadcrumb and the intro are enough. */}
          <h1 className="contact-title" data-reveal style={cssIndex(1)}>
            Let&apos;s talk
          </h1>
          <p className="contact-intro" data-reveal style={cssIndex(1)}>
            Open to full-time roles and freelance projects — tell me what
            you&apos;re building, and you&apos;ll hear back{" "}
            <b>within ~24 hours</b>.
          </p>
        </header>

        <div className="contact-cols">
          {/* The two left cards travel together: one grid item, so a short
              viewport scrolls them as a pair rather than clipping the second
              one where it happens to run out of room. */}
          <div className="contact-left">
          {/* ---------------------------------------------------------- */}
          {/* Find me                                                     */}
          {/* ---------------------------------------------------------- */}
          <section className="contact-card contact-find" data-reveal style={cssIndex(2)}>
            <h2 className="mono-label contact-card-head">Find me</h2>
            <ul className="contact-links">
              {contactLinks.map((link) => (
                <li key={link.id}>
                  <a
                    className="contact-link"
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    onClick={() => {
                      // Mail is the action this whole page is for. She notices.
                      if (link.icon === "mail") celebrate("hop");
                    }}
                  >
                    <span className="contact-link-icon" aria-hidden>
                      <LinkIcon icon={link.icon} />
                    </span>
                    <span className="contact-link-text">
                      <span className="contact-link-label">{link.label}</span>
                      <span className="contact-link-detail">{link.detail}</span>
                    </span>
                    <span className="contact-link-go" aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Who he is, and whether he's free                            */}
          {/* ---------------------------------------------------------- */}
          <section className="contact-card contact-who" data-reveal style={cssIndex(3)}>
            <div className="contact-who-head">
              <Image
                className="contact-photo"
                src="/profiles/edwin.jpg"
                alt=""
                width={96}
                height={96}
              />
              <div>
                <p className="contact-who-name">{profile.name}</p>
                <p className="mono-label contact-who-role">
                  {profile.role} · Lumajang, ID
                </p>
              </div>
            </div>

            <p className="contact-status">
              <i aria-hidden />
              <span className="contact-status-text">Open to work</span>
              {/* Empty until hydration, so the server never guesses the hour. */}
              <span className="contact-status-time mono-label">
                {time ? `${time} WIB` : ""}
              </span>
            </p>

            <h3 className="mono-label contact-sub-head">What I&apos;m good for</h3>
            <ul className="contact-good">
              {goodFor.map((item) => (
                <li key={item.key}>
                  <span className="mono-label contact-good-key">{item.key}</span>
                  {item.text}
                </li>
              ))}
            </ul>

            <p className="contact-where">
              <span className="mono-label contact-good-key">Where</span>
              {whereLine}
            </p>
          </section>
          </div>

          {/* The middle column is NOVA's — she's drawn on the fixed stage
              layer, and this is the space kept clear for her. */}
          <div className="contact-gap" aria-hidden />

          {/* ---------------------------------------------------------- */}
          {/* Message NOVA                                                */}
          {/* ---------------------------------------------------------- */}
          <section
            className="contact-card contact-msg"
            data-reveal
            style={cssIndex(4)}
          >
            <header className="contact-msg-head">
              <span className="contact-msg-avatar" aria-hidden>
                <Nova mood="greeting" />
              </span>
              <span>
                <span className="contact-msg-title">Message NOVA</span>
                <span className="mono-label contact-msg-sub">
                  Edwin&apos;s assistant · replies routed to him
                </span>
              </span>
            </header>

            <p className="contact-bubble">
              Hey — I&apos;m NOVA, Edwin&apos;s assistant. What brings you here?
            </p>

            <ul className="contact-intents">
              {contactIntents.map((intent) => (
                <li key={intent.id}>
                  <button
                    type="button"
                    className="contact-intent"
                    /* Straight into the terminal. `askNova` opens it and asks
                       on the visitor's behalf, so the answer arrives in the
                       one place the site keeps its conversation. */
                    onClick={() => askNova(intent.says)}
                  >
                    <span className="contact-intent-icon" aria-hidden>
                      <IntentIcon icon={intent.icon} />
                    </span>
                    <span className="contact-intent-text">
                      <span className="contact-intent-title">{intent.title}</span>
                      <span className="mono-label contact-intent-sub">
                        {intent.subtitle}
                      </span>
                    </span>
                    <span className="contact-intent-go" aria-hidden>
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </SceneShell>
  );
}

/** Inline custom property that staggers the reveal transition per element. */
function cssIndex(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Glyphs                                                                      */
/*                                                                             */
/* Drawn here rather than pulled from `ui/Icons` because these four are only    */
/* ever used on this scene, at one size, and a shared icon set that grows by    */
/* one entry per page stops being shared and starts being a junk drawer.        */
/* -------------------------------------------------------------------------- */

function LinkIcon({ icon }: { icon: ContactLink["icon"] }) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "mail") {
    return (
      <svg {...common}>
        <rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6" />
        <path d="M2.4 4.6 8 8.8l5.6-4.2" />
      </svg>
    );
  }

  if (icon === "github") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 .8a7.2 7.2 0 0 0-2.28 14c.36.07.49-.15.49-.34v-1.2c-2 .44-2.43-.97-2.43-.97-.33-.83-.8-1.06-.8-1.06-.66-.45.05-.44.05-.44.73.05 1.11.75 1.11.75.65 1.11 1.7.79 2.11.6.07-.47.25-.79.46-.97-1.6-.18-3.28-.8-3.28-3.56 0-.79.28-1.43.74-1.93-.07-.19-.32-.92.07-1.91 0 0 .6-.2 1.98.73a6.9 6.9 0 0 1 3.6 0c1.37-.93 1.97-.73 1.97-.73.4.99.15 1.72.07 1.9.46.51.74 1.15.74 1.94 0 2.77-1.68 3.38-3.29 3.56.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.34A7.2 7.2 0 0 0 8 .8Z" />
      </svg>
    );
  }

  if (icon === "linkedin") {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.2 5.9h2.2v7.4H3.2V5.9Zm1.1-3.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM7 5.9h2.1v1h.03c.3-.55 1.02-1.14 2.1-1.14 2.25 0 2.67 1.42 2.67 3.27v4.27h-2.2V9.47c0-.8-.02-1.83-1.14-1.83-1.14 0-1.31.86-1.31 1.77v3.89H7V5.9Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M9.2 1.8H4.6a1.4 1.4 0 0 0-1.4 1.4v9.6a1.4 1.4 0 0 0 1.4 1.4h6.8a1.4 1.4 0 0 0 1.4-1.4V5.4L9.2 1.8Z" />
      <path d="M9 2v3.4h3.6M6 11.4 8 13l2-1.6M8 8v5" />
    </svg>
  );
}

function IntentIcon({ icon }: { icon: "case" | "spark" | "chat" }) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "case") {
    return (
      <svg {...common}>
        <rect x="1.8" y="4.8" width="12.4" height="8.4" rx="1.6" />
        <path d="M5.6 4.8V3.6a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v1.2M1.8 8.4h12.4" />
      </svg>
    );
  }

  if (icon === "spark") {
    return (
      <svg {...common}>
        <path d="M8 1.8 9.4 6l4.2 1.4L9.4 8.8 8 13l-1.4-4.2L2.4 7.4 6.6 6 8 1.8Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M13.6 9.2a1.6 1.6 0 0 1-1.6 1.6H5.6L2.4 14V4a1.6 1.6 0 0 1 1.6-1.6h8a1.6 1.6 0 0 1 1.6 1.6v5.2Z" />
    </svg>
  );
}
