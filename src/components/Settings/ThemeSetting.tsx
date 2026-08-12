"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cx } from "@/lib/utils";
import {
  DARK_THEMES,
  LIGHT_THEMES,
  MAX_CUSTOM_THEMES,
  resolveCustomTheme,
  resolveTheme,
  type CustomTheme,
  type ThemeDef,
} from "@/lib/themes";
import { CloseIcon, PenIcon, PlusIcon } from "@/components/SketchNotes/atoms/icons";
import { ThemeTile } from "@/components/Settings/ThemeTile";
import { CustomThemeEditor, type ThemeDraft } from "@/components/Settings/CustomThemeEditor";

/** A labelled run of tiles within the picker. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-mono text-[10.5px] font-bold uppercase tracking-[.12em] text-ink-soft">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2.5 min-[440px]:grid-cols-3">{children}</div>
    </div>
  );
}

/** Small round control stacked in a custom tile's corner. */
function TileAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "absolute grid size-6 place-items-center rounded-full border border-border bg-panel text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Theme picker: the built-in palettes grouped by base, the user's own palettes,
 * and the editor for building a new one.
 *
 * Every tile previews itself with the real tokens (see {@link ThemeTile}), so
 * nothing here carries a colour value — presets come from `globals.css` and
 * custom palettes are derived in CSS from the two colours the user picked.
 */
export function ThemeSetting() {
  const {
    themeId,
    setTheme,
    customThemes,
    canAddCustomTheme,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
  } = useTheme();

  /** null = editor closed, "new" = building one, otherwise the id being edited. */
  const [editing, setEditing] = useState<string | null>(null);

  const presetTile = (t: ThemeDef) => (
    <ThemeTile
      key={t.id}
      theme={resolveTheme(t.id)}
      active={t.id === themeId}
      onSelect={() => setTheme(t.id)}
    />
  );

  const saveNew = (draft: ThemeDraft) => {
    addCustomTheme(draft);
    setEditing(null);
  };

  const saveEdit = (id: string, draft: ThemeDraft) => {
    updateCustomTheme(id, draft);
    setEditing(null);
  };

  const editTarget: CustomTheme | undefined =
    editing && editing !== "new" ? customThemes.find((t) => t.id === editing) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-4">
        <Group title={`Light · ${LIGHT_THEMES.length}`}>{LIGHT_THEMES.map(presetTile)}</Group>
        <Group title={`Dark · ${DARK_THEMES.length}`}>{DARK_THEMES.map(presetTile)}</Group>

        {customThemes.length > 0 && (
          <Group title={`Your themes · ${customThemes.length}`}>
            {customThemes.map((t) => (
              <ThemeTile
                key={t.id}
                theme={resolveCustomTheme(t)}
                active={t.id === themeId}
                onSelect={() => setTheme(t.id)}
                action={
                  <>
                    <TileAction
                      label={`Edit ${t.label}`}
                      onClick={() => setEditing(t.id)}
                      className="right-9 top-2"
                    >
                      <PenIcon size={12} />
                    </TileAction>
                    <TileAction
                      label={`Delete ${t.label}`}
                      onClick={() => removeCustomTheme(t.id)}
                      className="right-2 top-2"
                    >
                      <CloseIcon size={12} />
                    </TileAction>
                  </>
                }
              />
            ))}
          </Group>
        )}
      </div>

      {editTarget ? (
        <CustomThemeEditor
          key={editTarget.id}
          initial={{
            label: editTarget.label,
            dark: editTarget.dark,
            accent: editTarget.accent,
            paper: editTarget.paper,
          }}
          saveLabel="Save changes"
          onSave={(draft) => saveEdit(editTarget.id, draft)}
          onCancel={() => setEditing(null)}
        />
      ) : editing === "new" ? (
        <CustomThemeEditor saveLabel="Save theme" onSave={saveNew} onCancel={() => setEditing(null)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canAddCustomTheme}
            onClick={() => setEditing("new")}
            title={
              canAddCustomTheme
                ? "Build a theme from your own colours"
                : `You can keep up to ${MAX_CUSTOM_THEMES} custom themes`
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon size={14} />
            Custom theme
          </button>
          {!canAddCustomTheme && (
            <span className="text-[11.5px] text-ink-soft">
              Limit of {MAX_CUSTOM_THEMES} reached — delete one to add another.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
