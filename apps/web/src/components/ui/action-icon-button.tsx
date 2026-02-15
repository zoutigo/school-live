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
    "border-border bg-surface text-text-primary hover:bg-background focus-visible:ring-primary",
  primary:
    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 focus-visible:ring-primary",
  success:
    "border-success/30 bg-success/10 text-success hover:bg-success/15 focus-visible:ring-success",
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-card border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
