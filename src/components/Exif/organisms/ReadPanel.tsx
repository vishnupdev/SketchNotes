"use client";

import { useState } from "react";
import { useExifStore } from "@/store/useExifStore";
import type { ExifGroup } from "@/lib/Exif/tiff";
import { OpenPicture } from "@/components/Exif/molecules/OpenPicture";
import { formatBytes } from "@/lib/utils";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LocationIcon,
} from "@/components/SketchNotes/atoms/icons";

/** The order the groups are shown in — most surprising first. */
const GROUPS: ExifGroup[] = ["GPS", "Photo", "Image", "Camera", "Thumbnail"];

const GROUP_TITLES: Record<ExifGroup, string> = {
  GPS: "Where it was taken",
  Photo: "How the exposure was made",
  Image: "The picture and its maker",
  Camera: "Camera",
  Thumbnail: "The embedded thumbnail",
};

/**
 * What the file says about itself.
 *
 * Location comes first, deliberately. It is the tag people are surprised to
 * find and the one with consequences — a photo posted from home carries the
 * house. The rest follows in the order it is interesting: how the shot was
 * taken, then who made it, then the embedded thumbnail, which is its own
 * surprise (a second, smaller copy of the picture, sometimes from *before* it
 * was cropped).
 */
export function ReadPanel() {
  const name = useExifStore((s) => s.name);
  const meta = useExifStore((s) => s.meta);
  const preview = useExifStore((s) => s.preview);
  const coordinates = useExifStore((s) => s.coordinates);
  const close = useExifStore((s) => s.close);
  const clean = useExifStore((s) => s.clean);

  const [copied, setCopied] = useState(false);
  /**
   * A file can be readable as *metadata* and not decodable as a picture — a
   * truncated download, or a JPEG whose scan is corrupt. The tags are still
   * worth showing, so the preview drops out rather than leaving an empty frame.
   */
  const [previewBroken, setPreviewBroken] = useState(false);

  if (!meta || !name) return <OpenPicture />;

  const removable = meta.blocks.filter((block) => block.removable);
  const removableBytes = removable.reduce((sum, block) => sum + block.bytes, 0);

  const copyCoordinates = async () => {
    if (!coordinates) return;
    try {
      await navigator.clipboard.writeText(`${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* the figures are on screen and selectable */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-extrabold">{name}</h2>
          <p className="text-[12px] text-ink-soft">
            {meta.format.toUpperCase()} · {formatBytes(meta.bytes)}
            {meta.width > 0 && ` · ${meta.width} × ${meta.height}`}
          </p>
        </div>

        <button
          type="button"
          onClick={close}
          className="tint inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-2 text-[12.5px] font-semibold hover:border-danger hover:text-danger"
        >
          <CloseIcon size={14} />
          Close
        </button>
      </div>

      {preview && !previewBroken && (
        /* A plain <img>, deliberately. The source is a `blob:` URL for a file
           on this device: `next/image` would route it through the optimizer,
           which cannot fetch a blob URL and would re-encode the very bytes
           this app exists to leave untouched. Sized from the file's own header
           so it cannot shift layout (rule #7). */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={preview}
          alt={`Preview of ${name}`}
          width={meta.width || undefined}
          height={meta.height || undefined}
          onError={() => setPreviewBroken(true)}
          className="max-h-72 w-auto self-center rounded-[14px] border border-border object-contain"
        />
      )}

      {previewBroken && (
        <p className="rounded-xl border border-border bg-panel px-3 py-2 text-[12.5px] text-ink-soft">
          The picture itself could not be decoded — the file may be truncated. Its metadata was read
          and is shown below, and cleaning still works, since that edits the file&apos;s structure
          rather than the image.
        </p>
      )}

      {meta.warnings.map((warning) => (
        <p key={warning} className="rounded-xl border border-border bg-panel px-3 py-2 text-[12.5px] text-ink-soft">
          {warning}
        </p>
      ))}

      {coordinates && (
        <div className="rounded-[14px] border border-danger/50 bg-panel p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-bold">
            <LocationIcon size={16} />
            This picture carries its location
          </div>
          <p className="mt-1.5 font-mono text-[15px] tabular-nums">
            {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            Accurate to a few metres, and it travels with the file wherever it is sent. Copy the
            figures into Satellite Map&apos;s Find box to see where that is — nothing here contacts a
            map service, so the coordinates stay on this device unless you take them somewhere.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyCoordinates()}
              className="tint inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-accent hover:text-accent"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy coordinates"}
            </button>
            <button
              type="button"
              onClick={clean}
              className="tint rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-bold text-on-accent"
            >
              Take it out
            </button>
          </div>
        </div>
      )}

      {meta.tags.length === 0 && meta.text.length === 0 && meta.format !== "unknown" && (
        <p className="rounded-[14px] border border-border bg-panel p-5 text-center text-[13px] text-ink-soft">
          No EXIF and no text records — this file carries nothing about where or how it was made.
          Messaging apps and social networks strip it, so a picture that has been through one
          usually looks like this.
        </p>
      )}

      {GROUPS.map((group) => {
        const tags = meta.tags.filter((tag) => tag.group === group);
        if (tags.length === 0) return null;

        return (
          <section key={group} className="rounded-[14px] border border-border bg-panel p-4">
            <h3 className="text-[13px] font-bold">{GROUP_TITLES[group]}</h3>
            {group === "Thumbnail" && (
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
                A second, smaller copy of the picture is stored inside the file. On some cameras and
                editors it predates a crop — so the thumbnail can still show what you cropped out.
              </p>
            )}

            <dl className="mt-2.5 flex flex-col divide-y divide-border/60">
              {tags.map((tag) => (
                <div key={`${group}-${tag.id}`} className="flex gap-3 py-1.5 text-[12.5px]">
                  <dt className="w-[9.5rem] flex-none text-ink-soft">{tag.name}</dt>
                  <dd className="min-w-0 flex-1 break-words font-medium">{tag.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {meta.text.length > 0 && (
        <section className="rounded-[14px] border border-border bg-panel p-4">
          <h3 className="text-[13px] font-bold">Text records</h3>
          <dl className="mt-2.5 flex flex-col divide-y divide-border/60">
            {meta.text.map((record, index) => (
              <div key={`${record.key}-${index}`} className="flex gap-3 py-1.5 text-[12.5px]">
                <dt className="w-[9.5rem] flex-none text-ink-soft">{record.key}</dt>
                <dd className="min-w-0 flex-1 break-words font-medium">{record.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {meta.blocks.length > 0 && (
        <section className="rounded-[14px] border border-border bg-panel p-4">
          <h3 className="text-[13px] font-bold">What the file is made of</h3>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
            Every block in the container. {removable.length} of them —{" "}
            {formatBytes(removableBytes)} — are metadata that can come out without touching the
            picture.
          </p>

          <ul className="mt-2.5 flex flex-col divide-y divide-border/60">
            {meta.blocks.map((block, index) => (
              <li
                key={`${block.marker}-${index}`}
                className="flex items-baseline gap-3 py-1.5 text-[12.5px]"
              >
                <span className="w-16 flex-none font-mono text-[11.5px]">{block.marker}</span>
                <span className="min-w-0 flex-1">{block.kind}</span>
                <span className="flex-none tabular-nums text-ink-soft">
                  {formatBytes(block.bytes)}
                </span>
                <span
                  className={`w-20 flex-none text-right font-mono text-[10px] uppercase tracking-[.1em] ${
                    block.removable ? "text-accent" : "text-ink-soft"
                  }`}
                >
                  {block.removable ? "removable" : "kept"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
