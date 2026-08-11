"use client";

import { useEffect } from "react";
import type { BoardActions } from "@/hooks/useBoard";
import { useBoardStore } from "@/store/useBoardStore";
import { SectionCard } from "@/components/Board/molecules/SectionCard";

interface BoardCanvasProps {
  actions: BoardActions;
}

/** How long a just-changed card stays highlighted. */
const FLASH_MS = 1400;

/**
 * The grid of sections.
 *
 * One column on a phone, two from 560px, three from 900px — and a `wide` section
 * spans two columns wherever there are two to span. Ordinary CSS grid auto-flow,
 * so nothing is measured or positioned in JS and there is no layout work on a
 * reorder.
 *
 * It also owns the "where did that land?" affordance: when a typed command
 * targets a section, the card is scrolled into view and ringed for a moment. The
 * scroll is skipped for anyone who asked for reduced motion — the ring alone
 * still answers the question.
 */
export function BoardCanvas({ actions }: BoardCanvasProps) {
  const focusId = useBoardStore((s) => s.focusId);
  const setFocus = useBoardStore((s) => s.setFocus);
  const { sections } = actions;

  useEffect(() => {
    if (!focusId) return;
    const el = document.querySelector<HTMLElement>(`[data-board-section="${focusId}"]`);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
    const t = window.setTimeout(() => setFocus(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [focusId, setFocus]);

  return (
    <ul
      role="list"
      aria-label="Board sections"
      className="grid grid-cols-1 items-start gap-3 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3"
    >
      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          actions={actions}
          flash={section.id === focusId}
          index={index}
          total={sections.length}
        />
      ))}
    </ul>
  );
}
