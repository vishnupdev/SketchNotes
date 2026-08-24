"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useAssistantStore } from "@/store/useAssistantStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useTheme } from "@/hooks/useTheme";
import { APP_MAP } from "@/components/AppCatalog";
import { TOOLS } from "@/components/PdfEditor/catalog";
import { THEMES } from "@/lib/themes";
import { buildPaletteCommands, type PaletteContext } from "@/lib/palette/commands";
import { APP_SEARCH_TERMS } from "@/lib/palette/terms";
import { scoreCommand } from "@/lib/palette/match";
import { PaletteRow } from "@/components/Palette/molecules/PaletteRow";
import { AssistantIcon, SearchIcon } from "@/components/SketchNotes/atoms/icons";
import { cx } from "@/lib/utils";

/** How many rows to show at once. Enough to scan, short enough to stay a list. */
const MAX_ROWS = 8;

const GROUP_LABEL = {
  app: "Apps",
  pdf: "PDF Editor",
  theme: "Themes",
  workspace: "Workspace",
} as const;

/**
 * The command palette: one field that reaches everything in the workspace.
 *
 * Nineteen apps and ten PDF sections is more than a grid can serve well, and
 * before this the only way in was pointing at a tile — no search anywhere, and
 * no keyboard route at all beyond the canvas's own shortcuts. Ctrl/⌘ + K opens
 * it from any app, typing filters, ↑/↓ moves and Enter goes.
 *
 * It only ever drives shell state — the active app, the PDF section, the theme,
 * the overlays (rule #5) — so no app can be put into a bad state from here.
 * Anything it can't match is offered to the Assistant instead, which is the one
 * thing in the workspace that *can* answer a sentence.
 */
