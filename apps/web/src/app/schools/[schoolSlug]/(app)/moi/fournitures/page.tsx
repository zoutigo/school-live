"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SupplyListPanel } from "../../../../../../components/supply-lists/supply-list-panel";
import { useTranslation } from "../../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function MySupplyListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolSlug) return;
    void loadSelfContext(schoolSlug);
  }, [schoolSlug]);

  async function loadSelfContext(currentSchoolSlug: string) {
    try {
      const meResponse = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        { credentials: "include" },
      );

      if (!meResponse.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as { role?: string };
      if (me.role !== "STUDENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      const timetableResponse = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/timetable/me`,
        { credentials: "include" },
      );
      if (!timetableResponse.ok) {
        throw new Error("self-context-load-failed");
      }

      const timetable = (await timetableResponse.json()) as {
        student: { id: string };
      };
      setStudentId(timetable.student.id);
    } catch {
      // Silencieux : SupplyListPanel n'est jamais monte tant que
      // studentId reste null.
    }
  }

  if (!studentId) {
    return (
      <p className="text-sm text-text-secondary">
        {t("supplyList.page.loading")}
      </p>
    );
  }

  return <SupplyListPanel schoolSlug={schoolSlug} studentId={studentId} />;
}
