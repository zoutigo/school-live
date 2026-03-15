"use client";

import { CheckCircle2, Hourglass } from "lucide-react";
import { useEffect, useState } from "react";

type SuccessRedirectToastProps = {
  open: boolean;
  title: string;
  description: string;
  durationSeconds?: number;
  countdownLabel?: string;
  onComplete: () => void;
};

export function SuccessRedirectToast({
  open,
  title,
  description,
  durationSeconds = 5,
  countdownLabel = "Redirection vers l ecran de connexion dans",
  onComplete,
}: SuccessRedirectToastProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  useEffect(() => {
    if (!open) {
      setRemainingSeconds(durationSeconds);
      return;
    }

    setRemainingSeconds(durationSeconds);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setRemainingSeconds(Math.max(durationSeconds - elapsedSeconds, 0));
    }, 250);
    const timeoutId = window.setTimeout(() => {
      onComplete();
    }, durationSeconds * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [durationSeconds, onComplete, open]);

  if (!open) {
    return null;
  }

  const progressWidth = `${Math.max(
    0,
    (remainingSeconds / durationSeconds) * 100,
  )}%`;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(18,28,45,0.18)] px-4 backdrop-blur-[2px]">
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[26px] border border-warm-border/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.98)_0%,rgba(255,247,236,0.98)_100%)] shadow-[0_28px_80px_rgba(80,52,24,0.18)]"
        data-testid="success-redirect-toast"
        role="status"
      >
        <div className="relative p-6">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-success/12 blur-3xl" />
          <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-success/20 bg-success/12 text-success shadow-[0_10px_24px_rgba(46,160,67,0.15)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Procedure terminee
              </p>
              <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {description}
              </p>

              <div className="mt-5 rounded-[18px] border border-warm-border/70 bg-surface/90 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Hourglass className="h-4 w-4 text-primary" />
                    {countdownLabel}
                  </p>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-sm font-semibold text-surface">
                    {remainingSeconds}s
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-warm-border/50">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2ea043_0%,#0c5fa8_100%)] transition-[width] duration-300"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
