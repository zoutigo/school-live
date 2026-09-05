"use client";

import { Construction } from "lucide-react";
import { Card } from "../../../../../../components/ui/card";
import { useTranslation } from "../../../../../../i18n/useTranslation";

/**
 * Miroir de `app/(home)/placeholder.tsx` côté mobile pour l'entrée "Documents"
 * du menu élève : la fonctionnalité n'est pas encore implémentée sur aucune
 * des deux plateformes. Avant cette page, le lien pointait vers
 * `/schools/:slug/documents`, réservée au rôle PARENT (redirection muette
 * vers le dashboard pour un élève).
 */
export default function MyDocumentsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-warm-surface">
          <Construction className="h-10 w-10 text-warm-accent" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-text-primary">
          {t("sidebar.nav.documents")}
        </h1>
        <p className="text-sm font-semibold text-warm-accent">
          {t("documents.placeholder.subtitle")}
        </p>
        <p className="text-sm text-text-secondary">
          {t("documents.placeholder.body")}
        </p>
      </Card>
    </div>
  );
}
