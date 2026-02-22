"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LegacyFirstPasswordRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const target = params.toString()
      ? `/onboarding?${params.toString()}`
      : "/onboarding";
    router.replace(target);
  }, [router, params]);

  return (
    <div className="min-h-screen bg-background p-6 text-text-secondary">
      Redirection vers le nouvel onboarding...
    </div>
  );
}

export default function FirstPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 text-text-secondary">
          Chargement...
        </div>
      }
    >
      <LegacyFirstPasswordRedirect />
    </Suspense>
  );
}
