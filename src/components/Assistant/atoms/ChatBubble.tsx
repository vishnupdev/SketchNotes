"use client";

import { cx } from "@/lib/utils";
import type { ChatRole } from "@/lib/Assistant/types";

interface ChatBubbleProps {
  role: ChatRole;
  text: string;
  /** Optional footer row (engine badge, actions) rendered inside the bubble. */
  children?: React.ReactNode;
}

/**
 * One speech bubble. Agent answers use "• " lines as bullets, so the knowledge
 * base can stay plain text — rendered as a real <ul> for screen readers rather
 * than a wall of pre-wrapped text.
 */
export function ChatBubble({ role, text, children }: ChatBubbleProps) {
  const agent = role === "agent";
  const blocks = splitBlocks(text);

  return (
    <div
      className={cx(
        "max-w-[min(100%,54ch)] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed",
        agent
          ? "self-start border border-border bg-panel text-text"
          : "self-end bg-accent text-on-accent",
      )}
    >
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className={cx("space-y-1", i > 0 && "mt-2")}>
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className={agent ? "text-accent" : "opacity-70"}>
                  •
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i > 0 ? "mt-2" : undefined}>
            {block.text}
          </p>
        ),
      )}
      {children}
    </div>
  );
}

type Block = { type: "text"; text: string } | { type: "list"; items: string[] };

/** Group consecutive "• " lines into lists, everything else into paragraphs. */
function splitBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("•")) {
      const item = trimmed.replace(/^•\s*/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "list") last.items.push(item);
      else blocks.push({ type: "list", items: [item] });
    } else {
      blocks.push({ type: "text", text: trimmed });
    }
  }
  return blocks;
}
