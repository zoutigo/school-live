"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, ShieldAlert } from "lucide-react";
import { Card } from "../ui/card";
import { OnboardingTarget } from "../onboarding/onboarding-target";
import { lifeEventTypeLabel } from "../life-events/life-events-list";
import { markBadgeRead } from "../layout/badges-api";
import { useTranslation } from "../../i18n/useTranslation";
import { usePageHelp } from "../../store/page-help";
import { DISCIPLINE_SELF_TOUR_TARGETS } from "./discipline-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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

type DisciplineEventRow = {
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

export type DisciplinePanelProps = {
  schoolSlug: string;
  studentId: string;
  studentLabel: string;
};

/**
 * Panneau Discipline — composant central partagé (lecture seule).
 *
 * Réutilisé par deux points d'entrée fins :
 *  - la page Parent (`children/[childId]/discipline/page.tsx`), qui résout
 *    `studentId` depuis l'enfant sélectionné (et gère la redirection vers le
 *    premier enfant si besoin, hors de ce composant) ;
 *  - la page Élève self (`moi/discipline/page.tsx`), qui résout sa propre
 *    identité via `/timetable/me` (sans childId).
 */
export function DisciplinePanel({
  schoolSlug,
  studentId,
  studentLabel,
}: DisciplinePanelProps) {
  const { locale, t } = useTranslation();
  const [lifeEvents, setLifeEvents] = useState<DisciplineEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsWarning, setEventsWarning] = useState<string | null>(null);
  const [tab, setTab] = useState<LocalTab>("synthese");

  usePageHelp({
    title:
      tab === "synthese"
        ? t("discipline.disciplineSelf.help.synthese.title")
        : tab === "absences"
          ? t("discipline.disciplineSelf.help.absences.title")
          : t("discipline.disciplineSelf.help.sanctions.title"),
    sections:
      tab === "synthese"
        ? [
            {
              title: t("discipline.disciplineSelf.help.synthese.section1Title"),
              body: [t("discipline.disciplineSelf.help.synthese.section1Body")],
            },
            {
              title: t("discipline.disciplineSelf.help.synthese.section2Title"),
              body: [t("discipline.disciplineSelf.help.synthese.section2Body")],
            },
          ]
        : tab === "absences"
          ? [
              {
                title: t(
                  "discipline.disciplineSelf.help.absences.section1Title",
                ),
                body: [
                  t("discipline.disciplineSelf.help.absences.section1Body"),
                ],
              },
            ]
          : [
              {
                title: t(
                  "discipline.disciplineSelf.help.sanctions.section1Title",
                ),
                body: [
                  t("discipline.disciplineSelf.help.sanctions.section1Body"),
                ],
              },
            ],
  });

  useEffect(() => {
    if (!schoolSlug || !studentId) {
      return;
    }
    void loadLifeEventsWithFallback(schoolSlug, studentId);
  }, [schoolSlug, studentId]);

  useEffect(() => {
    if (!schoolSlug || !studentId) {
      return;
    }
    markBadgeRead(schoolSlug, "DISCIPLINE", studentId).catch(() => {
      // Silencieux : ne bloque jamais la consultation pour un souci réseau.
    });
  }, [schoolSlug, studentId]);

  async function loadLifeEventsWithFallback(
    currentSchoolSlug: string,
    currentStudentId: string,
  ) {
    setLoading(true);
    setError(null);
    setEventsWarning(null);
    try {
      await loadLifeEvents(currentSchoolSlug, currentStudentId);
    } catch {
      setLifeEvents([]);
      setEventsWarning(t("discipline.disciplineSelf.eventsWarning"));
    } finally {
      setLoading(false);
    }
  }

  async function loadLifeEvents(
    currentSchoolSlug: string,
    currentStudentId: string,
  ) {
    const response = await fetch(
      `${API_URL}/schools/${currentSchoolSlug}/students/${currentStudentId}/life-events?scope=current&limit=200`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load life events");
    }

    const payload = (await response.json()) as DisciplineEventRow[];
    setLifeEvents(payload);
  }

  const absences = useMemo(() => {
    const fromApi = lifeEvents
      .filter((entry) => entry.type === "ABSENCE" || entry.type === "RETARD")
      .map<AbsenceRow>((entry) => ({
        id: entry.id,
        type: entry.type === "RETARD" ? "RETARD" : "ABSENCE",
        period: new Date(entry.occurredAt).toLocaleString(
          locale === "en" ? "en-GB" : "fr-FR",
        ),
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
  }, [eventsWarning, lifeEvents, locale]);
  const sanctions = useMemo(() => {
    const fromApi = lifeEvents
      .filter((entry) => entry.type === "SANCTION" || entry.type === "PUNITION")
      .map<SanctionRow>((entry) => ({
        id: entry.id,
        type: entry.type === "PUNITION" ? "PUNITION" : "SANCTION",
        label: lifeEventTypeLabel(t, entry.type),
        date: new Date(entry.occurredAt).toLocaleDateString(
          locale === "en" ? "en-GB" : "fr-FR",
        ),
        reason: entry.reason,
        by: t("discipline.disciplineSelf.equipePedagogique"),
        comment: entry.comment ?? "",
        followUpDate: "",
      }));

    if (fromApi.length > 0) {
      return fromApi;
    }
    return eventsWarning ? SANCTIONS_FALLBACK : [];
  }, [eventsWarning, lifeEvents, locale, t]);
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
      label: t("discipline.disciplineSelf.kpi.absences"),
      value: absences.length,
      icon: Clock3,
      tone: "from-[#3DA5F5] to-[#207FD5]",
    },
    {
      key: "retards",
      label: t("discipline.disciplineSelf.kpi.retards"),
      value: retardsCount,
      icon: AlertTriangle,
      tone: "from-[#FF8A3D] to-[#FF5C2D]",
    },
    {
      key: "sanctions",
      label: t("discipline.disciplineSelf.kpi.sanctions"),
      value: sanctionsCount,
      icon: ShieldAlert,
      tone: "from-[#FF3E3E] to-[#C80000]",
    },
    {
      key: "punitions",
      label: t("discipline.disciplineSelf.kpi.punitions"),
      value: punitionsCount,
      icon: ShieldAlert,
      tone: "from-[#D946EF] to-[#A21CAF]",
    },
  ];

  return (
    <div className="grid gap-4">
      <Card
        title={t("discipline.disciplineSelf.title")}
        subtitle={studentLabel}
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("discipline.common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            {eventsWarning ? (
              <p className="text-sm text-[#8a6d1d]">{eventsWarning}</p>
            ) : null}
            <OnboardingTarget
              id={DISCIPLINE_SELF_TOUR_TARGETS.tabs}
              className="flex items-end gap-2 border-b border-border"
            >
              <button
                type="button"
                onClick={() => setTab("synthese")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "synthese"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("discipline.disciplineSelf.tabs.synthese")}
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
                {t("discipline.disciplineSelf.tabs.absencesRetards")}
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
                {t("discipline.disciplineSelf.tabs.sanctionsPunitions")}
              </button>
            </OnboardingTarget>

            {tab === "synthese" ? (
              <div className="grid gap-4">
                <OnboardingTarget
                  id={DISCIPLINE_SELF_TOUR_TARGETS.kpis}
                  className="grid gap-3 md:grid-cols-4"
                >
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
                </OnboardingTarget>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {t("discipline.disciplineSelf.synthese.lastAbsence")}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {absences[0]?.period ??
                        t("discipline.disciplineSelf.synthese.noData")}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {t("discipline.disciplineSelf.synthese.lastRetard")}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {absences.find((entry) => entry.type === "RETARD")
                        ?.period ??
                        t("discipline.disciplineSelf.synthese.noData")}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {t("discipline.disciplineSelf.synthese.lastSanction")}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sanctions.find((entry) => entry.type === "SANCTION")
                        ?.reason ??
                        t("discipline.disciplineSelf.synthese.noData")}
                    </p>
                  </div>
                  <div className="rounded-card border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {t("discipline.disciplineSelf.synthese.lastPunition")}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sanctions.find((entry) => entry.type === "PUNITION")
                        ?.reason ??
                        t("discipline.disciplineSelf.synthese.noData")}
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
                          {t(
                            "discipline.disciplineSelf.absences.columns.event",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("discipline.disciplineSelf.absences.columns.type")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.absences.columns.duration",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.absences.columns.justified",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.absences.columns.reason",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.absences.columns.comment",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.length === 0 ? (
                        <tr className="border-b border-border">
                          <td
                            className="px-3 py-4 text-sm text-text-secondary"
                            colSpan={6}
                          >
                            {t("discipline.disciplineSelf.absences.empty")}
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
                                {lifeEventTypeLabel(t, row.type)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.duration}
                            </td>
                            <td className="px-3 py-2 text-text-primary">
                              {row.justified
                                ? t("discipline.common.yes")
                                : t("discipline.common.no")}
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
                      {t("discipline.disciplineSelf.absences.empty")}
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
                            {lifeEventTypeLabel(t, row.type)}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.absences.durationPrefix",
                          )}{" "}
                          {row.duration}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.absences.justifiedPrefix",
                          )}{" "}
                          {row.justified
                            ? t("discipline.common.yes")
                            : t("discipline.common.no")}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("discipline.disciplineSelf.absences.reasonPrefix")}{" "}
                          {row.reason}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.absences.commentPrefix",
                          )}{" "}
                          {row.comment || "-"}
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
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.type",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.incident",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.date",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.reason",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("discipline.disciplineSelf.sanctions.columns.by")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.comment",
                          )}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t(
                            "discipline.disciplineSelf.sanctions.columns.executionDate",
                          )}
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
                            {t("discipline.disciplineSelf.sanctions.empty")}
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
                                {lifeEventTypeLabel(t, row.type)}
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
                      {t("discipline.disciplineSelf.sanctions.empty")}
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
                            {lifeEventTypeLabel(t, row.type)}
                          </span>
                          {row.label}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("discipline.disciplineSelf.sanctions.datePrefix")}{" "}
                          {row.date}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.sanctions.reasonPrefix",
                          )}{" "}
                          {row.reason}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("discipline.disciplineSelf.sanctions.byPrefix")}{" "}
                          {row.by}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.sanctions.commentPrefix",
                          )}{" "}
                          {row.comment || "-"}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t(
                            "discipline.disciplineSelf.sanctions.executionDatePrefix",
                          )}{" "}
                          {row.followUpDate || "-"}
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
