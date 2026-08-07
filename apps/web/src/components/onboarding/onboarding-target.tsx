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

    function measure() {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setTargetRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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
