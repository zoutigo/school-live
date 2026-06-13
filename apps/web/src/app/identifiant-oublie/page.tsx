"use client";

import { Suspense } from "react";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { useTranslation } from "../../i18n/useTranslation";
import { UsernameRecoveryClient } from "./username-recovery-client";

function UsernameRecoveryFallback() {
  const { t } = useTranslation();
  return (
    <div className="text-sm text-text-secondary">{t("common.loading")}</div>
  );
}

export default function UsernameRecoveryPage() {
  const { t } = useTranslation();
  return (
    <RecoveryShell title={t("recovery.username.shell.title")}>
      <div className="mx-auto w-full max-w-2xl">
        <Suspense fallback={<UsernameRecoveryFallback />}>
          <UsernameRecoveryClient />
        </Suspense>
      </div>
    </RecoveryShell>
  );
}
