import {
  ShieldCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CalendarDays,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CalendarDays,
  Wallet,
};

export function TrainingQuizIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
