"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { FamilyFeedPage } from "../../../../../components/feed/family-feed-page";
import { getSchoolMessagesUnreadCount } from "../../../../../components/messaging/messaging-api";
import type { StudentNotesTermSnapshot } from "../../../../../components/student-notes/student-notes.types";
import {
  buildAccountSummary,
  buildDisciplineSummary,
  buildNotesSummary,
  type ParentAccountItem,
  STUDENT_NOTES_FALLBACK,
  type ChildDisciplineSummary,
  type ChildNotesSummary,
  type ParentAccountSummary,
  type ParentChild,
  type ParentDashboardSummaryResponse,
  type StudentLifeEventRow,
} from "./page-logic";

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
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
  email?: string;
  linkedStudents?: ParentChild[];
};

type TeacherDashboardSummary = {
  classesCount: number;
  classNames: string[];
  unreadMessages: number;
};

type SchoolDashboardSummary = {
  classesCount: number;
  studentsCount: number;
  teachersCount: number;
  assignmentsCount: number;
  unreadMessages: number;
};

type DashboardHeroContent = {
  badge: string;
  lead: string;
  chips: string[];
};

type DashboardQuickLink = {
  id: string;
  label: string;
  value: string;
  href: string;
};

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
    case "SCHOOL_MANAGER":
      return "Direction";
    case "SUPERVISOR":
      return "Supervision";
    case "SCHOOL_ACCOUNTANT":
      return "Comptabilite";
    case "SUPPORT":
      return "Support";
    case "ADMIN":
      return "Administration plateforme";
    case "SUPER_ADMIN":
      return "Super administration";
    case "SALES":
      return "Developpement";
    default:
      return role;
  }
}

