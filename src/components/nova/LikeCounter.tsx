"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getLikesSnapshot,
  getServerLikesSnapshot,
  initLikes,
  subscribeLikes,
} from "@/lib/likes";
import { fireLike } from "@/lib/nova-bus";

/**
 * The ♥ readout at the top of the stage.
 *
 * Also a button — clicking it likes, same as pressing L. Renders the base count
 * before storage has been read so there's no blank flash and no layout shift;
 * `ready` only gates the visitor's own contribution, which the server can't know.
 */
export function LikeCounter() {
  const likes = useSyncExternalStore(
    subscribeLikes,
    getLikesSnapshot,
    getServerLikesSnapshot,
  );

  useEffect(() => initLikes(), []);

  return (
    <button
      type="button"
      onClick={(event) => {
        // Launch from the counter itself, so the hearts come from what was
        // clicked rather than surprising the visitor across the screen.
        const box = event.currentTarget.getBoundingClientRect();
        fireLike({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
      className="like-counter"
      aria-label={`Like — ${likes.total} so far`}
    >
      <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
        <path
          d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z"
          fill="currentColor"
        />
      </svg>
      <span data-liked={likes.mine > 0}>{likes.total.toLocaleString()}</span>
    </button>
  );
}
