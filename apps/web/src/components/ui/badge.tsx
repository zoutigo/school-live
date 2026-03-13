import type { HTMLAttributes } from "react";

type BadgeVariant = "notification" | "neutral";

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  notification:
    "border border-[#f3b3b8] bg-[#fff1f2] text-[#b42318] shadow-[0_4px_12px_rgba(180,35,24,0.12)]",
  neutral: "border border-warm-border bg-warm-surface text-text-secondary",
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
