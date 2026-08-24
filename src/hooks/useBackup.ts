"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyBackup,
  BackupError,
  createBackup,
  eraseWorkspaceData,
  readBackup,
} from "@/lib/backup";
import type { BackupSummary, RestoreMode } from "@/lib/backup/types";
import { BACKUP_KIND, saveFile } from "@/lib/download";
import { persistenceState, requestPersistence, storageBackend } from "@/lib/storage";

export type BackupPhase = "idle" | "exporting" | "reading" | "restoring" | "erasing";

/** A chosen file that has been read and validated, waiting for confirmation. */
export interface StagedRestore {
  fileName: string;
  entries: Record<string, string>;
  summary: BackupSummary;
}

export interface BackupState {
  phase: BackupPhase;
  busy: boolean;
  /** Last outcome, phrased for the user. */
  message: string;
  error: string;
  /** The backup file waiting to be applied, if one has been picked. */
  staged: StagedRestore | null;
  /** Whether the browser has exempted this origin's data from eviction. */
  persisted: boolean | null;
  /** Save everything to a file. */
  exportAll: () => void;
  /** Read and validate a chosen file; does not write anything. */
  stage: (file: File) => void;
  /** Discard the staged file. */
  cancel: () => void;
  /** Write the staged file into this browser, then reload. */
  restore: (mode: RestoreMode) => void;
  /** Delete every key the workspace owns, then reload. */
  erase: () => void;
  /** Ask the browser to keep this origin's data. */
  keepData: () => void;
}

/**
 * State for Settings → Data: taking a backup, restoring one, and asking the
 * browser not to evict what the workspace has saved.
 *
 * A restore ends in a full reload, deliberately. Every app reads its data once
 * at start-up (that is what keeps them independent of each other), so
 * re-hydrating every app's store in place would mean a new code path per app that
 * only ever run here — and any one of them missing would leave the user looking
 * at stale data and believing the restore failed.
 */
export function useBackup(): BackupState {
  const [phase, setPhase] = useState<BackupPhase>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [staged, setStaged] = useState<StagedRestore | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    void persistenceState().then((state) => {
      if (alive.current) setPersisted(state);
    });
    return () => {
      alive.current = false;
    };
  }, []);

  const fail = useCallback((e: unknown, fallback: string) => {
    if (!alive.current) return;
    setPhase("idle");
    setMessage("");
    setError(e instanceof BackupError ? e.message : fallback);
  }, []);

  const exportAll = useCallback(() => {
    setPhase("exporting");
    setError("");
    setMessage("");
    void (async () => {
      try {
        const { blob, name, summary } = await createBackup();
        const outcome = await saveFile(blob, name, BACKUP_KIND);
        if (!alive.current) return;
        setPhase("idle");
        if (outcome.kind === "cancelled") return;
        const kb = Math.max(1, Math.round(blob.size / 1024));
        setMessage(
          `Saved ${outcome.name} — ${summary.keys} keys, ${kb} KB${
            storageBackend() === "memory" ? " (this browser isn't storing data, so keep it safe)" : ""
          }.`,
        );
      } catch (e) {
        fail(e, "The backup couldn't be written. Try again.");
      }
    })();
  }, [fail]);

  const stage = useCallback(
    (file: File) => {
      setPhase("reading");
      setError("");
      setMessage("");
      void (async () => {
        try {
          const { entries, summary } = await readBackup(file);
          if (!alive.current) return;
          setStaged({ fileName: file.name, entries, summary });
          setPhase("idle");
        } catch (e) {
          fail(e, "That file couldn't be read.");
        }
      })();
    },
    [fail],
  );

  const cancel = useCallback(() => {
    setStaged(null);
    setError("");
    setMessage("");
  }, []);

  const restore = useCallback(
    (mode: RestoreMode) => {
      if (!staged) return;
      setPhase("restoring");
      setError("");
      void (async () => {
        try {
          await applyBackup(staged.entries, mode);
          // Reload rather than re-hydrate; see the note on this hook.
          window.location.reload();
        } catch (e) {
          fail(e, "The restore didn't finish. Nothing else was changed.");
        }
      })();
    },
    [staged, fail],
  );

  const erase = useCallback(() => {
    setPhase("erasing");
    setError("");
    void (async () => {
      try {
        await eraseWorkspaceData();
        window.location.reload();
      } catch (e) {
        fail(e, "Erasing didn't finish.");
      }
    })();
  }, [fail]);

  const keepData = useCallback(() => {
    void requestPersistence().then((granted) => {
      if (!alive.current) return;
      setPersisted(granted);
      setMessage(
        granted === true
          ? "This browser will keep the workspace's data even when space runs low."
          : granted === null
            ? "This browser doesn't offer that setting."
            : "The browser declined for now. Installing the app, or using it a few more times, usually earns it.",
      );
    });
  }, []);

  return {
    phase,
    busy: phase !== "idle",
    message,
    error,
    staged,
    persisted,
    exportAll,
    stage,
    cancel,
    restore,
    erase,
    keepData,
  };
}
