"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/Assistant/atoms/ChatBubble";
import { EngineBadge } from "@/components/Assistant/atoms/EngineBadge";
import { SuggestionChip } from "@/components/Assistant/atoms/SuggestionChip";
import { TypingDots } from "@/components/Assistant/atoms/TypingDots";
import { ActionRow } from "@/components/Assistant/molecules/ActionRow";
import type { AgentAction, ChatMessage } from "@/lib/Assistant/types";

interface MessageListProps {
  messages: ChatMessage[];
  /** An answer is being composed. */
  thinking: boolean;
  /** Label for the thinking indicator (e.g. download progress). */
  thinkingLabel?: string;
  onSuggestion: (question: string) => void;
  onAction: (action: AgentAction) => void;
}

/**
 * The conversation thread. Announced as a log so screen readers hear new
 * answers, and the newest turn is scrolled into view as it arrives.
 */
export function MessageList({
  messages,
  thinking,
  thinkingLabel,
  onSuggestion,
  onAction,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Follow the conversation, but don't yank the page on first paint (a restored
  // thread should just be there).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages.length, thinking]);

  const last = messages[messages.length - 1];

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Conversation"
      className="flex flex-col gap-3"
    >
      {messages.map((message) => {
        const isLast = message.id === last?.id;
        const agent = message.role === "agent";
        return (
          <div key={message.id} className="flex flex-col gap-2">
            <ChatBubble role={message.role} text={message.text}>
              {agent && (
                <>
                  {message.actions?.length ? (
                    <ActionRow actions={message.actions} onAction={onAction} />
                  ) : null}
                  {message.engine && (
                    <div className="mt-2.5">
                      <EngineBadge engine={message.engine} />
                    </div>
                  )}
                </>
              )}
            </ChatBubble>

            {/* Follow-ups only for the newest answer, so old chips don't pile up. */}
            {agent && isLast && !thinking && message.suggestions?.length ? (
              <div className="flex flex-wrap gap-2">
                {message.suggestions.map((suggestion) => (
                  <SuggestionChip
                    key={suggestion}
                    label={suggestion}
                    onClick={() => onSuggestion(suggestion)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {thinking && <TypingDots label={thinkingLabel} />}
      <div ref={endRef} aria-hidden />
    </div>
  );
}
