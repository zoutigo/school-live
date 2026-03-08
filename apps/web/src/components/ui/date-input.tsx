"use client";

import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DateInput({ className = "", ...props }: DateInputProps) {
  return (
    <input
      {...props}
      type="date"
      className={`rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
