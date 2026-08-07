"use client";

import { useEffect } from "react";
import { create } from "zustand";

export type PageHelpSection = { title: string; body: string[] };

export type PageHelpContent = {
  title: string;
  sections: PageHelpSection[];
};

type PageHelpState = {
  entry: PageHelpContent | null;
  open: boolean;
  setPageHelp: (entry: PageHelpContent | null) => void;
  openHelp: () => void;
  closeHelp: () => void;
};

export const usePageHelpStore = create<PageHelpState>((set) => ({
  entry: null,
  open: false,
  setPageHelp: (entry) => set({ entry }),
  openHelp: () => set({ open: true }),
  closeHelp: () => set({ open: false }),
}));

/**
 * Registers this page's Aide content in the global sidebar menu (see
 * AppSidebar) for as long as the calling component stays mounted. Content
 * is keyed off `JSON.stringify` since callers rebuild the object on every
 * render (translated strings) — cheap given how small this payload is.
 */
export function usePageHelp(content: PageHelpContent | null) {
  const setPageHelp = usePageHelpStore((state) => state.setPageHelp);
  const serialized = content ? JSON.stringify(content) : null;

  useEffect(() => {
    setPageHelp(content);
    return () => setPageHelp(null);
  }, [serialized, setPageHelp]);
}
