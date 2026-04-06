"use client";

import React from "react";
import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type ControlProps = {
  invalid?: boolean;
  className?: string;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & ControlProps;
type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;
type DateTimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;
type ColorInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;
type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & ControlProps;
type TextareaInputProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  ControlProps;
type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;
type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;
type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
  ControlProps;

function buildControlClassName({
  invalid = false,
  className = "",
}: ControlProps): string {
  return [
    "rounded-[14px] border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200",
    invalid
      ? "border-notification bg-notification/5 focus:border-notification focus:bg-notification/5 focus:ring-2 focus:ring-notification/20"
      : "border-warm-border focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const FormTextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function FormTextInput(
    { invalid = false, className = "", ...props }: TextInputProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        aria-invalid={invalid ? "true" : "false"}
        className={buildControlClassName({ invalid, className })}
      />
    );
  },
);

export const FormNumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function FormNumberInput(
    { invalid = false, className = "", ...props }: NumberInputProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type="number"
        aria-invalid={invalid ? "true" : "false"}
        className={buildControlClassName({ invalid, className })}
      />
    );
  },
);

export const FormDateTimeInput = forwardRef<
  HTMLInputElement,
  DateTimeInputProps
>(function FormDateTimeInput(
  { invalid = false, className = "", ...props }: DateTimeInputProps,
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="datetime-local"
      aria-invalid={invalid ? "true" : "false"}
      className={buildControlClassName({ invalid, className })}
    />
  );
});

export const FormColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  function FormColorInput(
    { invalid = false, className = "", ...props }: ColorInputProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type="color"
        aria-invalid={invalid ? "true" : "false"}
        className={[
          "h-8 w-10 cursor-pointer rounded border bg-warm-surface p-0.5 outline-none transition-all duration-200",
          invalid
            ? "border-notification ring-2 ring-notification/20"
            : "border-warm-border focus:ring-2 focus:ring-primary/20",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

export const FormSelect = forwardRef<HTMLSelectElement, SelectInputProps>(
  function FormSelect(
    { invalid = false, className = "", ...props }: SelectInputProps,
    ref,
  ) {
    return (
      <select
        {...props}
        ref={ref}
        aria-invalid={invalid ? "true" : "false"}
        className={buildControlClassName({ invalid, className })}
      />
    );
  },
);

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  function FormTextarea(
    { invalid = false, className = "", ...props }: TextareaInputProps,
    ref,
  ) {
    return (
      <textarea
        {...props}
        ref={ref}
        aria-invalid={invalid ? "true" : "false"}
        className={buildControlClassName({ invalid, className })}
      />
    );
  },
);

export const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function FormCheckbox(
    { invalid = false, className = "", ...props }: CheckboxProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type="checkbox"
        aria-invalid={invalid ? "true" : "false"}
        className={[
          "h-4 w-4 rounded border bg-warm-surface text-primary outline-none transition-all duration-200",
          invalid
            ? "border-notification ring-2 ring-notification/20"
            : "border-warm-border focus:ring-2 focus:ring-primary/20",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

export const FormRadio = forwardRef<HTMLInputElement, RadioProps>(
  function FormRadio(
    { invalid = false, className = "", ...props }: RadioProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type="radio"
        aria-invalid={invalid ? "true" : "false"}
        className={[
          "h-4 w-4 border bg-warm-surface text-primary outline-none transition-all duration-200",
          invalid
            ? "border-notification ring-2 ring-notification/20"
            : "border-warm-border focus:ring-2 focus:ring-primary/20",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

export const FormFileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FormFileInput(
    { invalid = false, className = "", ...props }: FileInputProps,
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type="file"
        aria-invalid={invalid ? "true" : "false"}
        className={className}
      />
    );
  },
);

type SubmitHintProps = {
  visible: boolean;
  message?: string;
  className?: string;
};

export function FormSubmitHint({
  visible,
  message = "Vous devez remplir correctement les champs obligatoires.",
  className = "",
}: SubmitHintProps) {
  if (!visible) {
    return null;
  }
  return (
    <p className={`text-[11px] leading-4 text-notification ${className}`}>
      {message}
    </p>
  );
}
