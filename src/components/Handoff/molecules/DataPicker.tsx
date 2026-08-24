"use client";

import { APP_MAP } from "@/components/AppCatalog";
import { groupId, type SendGroup } from "@/lib/Handoff/select";
import { cx, formatBytes } from "@/lib/utils";

/**
 * What to send.
 *
 * Sizes are shown against every row because they decide the experience: a task
 * list is a couple of codes and a moment, a sketchbook with photos in it is
 * hundreds of codes and several minutes. Someone choosing with the numbers in
 * front of them picks the two things they meant; someone choosing blind sends
 * everything and gives up halfway.
 */
export function DataPicker({
  groups,
  chosen,
  onToggle,
  onAll,
  onNone,
}: {
  groups: SendGroup[];
  chosen: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-soft">
        There is nothing saved on this device yet to send.
      </p>
    );
  }

  const total = groups
    .filter((g) => chosen.has(groupId(g)))
    .reduce((sum, g) => sum + g.bytes, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[.14em] text-ink-soft">
          {chosen.size} of {groups.length} selected · {formatBytes(total)}
        </p>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={onAll}
            className="rounded-full border border-border bg-panel px-3 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-text"
          >
            All
          </button>
          <button
            type="button"
            onClick={onNone}
            className="rounded-full border border-border bg-panel px-3 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-text"
          >
            None
          </button>
        </span>
      </div>

      <ul role="list" className="flex flex-col gap-1.5">
        {groups.map((group) => {
          const id = groupId(group);
          const on = chosen.has(id);
          const app = group.app ? APP_MAP[group.app] : undefined;
          return (
            <li key={id}>
              <label
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors",
                  on ? "border-accent bg-accent-soft" : "border-border bg-panel hover:border-accent",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(id)}
                  className="size-4 flex-none accent-accent"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {app?.name ?? "Workspace settings"}
                </span>
                <span className="flex-none font-mono text-[11px] text-ink-soft">
                  {formatBytes(group.bytes)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
