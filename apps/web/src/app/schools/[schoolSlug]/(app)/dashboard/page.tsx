"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BellDot,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { FamilyFeedPage } from "../../../../../components/feed/family-feed-page";

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
};

const familyStats = [
  {
    title: "Messages non lus",
    value: "3",
    note: "Des conversations attendent une reponse ou une lecture.",
    accent: "from-amber-300 via-orange-200 to-white",
    icon: BellDot,
  },
  {
    title: "Paiements en attente",
    value: "1",
    note: "Un reglement reste a finaliser pour cloturer la situation.",
    accent: "from-rose-200 via-orange-100 to-white",
    icon: CreditCard,
  },
  {
    title: "Documents recents",
    value: "4",
    note: "Nouveaux supports et pieces partages ces derniers jours.",
    accent: "from-sky-200 via-cyan-100 to-white",
    icon: FileText,
  },
];

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

function WarmWelcomePanel({ me }: { me: MeResponse | null }) {
  const fullName = me
    ? `${me.firstName} ${me.lastName}`
    : "Chargement du profil";
  const roleLabel = me ? getRoleLabel(me.role) : "Espace famille";

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf4] to-[#fef3c7] p-6 shadow-[0_18px_55px_rgba(180,83,9,0.12)] md:p-8">
      <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#fdba74]/30 blur-3xl" />
      <div className="absolute bottom-0 right-16 h-24 w-24 rounded-full bg-[#fcd34d]/30 blur-2xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/70 px-3 py-1 text-sm font-medium text-orange-900 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Vue d'ensemble de votre espace
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
              Bienvenue, {fullName}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
              Retrouvez vos priorites du moment, les echanges a suivre et les
              derniers contenus partages par l'etablissement dans un espace plus
              clair et plus vivant.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-orange-100">
              <HeartHandshake className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-slate-900">{roleLabel}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-orange-100">
              <Clock3 className="h-4 w-4 text-orange-600" />
              Mis a jour pour une lecture rapide
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/70 bg-white/70 p-4 backdrop-blur">
          <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-4 text-white">
            <div>
              <p className="text-sm text-slate-300">Profil actif</p>
              <p className="mt-1 font-heading text-xl font-semibold">
                {roleLabel}
              </p>
            </div>
            <GraduationCap className="h-8 w-8 text-amber-300" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-orange-100">
              <p className="text-sm text-slate-500">Lecture du tableau</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                Priorites, activite et contenus recents en un seul regard.
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-orange-100">
              <p className="text-sm text-slate-500">Navigation</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-orange-700">
                Continuer vers vos modules
                <ChevronRight className="h-4 w-4" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FamilyStatCard({
  title,
  value,
  note,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  note: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[24px] border border-orange-100 bg-gradient-to-br ${accent} p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-1`}
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/40 blur-2xl" />
      <div className="relative space-y-8">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Indicateur
            </p>
            <h2 className="font-heading text-xl font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-slate-900 shadow-sm ring-1 ring-black/5">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-heading text-5xl font-semibold leading-none text-slate-950">
              {value}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
              {note}
            </p>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/5">
            A suivre
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setMe((await response.json()) as MeResponse);
  }

  return (
    <div className="grid gap-6">
      <WarmWelcomePanel me={me} />

      {me?.role === "PARENT" || me?.role === "STUDENT" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {familyStats.map((item) => (
              <FamilyStatCard key={item.title} {...item} />
            ))}
          </div>

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
