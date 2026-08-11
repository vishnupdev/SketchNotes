"use client";

import type { BoardActions } from "@/hooks/useBoard";
import { splitLink } from "@/lib/Board/board-api";
import type { BoardSection } from "@/lib/Board/types";
import { ExternalLinkIcon, LinkIcon, TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { ItemComposer } from "./ItemComposer";

interface BodyProps {
  section: BoardSection;
  actions: BoardActions;
}

/**
 * Saved web addresses.
 *
 * The href is whatever `safeUrl` in `board-api.ts` allowed through, which is
 * `http(s)` only — a pasted `javascript:` string is stored as an empty url and
 * rendered as plain text, so a row can never become a script. `rel="noopener
 * noreferrer"` on every outbound link (rule #7, Best Practices).
 */
export function LinksBody({ section, actions }: BodyProps) {
  return (
    <div>
      {section.items.length > 0 && (
        <ul role="list" className="flex flex-col gap-0.5">
          {section.items.map((item) => (
            <li key={item.id} className="group/row flex items-center gap-1.5">
              <span className="flex-none text-ink-soft" aria-hidden>
                <LinkIcon size={14} />
              </span>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate rounded-md px-1 py-1 text-[13.5px] text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={item.url}
                >
                  {item.text}
                  <span className="ml-1 inline-block align-[-2px] opacity-60" aria-hidden>
                    <ExternalLinkIcon size={12} />
                  </span>
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate px-1 py-1 text-[13.5px] text-ink-soft">
                  {item.text}
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  actions.dispatch({ kind: "removeItem", id: section.id, itemId: item.id })
                }
                aria-label={`Remove “${item.text}”`}
                className="tint hover-pop grid size-7 flex-none place-items-center rounded-md text-ink-soft opacity-0 hover:text-danger focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent group-hover/row:opacity-100"
              >
                <TrashSmallIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* One field, parsed the same way the prompt parses "add docs
          example.com to work" — so what's learnt in one place works in both. */}
      <ItemComposer
        placeholder="Docs example.com"
        label={`Add a link to ${section.title}`}
        onAdd={(text) => {
          const { label, url } = splitLink(text);
          actions.dispatch({ kind: "addItem", id: section.id, text: label, url });
        }}
      />
    </div>
  );
}
