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
      className={`rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary ${className}`}
    />
  );
}
