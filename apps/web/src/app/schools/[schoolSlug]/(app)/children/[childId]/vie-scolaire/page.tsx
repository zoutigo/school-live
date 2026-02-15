"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Clock3, ShieldAlert } from "lucide-react";
import { Card } from "../../../../../../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

type LocalTab = "synthese" | "absences" | "sanctions";

type AbsenceRow = {
  id: string;
  type: "ABSENCE" | "RETARD";
  period: string;
  duration: string;
  justified: boolean;
  reason: string;
  comment: string;
};

type SanctionRow = {
  id: string;
  type: "SANCTION" | "PUNITION";
  label: string;
  date: string;
  reason: string;
  by: string;
  comment: string;
  followUpDate: string;
};

type StudentLifeEventRow = {
  id: string;
  type: "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";
  occurredAt: string;
  durationMinutes: number | null;
  justified: boolean | null;
  reason: string;
  comment: string | null;
};

const ABSENCES_FALLBACK: AbsenceRow[] = [
  {
    id: "a1",
    type: "ABSENCE",
    period: "Jeudi 04 dec. 2025, 08:45-17:20",
    duration: "2 demi-journees",
    justified: true,
    reason: "Maladie",
    comment: "",
  },
  {
    id: "a2",
    type: "RETARD",
    period: "Lundi 10 nov. 2025, 09:40-11:30",
    duration: "2 cours",
    justified: true,
    reason: "RDV medical",
    comment: "",
  },
  {
    id: "a3",
    type: "ABSENCE",
    period: "Mardi 14 oct. 2025, 13:30-14:25",
    duration: "1 cours",
    justified: true,
    reason: "Erreur d'emploi du temps",
    comment: "",
  },
  {
    id: "a4",
    type: "RETARD",
    period: "Lundi 08 sept. 2025, 08:45-08:55",
    duration: "00:10",
    justified: true,
    reason: "Transport",
    comment: "",
  },
];

const SANCTIONS_FALLBACK: SanctionRow[] = [
  {
    id: "s1",
    type: "SANCTION",
    label: "Sanction",
    date: "Mardi 06 jan. 2026",
    reason: "Oubli de materiel scolaire",
    by: "Mme BARRIERE Caroline",
    comment: "",
    followUpDate: "",
  },
  {
    id: "s2",
    type: "PUNITION",
    label: "Punition",
    date: "Jeudi 11 dec. 2025",
    reason: "Mauvaise attitude en classe",
    by: "Mme RUIS Aurelie",
    comment: "Propos deplaces envers un camarade.",
    followUpDate: "",
  },
  {
    id: "s3",
    type: "SANCTION",
    label: "Sanction",
    date: "Mercredi 24 sept. 2025",
    reason: "Oubli de materiel scolaire",
    by: "Mme BARRIERE Caroline",
    comment: "",
    followUpDate: "",
  },
];

