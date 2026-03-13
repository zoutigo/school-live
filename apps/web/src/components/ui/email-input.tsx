"use client";

import type { InputHTMLAttributes } from "react";

type EmailInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function EmailInput({ className = "", ...props }: EmailInputProps) {
  return (
    <input
      {...props}
      type="email"
      className={`rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}
