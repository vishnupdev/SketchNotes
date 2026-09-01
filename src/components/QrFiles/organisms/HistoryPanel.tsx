"use client";

import { useState } from "react";
import { useQrFilesStore } from "@/store/useQrFilesStore";
import { FileTile } from "@/components/QrFiles/molecules/FileTile";
import { TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { timeAgo } from "@/lib/utils";

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3.5 py-2 text-[12.5px] font-semibold text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const DANGER =
  "inline-flex items-center gap-2 rounded-full border border-danger px-3.5 py-2 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger hover:text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-danger";

/**
 * What has passed through, and deliberately only that.
 *
 * The list holds a file's name, size and code count — never its contents. A
 * video large enough to be worth converting would fill the browser's whole
 * storage quota on its own, and an app whose promise is "your file passes
 * through here" has no business keeping a copy of everything that ever did.
 *
 * So a row cannot re-open a file, and says so rather than offering a button that
 * would have to lie. What it is good for is the question that actually comes up:
 * how many codes was that photo, at which setting, so the next one can be
 * planned before it is dropped in.
 */
export function HistoryPanel() {
  const history = useQrFilesStore((s) => s.history);
  const forget = useQrFilesStore((s) => s.forget);
  const clearHistory = useQrFilesStore((s) => s.clearHistory);
  const [confirming, setConfirming] = useState(false);

  if (history.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-panel p-5 text-center text-[13px] leading-relaxed text-ink-soft">
        Nothing yet. Files you turn into codes, and files you rebuild from them, are listed here —
        their names and sizes only, never their contents.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul role="list" className="flex flex-col gap-2.5">
        {history.map((entry) => (
          <li key={entry.id}>
            <FileTile
              name={entry.name}
              mime={entry.mime}
              size={entry.size}
              fileClass={entry.fileClass}
              parts={entry.parts}
              note={`${entry.origin === "encoded" ? "Turned into codes" : "Rebuilt from codes"} ${timeAgo(entry.ts)}`}
              actions={
                <button
                  type="button"
                  onClick={() => forget(entry.id)}
                  aria-label={`Remove ${entry.name} from the list`}
                  title="Remove from the list"
                  className="grid size-9 place-items-center rounded-full border border-border text-ink-soft transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <TrashSmallIcon size={15} />
                </button>
              }
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (confirming ? clearHistory() : setConfirming(true))}
          className={confirming ? DANGER : BTN}
        >
          {confirming ? "Really clear the list" : "Clear the list"}
        </button>
        {confirming && (
          <button type="button" onClick={() => setConfirming(false)} className={BTN}>
            Keep it
          </button>
        )}
        <p className="text-[12px] text-ink-soft">
          Kept on this device only, and clearable here or from Settings → Data.
        </p>
      </div>
    </div>
  );
}
