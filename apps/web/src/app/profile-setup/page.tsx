"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "../../i18n/useTranslation";

function LegacyProfileSetupRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const target = params.toString()
      ? `/onboarding?${params.toString()}`
      : "/onboarding";
    router.replace(target);
  }, [router, params]);

  return (
    <div className="min-h-screen bg-background p-6 text-text-secondary">
      {t("profileSetup.redirecting")}
    </div>
  );
}

function ProfileSetupFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background p-6 text-text-secondary">
      {t("common.loading")}
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<ProfileSetupFallback />}>
      <LegacyProfileSetupRedirect />
    </Suspense>
  );
}
