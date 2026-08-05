"use client";

import { SuggestionChip } from "@/components/Assistant/atoms/SuggestionChip";
import { AssistantIcon } from "@/components/SketchNotes/atoms/icons";
import { APP_IDS_COUNT, STARTER_QUESTIONS } from "@/lib/Assistant/knowledge";

interface QuickStartProps {
  onAsk: (question: string) => void;
}

/**
 * Empty-state card: what the assistant is for, plus opening questions. Most
 * people don't know what to ask a help agent, so the first move is offered.
 */
export function QuickStart({ onAsk }: QuickStartProps) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <span className="grid size-11 place-items-center rounded-[13px] bg-accent-soft text-accent">
        <AssistantIcon size={24} />
      </span>
      <h2 className="mt-3 text-[17px] font-bold tracking-[.1px]">
        Ask me what this workspace can do
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
        {`I know all ${APP_IDS_COUNT} apps here — what each one does, how to get a job done, and ` +
          "where your data lives. Free, no account, and every answer is worked out on your own " +
          "device."}
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
        You can also just tell me what to do —{" "}
        <span className="font-medium text-text">&ldquo;open the timer&rdquo;</span>,{" "}
        <span className="font-medium text-text">&ldquo;go to PDF merge&rdquo;</span> or{" "}
        <span className="font-medium text-text">&ldquo;turn on dark mode&rdquo;</span>
        {" — and I'll do it."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STARTER_QUESTIONS.map((question) => (
          <SuggestionChip key={question} label={question} onClick={() => onAsk(question)} />
        ))}
      </div>
    </div>
  );
}
