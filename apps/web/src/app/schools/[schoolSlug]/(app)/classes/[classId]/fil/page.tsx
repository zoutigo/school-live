"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FamilyFeedPage } from "../../../../../../../components/feed/family-feed-page";
import { Card } from "../../../../../../../components/ui/card";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
} from "../_shared";

const ALLOWED_ROLES = [
  "TEACHER",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_STAFF",
] as const;

export default function TeacherClassFeedPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);
  const [viewerRole, setViewerRole] = useState<
    | "TEACHER"
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_STAFF"
  >("TEACHER");

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  async function bootstrap() {
    setLoading(true);
    setError(null);

    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      if (!ALLOWED_ROLES.includes(me.role as (typeof ALLOWED_ROLES)[number])) {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }
      setViewerRole(me.role as typeof viewerRole);

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/grades/context`,
        {
          credentials: "include",
        },
      );

      if (!contextResponse.ok) {
        if (me.role === "TEACHER") {
          setError("Impossible de charger le contexte de classe.");
        }
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      setContext(contextPayload);

      if (me.role === "TEACHER") {
        const hasClassAccess = contextPayload.assignments.some(
          (entry) => entry.classId === classId,
        );

        if (!hasClassAccess) {
          router.replace(`/schools/${schoolSlug}/mes-classes`);
          return;
        }
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card title="Fil de classe" subtitle="Chargement de la classe">
        <p className="text-sm text-text-secondary">Chargement...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Fil de classe" subtitle="Echanges classe">
        <p className="text-sm text-notification">{error}</p>
      </Card>
    );
  }

  return (
    <FamilyFeedPage
      schoolSlug={schoolSlug}
      childFullName={classContext?.className ?? "la classe"}
      scopeLabel="la vie de classe"
      viewerRole={viewerRole}
      viewScope="CLASS"
      currentClassId={classId}
    />
  );
}
