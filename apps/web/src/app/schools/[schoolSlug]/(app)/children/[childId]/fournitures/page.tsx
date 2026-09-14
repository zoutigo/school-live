"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SupplyListPanel } from "../../../../../../../components/supply-lists/supply-list-panel";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChildSupplyListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!schoolSlug) return;
    void loadParentContext(schoolSlug);
  }, [schoolSlug]);

  async function loadParentContext(currentSchoolSlug: string) {
    setReady(false);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        { credentials: "include" },
      );

      if (!response.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      setChildren(payload.linkedStudents ?? []);
      setReady(true);
    } catch {
      setReady(true);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  const subtitle = currentChild
    ? `${currentChild.firstName} ${currentChild.lastName}`
    : undefined;

  if (!ready) {
    return (
      <p className="text-sm text-text-secondary">
        {t("supplyList.page.loading")}
      </p>
    );
  }

  return (
    <SupplyListPanel
      schoolSlug={schoolSlug}
      studentId={childId}
      subtitle={subtitle}
    />
  );
}
