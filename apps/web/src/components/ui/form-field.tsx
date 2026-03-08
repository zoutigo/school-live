"use client";

import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string | null;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <label className={`grid gap-1 text-sm ${className}`} htmlFor={htmlFor}>
      <span className="text-text-secondary">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-notification">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="text-xs text-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}
