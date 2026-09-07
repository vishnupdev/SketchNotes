"use client";

import { useExifStore } from "@/store/useExifStore";
import { saveBlob } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { OpenPicture } from "@/components/Exif/molecules/OpenPicture";
import { BroomIcon, CheckIcon, DownloadIcon } from "@/components/SketchNotes/atoms/icons";

/**
 * Taking the metadata out, and being precise about what that means.
 *
 * The claim on this screen is the one the whole app rests on: **the picture is
 * not re-encoded.** The file is walked, the metadata blocks are dropped, and
 * every remaining byte — the compressed image data above all — is copied
 * through. The result is pixel-for-pixel identical, which the canvas
 * round-trip every other browser-based tool uses cannot say: that one costs a
 * generation of JPEG quality and the colour profile with it.
 *
 * Which is also why the ICC profile and the JFIF header are *kept*, and the
 * panel says so. They are instructions for decoding the picture correctly, not
 * facts about the photographer, and dropping the profile visibly shifts the
 * colours of a wide-gamut photo.
 */
export function CleanPanel() {
  const name = useExifStore((s) => s.name);
  const meta = useExifStore((s) => s.meta);
  const cleaned = useExifStore((s) => s.cleaned);
  const clean = useExifStore((s) => s.clean);

  if (!meta || !name) return <OpenPicture />;

  const removable = meta.blocks.filter((block) => block.removable);
  const kept = meta.blocks.filter((block) => !block.removable);
  const editable = meta.format === "jpeg" || meta.format === "png" || meta.format === "webp";

  const download = () => {
    if (!cleaned) return;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    saveBlob(
      new Blob([cleaned.bytes as unknown as BlobPart], { type: `image/${meta.format}` }),
      `${base}-clean${extension}`,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="truncate text-[15px] font-extrabold">{name}</h2>
        <p className="text-[12px] text-ink-soft">
          {meta.format.toUpperCase()} · {formatBytes(meta.bytes)}
        </p>
      </div>

      {!editable ? (
        <p className="rounded-[14px] border border-border bg-panel p-5 text-[13px] leading-relaxed text-ink-soft">
          This is a {meta.format === "gif" ? "GIF" : "file this cannot edit"}. Metadata is removed
          from JPEG, PNG and WebP only — for anything else the file is left exactly alone rather
          than rewritten into a format it wasn&apos;t.
        </p>
      ) : removable.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-panel p-5 text-[13px] leading-relaxed">
          <strong className="font-bold">Nothing to remove.</strong>{" "}
          <span className="text-ink-soft">
            This file carries no EXIF, no XMP, no comment and no text records. It is already as
            anonymous as the format allows.
          </span>
        </p>
      ) : (
        <>
          <section className="rounded-[14px] border border-border bg-panel p-4">
            <h3 className="text-[13px] font-bold">
              Coming out — {removable.length} block
              {removable.length === 1 ? "" : "s"}
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
              {removable.map((block, index) => (
                <li key={`${block.marker}-${index}`} className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-[11.5px] text-ink-soft">{block.marker}</span>{" "}
                    {block.kind}
                  </span>
                  <span className="flex-none tabular-nums text-ink-soft">
                    {formatBytes(block.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {kept.length > 0 && (
            <section className="rounded-[14px] border border-border bg-panel p-4">
              <h3 className="text-[13px] font-bold">Staying in — {kept.length}</h3>
              <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
                {kept.map((block, index) => (
                  <li key={`${block.marker}-${index}`} className="flex justify-between gap-3">
                    <span>
                      <span className="font-mono text-[11.5px] text-ink-soft">{block.marker}</span>{" "}
                      {block.kind}
                    </span>
                    <span className="flex-none tabular-nums text-ink-soft">
                      {formatBytes(block.bytes)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
                These are how the picture is decoded, not facts about you. Dropping the colour
                profile would visibly shift the colours of a wide-gamut photo, so it stays.
              </p>
            </section>
          )}

          {cleaned ? (
            <div className="rounded-[14px] border border-accent/45 bg-accent-soft p-4">
              <div className="flex items-center gap-2 text-[13.5px] font-bold">
                <CheckIcon size={16} />
                Cleaned — {formatBytes(cleaned.saved)} smaller
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed">
                {cleaned.removed.length} block{cleaned.removed.length === 1 ? "" : "s"} removed. The
                image data was copied through byte for byte, so this is the same picture at the same
                quality — not a re-encode.
              </p>
              <button
                type="button"
                onClick={download}
                className="tint mt-2.5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-on-accent"
              >
                <DownloadIcon size={15} />
                Save the clean copy
              </button>
              <p className="mt-2 text-[11.5px] text-ink-soft">
                Saved beside the original as{" "}
                <span className="font-mono">
                  {name.replace(/(\.[^.]+)?$/, "-clean$1")}
                </span>{" "}
                — the file you opened is never overwritten.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={clean}
              className="tint inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[14px] font-bold text-on-accent"
            >
              <BroomIcon size={17} />
              Remove it
            </button>
          )}
        </>
      )}
    </div>
  );
}
