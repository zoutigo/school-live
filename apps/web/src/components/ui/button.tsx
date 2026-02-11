import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  iconLeft?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-card px-4 py-2 text-sm font-heading font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-surface hover:bg-primary-dark",
  secondary:
    "bg-surface text-primary border border-primary hover:bg-background",
  ghost: "bg-transparent text-primary hover:bg-background",
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