export default function ChildVieScolairePage() {
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [lifeEvents, setLifeEvents] = useState<StudentLifeEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsWarning, setEventsWarning] = useState<string | null>(null);
  const [tab, setTab] = useState<LocalTab>("synthese");

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
    setEventsWarning(null);
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
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/vie-scolaire`,
        );
        return;
      }

      try {
        await loadLifeEvents(currentSchoolSlug, currentChildId);
      } catch {
        setLifeEvents([]);
        setEventsWarning(
          "Les evenements vie scolaire sont temporairement indisponibles. Affichage des donnees de demonstration.",
        );
      }
    } catch {
      setError("Impossible de charger la vie scolaire.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLifeEvents(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
    const response = await fetch(
      `${API_URL}/schools/${currentSchoolSlug}/students/${currentChildId}/life-events?scope=current&limit=200`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load life events");
    }

    const payload = (await response.json()) as StudentLifeEventRow[];
    setLifeEvents(payload);
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  const absences = useMemo(() => {
    const fromApi = lifeEvents
      .filter((entry) => entry.type === "ABSENCE" || entry.type === "RETARD")
      .map<AbsenceRow>((entry) => ({
        id: entry.id,
        type: entry.type === "RETARD" ? "RETARD" : "ABSENCE",
        period: new Date(entry.occurredAt).toLocaleString("fr-FR"),
        duration:
          entry.durationMinutes !== null ? `${entry.durationMinutes} min` : "-",
        justified: Boolean(entry.justified),
        reason: entry.reason,
        comment: entry.comment ?? "",
      }));

    if (fromApi.length > 0) {
      return fromApi;
    }
    return eventsWarning ? ABSENCES_FALLBACK : [];
  }, [eventsWarning, lifeEvents]);
  const sanctions = useMemo(() => {
    const fromApi = lifeEvents
      .filter((entry) => entry.type === "SANCTION" || entry.type === "PUNITION")
      .map<SanctionRow>((entry) => ({
        id: entry.id,
        type: entry.type === "PUNITION" ? "PUNITION" : "SANCTION",
        label: entry.type === "PUNITION" ? "Punition" : "Sanction",
        date: new Date(entry.occurredAt).toLocaleDateString("fr-FR"),
        reason: entry.reason,
        by: "Equipe pedagogique",
        comment: entry.comment ?? "",
        followUpDate: "",
      }));

    if (fromApi.length > 0) {
      return fromApi;
    }
    return eventsWarning ? SANCTIONS_FALLBACK : [];
  }, [eventsWarning, lifeEvents]);
  const retardsCount = useMemo(
    () => lifeEvents.filter((entry) => entry.type === "RETARD").length || 1,
    [lifeEvents],
  );
  const sanctionsCount = useMemo(
    () => sanctions.filter((entry) => entry.type === "SANCTION").length,
    [sanctions],
  );
  const punitionsCount = useMemo(
    () => sanctions.filter((entry) => entry.type === "PUNITION").length,
    [sanctions],
  );

  const kpis = [
    {
      key: "absences",
      label: "Absences",
      value: absences.length,
      icon: Clock3,
      tone: "from-[#3DA5F5] to-[#207FD5]",
    },
    {
      key: "retards",
      label: "Retards",
      value: retardsCount,
      icon: AlertTriangle,
      tone: "from-[#FF8A3D] to-[#FF5C2D]",
    },
    {
      key: "sanctions",
      label: "Sanctions",
      value: sanctionsCount,
      icon: ShieldAlert,
      tone: "from-[#FF3E3E] to-[#C80000]",
    },
    {
      key: "punitions",
      label: "Punitions",
      value: punitionsCount,
      icon: ShieldAlert,
      tone: "from-[#D946EF] to-[#A21CAF]",
    },
  ];

  return (
    <div className="grid gap-4">
      <Card
        title="Vie scolaire"
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : "Suivi eleve"
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            {eventsWarning ? (
              <p className="text-sm text-[#8a6d1d]">{eventsWarning}</p>
            ) : null}
            <div className="flex items-end gap-2 border-b border-border">
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
                onClick={() => setTab("absences")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "absences"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Absences / retards
              </button>
              <button
                type="button"
                onClick={() => setTab("sanctions")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "sanctions"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Sanctions / punitions
              </button>
            </div>

            {tab === "synthese" ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-4">
                  {kpis.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <div
                        key={entry.key}
                        className={`rounded-card bg-gradient-to-br ${entry.tone} p-4 text-white shadow-card`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/85">
                              {entry.label}
                            </p>
                            <p className="mt-2 font-heading text-3xl font-bold">
                              {entry.value}
                            </p>
                          </div>
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Derniere absence
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {absences[0]?.period ?? "Aucune donnee"}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Dernier retard
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Lundi 10 nov. 2025, 09:40
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Derniere sanction
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sanctions.find((entry) => entry.type === "SANCTION")
                        ?.reason ?? "Aucune donnee"}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Derniere punition
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sanctions.find((entry) => entry.type === "PUNITION")
                        ?.reason ?? "Aucune donnee"}
                    </p>
                  </div>
                </div>
              </div>
            ) : tab === "absences" ? (
              <div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-primary text-left text-white">
                        <th className="px-3 py-2 font-medium">
                          Absence / retard
                        </th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Duree</th>
                        <th className="px-3 py-2 font-medium">Justifie ?</th>
                        <th className="px-3 py-2 font-medium">Motif</th>
                        <th className="px-3 py-2 font-medium">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.length === 0 ? (
                        <tr className="border-b border-border">
                          <td
                            className="px-3 py-4 text-sm text-text-secondary"
                            colSpan={6}
                          >
                            Aucun evenement sur l'annee active.
                          </td>
                        </tr>
                      ) : (
                        absences.map((row) => (
                          <tr key={row.id} className="border-b border-border">
                            <td className="px-3 py-2 text-text-primary">
                              {row.period}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.type === "RETARD"
                                    ? "bg-[#FFF2E8] text-[#C15600]"
                                    : "bg-[#EAF3FF] text-[#1E5FAF]"
                                }`}
                              >
                                {row.type === "RETARD" ? "Retard" : "Absence"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.duration}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.justified ? "Oui" : "Non"}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.reason}
                            </td>
                            <td className="px-3 py-2 text-text-secondary">
                              {row.comment || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {absences.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      Aucun evenement sur l'annee active.
                    </p>
                  ) : (
                    absences.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {row.period}
                        </p>
                        <p className="mt-1 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              row.type === "RETARD"
                                ? "bg-[#FFF2E8] text-[#C15600]"
                                : "bg-[#EAF3FF] text-[#1E5FAF]"
                            }`}
                          >
                            {row.type === "RETARD" ? "Retard" : "Absence"}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Duree: {row.duration}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Justifie: {row.justified ? "Oui" : "Non"}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Motif: {row.reason}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Commentaire: {row.comment || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-primary text-left text-white">
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Incident</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Motif</th>
                        <th className="px-3 py-2 font-medium">Par</th>
                        <th className="px-3 py-2 font-medium">Commentaire</th>
                        <th className="px-3 py-2 font-medium">
                          Date de deroulement
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanctions.length === 0 ? (
                        <tr className="border-b border-border">
                          <td
                            className="px-3 py-4 text-sm text-text-secondary"
                            colSpan={7}
                          >
                            Aucune sanction/punition sur l'annee active.
                          </td>
                        </tr>
                      ) : (
                        sanctions.map((row) => (
                          <tr key={row.id} className="border-b border-border">
                            <td className="px-3 py-2 text-text-primary">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.type === "PUNITION"
                                    ? "bg-fuchsia-100 text-fuchsia-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {row.type === "PUNITION"
                                  ? "Punition"
                                  : "Sanction"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.label}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.date}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.reason}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.by}
                            </td>
                            <td className="px-3 py-2 text-text-secondary">
                              {row.comment || "-"}
                            </td>
                            <td className="px-3 py-2 text-text-secondary">
                              {row.followUpDate || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {sanctions.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      Aucune sanction/punition sur l'annee active.
                    </p>
                  ) : (
                    sanctions.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          <span
                            className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.type === "PUNITION"
                                ? "bg-fuchsia-100 text-fuchsia-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {row.type === "PUNITION" ? "Punition" : "Sanction"}
                          </span>
                          {row.label}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Date: {row.date}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Motif: {row.reason}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Par: {row.by}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Commentaire: {row.comment || "-"}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          Date de deroulement: {row.followUpDate || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
