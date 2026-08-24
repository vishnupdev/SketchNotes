"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useIntakeStore } from "@/store/useIntakeStore";
import { classifyFile } from "@/lib/intake/classify";
import {
  clearShareMarker,
  onLaunchFiles,
  shareMarker,
  takeSharedArrival,
  type Arrival,
} from "@/lib/intake/arrivals";
import { INTAKE_TARGETS, type IntakeItem } from "@/lib/intake/types";
import { cx, uid } from "@/lib/utils";

/**
 * Brings files and text in from the operating system.
 *
 * Two sources — being launched with a file (`file_handlers`) and being shared to
 * (`share_target`) — become one list of arrivals, each routed to the app that
 * can open it. The point of it is that an installed OneApp behaves like an
 * application: double-clicking a PDF opens it here, and a photo shared from the
 * gallery lands in Image Studio, rather than the user having to open the app,
 * find the right tool and browse for the file they were already holding.
 *
 * Headless apart from one line of feedback, which only appears when something
 * arrives that nothing here can open — silence in that case would look like the
 * file had been swallowed.
 */
export function IntakeBridge() {
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);
  const openSettings = useWorkspaceStore((s) => s.openSettings);
  const push = useIntakeStore((s) => s.push);
  const setProblem = useIntakeStore((s) => s.setProblem);
  const problem = useIntakeStore((s) => s.problem);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const receive = async (arrival: Arrival, via: IntakeItem["via"]) => {
      const items: IntakeItem[] = [];
      const rejected: string[] = [];

      for (const incoming of arrival.files) {
        const kind = await classifyFile(incoming.file);
        if (!kind) {
          rejected.push(incoming.file.name);
          continue;
        }
        items.push({ id: uid(), kind, file: incoming.file, handle: incoming.handle, via });
      }

      // Shared text and links have no file to classify; the board is where a
      // saved link or a scrap of text belongs.
      const text = (arrival.text ?? "").trim();
      const url = (arrival.url ?? "").trim();
      if (text || url) {
        items.push({ id: uid(), kind: "text", text, url, title: arrival.title, via });
      }

      if (cancelled) return;

      if (items.length === 0) {
        setProblem(
          rejected.length
            ? `Nothing here can open ${rejected.join(", ")}. OneApp opens PDFs, images, sketch notes and its own backups.`
            : "",
        );
        return;
      }

      push(items);
      setDismissed(false);
      if (rejected.length) {
        setProblem(`${rejected.join(", ")} was left alone — no app here opens that kind of file.`);
      }

      // Go where the *first* arrival belongs. Several files of one kind open
      // together in that app; a mixed drop takes the first and leaves the rest
      // waiting, which each app picks up as it is opened.
      const target = INTAKE_TARGETS[items[0].kind];
      if ("settings" in target) {
        openSettings();
        return;
      }
      if (target.app === "pdf") setPdfTool(target.tool ?? null);
      setActiveApp(target.app, { intro: false });
    };

    // Set the launch consumer synchronously on mount: the queue holds exactly
    // one launch and flushes it the moment a consumer exists, so anything that
    // awaits first risks missing it.
    onLaunchFiles((arrival) => void receive(arrival, "file-handler"));

    const marker = shareMarker();
    if (marker !== null) {
      void takeSharedArrival().then((arrival) => {
        clearShareMarker();
        if (cancelled) return;
        if (arrival) {
          void receive(arrival, "share");
          return;
        }
        // Nothing to read. Say why, rather than leaving the user looking at a
        // workspace that ignored what they shared.
        setProblem(
          marker === "missed"
            ? "That share arrived before the app was ready, so nothing was saved to this device — open OneApp once, then share again."
            : marker === "failed"
              ? "That share couldn't be read. Try sharing it again, or open the file from inside the app."
              : "",
        );
      });
    }

    return () => {
      cancelled = true;
    };
  }, [openSettings, push, setActiveApp, setPdfTool, setProblem]);

  if (!problem || dismissed) return null;

  return (
    <div
      role="status"
      className={cx(
        "fixed inset-x-3 bottom-3 z-70 mx-auto flex max-w-130 items-start gap-3",
        "rounded-xl border border-border bg-panel p-3.5 shadow-panel",
      )}
    >
      <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-soft">{problem}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex-none rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-ink-soft hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        OK
      </button>
    </div>
  );
}