function isSchoolOperationsRole(role: MeResponse["role"] | undefined) {
  return (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR" ||
    role === "SCHOOL_ACCOUNTANT"
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function getHeroContent(me: MeResponse | null): DashboardHeroContent {
  if (!me) {
    return {
      badge: "Accueil",
      lead: "Retrouvez ici vos priorites du moment et vos acces directs utiles.",
      chips: [],
    };
  }

  if (me.role === "PARENT") {
    const childrenCount = me.linkedStudents?.length ?? 0;
    return {
      badge: "Accueil famille",
      lead: "Suivez en un coup d'oeil la situation scolaire de vos enfants, leurs resultats recents et les actions parent a traiter.",
      chips: [
        "Parent",
        childrenCount > 0
          ? `${childrenCount} enfant${childrenCount > 1 ? "s" : ""} suivi${childrenCount > 1 ? "s" : ""}`
          : "Acces famille",
      ],
    };
  }

  if (me.role === "TEACHER") {
    return {
      badge: "Accueil enseignant",
      lead: "Retrouvez vos classes, la saisie pedagogique et les echanges utiles sans passer par plusieurs modules.",
      chips: ["Enseignant", "Pilotage quotidien"],
    };
  }

  if (isSchoolOperationsRole(me.role)) {
    return {
      badge:
        me.role === "SCHOOL_ADMIN"
          ? "Accueil etablissement"
          : "Coordination etablissement",
      lead: "Gardez une lecture courte de la structure, de la scolarite et de la coordination de l'etablissement.",
      chips: [getRoleLabel(me.role), "Lecture de pilotage"],
    };
  }

  return {
    badge: "Accueil",
    lead: "Retrouvez ici vos priorites du moment et vos acces directs utiles.",
    chips: [getRoleLabel(me.role)],
  };
}

function WarmWelcomePanel({ me }: { me: MeResponse | null }) {
  const fullName = me
    ? `${me.firstName} ${me.lastName}`
    : "Chargement du profil";
  const hero = getHeroContent(me);

  return (
    <section className="relative w-full min-w-0 overflow-hidden rounded-[20px] border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf4] to-[#fef3c7] p-3 shadow-[0_18px_55px_rgba(180,83,9,0.12)] min-[360px]:rounded-[24px] min-[360px]:p-4 md:p-7">
      <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-[#fdba74]/20 blur-3xl" />
      <div className="absolute bottom-0 right-16 h-24 w-24 rounded-full bg-[#fcd34d]/25 blur-2xl" />
      <div className="relative min-w-0 space-y-4">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-orange-900 backdrop-blur sm:text-sm">
            <Sparkles className="h-4 w-4" />
            {hero.badge}
          </div>
          <h1 className="font-heading text-[1.6rem] font-semibold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
            Bienvenue, {fullName}
          </h1>
          <p className="max-w-none text-sm leading-6 text-slate-700 sm:text-base sm:leading-7 md:text-lg">
            {hero.lead}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {hero.chips.map((chip) => (
            <div
              key={chip}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/88 px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-orange-100 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              {chip.includes("enfant") ? (
                <GraduationCap className="h-4 w-4 text-orange-600" />
              ) : (
                <HeartHandshake className="h-4 w-4 text-orange-600" />
              )}
              <span className="font-medium text-slate-900">{chip}</span>
            </div>
          ))}
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

function DashboardActionLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-[16px] border border-white/80 bg-white/82 px-3 py-3 text-sm text-slate-700 ring-1 ring-orange-100/60 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 min-[360px]:rounded-[18px] min-[360px]:px-3.5 min-[360px]:py-3.5"
    >
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-orange-700" />
    </Link>
  );
}

function QuickMetricRow({ link }: { link: DashboardQuickLink }) {
  return (
    <Link
      href={link.href}
      className="flex items-center justify-between gap-3 rounded-[16px] border border-white/80 bg-white/82 px-3 py-3 ring-1 ring-orange-100/60 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 min-[360px]:rounded-[18px] min-[360px]:px-3.5 min-[360px]:py-3.5"
    >
      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
        {link.label}
      </p>
      <div className="flex items-center gap-2">
        <span className="font-heading text-xl font-semibold text-slate-950">
          {link.value}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-orange-700" />
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

function TeacherClassesCard({
  summary,
  loading,
  schoolSlug,
}: {
  summary: TeacherDashboardSummary;
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Mes classes"
      eyebrow="Pilotage"
      icon={Building2}
      accent="from-[#ffe2b8] via-[#fff2dc] to-white"
    >
      {loading ? (
        <div className="h-36 animate-pulse rounded-[18px] bg-white/80" />
      ) : (
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/80 bg-white/85 p-3 ring-1 ring-orange-100/60">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Classes actives
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-950">
              {formatCount(summary.classesCount)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {summary.classNames.length > 0
                ? summary.classNames.join(" • ")
                : "Aucune classe affectee pour le moment."}
            </p>
          </div>
          <DashboardActionLink
            href={`/schools/${schoolSlug}/mes-classes`}
            label="Ouvrir mes classes"
            hint="Acceder aux classes suivies et a leurs modules."
          />
        </div>
      )}
    </FamilyCardShell>
  );
}

function TeacherPedagogyCard({
  summary,
  loading,
  schoolSlug,
}: {
  summary: TeacherDashboardSummary;
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Suivi pedagogique"
      eyebrow="Evaluations"
      icon={BookOpen}
      accent="from-[#ffd9cf] via-[#fff2e8] to-white"
    >
      {loading ? (
        <div className="h-36 animate-pulse rounded-[18px] bg-white/80" />
      ) : (
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/80 bg-white/85 p-3 ring-1 ring-orange-100/60">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Saisie disponible
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-950">
              {formatCount(summary.classesCount)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Acces direct au cahier de notes et aux evaluations de vos classes.
            </p>
          </div>
          <DashboardActionLink
            href={`/schools/${schoolSlug}/student-grades`}
            label="Ouvrir le cahier de notes"
            hint="Saisir, verifier et publier les notes."
          />
        </div>
      )}
    </FamilyCardShell>
  );
}

function TeacherCommunicationCard({
  summary,
  loading,
  schoolSlug,
}: {
  summary: TeacherDashboardSummary;
  loading: boolean;
  schoolSlug: string;
}) {
  return (
    <FamilyCardShell
      title="Echanges"
      eyebrow="Communication"
      icon={MessageSquare}
      accent="from-[#d6f2fb] via-[#edf9ff] to-white"
    >
      {loading ? (
        <div className="h-36 animate-pulse rounded-[18px] bg-white/80" />
      ) : (
        <div className="space-y-3">
          <div className="rounded-[18px] border border-white/80 bg-slate-900 px-3 py-3 text-white">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
              Messages non lus
            </p>
            <p className="mt-2 font-heading text-3xl font-semibold">
              {formatCount(summary.unreadMessages)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {summary.unreadMessages > 0
                ? "Des parents ou collegues attendent une lecture."
                : "Boite de reception a jour."}
            </p>
          </div>
          <DashboardActionLink
            href={`/schools/${schoolSlug}/messagerie`}
            label="Ouvrir la messagerie"
            hint="Reprendre les echanges et les suivis de classe."
          />
        </div>
      )}
    </FamilyCardShell>
  );
}

function SchoolOperationsCard({
  title,
  eyebrow,
  icon,
  accent,
  links,
  loading,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  accent: string;
  links: DashboardQuickLink[];
  loading: boolean;
}) {
  return (
    <FamilyCardShell
      title={title}
      eyebrow={eyebrow}
      icon={icon}
      accent={accent}
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-[18px] bg-white/80"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <QuickMetricRow key={link.id} link={link} />
          ))}
        </div>
      )}
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
  const [teacherCardsLoading, setTeacherCardsLoading] = useState(false);
  const [teacherSummary, setTeacherSummary] = useState<TeacherDashboardSummary>(
    {
      classesCount: 0,
      classNames: [],
      unreadMessages: 0,
    },
  );
  const [schoolCardsLoading, setSchoolCardsLoading] = useState(false);
  const [schoolSummary, setSchoolSummary] = useState<SchoolDashboardSummary>({
    classesCount: 0,
    studentsCount: 0,
    teachersCount: 0,
    assignmentsCount: 0,
    unreadMessages: 0,
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
      return;
    }

    if (payload.role === "TEACHER") {
      await loadTeacherDashboardData();
      return;
    }

    if (isSchoolOperationsRole(payload.role)) {
      await loadSchoolDashboardData();
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
                    snapshots: STUDENT_NOTES_FALLBACK,
                  };
                }
                const snapshots =
                  (await response.json()) as StudentNotesTermSnapshot[];
                return {
                  child,
                  snapshots:
                    Array.isArray(snapshots) && snapshots.length > 0
                      ? snapshots
                      : STUDENT_NOTES_FALLBACK,
                };
              } catch {
                return {
                  child,
                  snapshots: STUDENT_NOTES_FALLBACK,
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

  async function loadTeacherDashboardData() {
    setTeacherCardsLoading(true);

    try {
      const [contextPayload, unreadMessages] = await Promise.all([
        fetch(`${API_URL}/schools/${schoolSlug}/student-grades/context`, {
          credentials: "include",
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error("TEACHER_CONTEXT_FAILED");
          }
          return (await response.json()) as {
            assignments?: Array<{
              classId: string;
              className: string;
            }>;
          };
        }),
        getSchoolMessagesUnreadCount(schoolSlug).catch(() => 0),
      ]);

      const classes = Array.from(
        new Map(
          (contextPayload.assignments ?? []).map((entry) => [
            entry.classId,
            entry.className,
          ]),
        ).values(),
      ).sort((left, right) => left.localeCompare(right));

      setTeacherSummary({
        classesCount: classes.length,
        classNames: classes.slice(0, 3),
        unreadMessages,
      });
    } catch {
      setTeacherSummary({
        classesCount: 0,
        classNames: [],
        unreadMessages: 0,
      });
    } finally {
      setTeacherCardsLoading(false);
    }
  }

  async function loadSchoolDashboardData() {
    setSchoolCardsLoading(true);

    try {
      const buildAdminPath = (segment: string) =>
        `${API_URL}/schools/${schoolSlug}/admin/${segment}`;

      const [
        classesResponse,
        studentsResponse,
        teachersResponse,
        assignmentsResponse,
        unreadMessages,
      ] = await Promise.all([
        fetch(buildAdminPath("classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath("students"), {
          credentials: "include",
        }),
        fetch(buildAdminPath("teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath("teacher-assignments"), {
          credentials: "include",
        }),
        getSchoolMessagesUnreadCount(schoolSlug).catch(() => 0),
      ]);

      const nextSummary: SchoolDashboardSummary = {
        classesCount: classesResponse.ok
          ? ((await classesResponse.json()) as Array<unknown>).length
          : 0,
        studentsCount: studentsResponse.ok
          ? ((await studentsResponse.json()) as Array<unknown>).length
          : 0,
        teachersCount: teachersResponse.ok
          ? ((await teachersResponse.json()) as Array<unknown>).length
          : 0,
        assignmentsCount: assignmentsResponse.ok
          ? ((await assignmentsResponse.json()) as Array<unknown>).length
          : 0,
        unreadMessages,
      };

      setSchoolSummary(nextSummary);
    } catch {
      setSchoolSummary({
        classesCount: 0,
        studentsCount: 0,
        teachersCount: 0,
        assignmentsCount: 0,
        unreadMessages: 0,
      });
    } finally {
      setSchoolCardsLoading(false);
    }
  }

  const schoolStructureLinks: DashboardQuickLink[] = [
    {
      id: "classes",
      label: "Classes",
      value: formatCount(schoolSummary.classesCount),
      href: "/classes",
    },
    {
      id: "students",
      label: "Eleves",
      value: formatCount(schoolSummary.studentsCount),
      href: "/eleves",
    },
    {
      id: "teachers",
      label: "Enseignants",
      value: formatCount(schoolSummary.teachersCount),
      href: "/teachers",
    },
  ];

  const schoolAcademicLinks: DashboardQuickLink[] = [
    {
      id: "assignments",
      label: "Affectations",
      value: formatCount(schoolSummary.assignmentsCount),
      href: "/teachers",
    },
    {
      id: "grades",
      label: "Notes",
      value: "Module",
      href: `/schools/${schoolSlug}/student-grades`,
    },
    {
      id: "curriculums",
      label: "Curriculums",
      value: "Module",
      href: "/curriculums",
    },
  ];

  const schoolCoordinationLinks: DashboardQuickLink[] = [
    {
      id: "messages",
      label: "Messagerie",
      value: formatCount(schoolSummary.unreadMessages),
      href: `/schools/${schoolSlug}/messagerie`,
    },
    {
      id: "feed",
      label: "Fil d'actualite",
      value: "Suivre",
      href: `/schools/${schoolSlug}/fil`,
    },
    {
      id: "settings",
      label: "Parametres",
      value: "Ouvrir",
      href: "/settings",
    },
  ];

  return (
    <div
      data-testid="dashboard-root"
      className="grid w-full min-w-0 gap-4 overflow-x-hidden min-[360px]:gap-6"
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
        <div className="grid gap-3 min-[360px]:gap-4 xl:grid-cols-3">
          <TeacherClassesCard
            summary={teacherSummary}
            loading={teacherCardsLoading}
            schoolSlug={schoolSlug}
          />
          <TeacherPedagogyCard
            summary={teacherSummary}
            loading={teacherCardsLoading}
            schoolSlug={schoolSlug}
          />
          <TeacherCommunicationCard
            summary={teacherSummary}
            loading={teacherCardsLoading}
            schoolSlug={schoolSlug}
          />
        </div>
      ) : null}

      {isSchoolOperationsRole(me?.role) ? (
        <div className="grid gap-3 min-[360px]:gap-4 xl:grid-cols-3">
          <SchoolOperationsCard
            title="Structure"
            eyebrow="Etablissement"
            icon={Users}
            accent="from-[#ffe2b8] via-[#fff2dc] to-white"
            links={schoolStructureLinks}
            loading={schoolCardsLoading}
          />
          <SchoolOperationsCard
            title="Scolarite"
            eyebrow="Pedagogie"
            icon={ClipboardCheck}
            accent="from-[#ffd9cf] via-[#fff2e8] to-white"
            links={schoolAcademicLinks}
            loading={schoolCardsLoading}
          />
          <SchoolOperationsCard
            title="Coordination"
            eyebrow="Pilotage"
            icon={LayoutDashboard}
            accent="from-[#d6f2fb] via-[#edf9ff] to-white"
            links={schoolCoordinationLinks}
            loading={schoolCardsLoading}
          />
        </div>
      ) : null}
    </div>
  );
}
