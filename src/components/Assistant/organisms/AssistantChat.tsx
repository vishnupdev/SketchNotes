"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useAssistantStore } from "@/store/useAssistantStore";
import { useAssistant, useDeviceModelStatus } from "@/hooks/useAssistant";
import { useTheme } from "@/hooks/useTheme";
import { Composer } from "@/components/Assistant/molecules/Composer";
import { EngineToggle } from "@/components/Assistant/molecules/EngineToggle";
import { MessageList } from "@/components/Assistant/molecules/MessageList";
import { QuickStart } from "@/components/Assistant/molecules/QuickStart";
import { TrashSmallIcon } from "@/components/SketchNotes/atoms/icons";
import { uid } from "@/lib/utils";
import type { AgentAction, ChatMessage } from "@/lib/Assistant/types";

/**
 * The assistant conversation: composer, thread, engine choice.
 *
 * Asking runs through {@link useAssistant}, which answers from the workspace
 * knowledge base and — where the browser provides a built-in on-device model —
 * has it phrase the reply.
 *
 * This is also where the agent acts. An answer's "Open <app>" buttons run
 * through {@link runAction}; an *instruction* ("open the timer", "turn on dark
 * mode") comes back with `reply.run` and is carried out immediately, so asking
 * for something in chat does the thing rather than just describing it.
 */
export function AssistantChat() {
  const setActiveApp = useWorkspaceStore((s) => s.setActiveApp);
  const setPdfTool = useWorkspaceStore((s) => s.setPdfTool);
  const openSettings = useWorkspaceStore((s) => s.openSettings);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  // Theme lives in shared workspace state, so the agent can set it for you.
  const { setTheme } = useTheme();

  const messages = useAssistantStore((s) => s.messages);
  const mode = useAssistantStore((s) => s.mode);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const setMode = useAssistantStore((s) => s.setMode);
  const clear = useAssistantStore((s) => s.clear);
  const hydrate = useAssistantStore((s) => s.hydrate);

  // Adopt the persisted thread once, after mount.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const deviceStatus = useDeviceModelStatus();

  // On-device model download progress (0..1), null when not downloading.
  const [download, setDownload] = useState<number | null>(null);
  const onProgress = useCallback((fraction: number) => {
    setDownload(fraction >= 1 ? null : fraction);
  }, []);

  const { mutate, isPending } = useAssistant({ mode, onProgress });

  const runAction = useCallback(
    (action: AgentAction) => {
      switch (action.kind) {
        case "overlay":
          if (action.overlay === "settings") openSettings();
          else openLauncher();
          return;
        case "theme":
          setTheme(action.themeId);
          return;
        case "chat":
          clear();
          return;
        default:
          // Set the PDF section before switching, so the editor opens straight into it.
          if (action.app === "pdf") setPdfTool(action.tool ?? null);
          setActiveApp(action.app);
      }
    },
    [clear, openLauncher, openSettings, setActiveApp, setPdfTool, setTheme],
  );

  const ask = useCallback(
    (question: string) => {
      if (isPending) return;
      addMessage({ id: uid(), role: "user", text: question, ts: Date.now() });
      mutate(question, {
        onSettled: () => setDownload(null),
        onSuccess: (reply) => {
          // Carry out an instruction before replying, so "clear the chat" leaves
          // the confirmation behind and a jump lands with the answer in place.
          if (reply.run) runAction(reply.run);
          const message: ChatMessage = {
            id: uid(),
            role: "agent",
            text: reply.text,
            ts: Date.now(),
            actions: reply.actions,
            suggestions: reply.suggestions,
            engine: reply.engine,
          };
          addMessage(message);
        },
        onError: () => {
          addMessage({
            id: uid(),
            role: "agent",
            text: "Something went wrong working that out. Try asking again, or rephrase it.",
            ts: Date.now(),
            suggestions: ["List all the apps", "What is OneApp?"],
          });
        },
      });
    },
    [addMessage, isPending, mutate, runAction],
  );

  /*
   * A question handed over from the command palette, asked as soon as this app
   * is on screen. Taken from the store (which clears it) rather than read, so a
   * re-render — or coming back to the app later — can never re-ask it.
   */
  const takePending = useAssistantStore((s) => s.takePending);
  const pending = useAssistantStore((s) => s.pending);
  useEffect(() => {
    if (pending === null || isPending) return;
    const question = takePending();
    if (question) ask(question);
  }, [ask, isPending, pending, takePending]);

  const thinkingLabel =
    download !== null ? `Downloading the on-device model… ${Math.round(download * 100)}%` : undefined;

  return (
    // A chat column: the thread scrolls, the composer stays put. `min-h-0` is
    // what lets the scroll area shrink inside the flex parent.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <EngineToggle
          value={mode}
          onChange={setMode}
          deviceUnsupported={deviceStatus === "unavailable"}
        />
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <TrashSmallIcon size={14} />
            Clear chat
          </button>
        )}
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5">
        <div className="mx-auto w-full max-w-[760px] pb-4">
          {messages.length === 0 ? (
            <QuickStart onAsk={ask} />
          ) : (
            <MessageList
              messages={messages}
              thinking={isPending}
              thinkingLabel={thinkingLabel}
              onSuggestion={ask}
              onAction={runAction}
            />
          )}

          <p className="mt-5 text-[12px] leading-relaxed text-ink-soft">
            Answers come from a built-in description of this workspace, so they stay accurate and
            work with no connection. If your browser provides an on-device AI model (latest Chrome
            &amp; Edge) it phrases the reply — still entirely on your device. Nothing you type is
            sent anywhere, and the chat is saved only in this browser.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-paper px-5 py-3">
        <div className="mx-auto w-full max-w-[760px]">
          <Composer onSubmit={ask} busy={isPending} />
        </div>
      </div>
    </div>
  );
}
