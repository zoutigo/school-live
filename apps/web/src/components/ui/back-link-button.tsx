import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type BackLinkButtonProps = {
  href: string;
  children?: ReactNode;
  className?: string;
};

export function BackLinkButton({
  href,
  children = "Retour",
  className = "",
}: BackLinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-card border border-primary bg-surface px-4 py-2 text-sm font-heading font-semibold text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
