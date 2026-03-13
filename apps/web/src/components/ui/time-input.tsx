"use client";

import type { InputHTMLAttributes } from "react";

type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function TimeInput({ className = "", ...props }: TimeInputProps) {
  return (
    <input
      {...props}
      type="time"
      className={`rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}
