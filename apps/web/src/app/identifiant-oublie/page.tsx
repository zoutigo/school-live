import { Suspense } from "react";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { UsernameRecoveryClient } from "./username-recovery-client";

export default function UsernameRecoveryPage() {
  return (
    <RecoveryShell title="Recuperation par identifiant">
      <div className="mx-auto w-full max-w-2xl">
        <Suspense
          fallback={
            <div className="text-sm text-text-secondary">Chargement...</div>
          }
        >
          <UsernameRecoveryClient />
        </Suspense>
      </div>
    </RecoveryShell>
  );
}
