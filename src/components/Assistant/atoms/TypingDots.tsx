"use client";

/**
 * "Thinking" indicator shown while an answer is being composed. Pure CSS
 * animation (no JS timers) and it holds still for anyone who has asked for
 * reduced motion.
 */
export function TypingDots({ label = "Thinking…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 self-start rounded-2xl border border-border bg-panel px-4 py-3"
    >
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-accent motion-safe:animate-bounce motion-reduce:opacity-60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="text-[12.5px] text-ink-soft">{label}</span>
    </div>
  );
}
