"use client";

import { ChevronRightIcon } from "@/components/SketchNotes/atoms/icons";
import type { AgentAction } from "@/lib/Assistant/types";

interface ActionRowProps {
  actions: AgentAction[];
  onAction: (action: AgentAction) => void;
}

/**
 * "Open <app>" buttons attached to an answer — the part that makes this a
 * useful agent rather than a help page: it takes you to the tool it just
 * described, in one tap.
 */
export function ActionRow({ actions, onAction }: ActionRowProps) {
  if (!actions.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onAction(action)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          {action.label}
          <ChevronRightIcon size={14} />
        </button>
      ))}
    </div>
  );
}
