"use client";

import type { ReactNode } from "react";

type RecoveryShellProps = {
  title: string;
  children: ReactNode;
  contentMaxWidthClassName?: string;
  centerContent?: boolean;
};

export function RecoveryShell({
  title,
  children,
  contentMaxWidthClassName = "max-w-3xl",
  centerContent = true,
}: RecoveryShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-x-hidden bg-background text-text-primary">
      <header
        className="flex h-16 items-center justify-between border-b border-border bg-surface px-4"
        data-testid="recovery-header"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-primary-dark font-heading text-sm font-bold text-surface shadow-[0_10px_20px_rgba(12,95,168,0.2)]">
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
          className="hidden w-14 shrink-0 border-r border-border bg-gradient-to-b from-sidebar-bg via-primary to-[#083a64] md:block"
          data-testid="recovery-sidebar"
          aria-hidden
        />
        <main
          className={`flex min-w-0 flex-1 p-4 sm:p-6 ${
            centerContent
              ? "items-center justify-center"
              : "items-start justify-center"
          }`}
        >
          <div className={`w-full ${contentMaxWidthClassName}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
