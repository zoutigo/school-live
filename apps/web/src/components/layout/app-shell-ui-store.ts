"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppShellUiState = {
  hasOpenedMobileMenu: boolean;
  markMobileMenuOpened: () => void;
  reset: () => void;
};

const initialState = {
  hasOpenedMobileMenu: false,
};

export const useAppShellUiStore = create<AppShellUiState>()(
  persist(
    (set) => ({
      ...initialState,
      markMobileMenuOpened: () =>
        set(() => ({
          hasOpenedMobileMenu: true,
        })),
      reset: () =>
        set(() => ({
          ...initialState,
        })),
    }),
    {
      name: "app-shell-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasOpenedMobileMenu: state.hasOpenedMobileMenu,
      }),
    },
  ),
);
