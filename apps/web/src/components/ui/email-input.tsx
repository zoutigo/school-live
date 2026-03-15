"use client";

import type { InputHTMLAttributes } from "react";

type EmailInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export function EmailInput({
  className = "",
  invalid = false,
  ...props
}: EmailInputProps) {
  return (
    <input
      {...props}
      type="email"
      aria-invalid={invalid ? "true" : "false"}
      className={`rounded-[14px] border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 placeholder:text-text-secondary/70 ${
        invalid
          ? "border-notification bg-notification/5 focus:border-notification focus:bg-notification/5 focus:ring-2 focus:ring-notification/20"
          : "border-warm-border focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
      } ${className}`}
    />
  );
}
