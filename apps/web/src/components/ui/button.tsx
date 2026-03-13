import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  iconLeft?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-card px-4 py-2 text-sm font-heading font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-surface shadow-[0_12px_24px_rgba(12,95,168,0.18)] hover:bg-primary-dark hover:shadow-[0_16px_30px_rgba(12,95,168,0.24)]",
  secondary:
    "border border-warm-border bg-warm-surface text-primary hover:bg-warm-highlight",
  ghost: "bg-transparent text-primary hover:bg-warm-highlight/70",
};

export function Button({
  variant = "primary",
  iconLeft,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {iconLeft}
      {children}
    </button>
  );
}
