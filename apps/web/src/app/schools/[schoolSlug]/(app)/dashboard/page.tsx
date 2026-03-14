"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { FamilyFeedPage } from "../../../../../components/feed/family-feed-page";
import { STUDENT_NOTES_DEMO_DATA } from "../../../../../components/student-notes/student-notes-demo-data";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
} from "../../../../../components/student-notes/student-notes.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

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
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
  email?: string;
  linkedStudents?: ParentChild[];
};

export type StudentLifeEventRow = {
  id: string;
  type: "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";
  occurredAt: string;
  durationMinutes: number | null;
  justified: boolean | null;
  reason: string;
  comment: string | null;
};

export type ChildDisciplineSummary = {
  childId: string;
  childName: string;
  absences: number;
  unjustifiedAbsences: number;
  retards: number;
  incidents: number;
  statusLabel: string;
  statusTone: "calm" | "watch" | "alert";
  detail: string;
};

export type LatestEvaluation = {
  id: string;
  subjectLabel: string;
  score: number;
  maxScore: number;
  recordedAtLabel: string;
};

export type ChildNotesSummary = {
  childId: string;
  childName: string;
  averageLabel: string;
  termLabel: string;
  trendLabel: string;
  latestEvaluations: LatestEvaluation[];
};

export type ParentAccountItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "watch" | "alert";
};

export type ParentAccountSummary = {
  headline: string;
  detail: string;
  items: ParentAccountItem[];
};

export type ParentDashboardSummaryResponse = {
  unreadMessages: number;
  payments: {
    connected: boolean;
    pendingCount: number | null;
    overdueCount: number | null;
    detail: string;
  };
  documents: {
    recentCount: number;
    totalPublishedCount: number;
    detail: string;
    latest: Array<{
      id: string;
      title: string;
      publishedAt: string | null;
    }>;
  };
};

const teacherStats = [
  { title: "Classes assignées", value: "4" },
  { title: "Copies à corriger", value: "28" },
  { title: "Messages parents", value: "6" },
];

const schoolAdminStats = [
  { title: "Classes actives", value: "18" },
  { title: "Élèves inscrits", value: "1320" },
  { title: "Demandes en attente", value: "11" },
];

function getRoleLabel(role: MeResponse["role"]) {
  switch (role) {
    case "PARENT":
      return "Parent";
    case "STUDENT":
      return "Élève";
    case "TEACHER":
      return "Enseignant";
    case "SCHOOL_ADMIN":
      return "Administration";
    default:
      return role;
  }
}

export function getCurrentTerm(date = new Date()): StudentNotesTerm {
  const month = date.getMonth() + 1;
  if (month >= 9 && month <= 12) {
    return "TERM_1";
  }
  if (month >= 1 && month <= 3) {
    return "TERM_2";
  }
  return "TERM_3";
}

function formatStudentName(child: ParentChild) {
  return `${child.firstName} ${child.lastName}`.trim();
}

function formatDateLabel(value: string) {
  const normalized = parseRecordedAt(value);
  if (!normalized) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(normalized);
}

function formatAverage(value: number | null) {
  if (value === null) {
    return "En attente";
  }
  return `${value.toFixed(1).replace(".", ",")}/20`;
}

