"use client";

import type { BoardActions } from "@/hooks/useBoard";
import type { BoardSection } from "@/lib/Board/types";
import { cx } from "@/lib/utils";
import { TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { ItemComposer } from "./ItemComposer";

interface BodyProps {
  section: BoardSection;
  actions: BoardActions;
}

/** Tickable rows. Row text stays editable in place; ticking runs through the
 *  same `tick` command the prompt uses, so both paths are undoable alike. */
export function ChecklistBody({ section, actions }: BodyProps) {
  const left = section.items.filter((i) => !i.done).length;

  return (
    <div>
      {section.items.length > 0 && (
        <ul role="list" className="flex flex-col gap-0.5">
          {section.items.map((item) => (
            <li key={item.id} className="group/row flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  actions.dispatch({
                    kind: "tick",
                    id: section.id,
                    itemId: item.id,
                    done: e.target.checked,
                  })
                }
                aria-label={item.text}
                className="size-4 flex-none accent-[var(--accent)]"
              />
              <input
                value={item.text}
                onChange={(e) => actions.writeItem(section.id, item.id, { text: e.target.value })}
                aria-label={`Edit “${item.text}”`}
                className={cx(
                  "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-[13.5px] focus:border-border focus:bg-paper focus:outline-none",
                  item.done && "text-ink-soft line-through",
                )}
              />
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

      <ItemComposer placeholder="Add a row…" label={`Add a row to ${section.title}`} onAdd={(text) => actions.dispatch({ kind: "addItem", id: section.id, text, url: "" })} />

      {section.items.length > 0 && (
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-soft">
          {left === 0 ? "All done" : `${left} of ${section.items.length} left`}
        </p>
      )}
    </div>
  );
}
