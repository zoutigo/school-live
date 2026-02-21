import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  ...props
}: Props) {
  return (
    <article
      className={`rounded-card border border-border bg-surface p-5 shadow-card ${className}`}
      {...props}
    >
      {title || actions ? (
        <div className="mb-1 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {actions}
        </div>
      ) : null}
      {subtitle ? (
        <p className="mb-3 text-sm text-text-secondary">{subtitle}</p>
      ) : null}
      {children}
    </article>
  );
}
