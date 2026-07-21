"use client";

import { useEffect, useRef, useState } from "react";
import type { NoteMeta } from "@/engine/types";
import { cx, timeAgo } from "@/lib/utils";
import { TrashSmallIcon } from "@/components/atoms/icons";

interface NoteListItemProps {
  note: NoteMeta;
  active: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

/** A row in the notes drawer with a two-step ("Sure?") delete confirm. */
export function NoteListItem({ note, active, onOpen, onDelete }: NoteListItemProps) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      if (timer.current) clearTimeout(timer.current);
      setConfirming(false);
      onDelete(note.id);
    } else {
      setConfirming(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirming(false), 2500);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(note.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(note.id)}
      className={cx(
        "flex cursor-pointer items-center gap-2 rounded-xl py-2.5 pl-3 pr-2",
        active ? "bg-accent-soft" : "tint",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">
          {note.title || "Untitled note"}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-soft">{timeAgo(note.updatedAt)}</div>
      </div>
      <button
        type="button"
        aria-label="Delete note"
        onClick={handleDelete}
        className={cx(
          "grid h-8 min-w-[32px] flex-none place-items-center rounded-[9px] px-1.5 text-[12px] font-bold",
          confirming
            ? "bg-danger text-white"
            : "text-ink-soft hover:bg-danger/[.12] hover:text-danger",
        )}
      >
        {confirming ? "Sure?" : <TrashSmallIcon size={15} />}
      </button>
    </div>
  );
}
