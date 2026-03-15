import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type ActionVariant = "neutral" | "primary" | "success" | "destructive";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: ActionVariant;
};

const variantClasses: Record<ActionVariant, string> = {
  neutral:
    "border-warm-border bg-warm-surface text-text-primary hover:bg-warm-highlight focus-visible:ring-primary",
  primary:
    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-primary",
  success:
    "border-accent-teal/30 bg-accent-teal/10 text-accent-teal-dark hover:bg-accent-teal/15 focus-visible:ring-accent-teal",
  destructive:
    "border-notification/40 bg-notification/10 text-notification hover:bg-notification/15 focus-visible:ring-notification",
};

export function ActionIconButton({
  icon: Icon,
  label,
  variant = "neutral",
  className = "",
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
