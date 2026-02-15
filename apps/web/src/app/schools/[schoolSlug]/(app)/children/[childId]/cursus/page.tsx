"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

type CursusTab = "synthese" | "vie-scolaire" | "help";
type EventTypeFilter = "ALL" | "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";

type StudentLifeEventRow = {
  id: string;
  type: "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";
  occurredAt: string;
  reason: string;
  comment: string | null;
  class: { id: string; name: string } | null;
  schoolYear: { id: string; label: string } | null;
};

type CursusGroup = {
  key: string;
  schoolYearLabel: string;
  className: string;
  events: StudentLifeEventRow[];
};

export default function ChildCursusPage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [lifeEvents, setLifeEvents] = useState<StudentLifeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CursusTab>("synthese");
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [eventTypeFilter, setEventTypeFilter] =
    useState<EventTypeFilter>("ALL");

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadParentContext(schoolSlug, childId);
  }, [schoolSlug, childId]);

  async function loadParentContext(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        {
          credentials: "include",
        },
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

      const linked = payload.linkedStudents ?? [];
      setChildren(linked);

      if (
        linked.length > 0 &&
        !linked.some((entry) => entry.id === currentChildId)
      ) {
        router.replace(
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/cursus`,
        );
        return;
      }

      await loadLifeEvents(currentSchoolSlug, currentChildId);
    } catch {
      setError("Impossible de charger le cursus.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLifeEvents(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
    const response = await fetch(
      `${API_URL}/schools/${currentSchoolSlug}/students/${currentChildId}/life-events?scope=all&limit=500`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load cursus events");
    }

    const payload = (await response.json()) as StudentLifeEventRow[];
    setLifeEvents(payload);
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  const groups = useMemo<CursusGroup[]>(() => {
    const filteredEvents = lifeEvents.filter((event) => {
      if (
        schoolYearFilter !== "ALL" &&
        (event.schoolYear?.label ?? "Annee non definie") !== schoolYearFilter
      ) {
        return false;
      }
      if (
        classFilter !== "ALL" &&
        (event.class?.name ?? "Classe non definie") !== classFilter
      ) {
        return false;
      }
      if (eventTypeFilter !== "ALL" && event.type !== eventTypeFilter) {
        return false;
      }

      return true;
    });

    const map = new Map<string, CursusGroup>();
    for (const event of filteredEvents) {
      const schoolYearLabel = event.schoolYear?.label ?? "Annee non definie";
      const className = event.class?.name ?? "Classe non definie";
      const key = `${schoolYearLabel}::${className}`;
      const current = map.get(key);
      if (current) {
        current.events.push(event);
      } else {
        map.set(key, {
          key,
          schoolYearLabel,
          className,
          events: [event],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      `${b.schoolYearLabel} ${b.className}`.localeCompare(
        `${a.schoolYearLabel} ${a.className}`,
      ),
    );
  }, [classFilter, eventTypeFilter, lifeEvents, schoolYearFilter]);

  const summary = useMemo(() => {
    const scopedEvents = lifeEvents.filter((event) => {
      if (
        schoolYearFilter !== "ALL" &&
        (event.schoolYear?.label ?? "Annee non definie") !== schoolYearFilter
      ) {
        return false;
      }
      if (
        classFilter !== "ALL" &&
        (event.class?.name ?? "Classe non definie") !== classFilter
      ) {
        return false;
      }
      if (eventTypeFilter !== "ALL" && event.type !== eventTypeFilter) {
        return false;
      }

      return true;
    });

    const absences = scopedEvents.filter(
      (entry) => entry.type === "ABSENCE",
    ).length;
    const retards = scopedEvents.filter(
      (entry) => entry.type === "RETARD",
    ).length;
    const sanctions = scopedEvents.filter(
      (entry) => entry.type === "SANCTION",
    ).length;
    const punitions = scopedEvents.filter(
      (entry) => entry.type === "PUNITION",
    ).length;
    return { absences, retards, sanctions, punitions };
  }, [classFilter, eventTypeFilter, lifeEvents, schoolYearFilter]);

  const schoolYearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          lifeEvents.map(
            (event) => event.schoolYear?.label ?? "Annee non definie",
          ),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [lifeEvents],
  );

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          lifeEvents.map((event) => event.class?.name ?? "Classe non definie"),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [lifeEvents],
  );

  function typeLabel(type: StudentLifeEventRow["type"]) {
    if (type === "ABSENCE") {
      return "Absence";
    }
    if (type === "RETARD") {
      return "Retard";
    }
    if (type === "PUNITION") {
      return "Punition";
    }

    return "Sanction";
  }

  function resetFilters() {
    setSchoolYearFilter("ALL");
    setClassFilter("ALL");
    setEventTypeFilter("ALL");
  }

  function exportPdf() {
    window.print();
  }

  return (
    <div className="grid gap-4">
      <Card
        title="Cursus"
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : "Historique eleve"
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-end gap-2 border-b border-border print:hidden">
              <button
                type="button"
                onClick={() => setTab("synthese")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "synthese"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Synthese
              </button>
              <button
                type="button"
                onClick={() => setTab("vie-scolaire")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "vie-scolaire"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Vie scolaire
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

            {tab !== "help" ? (
              <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto] print:hidden">
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee</span>
                  <select
                    value={schoolYearFilter}
                    onChange={(event) =>
                      setSchoolYearFilter(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Toutes</option>
                    {schoolYearOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Classe</span>
                  <select
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Toutes</option>
                    {classOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Type</span>
                  <select
                    value={eventTypeFilter}
                    onChange={(event) =>
                      setEventTypeFilter(event.target.value as EventTypeFilter)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">Tous</option>
                    <option value="ABSENCE">Absences</option>
                    <option value="RETARD">Retards</option>
                    <option value="SANCTION">Sanctions</option>
                    <option value="PUNITION">Punitions</option>
                  </select>
                </label>
                <div className="self-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-card border border-border px-3 py-2 text-sm font-semibold text-text-primary"
                  >
                    Reinitialiser
                  </button>
                </div>
                <div className="self-end">
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    Exporter PDF
                  </button>
                </div>
              </div>
            ) : null}

            {tab === "help" ? (
              <ModuleHelpTab
                moduleName="Cursus"
                moduleSummary="ce module recapitulera le parcours eleve annee par annee et classe par classe."
                actions={[
                  {
                    name: "Consulter",
                    purpose: "analyser l'historique global de l'eleve.",
                    howTo:
                      "ouvrir l'onglet Vie scolaire pour un recap par annee/classe.",
                    moduleImpact:
                      "vue chronologique des evenements du parcours.",
                    crossModuleImpact:
                      "complete la page Vie scolaire courante qui ne montre que l'annee active.",
                  },
                ]}
              />
            ) : tab === "synthese" ? (
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-card border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Annees / classes
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold text-text-primary">
                    {groups.length}
                  </p>
                </div>
                <div className="rounded-card border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Absences
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold text-text-primary">
                    {summary.absences}
                  </p>
                </div>
                <div className="rounded-card border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Retards
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold text-text-primary">
                    {summary.retards}
                  </p>
                </div>
                <div className="rounded-card border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Sanctions
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold text-text-primary">
                    {summary.sanctions}
                  </p>
                </div>
                <div className="rounded-card border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    Punitions
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold text-text-primary">
                    {summary.punitions}
                  </p>
                </div>
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Aucun evenement vie scolaire sur le cursus pour le moment.
              </p>
            ) : (
              <div className="grid gap-3">
                {groups.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-card border border-border bg-background p-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {group.schoolYearLabel} - {group.className}
                    </p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-text-secondary">
                            <th className="px-2 py-2 font-medium">Date</th>
                            <th className="px-2 py-2 font-medium">Type</th>
                            <th className="px-2 py-2 font-medium">Motif</th>
                            <th className="px-2 py-2 font-medium">
                              Commentaire
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.events.map((event) => (
                            <tr
                              key={event.id}
                              className="border-b border-border"
                            >
                              <td className="px-2 py-2 text-text-primary">
                                {new Date(event.occurredAt).toLocaleString(
                                  "fr-FR",
                                )}
                              </td>
                              <td className="px-2 py-2 text-text-primary">
                                {typeLabel(event.type)}
                              </td>
                              <td className="px-2 py-2 text-text-primary">
                                {event.reason}
                              </td>
                              <td className="px-2 py-2 text-text-secondary">
                                {event.comment || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
