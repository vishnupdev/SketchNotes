"use client";

import type { BoardActions } from "@/hooks/useBoard";
import type { BoardSection } from "@/lib/Board/types";

interface BodyProps {
  section: BoardSection;
  actions: BoardActions;
}

/** Free text. Grows to a readable height, then scrolls inside the card. */
export function NoteBody({ section, actions }: BodyProps) {
  return (
    <textarea
      value={section.text}
      onChange={(e) => actions.writeSection(section.id, { text: e.target.value })}
      placeholder="Anything you like…"
      aria-label={`${section.title} text`}
      rows={5}
      className="scroll-slim max-h-64 w-full resize-y rounded-lg border border-border bg-paper px-2.5 py-2 text-[13.5px] leading-relaxed placeholder:text-ink-soft focus:border-accent focus:outline-none"
    />
  );
}
