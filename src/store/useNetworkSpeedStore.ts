"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  isAbort,
  readConnection,
  runSpeedTest,
} from "@/lib/NetworkSpeed/speedtest";
import { HISTORY_LIMIT, loadHistory, saveHistory } from "@/lib/NetworkSpeed/history-api";
import type {
  ConnectionInfo,
  SpeedRecord,
  TestPhase,
  TestStatus,
} from "@/lib/NetworkSpeed/types";

/** Live per-phase readings shown while a test runs. */
interface LiveReadings {
  ping: number;
  jitter: number;
  download: number;
  upload: number;
}

const ZERO: LiveReadings = { ping: 0, jitter: 0, download: 0, upload: 0 };

interface NetworkSpeedState {
  status: TestStatus;
  phase: TestPhase;
  /** Live readings for the current/last run. */
  live: LiveReadings;
  /** Progress 0→1 of the active phase (download/upload). */
  progress: number;
  /** Browser connection hints, refreshed on hydrate + at each run. */
  connection: ConnectionInfo | null;
  error: string | null;
  history: SpeedRecord[];
  hydrated: boolean;

  hydrate: () => void;
  start: () => void;
  cancel: () => void;
  clearHistory: () => void;
}

// Module-level controller so a run survives component re-renders / app switches.
let controller: AbortController | null = null;

export const useNetworkSpeedStore = create<NetworkSpeedState>((set, get) => ({
  status: "idle",
  phase: "idle",
  live: ZERO,
  progress: 0,
  connection: null,
  error: null,
  history: [],
  hydrated: false,

  hydrate: () => {
    set({ connection: readConnection() });
    if (get().hydrated) return;
    void loadHistory().then((history) => set({ history, hydrated: true }));
  },

  start: () => {
    if (get().status === "running") return;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    const connection = readConnection();

    set({
      status: "running",
      phase: "ping",
      live: ZERO,
      progress: 0,
      error: null,
      connection,
    });

    void runSpeedTest(
      {
        onPhase: (phase) => set({ phase, progress: 0 }),
        onPing: (ping, jitter) => set((s) => ({ live: { ...s.live, ping, jitter } })),
        onDownload: (download, progress) =>
          set((s) => ({ live: { ...s.live, download }, progress })),
        onUpload: (upload, progress) =>
          set((s) => ({ live: { ...s.live, upload }, progress })),
      },
      signal,
    )
      .then((result) => {
        const record: SpeedRecord = {
          id: uid(),
          at: Date.now(),
          ...result,
          connection,
        };
        const history = [record, ...get().history].slice(0, HISTORY_LIMIT);
        saveHistory(history);
        set({
          status: "done",
          phase: "done",
          progress: 1,
          live: { ping: result.ping, jitter: result.jitter, download: result.download, upload: result.upload },
          history,
        });
      })
      .catch((err: unknown) => {
        if (isAbort(err)) {
          set({ status: "idle", phase: "idle", progress: 0 });
          return;
        }
        const message =
          !navigator.onLine
            ? "You appear to be offline. Connect to a network and try again."
            : "Couldn't reach the speed-test server. Check your connection or any content blockers and try again.";
        set({ status: "error", phase: "idle", error: message });
      });
  },

  cancel: () => {
    controller?.abort();
    controller = null;
    set({ status: "idle", phase: "idle", progress: 0 });
  },

  clearHistory: () => {
    saveHistory([]);
    set({ history: [] });
  },
}));
