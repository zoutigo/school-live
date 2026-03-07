"use client";

import type { ReactNode } from "react";

type RecoveryShellProps = {
  title: string;
  children: ReactNode;
};

export function RecoveryShell({ title, children }: RecoveryShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-text-primary">
      <header
        className="flex h-16 items-center justify-between border-b border-border bg-surface px-4"
        data-testid="recovery-header"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-card bg-primary font-heading text-sm font-bold text-surface">
            SL
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-text-primary">
              scolive
            </p>
            <p className="text-xs text-text-secondary">Portail recuperation</p>
          </div>
        </div>

        <h1 className="hidden font-heading text-base font-semibold text-text-primary md:block">
          {title}
        </h1>

        <div className="hidden w-[164px] md:block" aria-hidden />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-14 shrink-0 border-r border-border bg-primary md:block"
          data-testid="recovery-sidebar"
          aria-hidden
        />
        <main className="flex min-w-0 flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
