"use client";

/**
 * A minimised window, parked in the dock strip.
 *
 * Shared rather than owned by each window: the terminal and the live resume can
 * be minimised at the same time, and they have to sit beside each other rather
 * than on top of one another. The strip that lays them out lives in `NovaStage`,
 * so both pills are siblings in one flex row and ordering is just DOM order.
 *
 * Hidden pills are `display: none` (see `resume.css`) so they take no space in
 * that row — the fade in and out survives via `allow-discrete`.
 */
export function DockPill({
  label,
  open,
  tone = "dark",
  onClick,
}: {
  label: string;
  open: boolean;
  /** `paper` matches the resume window's cream chrome instead of the terminal's. */
  tone?: "dark" | "paper";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="dock-pill"
      data-tone={tone}
      data-open={open}
      aria-hidden={!open}
      inert={!open}
      onClick={onClick}
    >
      <span className="dock-pill-lights" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {label}
      <span className="dock-pill-live" aria-hidden />
    </button>
  );
}
