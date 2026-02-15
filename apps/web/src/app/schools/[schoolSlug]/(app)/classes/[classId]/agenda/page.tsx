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

const DEMO_EVENTS = [
  {
    id: "evt-1",
    title: "Conseil pedagogique",
    date: "Lundi 10:00",
    channel: "Classe",
    details: "Point de coordination avec les delegues.",
  },
  {
    id: "evt-2",
    title: "Interrogation courte",
    date: "Mercredi 08:15",
    channel: "Matiere",
    details: "Controle de 20 minutes sur le chapitre en cours.",
  },
  {
    id: "evt-3",
    title: "Sortie encadree",
    date: "Vendredi 14:00",
    channel: "Etablissement",
    details: "Verification des autorisations parentales.",
  },
];

export default function TeacherClassAgendaPage() {
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
        setError("Impossible de charger l'agenda de classe.");
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
        title={`Agenda - ${classContext?.className ?? "Classe"}`}
        subtitle="Planning de classe et points d'organisation"
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
            moduleName="Agenda"
            moduleSummary="ce module sert a publier les evenements de classe et l'organisation hebdomadaire."
            actions={[
              {
                name: "Lister",
                purpose: "voir les prochains evenements.",
                howTo: "consulter l'onglet Liste.",
                moduleImpact: "clarifie le rythme de classe.",
                crossModuleImpact:
                  "alimente les infos communiquees aux parents et aux eleves.",
              },
              {
                name: "Voir",
                purpose: "suivre la charge de la classe.",
                howTo: "ouvrir le recap global dans l'onglet Voir.",
                moduleImpact: "meilleure anticipation des periodes chargees.",
                crossModuleImpact:
                  "coordination avec devoirs, notes et vie de classe.",
              },
            ]}
          />
        ) : tab === "list" ? (
          <div className="grid gap-3">
            {DEMO_EVENTS.map((event) => (
              <article
                key={event.id}
                className="rounded-card border border-border bg-background p-3"
              >
                <p className="text-xs text-text-secondary">{event.channel}</p>
                <h3 className="text-sm font-semibold text-text-primary">
                  {event.title}
                </h3>
                <p className="text-xs text-primary">{event.date}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  {event.details}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">Classe</p>
              <p className="text-sm font-semibold text-text-primary">
                {classContext.className}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">Eleves</p>
              <p className="text-sm font-semibold text-text-primary">
                {classContext.students.length}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <p className="text-xs text-text-secondary">Evenements demo</p>
              <p className="text-sm font-semibold text-text-primary">
                {DEMO_EVENTS.length}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
