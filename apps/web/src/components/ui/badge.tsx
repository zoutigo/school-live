import type { HTMLAttributes } from "react";

type BadgeVariant = "notification" | "neutral";

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  notification: "bg-notification text-surface",
  neutral: "bg-background text-text-secondary border border-border",
};

export function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-heading font-semibold ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
