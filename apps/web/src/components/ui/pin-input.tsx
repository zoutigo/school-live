"use client";

import type { InputHTMLAttributes } from "react";
import { PasswordField } from "./password-field";

type PinInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PinInput({
  className = "",
  maxLength = 6,
  ...props
}: PinInputProps) {
  return (
    <PasswordField
      {...props}
      inputMode="numeric"
      maxLength={maxLength}
      className={`rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
