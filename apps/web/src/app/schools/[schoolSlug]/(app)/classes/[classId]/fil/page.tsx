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
import { useTranslation } from "../../../../../../../i18n/useTranslation";

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
  const { t } = useTranslation();

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
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        {
          credentials: "include",
        },
      );

      if (!contextResponse.ok) {
        if (me.role === "TEACHER") {
          setError(t("feed.classPage.contextError"));
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
      setError(t("feed.classPage.networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card title={t("feed.classPage.title")} subtitle={t("feed.classPage.loadingSubtitle")}>
        <p className="text-sm text-text-secondary">{t("common.loading")}</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title={t("feed.classPage.title")} subtitle={t("feed.classPage.exchangesSubtitle")}>
        <p className="text-sm text-notification">{error}</p>
      </Card>
    );
  }

  return (
    <FamilyFeedPage
      schoolSlug={schoolSlug}
      childFullName={classContext?.className ?? t("feed.classPage.defaultClassName")}
      scopeLabel={t("feed.scope.class")}
      viewerRole={viewerRole}
      viewScope="CLASS"
      currentClassId={classId}
    />
  );
}
