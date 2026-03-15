"use client";

import type { InputHTMLAttributes } from "react";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export function DateInput({
  className = "",
  invalid = false,
  ...props
}: DateInputProps) {
  return (
    <input
      {...props}
      type="date"
      aria-invalid={invalid ? "true" : "false"}
      className={`rounded-[14px] border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 ${
        invalid
          ? "border-notification bg-notification/5 focus:border-notification focus:bg-notification/5 focus:ring-2 focus:ring-notification/20"
          : "border-warm-border focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
      } ${className}`}
    />
  );
}
