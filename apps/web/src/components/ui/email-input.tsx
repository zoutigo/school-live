"use client";

import type { InputHTMLAttributes } from "react";

type EmailInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function EmailInput({
  className = "",
  ...props
}: EmailInputProps) {
  return (
    <input
      {...props}
      type="email"
      className={`rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
