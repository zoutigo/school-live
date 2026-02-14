"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type MeResponse = {
  firstName: string;
  lastName: string;
  role:
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
  email?: string;
  schoolSlug: string | null;
};
type Tab = "overview" | "help";

const kpis = [
  { label: "Ecoles actives", value: "24" },
  { label: "Utilisateurs", value: "4 182" },
  { label: "Connexions du jour", value: "1 036" },
];

export default function AcceuilPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace("/");
      return;
    }

    const payload = (await response.json()) as MeResponse;

    if (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN") {
      if (payload.schoolSlug) {
        router.replace(`/schools/${payload.schoolSlug}/dashboard`);
        return;
      }

      router.replace("/");
      return;
    }

    setMe(payload);
    setLoading(false);
  }

  return (
    <AppShell schoolName="School-Live Platform">
      <div className="grid gap-4">
        <Card
          title="Acceuil administration"
          subtitle="Pilotage global de la plateforme"
        >
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
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Aide
            </button>
          </div>

          {tab === "overview" ? (
            loading ? (
              <p className="text-text-secondary">Chargement...</p>
            ) : (
              <p className="text-sm text-text-secondary">
                Connecte:{" "}
                <span className="font-medium text-text-primary">
                  {me?.firstName} {me?.lastName}
                </span>{" "}
                ({me?.role})
              </p>
            )
          ) : (
            <ModuleHelpTab
              moduleName="Accueil administration"
              moduleSummary="ce module sert de point d'entree pour suivre l'etat global de la plateforme."
              actions={[
                {
                  name: "Consulter",
                  purpose:
                    "avoir une lecture rapide des indicateurs essentiels (ecoles, utilisateurs, connexions).",
                  howTo: "ouvrir la Vue globale et verifier les cartes KPI.",
                  moduleImpact:
                    "pas de modification de donnees, uniquement de la supervision.",
                  crossModuleImpact:
                    "vous aide a prioriser les actions dans Ecoles, Utilisateurs, Classes et Inscriptions.",
                },
              ]}
              tips={[
                "Commencer par ce module apres quelques jours d'absence pour reprendre le fil rapidement.",
              ]}
            />
          )}
        </Card>

        {tab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {kpis.map((item) => (
              <Card key={item.label} title={item.label}>
                <p className="font-heading text-2xl font-bold text-primary">
                  {item.value}
                </p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
