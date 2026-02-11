import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export function Card({
  title,
  subtitle,
  children,
  className = "",
  ...props
}: Props) {
  return (
    <article
      className={`rounded-card border border-border bg-surface p-5 shadow-card ${className}`}
      {...props}
    >
      {title ? (
        <h3 className="mb-1 font-heading text-lg font-semibold text-text-primary">
          {title}
        </h3>
      ) : null}
      {subtitle ? (
        <p className="mb-3 text-sm text-text-secondary">{subtitle}</p>
      ) : null}
      {children}
    </article>
  );
}
