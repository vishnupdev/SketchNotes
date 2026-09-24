"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useWatchPartyStore } from "@/store/useWatchPartyStore";
import { MAX_CHAT } from "@/lib/WatchParty/protocol";
import { partyColor } from "@/components/WatchParty/atoms/Avatar";
import { SendIcon } from "@/components/SketchNotes/atoms/icons";
import { FIELD } from "@/components/WatchParty/ui";
import { cx } from "@/lib/utils";

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * The room's chat. A `log` region, so new lines are announced politely as they
 * arrive, and it follows the newest line unless you have scrolled up to read
 * something older.
 */
export function ChatPanel() {
  const chat = useWatchPartyStore((s) => s.chat);
  const me = useWatchPartyStore((s) => s.me);
  const sendChat = useWatchPartyStore((s) => s.sendChat);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const fieldId = useId();

  useEffect(() => {
    const list = listRef.current;
    if (list && pinned.current) list.scrollTop = list.scrollHeight;
  }, [chat.length]);

  const send = () => {
    if (!text.trim()) return;
    sendChat(text);
    setText("");
    pinned.current = true;
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      <ol
        ref={listRef}
        role="log"
        aria-label="Chat"
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex max-h-[min(52svh,560px)] min-h-40 flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-panel p-3"
      >
        {chat.length === 0 && (
          <li className="m-auto text-center text-[12.5px] text-ink-soft">
            No messages yet. Say hello — reactions from the Watch tab land on everyone&apos;s screen too.
          </li>
        )}
        {chat.map((m) =>
          m.from === null ? (
            <li key={m.id} className="text-center text-[11.5px] text-ink-soft">
              {m.text}
            </li>
          ) : (
            <li key={m.id} className={cx("flex min-w-0 flex-col", m.from === me && "items-end")}>
              <span className="flex items-baseline gap-2 text-[11px]">
                <b style={{ color: partyColor(m.slot) }}>{m.from === me ? "You" : m.name}</b>
                <time dateTime={new Date(m.at).toISOString()} className="text-ink-soft">
                  {clock(m.at)}
                </time>
              </span>
              <p
                className={cx(
                  "mt-0.5 max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-[13.5px] leading-snug wrap-anywhere",
                  m.from === me ? "bg-accent-soft text-text" : "bg-paper text-text",
                )}
              >
                {m.text}
              </p>
            </li>
          ),
        )}
      </ol>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Message the room
        </label>
        <textarea
          id={fieldId}
          rows={1}
          value={text}
          maxLength={MAX_CHAT}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter is a new line, as in every chat app.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message the room"
          className={cx(FIELD, "max-h-32 min-h-11 flex-1 resize-none")}
        />
        <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid size-11 flex-none place-items-center rounded-full bg-accent text-on-accent transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40">
          <SendIcon size={17} />
        </button>
      </form>
    </div>
  );
}
