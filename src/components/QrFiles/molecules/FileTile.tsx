"use client";

import type { ReactNode } from "react";
import { FILE_CLASS_LABEL, type FileClass } from "@/lib/qr/file-frames";
import {
  CameraIcon,
  DriveIcon,
  PlayIcon,
  ScanDocIcon,
  VolumeIcon,
} from "@/components/SketchNotes/atoms/icons";
import { formatBytes } from "@/lib/utils";

/** One glyph per class of file, so a row is recognisable before it is read. */
const CLASS_ICON: Record<FileClass, ReactNode> = {
  image: <CameraIcon size={20} />,
  document: <ScanDocIcon size={20} />,
  audio: <VolumeIcon size={20} />,
  video: <PlayIcon size={20} />,
  file: <DriveIcon size={20} />,
};

export interface FileTileProps {
  name: string;
  mime: string;
  size: number;
  fileClass: FileClass;
  /** Code count, where one is known. */
  parts?: number;
  /** A line under the details — status, or what happens next. */
  note?: ReactNode;
  /** Buttons for this file, right-aligned on wide screens. */
  actions?: ReactNode;
}

/**
 * The card that stands for a file everywhere in this app: what it is, how big,
 * and how many codes it comes to.
 *
 * The same shape is used for a file on its way in and a file that has just been
 * rebuilt, on purpose — the two halves of this app are one round trip, and a
 * rebuilt file that looks identical to the one that went in is the clearest
 * possible statement that it worked.
 */
export function FileTile({ name, mime, size, fileClass, parts, note, actions }: FileTileProps) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-panel p-3.5">
      <span className="grid size-10 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
        {CLASS_ICON[fileClass]}
      </span>

      <div className="min-w-0 flex-1">
        {/* break-all, not truncate: a file's extension is at the *end* of its
            name, and it is the half that says what the thing is. */}
        <p className="break-all text-[13.5px] font-semibold leading-snug">{name}</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">
          {FILE_CLASS_LABEL[fileClass]}
          {mime ? ` · ${mime}` : ""} · {formatBytes(size)}
          {parts !== undefined ? ` · ${parts} code${parts === 1 ? "" : "s"}` : ""}
        </p>
        {note && <div className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{note}</div>}
      </div>

      {actions && <div className="flex flex-none flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
