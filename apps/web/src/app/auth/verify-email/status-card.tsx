"use client";

import Link from "next/link";
import { useTranslation } from "../../../i18n/useTranslation";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export function NoTokenStatusCard() {
  const { t } = useTranslation();
  return (
    <StatusCardBase
      success={false}
      title={t("verifyEmail.noToken.title")}
      message={t("verifyEmail.noToken.message")}
    />
  );
}

type ResultStatusCardProps = {
  success: boolean;
  message?: string;
  fallbackKey: "verified" | "invalidOrExpired" | "serverError";
};

export function ResultStatusCard({
  success,
  message,
  fallbackKey,
}: ResultStatusCardProps) {
  const { t } = useTranslation();
  const title = success
    ? t("verifyEmail.success.title")
    : t("verifyEmail.failure.title");
  const resolvedMessage = message ?? t(`verifyEmail.fallback.${fallbackKey}`);

  return (
    <StatusCardBase success={success} title={title} message={resolvedMessage} />
  );
}

function StatusCardBase({
  success,
  title,
  message,
}: {
  success: boolean;
  title: string;
  message: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-card text-center">
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        {success ? "✓" : "✗"}
      </div>
      <h1 className="font-heading text-xl font-semibold text-text-primary">
        {title}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
      {success && (
        <p className="mt-3 text-sm text-text-secondary">
          {t("verifyEmail.success.followUp")}
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        {t("verifyEmail.backToHome")}
      </Link>
    </div>
  );
}
