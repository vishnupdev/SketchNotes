"use client";

import { useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorCommands } from "@/context/editor-context";
import { useTheme } from "@/hooks/useTheme";
import { cx } from "@/lib/utils";
import { IconButton } from "@/components/SketchNotes/atoms/IconButton";
import { PrimaryButton } from "@/components/SketchNotes/atoms/PrimaryButton";
import { Popover } from "@/components/SketchNotes/atoms/Popover";
import { DownloadMenu } from "@/components/SketchNotes/molecules/DownloadMenu";
import {
  AppsIcon,
  DownloadIcon,
  MenuIcon,
  MoonIcon,
  RedoIcon,
  SunIcon,
  TrashIcon,
  UndoIcon,
} from "@/components/SketchNotes/atoms/icons";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STATUS_LABEL: Record<string, string> = { saving: "Saving…", saved: "Saved ✓" };

/** Top app bar: notes menu, title, save status, theme/clear/undo/redo, export. */
export function Header() {
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const isEmpty = useEditorStore((s) => s.isEmpty);
  const setDrawerOpen = useEditorStore((s) => s.setDrawerOpen);
  const activePopover = useEditorStore((s) => s.activePopover);
  const togglePopover = useEditorStore((s) => s.togglePopover);
  const closePopovers = useEditorStore((s) => s.closePopovers);

  const { undo, redo, clear, markDirty } = useEditorCommands();
  const { dark, toggle } = useTheme();
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const dlRef = useRef<HTMLButtonElement>(null);

  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex items-center gap-1 border-b border-border bg-paper px-2.5"
      style={{
        height: "calc(54px + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <IconButton aria-label="Open notes" onClick={() => setDrawerOpen(true)}>
        <MenuIcon />
      </IconButton>

      <IconButton aria-label="Switch app" title="Apps" onClick={openLauncher}>
        <AppsIcon />
      </IconButton>

      <span className="whitespace-nowrap px-1.5 pl-0.5 font-hand text-[17px] font-bold tracking-[.2px] max-[520px]:hidden">
        Sketchnotes
      </span>

      <input
        id="titleInput"
        placeholder="Untitled note"
        maxLength={60}
        autoComplete="off"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markDirty();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          e.stopPropagation();
        }}
        className="min-w-0 flex-1 rounded-[9px] border-0 bg-transparent px-2 py-[7px] text-[15px] font-semibold outline-none focus:bg-accent/[.07]"
      />

      <span
        className={cx(
          "min-w-[52px] flex-none text-right text-[11px] text-ink-soft transition-opacity max-[420px]:hidden",
          saveStatus ? "opacity-100" : "opacity-0",
        )}
      >
        {STATUS_LABEL[saveStatus] ?? ""}
      </span>

      <IconButton aria-label="Toggle dark mode" title="Toggle dark mode" onClick={toggle}>
        {dark ? <SunIcon size={19} /> : <MoonIcon size={19} />}
      </IconButton>

      <IconButton aria-label="Clear canvas" title="Clear canvas" onClick={clear} disabled={isEmpty}>
        <TrashIcon size={19} />
      </IconButton>

      <IconButton aria-label="Undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
        <UndoIcon />
      </IconButton>

      <IconButton aria-label="Redo" title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
        <RedoIcon />
      </IconButton>

      <PrimaryButton
        ref={dlRef}
        aria-label="Download"
        className="ml-0.5 max-[560px]:px-2.5"
        onClick={() => togglePopover("download")}
      >
        <DownloadIcon size={17} />
        <span className="max-[560px]:hidden">PNG</span>
      </PrimaryButton>

      <Popover
        open={activePopover === "download"}
        anchorRef={dlRef}
        onClose={closePopovers}
        placement="bottom"
        align="end"
        className="p-1.5"
      >
        <DownloadMenu />
      </Popover>
    </header>
  );
}
