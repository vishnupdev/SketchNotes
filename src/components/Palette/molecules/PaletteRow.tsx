"use client";

import { APP_MAP, chipGradient } from "@/components/AppCatalog";
import type { PaletteCommand } from "@/lib/palette/commands";
import { cx } from "@/lib/utils";
import { PaletteIcon, SearchIcon, SettingsIcon } from "@/components/SketchNotes/atoms/icons";

/** Mark for a row: the app's own logo when it has one, else a group glyph. */
function RowMark({ command }: { command: PaletteCommand }) {
  const app = command.app ? APP_MAP[command.app] : undefined;
  if (app) {
    return (
      <span
        style={{ "--chip-grad": chipGradient(app.hue) } as React.CSSProperties}
        className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-(image:--chip-grad) text-white [&>svg]:size-4"
      >
        {app.icon}
      </span>
    );
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-accent-soft text-accent [&>svg]:size-4">
      {command.group === "theme" ? (
        <PaletteIcon size={16} />
      ) : command.group === "workspace" ? (
        <SettingsIcon size={16} />
      ) : (
        <SearchIcon size={16} />
      )}
    </span>
  );
}

/**
 * One row of the command palette.
 *
 * A `<li><button>` rather than an `option`, because the row carries a logo and
 * two lines of text; the listbox semantics are supplied by `role`/`aria-selected`
 * so a screen reader still hears a single-select list (see CommandPalette for
 * the combobox wiring).
 */
export function PaletteRow({
  command,
  selected,
  onRun,
  onHover,
  id,
}: {
  command: PaletteCommand;
  selected: boolean;
  onRun: () => void;
  onHover: () => void;
  id: string;
}) {
  return (
    <li role="presentation">
      <button
        type="button"
        id={id}
        role="option"
        aria-selected={selected}
        onClick={onRun}
        onPointerMove={onHover}
        // The input keeps focus while the list is driven by arrow keys, so the
        // selected row is styled rather than focused — and `tabIndex={-1}`
        // keeps Tab from walking a list that Enter already commits.
        tabIndex={-1}
        className={cx(
          "flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
          selected ? "border-accent bg-accent-soft" : "border-transparent hover:bg-paper",
        )}
      >
        <RowMark command={command} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-semibold tracking-[.1px]">
            {command.title}
          </span>
          <span className="truncate text-[11.5px] text-ink-soft">{command.hint}</span>
        </span>
        {selected && (
          <span
            aria-hidden
            className="hidden flex-none rounded-md border border-border bg-paper px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-soft min-[560px]:block"
          >
            Enter
          </span>
        )}
      </button>
    </li>
  );
}
