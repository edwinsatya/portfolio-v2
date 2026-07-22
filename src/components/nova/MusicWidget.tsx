"use client";

import { useEffect, useRef } from "react";
import { jamThumbnail, jams } from "@/content/profile";
import { Play, X } from "@/components/ui/Icons";
import { useMusicWidget } from "@/hooks/useMusicWidget";
import "./music.css";

/**
 * "Last jammed to" — a small card in the bottom-right that expands into an
 * embedded player.
 *
 * No audio ships with the site and none is ever hosted here: the artwork is
 * YouTube's thumbnail and playback is YouTube's own iframe. `nocookie` is the
 * privacy-preserving host, and there is no `autoplay` — sound on arrival is the
 * one thing nobody forgives. Switching tracks doesn't autoplay either: the embed
 * is remounted by `key`, and the visitor presses play.
 *
 * The iframe is mounted for both `open` and `mini` so minimising never
 * interrupts the music, and unmounted on close, which is what stops it.
 *
 * Rendered as a sibling of `NovaStage` rather than inside it, deliberately: that
 * layer is lifted to z-index 90 while a window is open, and the card riding up
 * with it would float over the terminal's scrim.
 */
export function MusicWidget() {
  const { visible, mode, track, open, minimize, close, dismiss, selectTrack } =
    useMusicWidget();
  const cardRef = useRef<HTMLButtonElement>(null);

  const current = jams[track];
  const isPlaying = mode !== "closed";

  // Escape collapses the player. It isn't modal — it doesn't trap focus or take
  // the page — so this is a convenience, not the only way out.
  useEffect(() => {
    if (!isPlaying) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, close]);

  // Closing puts focus back on the card rather than dropping it on the body.
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (wasPlaying.current && !isPlaying) cardRef.current?.focus();
    wasPlaying.current = isPlaying;
  }, [isPlaying]);

  return (
    <div className="music" data-shown={visible} data-mode={mode} inert={!visible}>
      {/* Resting card. Hidden rather than unmounted while the panel is up, so
          the entrance transition doesn't replay on every close. */}
      <button
        ref={cardRef}
        type="button"
        className="music-card"
        onClick={open}
        aria-expanded={isPlaying}
        aria-label={`Play ${current.title} by ${current.artist}`}
      >
        <span className="music-art">
          {/* Plain <img>: a remote thumbnail off a host we don't control isn't
              worth a next/image remote pattern for one 320px asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={jamThumbnail(current.youtubeId)}
            alt=""
            width={320}
            height={180}
          />
          <Play className="music-art-play" />
        </span>

        <span className="music-meta">
          <span className="music-label">♪ Last jammed to</span>
          <span className="music-title">{current.title}</span>
          <span className="music-artist">{current.artist}</span>
        </span>
      </button>

      <button
        type="button"
        className="music-dismiss"
        onClick={dismiss}
        aria-label="Hide the music widget"
      >
        <X className="size-3" />
      </button>

      {isPlaying && (
        <div className="music-panel">
          <header className="music-panel-head">
            <span className="music-label">♪ Now playing</span>

            <span className="music-panel-controls">
              {/* Restore and minimise are the same button wearing two hats —
                  one control that always points at the other state. */}
              <button
                type="button"
                className="music-panel-btn"
                onClick={mode === "mini" ? open : minimize}
                aria-label={
                  mode === "mini" ? "Expand the player" : "Minimise the player"
                }
              >
                <span className="music-chevron" aria-hidden />
              </button>

              <button
                type="button"
                className="music-panel-btn"
                onClick={close}
                aria-label="Close the player and stop playback"
              >
                <X className="size-3.5" />
              </button>
            </span>
          </header>

          <div className="music-body">
            <div className="music-frame">
              {/* Keyed by video: switching jams has to remount the embed, and
                  the same key is what keeps it alive across open ↔ mini. */}
              <iframe
                key={current.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${current.youtubeId}?rel=0`}
                title={`${current.title} — ${current.artist}`}
                allow="encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <p className="music-caption">
              <strong>{current.title}</strong>
              <span>{current.artist}</span>
            </p>
          </div>

          {/* The rest of the queue. Hidden in the mini bar, where there's room
              for the title and nothing else. */}
          <ul className="music-list">
            {jams.map((jam, index) => (
              <li key={jam.youtubeId}>
                <button
                  type="button"
                  className="music-track"
                  data-current={index === track}
                  onClick={() => selectTrack(index)}
                  aria-current={index === track}
                >
                  <span className="music-track-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="music-track-title">{jam.title}</span>
                  <span className="music-track-artist">{jam.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
