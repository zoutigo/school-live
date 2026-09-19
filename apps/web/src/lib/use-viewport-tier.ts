"use client";

import { useEffect, useState } from "react";

export type ViewportTier = "mobile" | "tablet" | "desktop";

/**
 * Palier d'affichage dérivé de la largeur de fenêtre, pour les écrans qui ont
 * besoin de trois layouts distincts (pas juste un simple "compact vs large") :
 * mobile (< 640px), tablette (640-1023px), desktop (>= 1024px).
 */
export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>("desktop");

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const tabletQuery = window.matchMedia("(max-width: 1023px)");

    const onChange = () => {
      if (mobileQuery.matches) {
        setTier("mobile");
      } else if (tabletQuery.matches) {
        setTier("tablet");
      } else {
        setTier("desktop");
      }
    };

    onChange();
    mobileQuery.addEventListener("change", onChange);
    tabletQuery.addEventListener("change", onChange);
    return () => {
      mobileQuery.removeEventListener("change", onChange);
      tabletQuery.removeEventListener("change", onChange);
    };
  }, []);

  return tier;
}
