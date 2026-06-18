"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "overview" | "future" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type IndicatorsResponse = {
  schoolsCount: number;
  usersCount: number;
  studentsCount: number;
  teachersCount: number;
  gradesCount: number;
  adminsCount: number;
  schoolAdminsCount: number;
};

export default function IndicatorsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorsResponse | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;

    if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }

    const indicatorsResponse = await fetch(`${API_URL}/system/indicators`, {
      credentials: "include",
    });

    if (!indicatorsResponse.ok) {
      router.replace("/");
      return;
    }

    setIndicators((await indicatorsResponse.json()) as IndicatorsResponse);
    setLoading(false);
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="grid gap-4">
        <Card title={t("indicators.title")} subtitle={t("indicators.subtitle")}>
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "overview"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("indicators.tab.overview")}
            </button>
            <button
              type="button"
              onClick={() => setTab("future")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "future"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("indicators.tab.future")}
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("indicators.tab.help")}
            </button>
          </div>

          {tab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card title={t("indicators.card.schools")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.schoolsCount ?? 0)}
                </p>
              </Card>
              <Card title={t("indicators.card.users")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.usersCount ?? 0)}
                </p>
              </Card>
              <Card title={t("indicators.card.students")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.studentsCount ?? 0)}
                </p>
              </Card>
              <Card title={t("indicators.card.teachers")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.teachersCount ?? 0)}
                </p>
              </Card>
              <Card title={t("indicators.card.grades")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.gradesCount ?? 0)}
                </p>
              </Card>
              <Card title={t("indicators.card.admins")}>
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading
                    ? "..."
                    : (indicators?.adminsCount ?? 0) +
                      (indicators?.schoolAdminsCount ?? 0)}
                </p>
              </Card>
            </div>
          ) : tab === "future" ? (
            <p className="text-sm text-text-secondary">
              {t("indicators.future.text")}
            </p>
          ) : (
            <ModuleHelpTab
              moduleName={t("indicators.help.moduleName")}
              moduleSummary={t("indicators.help.moduleSummary")}
              actions={[
                {
                  name: t("indicators.help.action1.name"),
                  purpose: t("indicators.help.action1.purpose"),
                  howTo: t("indicators.help.action1.howTo"),
                  moduleImpact: t("indicators.help.action1.moduleImpact"),
                  crossModuleImpact: t(
                    "indicators.help.action1.crossModuleImpact",
                  ),
                },
                {
                  name: t("indicators.help.action2.name"),
                  purpose: t("indicators.help.action2.purpose"),
                  howTo: t("indicators.help.action2.howTo"),
                  moduleImpact: t("indicators.help.action2.moduleImpact"),
                  crossModuleImpact: t(
                    "indicators.help.action2.crossModuleImpact",
                  ),
                },
              ]}
              tips={[t("indicators.help.tip1")]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
