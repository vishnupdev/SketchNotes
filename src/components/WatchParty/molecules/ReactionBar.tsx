"use client";

import { REACTIONS, type Reaction } from "@/lib/WatchParty/types";

/** Throw a reaction onto everyone's screen. */
export function ReactionBar({ onReact }: { onReact: (emoji: Reaction) => void }) {
  return (
    <div role="group" aria-label="React" className="flex flex-wrap gap-1.5">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className="grid size-11 place-items-center rounded-full border border-border bg-panel text-[20px] leading-none transition-transform hover:-translate-y-0.5 hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
