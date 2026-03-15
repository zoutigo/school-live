"use client";

import type { InputHTMLAttributes } from "react";
import { PasswordField } from "./password-field";

type PinInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PinInput({
  className = "",
  maxLength = 6,
  ...props
}: PinInputProps) {
  const invalid = props["aria-invalid"] === "true";
  return (
    <PasswordField
      {...props}
      inputMode="numeric"
      maxLength={maxLength}
      className={`rounded-[14px] border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary/70 ${
        invalid
          ? "border-notification bg-notification/5 focus:border-notification focus:bg-notification/5 focus:ring-2 focus:ring-notification/20"
          : "border-warm-border focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
      } ${className}`}
    />
  );
}
