"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/hooks/useNovaChat";

type NovaChatProps = {
  isOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  suggestions: string[];
  onSend: (text: string) => void;
  onClose: () => void;
};

/**
 * The "Talk to NOVA" panel: a small card above the docked robot on desktop, a
 * bottom sheet on phones.
 *
 * Non-modal by design — it never traps focus or blocks the page behind it, so a
 * visitor can leave it open and keep reading. Escape closes it from anywhere
 * (handled in `useNovaChat`) and focus returns to the robot.
 */
export function NovaChat({
  isOpen,
  messages,
  isThinking,
  suggestions,
  onSend,
  onClose,
}: NovaChatProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Put the caret in the box as soon as the panel opens.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, isThinking]);

  function submit(text: string) {
    onSend(text);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <section
      className="nova-chat"
      data-open={isOpen}
      // Hidden from assistive tech and taken out of the tab order while closed,
      // so a keyboard user never lands in an invisible panel.
      aria-hidden={!isOpen}
      inert={!isOpen}
      aria-label="Chat with NOVA"
    >
      <header className="nova-chat-head">
        <span className="nova-chat-title">
          <span className="nova-chat-dot" />
          Talk to NOVA
        </span>
        <button
          type="button"
          onClick={onClose}
          className="nova-chat-close"
          aria-label="Close chat"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div
        ref={logRef}
        className="nova-chat-log"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <p
            key={message.id}
            className="nova-chat-msg"
            data-from={message.from}
          >
            {message.text}
          </p>
        ))}

        {isThinking && (
          <p className="nova-chat-msg" data-from="nova" data-thinking="true">
            <span className="nova-chat-typing" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className="sr-only">NOVA is typing</span>
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="nova-chat-chips">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => submit(suggestion)}
              className="nova-chat-chip"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        className="nova-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={200}
          autoComplete="off"
          placeholder="Ask about Edwin…"
          aria-label="Ask NOVA about Edwin"
          onChange={(event) => setDraft(event.target.value)}
          className="nova-chat-input"
        />
        <button
          type="submit"
          className="nova-chat-send"
          disabled={draft.trim().length === 0}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path
              d="M4 12h14M12 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </section>
  );
}
