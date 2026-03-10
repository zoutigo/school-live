"use client";

import type { InputHTMLAttributes } from "react";

type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function TimeInput({ className = "", ...props }: TimeInputProps) {
  return (
    <input
      {...props}
      type="time"
      className={`rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
