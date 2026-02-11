"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "overview" | "future";

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
    <AppShell schoolName="School-Live Platform">
      <div className="grid gap-4">
        <Card title="Indicateurs" subtitle="Vue consolidée de la plateforme">
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
              Vue globale
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
              Onglet suivant
            </button>
          </div>

          {tab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card title="Ecoles">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.schoolsCount ?? 0)}
                </p>
              </Card>
              <Card title="Utilisateurs">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.usersCount ?? 0)}
                </p>
              </Card>
              <Card title="Eleves">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.studentsCount ?? 0)}
                </p>
              </Card>
              <Card title="Enseignants">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.teachersCount ?? 0)}
                </p>
              </Card>
              <Card title="Notes">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading ? "..." : (indicators?.gradesCount ?? 0)}
                </p>
              </Card>
              <Card title="Admins">
                <p className="font-heading text-3xl font-bold text-primary">
                  {loading
                    ? "..."
                    : (indicators?.adminsCount ?? 0) +
                      (indicators?.schoolAdminsCount ?? 0)}
                </p>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Cet onglet servira pour les graphiques temporels (croissance,
              usage, performance).
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