export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen);
  const closePalette = useWorkspaceStore((s) => s.closePalette);
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);
  const openSettings = useWorkspaceStore((s) => s.openSettings);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const appOrder = useWorkspaceStore((s) => s.appOrder);
  const askLater = useAssistantStore((s) => s.askLater);
  const customThemes = useEditorStore((s) => s.customThemes);
  const { setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const ctx: PaletteContext = useMemo(
    () => ({
      setActiveApp: (app) => setActiveApp(app),
      setPdfTool,
      openSettings,
      openLauncher,
      setTheme,
      ask: (question) => {
        askLater(question);
        setActiveApp("assistant");
      },
    }),
    [askLater, openLauncher, openSettings, setActiveApp, setPdfTool, setTheme],
  );

  const commands = useMemo(
    () =>
      buildPaletteCommands({
        // In the user's own launcher order, so an empty palette opens on the
        // list they arranged rather than on the catalog's default.
        apps: appOrder
          .map((id) => APP_MAP[id])
          .filter(Boolean)
          .map((a) => ({ id: a.id, name: a.name, tagline: a.tagline })),
        pdfTools: TOOLS.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb })),
        themes: [
          ...THEMES.map((t) => ({ id: t.id, label: t.label, dark: t.dark })),
          ...customThemes.map((t) => ({ id: t.id, label: t.label, dark: t.dark })),
        ],
        aliases: APP_SEARCH_TERMS,
      }),
    [appOrder, customThemes],
  );

  const matches = useMemo(() => {
    const scored = commands
      .map((command) => ({
        command,
        score: scoreCommand(query, command.title, command.keywords),
      }))
      .filter((row) => row.score > 0);
    // A stable sort, so ties keep the order the rows were built in — the user's
    // launcher order for apps, catalog order for everything else.
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_ROWS).map((row) => row.command);
  }, [commands, query]);

  const trimmed = query.trim();
  /** Offered when nothing matches, or when the query reads like a sentence. */
  const showAsk = trimmed.length > 2 && (matches.length === 0 || trimmed.includes(" "));
  const rowCount = matches.length + (showAsk ? 1 : 0);

  // Reset on every open, so the palette never reopens mid-search.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    // The input is inside a dialog that fades in; focus on the next frame so
    // the caret lands after the transition rather than fighting it.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Keep the selected row in view when it moves off the visible list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, matches]);

  const run = useCallback(
    (index: number) => {
      if (showAsk && index === matches.length) {
        ctx.ask(trimmed);
        closePalette();
        return;
      }
      const command = matches[index];
      if (!command) return;
      command.run(ctx);
      closePalette();
    },
    [closePalette, ctx, matches, showAsk, trimmed],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setCursor((c) => (rowCount === 0 ? 0 : (c + 1) % rowCount));
      return;
    }
    if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setCursor((c) => (rowCount === 0 ? 0 : (c - 1 + rowCount) % rowCount));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      run(cursor);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // The launcher and the settings dialog both close themselves on Escape
      // from a window listener, and the palette can be opened from either.
      // Stopping here means one Escape closes only the top layer.
      e.stopPropagation();
      closePalette();
    }
  };

  // Group headings are drawn from the run of rows that share a group, so the
  // list stays one flat listbox for assistive tech while reading as sections.
  const heading = (index: number): string | null => {
    const group = matches[index].group;
    return index === 0 || matches[index - 1].group !== group ? GROUP_LABEL[group] : null;
  };

  return (
    <div
      className={cx(
        "fixed inset-0 z-90 flex items-start justify-center p-3 pt-[12vh] transition-opacity duration-150",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        aria-label="Close the command palette"
        onClick={closePalette}
        className="absolute inset-0 cursor-default bg-(--scrim) backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the workspace"
        className={cx(
          "relative flex max-h-[70vh] w-[min(96vw,560px)] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-panel transition-transform duration-150",
          open ? "translate-y-0" : "-translate-y-2",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <SearchIcon size={18} className="flex-none text-ink-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={rowCount > 0 ? `palette-row-${cursor}` : undefined}
            aria-label="Search apps, PDF tools, themes and settings"
            placeholder="Search apps, tools, themes…"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-ink-soft"
          />
          <kbd className="hidden flex-none rounded-md border border-border bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-soft min-[560px]:block">
            Esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          id="palette-list"
          role="listbox"
          aria-label="Results"
          className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2"
        >
          {matches.map((command, index) => {
            const label = heading(index);
            return (
              <Fragment key={command.id}>
                {label && (
                  <li
                    role="presentation"
                    className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.6px] text-ink-soft first:pt-0"
                  >
                    {label}
                  </li>
                )}
                <PaletteRow
                  id={`palette-row-${index}`}
                  command={command}
                  selected={index === cursor}
                  onRun={() => run(index)}
                  onHover={() => setCursor(index)}
                />
              </Fragment>
            );
          })}

          {showAsk && (
            <li role="presentation">
              <button
                type="button"
                id={`palette-row-${matches.length}`}
                role="option"
                aria-selected={cursor === matches.length}
                tabIndex={-1}
                onClick={() => run(matches.length)}
                onPointerMove={() => setCursor(matches.length)}
                className={cx(
                  "mt-1 flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
                  cursor === matches.length
                    ? "border-accent bg-accent-soft"
                    : "border-transparent hover:bg-paper",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-accent-soft text-accent">
                  <AssistantIcon size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-semibold">
                    Ask the Assistant “{trimmed}”
                  </span>
                  <span className="truncate text-[11.5px] text-ink-soft">
                    Answers from the workspace guide, on this device
                  </span>
                </span>
              </button>
            </li>
          )}

          {rowCount === 0 && (
            <li role="presentation" className="px-2.5 py-6 text-center text-[12.5px] text-ink-soft">
              Nothing matches “{trimmed}”.
            </li>
          )}
        </ul>

        <p className="hidden items-center gap-1.5 border-t border-border px-3.5 py-2 text-[11.5px] text-ink-soft min-[560px]:flex">
          <kbd className="rounded-md border border-border bg-paper px-1.5 py-0.5 font-sans text-[10.5px] font-semibold">
            ↑ ↓
          </kbd>
          to move
          <kbd className="ml-1.5 rounded-md border border-border bg-paper px-1.5 py-0.5 font-sans text-[10.5px] font-semibold">
            Enter
          </kbd>
          to open · anything else goes to the Assistant
        </p>
      </div>
    </div>
  );
}
