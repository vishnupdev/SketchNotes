"use client";

import { create } from "zustand";
import { DEFAULT_NEWS_TAB } from "@/lib/News/catalog";

interface NewsState {
  /** Currently selected news tab id (see NEWS_TABS in lib/News/catalog). */
  activeTab: string;
  setActiveTab: (id: string) => void;
}

/** UI state for the News app — which tab the feed is showing. */
export const useNewsStore = create<NewsState>((set) => ({
  activeTab: DEFAULT_NEWS_TAB,
  setActiveTab: (activeTab) => set({ activeTab }),
}));
