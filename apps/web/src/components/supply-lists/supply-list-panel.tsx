"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { useTranslation } from "../../i18n/useTranslation";
import {
  getMyChildSupplyList,
  markMyChildSupplyListSeen,
  type ChildSupplyList,
} from "./supply-lists-api";

type Props = {
  schoolSlug: string;
  studentId: string;
  title?: string;
  subtitle?: string;
};

export function SupplyListPanel({
  schoolSlug,
  studentId,
  title,
  subtitle,
}: Props) {
  const { t } = useTranslation();
  const [supplyList, setSupplyList] = useState<ChildSupplyList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!schoolSlug || !studentId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await getMyChildSupplyList(schoolSlug, studentId);
        if (cancelled) return;
        setSupplyList(result);
        if (result.targetSchoolYearId && !result.seen) {
          void markMyChildSupplyListSeen(schoolSlug, studentId);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [schoolSlug, studentId]);

  return (
    <Card title={title ?? t("supplyList.page.title")} subtitle={subtitle}>
      {loading ? (
        <p
          className="text-sm text-text-secondary"
          data-testid="supply-list-loading"
        >
          {t("supplyList.page.loading")}
        </p>
      ) : error ? (
        <p
          className="text-sm text-notification"
          data-testid="supply-list-error"
        >
          {t("supplyList.page.error")}
        </p>
      ) : !supplyList?.targetSchoolYearId ? (
        <p
          className="text-sm text-text-secondary"
          data-testid="supply-list-not-ready"
        >
          {t("supplyList.page.notReady")}
        </p>
      ) : supplyList.items.length === 0 ? (
        <p
          className="text-sm text-text-secondary"
          data-testid="supply-list-empty"
        >
          {t("supplyList.page.empty")}
        </p>
      ) : (
        <div className="grid gap-3" data-testid="supply-list-items">
          <p className="text-sm font-medium text-text-secondary">
            {t("supplyList.page.yearLabel").replace(
              "{year}",
              supplyList.targetSchoolYearLabel ?? "",
            )}
          </p>
          <ul className="grid gap-2">
            {supplyList.items
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((item) => (
                <li
                  key={item.id}
                  className="content-panel flex items-start justify-between gap-3 p-3 text-sm"
                  data-testid="supply-list-item"
                >
                  <div>
                    <p className="font-medium text-text-primary">
                      {item.rank}. {item.label}
                    </p>
                    {item.note ? (
                      <p className="text-xs text-text-secondary">
                        {t("supplyList.page.note").replace("{note}", item.note)}
                      </p>
                    ) : null}
                  </div>
                  <span className="whitespace-nowrap text-text-secondary">
                    {t("supplyList.page.quantity").replace(
                      "{quantity}",
                      String(item.quantity),
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
