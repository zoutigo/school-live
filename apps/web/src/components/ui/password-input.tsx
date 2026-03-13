"use client";

import type { InputHTMLAttributes } from "react";
import { PasswordField } from "./password-field";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  return (
    <PasswordField
      {...props}
      className={`rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  );
}
