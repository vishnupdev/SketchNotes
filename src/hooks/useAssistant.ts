"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { answerLocally, buildContext } from "@/lib/Assistant/agent";
import {
  askDeviceModel,
  deviceModelAvailability,
  isDeviceModelSupported,
  type ModelAvailability,
  type ProgressFn,
} from "@/lib/Assistant/prompt-api";
import type { AgentReply, EngineMode } from "@/lib/Assistant/types";

interface UseAssistantArgs {
  /** Which brain to answer with. */
  mode: EngineMode;
  /** Reports on-device model download progress (fraction 0..1). */
  onProgress?: ProgressFn;
}

/**
 * Ask the assistant a question. Modelled as a mutation because each ask is a
 * one-off action with no cacheable identity — the same question can be asked
 * again later and should be answered again.
 *
 * Engine selection:
 * - `local`  — always the bundled retrieval engine: instant, offline, no model.
 * - `device` — the browser's built-in on-device model, downloading it if needed.
 * - `auto`   — the on-device model when it is *already* downloaded (no surprise
 *   downloads by default), otherwise the local engine.
 *
 * Either way the answer is grounded in the same knowledge base, and any
 * on-device failure silently falls back to the local reply — the user always
 * gets an answer.
 */
export function useAssistant({ mode, onProgress }: UseAssistantArgs) {
  return useMutation<AgentReply, Error, string>({
    mutationFn: async (question) => {
      const local = answerLocally(question);

      // Chit-chat, navigation and generated lists are answered verbatim.
      if (mode === "local" || !local.rephrasable || !local.matches.length) return local.reply;

      if (!isDeviceModelSupported()) return local.reply;
      const availability = await deviceModelAvailability();
      const usable = mode === "device" ? availability !== "unavailable" : availability === "available";
      if (!usable) return local.reply;

      try {
        const text = await askDeviceModel({
          question,
          context: buildContext(local.matches),
          onProgress,
        });
        // Actions and follow-ups still come from retrieval, so the buttons stay
        // correct no matter how the model phrased things.
        return { ...local.reply, text, engine: "device" };
      } catch {
        return local.reply;
      }
    },
  });
}

/**
 * Availability of the browser's built-in model, resolved after mount (the check
 * is client-only and asynchronous). `null` while still unknown.
 */
export function useDeviceModelStatus(): ModelAvailability | null {
  const [status, setStatus] = useState<ModelAvailability | null>(null);

  useEffect(() => {
    let alive = true;
    if (!isDeviceModelSupported()) {
      setStatus("unavailable");
      return;
    }
    void deviceModelAvailability().then((a) => {
      if (alive) setStatus(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  return status;
}
