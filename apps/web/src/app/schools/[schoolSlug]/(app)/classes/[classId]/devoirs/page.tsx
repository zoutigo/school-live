"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
} from "../_shared";

type TabKey = "list" | "view" | "help";

type HomeworkRow = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: "A_FAIRE" | "EN_RETARD" | "VALIDE";
};

const DEMO_HOMEWORKS: HomeworkRow[] = [
  {
    id: "hw-1",
    title: "Exercices chapitre 4",
    subject: "Mathematiques",
    dueDate: "Mardi 18:00",
    status: "A_FAIRE",
  },
  {
    id: "hw-2",
    title: "Lecture commentaire compose",
    subject: "Francais",
    dueDate: "Mercredi 08:00",
    status: "EN_RETARD",
  },
  {
    id: "hw-3",
    title: "Questions sur la cellule",
    subject: "SVT",
    dueDate: "Vendredi 10:00",
    status: "VALIDE",
  },
];

function statusPill(status: HomeworkRow["status"]) {
  if (status === "VALIDE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "EN_RETARD") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function statusLabel(status: HomeworkRow["status"]) {
  if (status === "VALIDE") {
    return "Valide";
  }
  if (status === "EN_RETARD") {
    return "En retard";
  }
  return "A faire";
}

export default function TeacherClassHomeworkPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

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
      if (me.role !== "TEACHER") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/grades/context`,
        {
          credentials: "include",
        },
      );

      if (!contextResponse.ok) {
        setError("Impossible de charger les devoirs de classe.");
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      setContext(contextPayload);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoading(false);
    }
  }

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  return (
    <div className="grid gap-4">
      <Card
        title={`Devoirs - ${classContext?.className ?? "Classe"}`}
        subtitle="Suivi des devoirs et etat de rendu"
      >
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "list"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setTab("view")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "view"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Voir
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

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !classContext ? (
          <p className="text-sm text-notification">
            Classe non accessible avec vos affectations.
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName="Devoirs"
            moduleSummary="ce module centralise les devoirs annonces a la classe et leur statut de suivi."
            actions={[
              {
                name: "Lister",
                purpose: "suivre les devoirs en cours.",
                howTo: "consulter l'onglet Liste.",
                moduleImpact: "permet de gerer la charge eleve par eleve.",
                crossModuleImpact:
                  "en lien avec Notes pour evaluer les rendus.",
              },
              {
                name: "Voir",
                purpose: "obtenir une synthese rapide de la classe.",
                howTo: "ouvrir l'onglet Voir.",
                moduleImpact: "priorisation des relances.",
                crossModuleImpact:
                  "ameliore le suivi parent via les espaces enfant.",
              },
            ]}
          />
        ) : tab === "list" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-3 py-2 font-medium">Titre</th>
                  <th className="px-3 py-2 font-medium">Matiere</th>
                  <th className="px-3 py-2 font-medium">Echeance</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_HOMEWORKS.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-3 py-2">{row.title}</td>
                    <td className="px-3 py-2">{row.subject}</td>
                    <td className="px-3 py-2">{row.dueDate}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPill(
                          row.status,
                        )}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">Classe</p>
              <p className="text-sm font-semibold text-text-primary">
                {classContext.className}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">Devoirs</p>
              <p className="text-sm font-semibold text-text-primary">
                {DEMO_HOMEWORKS.length}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">A faire</p>
              <p className="text-sm font-semibold text-text-primary">
                {
                  DEMO_HOMEWORKS.filter((entry) => entry.status === "A_FAIRE")
                    .length
                }
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">En retard</p>
              <p className="text-sm font-semibold text-text-primary">
                {
                  DEMO_HOMEWORKS.filter((entry) => entry.status === "EN_RETARD")
                    .length
                }
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