function parseRecordedAt(value: string) {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(value);
  if (!slashMatch) {
    return null;
  }

  const day = Number(slashMatch[1]);
  const month = Number(slashMatch[2]) - 1;
  const year = slashMatch[3]
    ? Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
    : new Date().getFullYear();
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildDisciplineSummary(
  child: ParentChild,
  lifeEvents: StudentLifeEventRow[],
): ChildDisciplineSummary {
  const absences = lifeEvents.filter((entry) => entry.type === "ABSENCE");
  const retards = lifeEvents.filter((entry) => entry.type === "RETARD");
  const incidents = lifeEvents.filter(
    (entry) => entry.type === "SANCTION" || entry.type === "PUNITION",
  );
  const unjustifiedAbsences = absences.filter(
    (entry) => entry.justified === false,
  ).length;

  let statusLabel = "Situation sereine";
  let statusTone: ChildDisciplineSummary["statusTone"] = "calm";
  let detail = "Aucun signal disciplinaire notable sur la periode.";

  if (unjustifiedAbsences > 0 || incidents.length >= 2) {
    statusLabel = "Priorite parent";
    statusTone = "alert";
    detail =
      unjustifiedAbsences > 0
        ? `${unjustifiedAbsences} absence${unjustifiedAbsences > 1 ? "s" : ""} a justifier.`
        : `${incidents.length} incidents recensés sur la periode.`;
  } else if (
    absences.length > 0 ||
    retards.length > 1 ||
    incidents.length > 0
  ) {
    statusLabel = "A surveiller";
    statusTone = "watch";
    detail =
      absences.length > 0
        ? `${absences.length} absence${absences.length > 1 ? "s" : ""} enregistree${absences.length > 1 ? "s" : ""}.`
        : `${retards.length} retard${retards.length > 1 ? "s" : ""} ce trimestre.`;
  }

  return {
    childId: child.id,
    childName: formatStudentName(child),
    absences: absences.length,
    unjustifiedAbsences,
    retards: retards.length,
    incidents: incidents.length,
    statusLabel,
    statusTone,
    detail,
  };
}

export function buildNotesSummary(
  child: ParentChild,
  snapshots: StudentNotesTermSnapshot[],
): ChildNotesSummary {
  const currentTerm = getCurrentTerm();
  const snapshot =
    snapshots.find((entry) => entry.term === currentTerm) ??
    snapshots[0] ??
    null;

  if (!snapshot) {
    return {
      childId: child.id,
      childName: formatStudentName(child),
      averageLabel: "En attente",
      termLabel: "Trimestre en cours",
      trendLabel: "Aucune evaluation publiee",
      latestEvaluations: [],
    };
  }

  const latestEvaluations = snapshot.subjects
    .flatMap((subject) =>
      subject.evaluations.map((evaluation) => ({
        subjectLabel: subject.subjectLabel,
        evaluation,
      })),
    )
    .sort((left, right) => {
      const leftDate =
        parseRecordedAt(left.evaluation.recordedAt)?.getTime() ?? 0;
      const rightDate =
        parseRecordedAt(right.evaluation.recordedAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    })
    .slice(0, 3)
    .map(({ subjectLabel, evaluation }) => {
      const score = evaluation.score;
      if (typeof score !== "number" || !Number.isFinite(score)) {
        return null;
      }
      return {
        id: evaluation.id,
        subjectLabel,
        score,
        maxScore: evaluation.maxScore,
        recordedAtLabel: formatDateLabel(evaluation.recordedAt),
      };
    })
    .filter(
      (evaluation): evaluation is LatestEvaluation => evaluation !== null,
    );

  const average = snapshot.generalAverage.student;
  let trendLabel = "Progression a confirmer";
  if (average !== null && average >= 14) {
    trendLabel = "Dynamique tres encourageante";
  } else if (average !== null && average >= 10) {
    trendLabel = "Bases solides ce trimestre";
  } else if (average !== null) {
    trendLabel = "Points de vigilance a suivre";
  }

  return {
    childId: child.id,
    childName: formatStudentName(child),
    averageLabel: formatAverage(average),
    termLabel: snapshot.label || "Trimestre en cours",
    trendLabel,
    latestEvaluations,
  };
}

export function buildAccountSummary(
  payload: ParentDashboardSummaryResponse,
): ParentAccountSummary {
  const unreadMessages = payload.unreadMessages;
  const pendingPayments = payload.payments.pendingCount ?? 0;
  const latePayments = payload.payments.overdueCount ?? 0;
  const recentDocuments = payload.documents.recentCount;
  const pendingActions = [
    payload.payments.connected && pendingPayments > 0,
    unreadMessages > 0,
    recentDocuments > 0,
  ].filter(Boolean).length;

  const latestDocumentLabel =
    payload.documents.latest[0]?.title ??
    (payload.documents.totalPublishedCount > 0
      ? `${payload.documents.totalPublishedCount} document(s) publie(s)`
      : "Aucun document publie");

  return {
    headline:
      pendingActions === 0
        ? "Compte parent a jour"
        : `${pendingActions} point${pendingActions > 1 ? "s" : ""} a traiter`,
    detail:
      payload.payments.connected && latePayments > 0
        ? "Un reglement reste en retard et merite une verification."
        : "Retrouvez ici les elements administratifs et les echanges a suivre.",
    items: [
      {
        id: "payments",
        label: "Paiements",
        value: payload.payments.connected ? String(pendingPayments) : "--",
        detail: payload.payments.connected
          ? pendingPayments > 0
            ? `${latePayments} en retard, ${pendingPayments - latePayments} en attente`
            : "Aucun paiement en attente"
          : payload.payments.detail,
        tone:
          payload.payments.connected && latePayments > 0
            ? "alert"
            : payload.payments.connected && pendingPayments > 0
              ? "watch"
              : "neutral",
      },
      {
        id: "messages",
        label: "Messages non lus",
        value: String(unreadMessages),
        detail:
          unreadMessages > 0
            ? "Des echanges attendent votre lecture."
            : "Boite de reception a jour",
        tone: unreadMessages > 0 ? "watch" : "neutral",
      },
      {
        id: "documents",
        label: "Documents recents",
        value: String(recentDocuments),
        detail:
          recentDocuments > 0 ? latestDocumentLabel : payload.documents.detail,
        tone: recentDocuments > 0 ? "neutral" : "watch",
      },
    ],
  };
}

function WarmWelcomePanel({ me }: { me: MeResponse | null }) {
  const fullName = me
    ? `${me.firstName} ${me.lastName}`
    : "Chargement du profil";
  const roleLabel = me ? getRoleLabel(me.role) : "Espace famille";

  return (
    <section className="relative w-full min-w-0 overflow-hidden rounded-[20px] border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf4] to-[#fef3c7] p-3 shadow-[0_18px_55px_rgba(180,83,9,0.12)] min-[360px]:rounded-[24px] min-[360px]:p-4 md:p-7">
      <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-[#fdba74]/20 blur-3xl" />
      <div className="absolute bottom-0 right-16 h-24 w-24 rounded-full bg-[#fcd34d]/25 blur-2xl" />
      <div className="relative min-w-0 space-y-4">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-orange-900 backdrop-blur sm:text-sm">
            <Sparkles className="h-4 w-4" />
            Accueil famille
          </div>
          <h1 className="font-heading text-[1.6rem] font-semibold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
            Bienvenue, {fullName}
          </h1>
          <p className="max-w-none text-sm leading-6 text-slate-700 sm:text-base sm:leading-7 md:text-lg">
            Suivez en un coup d&apos;oeil la situation scolaire de vos enfants,
            leurs resultats recents et les actions parent a traiter.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/88 px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-orange-100 sm:px-4 sm:py-2.5 sm:text-sm">
            <HeartHandshake className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-slate-900">{roleLabel}</span>
          </div>
          {me?.role === "PARENT" && me.linkedStudents?.length ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/88 px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-orange-100 sm:px-4 sm:py-2.5 sm:text-sm">
              <GraduationCap className="h-4 w-4 text-orange-600" />
              {me.linkedStudents.length} enfant
              {me.linkedStudents.length > 1 ? "s" : ""} suivi
              {me.linkedStudents.length > 1 ? "s" : ""}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FamilyCardShell({
  title,
  eyebrow,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  accent: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`relative w-full min-w-0 overflow-hidden rounded-[18px] border border-orange-100 bg-gradient-to-br ${accent} p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:rounded-[22px] min-[360px]:p-4 md:p-5`}
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/50 blur-2xl" />
      <div className="relative min-w-0 space-y-3 min-[360px]:space-y-4 md:space-y-5">
        <div className="flex items-start justify-between gap-2 min-[360px]:gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 min-[360px]:text-sm min-[360px]:tracking-[0.18em]">
              {eyebrow}
            </p>
            <h2 className="font-heading text-base font-semibold text-slate-900 min-[360px]:text-lg sm:text-xl">
              {title}
            </h2>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/85 text-slate-900 shadow-sm ring-1 ring-black/5 min-[360px]:h-10 min-[360px]:w-10 md:h-12 md:w-12 md:rounded-2xl">
            <Icon className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4 md:h-5 md:w-5" />
          </div>
        </div>
        {children}
      </div>
    </article>
  );
}

function ToneBadge({
  label,
  tone,
}: {
  label: string;
  tone: "calm" | "watch" | "alert";
}) {
  const className =
    tone === "alert"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : tone === "watch"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-1 text-[10px] font-semibold ring-1 min-[360px]:px-2 min-[360px]:text-[11px] sm:px-2.5 sm:text-xs ${className}`}
    >
      {label}
    </span>
  );
}

function ParentDisciplineCard({
  summaries,
  loading,
  schoolSlug,
}: {
  summaries: ChildDisciplineSummary[];
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Vie scolaire"
      eyebrow="Discipline"
      icon={ShieldAlert}
      accent="from-[#ffe2b8] via-[#fff2dc] to-white"
    >
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[16px] border border-white/80 bg-white/80 p-2.5 min-[360px]:rounded-[18px] min-[360px]:p-3 md:rounded-[22px] md:p-4"
              >
                <div className="h-4 w-28 animate-pulse rounded-full bg-orange-100" />
                <div className="mt-3 h-16 animate-pulse rounded-2xl bg-orange-50" />
              </div>
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-orange-200 bg-white/70 px-3 py-4 text-sm text-slate-600 min-[360px]:rounded-[18px] min-[360px]:py-5 md:rounded-[22px] md:px-4 md:py-6">
            Aucun enfant associe ou aucune donnee de vie scolaire disponible.
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((summary) => (
              <Link
                key={summary.childId}
                href={`/schools/${schoolSlug}/children/${summary.childId}/vie-scolaire`}
                className="block rounded-[16px] border border-white/80 bg-white/85 p-2.5 shadow-sm ring-1 ring-orange-100/60 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 min-[360px]:rounded-[18px] min-[360px]:p-3 md:rounded-[22px] md:p-4"
              >
                <div className="flex items-start justify-between gap-2 min-[360px]:gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-semibold text-slate-900 sm:text-lg">
                      {summary.childName}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                      {summary.detail}
                    </p>
                  </div>
                  <ToneBadge
                    label={summary.statusLabel}
                    tone={summary.statusTone}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center min-[360px]:gap-1.5 md:mt-4 md:gap-2">
                  <div className="rounded-lg bg-[#fff8f1] px-1.5 py-2 min-[360px]:rounded-xl min-[360px]:px-2 min-[360px]:py-2.5 md:rounded-2xl md:px-3 md:py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
                      Absences
                    </p>
                    <p className="mt-2 font-heading text-xl font-semibold text-slate-950 sm:text-2xl">
                      {summary.absences}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#fff8f1] px-1.5 py-2 min-[360px]:rounded-xl min-[360px]:px-2 min-[360px]:py-2.5 md:rounded-2xl md:px-3 md:py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
                      Retards
                    </p>
                    <p className="mt-2 font-heading text-xl font-semibold text-slate-950 sm:text-2xl">
                      {summary.retards}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#fff8f1] px-1.5 py-2 min-[360px]:rounded-xl min-[360px]:px-2 min-[360px]:py-2.5 md:rounded-2xl md:px-3 md:py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
                      Incidents
                    </p>
                    <p className="mt-2 font-heading text-xl font-semibold text-slate-950 sm:text-2xl">
                      {summary.incidents}
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-orange-700 sm:text-sm">
                  Ouvrir le detail discipline
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </FamilyCardShell>
  );
}

function ParentEvaluationsCard({
  summaries,
  loading,
  schoolSlug,
}: {
  summaries: ChildNotesSummary[];
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Resultats recents"
      eyebrow="Evaluations"
      icon={GraduationCap}
      accent="from-[#ffd9cf] via-[#fff2e8] to-white"
    >
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[16px] border border-white/80 bg-white/80 p-2.5 min-[360px]:rounded-[18px] min-[360px]:p-3 md:rounded-[22px] md:p-4"
              >
                <div className="h-4 w-32 animate-pulse rounded-full bg-rose-100" />
                <div className="mt-3 h-20 animate-pulse rounded-2xl bg-orange-50" />
              </div>
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-orange-200 bg-white/70 px-3 py-4 text-sm text-slate-600 min-[360px]:rounded-[18px] min-[360px]:py-5 md:rounded-[22px] md:px-4 md:py-6">
            Les evaluations apparaitront ici des qu&apos;elles seront publiees.
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((summary) => (
              <Link
                key={summary.childId}
                href={`/schools/${schoolSlug}/children/${summary.childId}/notes`}
                className="block rounded-[16px] border border-white/80 bg-white/85 p-2.5 shadow-sm ring-1 ring-orange-100/60 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 min-[360px]:rounded-[18px] min-[360px]:p-3 md:rounded-[22px] md:p-4"
              >
                <div className="flex items-start justify-between gap-2 min-[360px]:gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-semibold text-slate-900 sm:text-lg">
                      {summary.childName}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                      {summary.trendLabel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#fff7ef] px-2 py-1.5 text-right min-[360px]:rounded-xl min-[360px]:px-2.5 min-[360px]:py-2 md:rounded-2xl md:px-3 md:py-2.5 lg:px-4 lg:py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
                      {summary.termLabel}
                    </p>
                    <p className="mt-1 font-heading text-xl font-semibold text-slate-950 sm:text-2xl">
                      {summary.averageLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {summary.latestEvaluations.length > 0 ? (
                    summary.latestEvaluations.map((evaluation) => (
                      <div
                        key={evaluation.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 rounded-lg bg-[#fffaf5] px-2 py-1.5 min-[360px]:gap-1.5 min-[360px]:rounded-xl min-[360px]:px-2.5 min-[360px]:py-2 md:gap-2 md:px-3"
                      >
                        <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                          {evaluation.subjectLabel}
                        </p>
                        <p className="shrink-0 text-xs font-semibold text-slate-950 sm:text-sm">
                          {String(evaluation.score).replace(".", ",")}
                          <span className="ml-1 text-[10px] font-medium text-slate-400 sm:text-[11px]">
                            /{evaluation.maxScore}
                          </span>
                        </p>
                        <p className="shrink-0 text-[10px] text-slate-500 sm:text-xs">
                          {evaluation.recordedAtLabel}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg bg-[#fffaf5] px-2 py-2 text-sm text-slate-600 min-[360px]:rounded-xl min-[360px]:px-2.5 min-[360px]:py-2.5 md:px-3 md:py-3">
                      Aucune evaluation recente pour le moment.
                    </div>
                  )}
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-orange-700 sm:text-sm">
                  Ouvrir les evaluations
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </FamilyCardShell>
  );
}

function AccountItemRow({
  item,
  href,
}: {
  item: ParentAccountItem;
  href: string;
}) {
  const toneClass =
    item.tone === "alert"
      ? "border-rose-200 bg-rose-50/70"
      : item.tone === "watch"
        ? "border-amber-200 bg-amber-50/70"
        : "border-orange-100 bg-white/80";

  return (
    <Link
      href={href}
      className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-[16px] border px-2.5 py-2.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 min-[360px]:rounded-[18px] min-[360px]:px-3 min-[360px]:py-3 md:gap-3 md:rounded-[22px] md:px-4 md:py-4 ${toneClass}`}
    >
      <p className="min-w-0 truncate text-xs font-semibold text-slate-900 min-[360px]:text-sm">
        {item.label}
      </p>
      <div className="flex shrink-0 items-center gap-2 min-[360px]:gap-3">
        <div className="rounded-lg bg-white/85 px-2 py-1 text-right shadow-sm ring-1 ring-black/5 min-[360px]:rounded-xl min-[360px]:px-2.5 min-[360px]:py-1.5 md:rounded-2xl md:px-3 md:py-2">
          <p className="font-heading text-lg font-semibold text-slate-950 min-[360px]:text-xl md:text-2xl">
            {item.value}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-orange-700" />
      </div>
    </Link>
  );
}

function ParentAccountCard({
  summary,
  loading,
  schoolSlug,
}: {
  summary: ParentAccountSummary;
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Mon espace parent"
      eyebrow="Compte"
      icon={CreditCard}
      accent="from-[#d6f2fb] via-[#edf9ff] to-white"
    >
      <div className="space-y-4">
        <div className="rounded-[16px] border border-white/80 bg-slate-900 px-2.5 py-2.5 text-white min-[360px]:rounded-[18px] min-[360px]:px-3 min-[360px]:py-3 md:rounded-[22px] md:px-4 md:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300 min-[360px]:text-sm">
                Situation du compte
              </p>
              <p className="mt-1 font-heading text-xl font-semibold min-[360px]:text-2xl">
                {loading ? "Chargement..." : summary.headline}
              </p>
              <p className="mt-2 text-xs text-slate-300 min-[360px]:text-sm">
                {loading ? "Preparation de vos indicateurs." : summary.detail}
              </p>
            </div>
            <CheckCircle2 className="mt-1 h-6 w-6 text-amber-300" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-[18px] bg-white/80 min-[360px]:h-24 min-[360px]:rounded-[22px]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {summary.items.map((item) => (
              <AccountItemRow
                key={item.id}
                item={item}
                href={
                  item.id === "payments"
                    ? `/schools/${schoolSlug}/situation-financiere`
                    : item.id === "messages"
                      ? `/schools/${schoolSlug}/messagerie`
                      : `/schools/${schoolSlug}/documents`
                }
              />
            ))}
          </div>
        )}
      </div>
    </FamilyCardShell>
  );
}

export default function DashboardPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [parentCardsLoading, setParentCardsLoading] = useState(false);
  const [disciplineSummaries, setDisciplineSummaries] = useState<
    ChildDisciplineSummary[]
  >([]);
  const [notesSummaries, setNotesSummaries] = useState<ChildNotesSummary[]>([]);
  const [accountSummary, setAccountSummary] = useState<ParentAccountSummary>({
    headline: "Compte parent",
    detail: "Resume de vos actions administratives.",
    items: [],
  });

  useEffect(() => {
    void loadProfile();
  }, [schoolSlug]);

  async function loadProfile() {
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    const payload = (await response.json()) as MeResponse;
    setMe(payload);

    if (payload.role === "PARENT") {
      await loadParentDashboardData(payload);
    }
  }

  async function loadParentDashboardData(payload: MeResponse) {
    const children = payload.linkedStudents ?? [];
    setParentCardsLoading(true);

    try {
      const [accountPayload, lifeEventsGroups, notesGroups] = await Promise.all(
        [
          fetch(
            `${API_URL}/schools/${schoolSlug}/auth/me/parent-dashboard-summary`,
            {
              credentials: "include",
            },
          ).then(async (response) => {
            if (!response.ok) {
              throw new Error("PARENT_DASHBOARD_SUMMARY_FAILED");
            }
            return (await response.json()) as ParentDashboardSummaryResponse;
          }),
          Promise.all(
            children.map(async (child) => {
              try {
                const response = await fetch(
                  `${API_URL}/schools/${schoolSlug}/students/${child.id}/life-events?scope=current&limit=200`,
                  {
                    credentials: "include",
                  },
                );
                if (!response.ok) {
                  return { child, events: [] as StudentLifeEventRow[] };
                }
                const events = (await response.json()) as StudentLifeEventRow[];
                return { child, events };
              } catch {
                return { child, events: [] as StudentLifeEventRow[] };
              }
            }),
          ),
          Promise.all(
            children.map(async (child) => {
              try {
                const response = await fetch(
                  `${API_URL}/schools/${schoolSlug}/students/${child.id}/notes`,
                  {
                    credentials: "include",
                  },
                );
                if (!response.ok) {
                  return {
                    child,
                    snapshots:
                      STUDENT_NOTES_DEMO_DATA as StudentNotesTermSnapshot[],
                  };
                }
                const snapshots =
                  (await response.json()) as StudentNotesTermSnapshot[];
                return {
                  child,
                  snapshots:
                    Array.isArray(snapshots) && snapshots.length > 0
                      ? snapshots
                      : STUDENT_NOTES_DEMO_DATA,
                };
              } catch {
                return {
                  child,
                  snapshots:
                    STUDENT_NOTES_DEMO_DATA as StudentNotesTermSnapshot[],
                };
              }
            }),
          ),
        ],
      );

      setDisciplineSummaries(
        lifeEventsGroups.map(({ child, events }) =>
          buildDisciplineSummary(child, events),
        ),
      );
      setNotesSummaries(
        notesGroups.map(({ child, snapshots }) =>
          buildNotesSummary(child, snapshots),
        ),
      );
      setAccountSummary(buildAccountSummary(accountPayload));
    } catch {
      setAccountSummary({
        headline: "Compte parent",
        detail: "Les informations de compte sont temporairement indisponibles.",
        items: [
          {
            id: "payments",
            label: "Paiements",
            value: "--",
            detail: "Resume comptable indisponible pour le moment.",
            tone: "neutral",
          },
          {
            id: "messages",
            label: "Messages non lus",
            value: "--",
            detail: "Le compteur de messages n'a pas pu etre charge.",
            tone: "watch",
          },
          {
            id: "documents",
            label: "Documents recents",
            value: "--",
            detail: "Le resume des documents n'a pas pu etre charge.",
            tone: "watch",
          },
        ],
      });
    } finally {
      setParentCardsLoading(false);
    }
  }

  return (
    <div
      data-testid="dashboard-root"
      className="mx-auto grid w-full min-w-0 max-w-[1120px] gap-4 overflow-x-hidden min-[360px]:gap-6"
    >
      <WarmWelcomePanel me={me} />

      {me?.role === "PARENT" || me?.role === "STUDENT" ? (
        <>
          {me?.role === "PARENT" ? (
            <div className="grid gap-3 min-[360px]:gap-4 xl:grid-cols-3">
              <ParentDisciplineCard
                summaries={disciplineSummaries}
                loading={parentCardsLoading}
                schoolSlug={schoolSlug}
              />
              <ParentEvaluationsCard
                summaries={notesSummaries}
                loading={parentCardsLoading}
                schoolSlug={schoolSlug}
              />
              <ParentAccountCard
                summary={accountSummary}
                loading={parentCardsLoading}
                schoolSlug={schoolSlug}
              />
            </div>
          ) : null}

          {me?.role === "PARENT" ? (
            <FamilyFeedPage
              schoolSlug={schoolSlug}
              childFullName="vos enfants"
              scopeLabel="la vie de l'ecole"
              viewerRole={me.role}
              viewScope="GENERAL"
            />
          ) : null}
        </>
      ) : null}

      {me?.role === "TEACHER" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {teacherStats.map((item) => (
            <article
              key={item.title}
              className="rounded-[22px] border border-border bg-surface p-5 shadow-card"
            >
              <p className="text-sm text-text-secondary">{item.title}</p>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {me?.role === "SCHOOL_ADMIN" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {schoolAdminStats.map((item) => (
            <article
              key={item.title}
              className="rounded-[22px] border border-border bg-surface p-5 shadow-card"
            >
              <p className="text-sm text-text-secondary">{item.title}</p>
              <p className="font-heading text-2xl font-bold text-primary">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
