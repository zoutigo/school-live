"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useOnboardingTourStore } from "../../store/onboarding-tour";

type Props = {
  id: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function OnboardingTarget({
  id,
  children,
  className,
  "data-testid": dataTestId,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const activeTourId = useOnboardingTourStore((state) => state.activeTourId);
  const steps = useOnboardingTourStore((state) => state.steps);
  const stepIndex = useOnboardingTourStore((state) => state.stepIndex);
  const setTargetRect = useOnboardingTourStore((state) => state.setTargetRect);

  const isActiveTarget = !!activeTourId && steps[stepIndex]?.targetKey === id;

  useEffect(() => {
    if (!isActiveTarget) return;

    let hasAutoScrolled = false;

    function measure() {
      const node = ref.current;
      const rect = node?.getBoundingClientRect();
      if (!node || !rect || rect.width <= 0 || rect.height <= 0) return;

      // A target further down a scrollable page/list can end up below the
      // fold (or, more rarely, above it) when its step activates — nudge it
      // into view once instead of leaving the user to notice and scroll
      // manually to see the spotlight.
      if (!hasAutoScrolled) {
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth =
          window.innerWidth || document.documentElement.clientWidth;
        const isFullyVisible =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= viewportHeight &&
          rect.right <= viewportWidth;
        if (!isFullyVisible) {
          hasAutoScrolled = true;
          node.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }

      setTargetRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isActiveTarget, setTargetRect]);

  return (
    <div
      ref={ref}
      className={className}
      data-tour-target={id}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}
