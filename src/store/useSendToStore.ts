"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { clampValue, type SendItem } from "@/lib/sendto/types";
import type { AppId } from "@/store/useWorkspaceStore";

/**
 * The waiting room for a result on its way from one app to another.
 *
 * Shell-level and deliberately tiny, for the same reason `useIntakeStore` is:
 * the sender knows what it produced, the destination knows what to do with it,
 * and neither has to know the other exists (rules #4/#5). See
 * `lib/sendto/types.ts` for the whole arrangement.
 *
 * Reading is destructive. That is the load-bearing detail — an app re-mounts
 * whenever the user switches away and back, and a payload that survived being
 * taken would be re-applied every time, quietly appending the same paragraph to
 * a document on every visit.
 *
 * Never persisted. A send is meaningful for the second between tapping it and
 * arriving; reopening the workspace tomorrow should not deliver it again.
 */
interface SendToState {
  pending: SendItem[];

  /**
   * Address a payload to an app. Returns the item so a caller can report what
   * it sent. The id, the trimming and the cap are applied here so no producer
   * has to remember them.
   */
  send: (item: Omit<SendItem, "id">) => SendItem;
  /** Take the oldest payload addressed to `app`, removing it. */
  take: (app: AppId) => SendItem | null;
  clear: () => void;
}

export const useSendToStore = create<SendToState>((set, get) => ({
  pending: [],

  send: (draft) => {
    const item: SendItem = { ...draft, id: uid(), value: clampValue(draft.kind, draft.value) };
    set((s) => ({ pending: [...s.pending, item] }));
    return item;
  },

  take: (app) => {
    const item = get().pending.find((i) => i.to === app) ?? null;
    if (item) set((s) => ({ pending: s.pending.filter((i) => i.id !== item.id) }));
    return item;
  },

  clear: () => set({ pending: [] }),
}));

/**
 * Selector: is anything waiting for this app?
 *
 * Subscribing to a boolean rather than to `pending` is what keeps a destination
 * from re-rendering every time some other app sends something somewhere else.
 */
export const hasSendTo = (app: AppId) => (s: SendToState) => s.pending.some((i) => i.to === app);
