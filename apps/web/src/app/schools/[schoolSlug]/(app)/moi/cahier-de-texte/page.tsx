"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "../../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/**
 * Redirige l'élève connecté vers l'écran Devoirs de sa propre classe
 * (`classes/:classId/devoirs`), déjà self-capable pour le rôle STUDENT —
 * miroir exact de `app/(home)/homework/me.tsx` côté mobile, qui redirige de
 * la même façon vers `(home)/classes/[classId]/homework` plutôt que de
 * dupliquer l'écran. Remplace l'ancienne coquille marketing (titre/sous-titre/
 * puces sans aucune fonctionnalité réelle).
 */
export default function MyCahierDeTextePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  useEffect(() => {
    if (!schoolSlug) return;
    let cancelled = false;

    async function redirectToOwnClass() {
      try {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/timetable/me`,
          { credentials: "include" },
        );
        if (!response.ok) {
          if (!cancelled) router.replace(`/schools/${schoolSlug}/dashboard`);
          return;
        }
        const timetable = (await response.json()) as {
          class?: { id?: string };
        };
        if (cancelled) return;
        if (timetable.class?.id) {
          router.replace(
            `/schools/${schoolSlug}/classes/${timetable.class.id}/devoirs`,
          );
        } else {
          router.replace(`/schools/${schoolSlug}/dashboard`);
        }
      } catch {
        if (!cancelled) router.replace(`/schools/${schoolSlug}/dashboard`);
      }
    }

    void redirectToOwnClass();
    return () => {
      cancelled = true;
    };
  }, [schoolSlug, router]);

  return (
    <p className="text-sm text-text-secondary">
      {t("homework.common.loading")}
    </p>
  );
}
