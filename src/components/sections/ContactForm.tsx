"use client";

import { useState } from "react";
import { profile } from "@/content/profile";
import { ArrowUpRight } from "@/components/ui/Icons";

const field =
  "w-full rounded-xl border border-line bg-bg-soft/70 px-4 py-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent/60 focus:outline-none";

/**
 * Opens the visitor's mail client with the message pre-filled.
 *
 * No backend, nothing to leak, and no fake "sent!" state — the send genuinely
 * happens in their mail app. Swap in a POST to an API route if you'd rather
 * collect submissions server-side later.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `Portfolio enquiry from ${name || "someone"}`;
    const body = `${message}\n\n— ${name}\n${email}`;

    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="panel rounded-2xl p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-xs text-faint">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-xs text-faint">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={field}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="mb-2 block text-xs text-faint">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="What are you building?"
          className={`${field} resize-y`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-bg transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100"
        >
          Send message
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
        </button>

        <p aria-live="polite" className="text-xs text-faint">
          {sent
            ? "Your mail app should be open — hit send there."
            : "Opens in your mail app."}
        </p>
      </div>
    </form>
  );
}
