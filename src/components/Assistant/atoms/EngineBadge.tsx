"use client";

import type { ReplyEngine } from "@/lib/Assistant/types";

const COPY: Record<ReplyEngine, { label: string; title: string }> = {
  device: {
    label: "on-device AI",
    title: "Phrased by your browser's built-in AI model, running on this device",
  },
  local: {
    label: "built-in guide",
    title: "Answered from the workspace's built-in feature guide — no model needed",
  },
};

/** Tiny provenance label under an answer, so it's clear what produced it. */
export function EngineBadge({ engine }: { engine: ReplyEngine }) {
  const { label, title } = COPY[engine];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[.12em] text-accent"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      {label}
    </span>
  );
}
