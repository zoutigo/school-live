import {
  ShieldCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CalendarDays,
  Wallet,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Sparkles,
  BookOpen,
  MessageSquare,
  CalendarDays,
  Wallet,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  Newspaper,
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
