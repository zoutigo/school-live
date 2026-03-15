"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "../../components/layout/app-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";

type MeResponse = {
  firstName: string;
  lastName: string;
  role:
    | PlatformRole
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT";
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

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function getRoleLabel(role: PlatformRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super administration";
    case "ADMIN":
      return "Administration plateforme";
    case "SALES":
      return "Developpement";
    case "SUPPORT":
      return "Support";
    default:
      return role;
  }
}

function PlatformHero({ me }: { me: MeResponse | null }) {
  const fullName = me
    ? `${me.firstName} ${me.lastName}`.trim()
    : "Chargement du profil";
  const roleLabel = me?.role
    ? getRoleLabel(me.role as PlatformRole)
    : "Plateforme";

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf4] to-[#fef3c7] p-4 shadow-[0_18px_55px_rgba(180,83,9,0.12)] min-[360px]:rounded-[24px] min-[360px]:p-5 md:p-7">
      <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-[#fdba74]/20 blur-3xl" />
      <div className="absolute bottom-0 right-16 h-24 w-24 rounded-full bg-[#fcd34d]/25 blur-2xl" />
      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-orange-900 backdrop-blur sm:text-sm">
          <Sparkles className="h-4 w-4" />
          Accueil plateforme
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-[1.6rem] font-semibold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
            Bienvenue, {fullName}
          </h1>
          <p className="text-sm leading-6 text-slate-700 sm:text-base sm:leading-7 md:text-lg">
            Gardez une lecture directe du reseau, des comptes et de l'activite
            plateforme sans passer par plusieurs modules.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/88 px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-orange-100 sm:px-4 sm:py-2.5 sm:text-sm">
            <ShieldCheck className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-slate-900">{roleLabel}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/88 px-3 py-2 text-xs text-slate-700 shadow-sm ring-1 ring-orange-100 sm:px-4 sm:py-2.5 sm:text-sm">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-slate-900">Pilotage global</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformCard({
  title,
  eyebrow,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Building2;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[18px] border border-orange-100 bg-gradient-to-br ${accent} p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] min-[360px]:rounded-[22px] min-[360px]:p-5`}
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/50 blur-2xl" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 min-[360px]:text-sm">
              {eyebrow}
            </p>
            <h2 className="font-heading text-lg font-semibold text-slate-900 sm:text-xl">
              {title}
            </h2>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-slate-900 shadow-sm ring-1 ring-black/5">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {children}
      </div>
    </article>
  );
}

function PlatformLinkRow({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-[16px] border border-white/80 bg-white/85 px-3 py-3 ring-1 ring-orange-100/60 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="font-heading text-xl font-semibold text-slate-950">
          {value}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-orange-700" />
      </div>
    </Link>
  );
}

export default function AcceuilPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorsResponse | null>(null);

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

    if (
      payload.role !== "SUPER_ADMIN" &&
      payload.role !== "ADMIN" &&
      payload.role !== "SALES" &&
      payload.role !== "SUPPORT"
    ) {
      if (payload.schoolSlug) {
        router.replace(`/schools/${payload.schoolSlug}/dashboard`);
        return;
      }

      router.replace("/");
      return;
    }

    setMe(payload);

    if (payload.role === "SUPER_ADMIN" || payload.role === "ADMIN") {
      try {
        const indicatorsResponse = await fetch(`${API_URL}/system/indicators`, {
          credentials: "include",
        });
        if (indicatorsResponse.ok) {
          setIndicators(
            (await indicatorsResponse.json()) as IndicatorsResponse,
          );
        }
      } catch {
        // Keep the platform dashboard readable without indicators.
      }
    }

    setLoading(false);
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div
        data-testid="platform-dashboard-root"
        className="grid w-full gap-4 min-[360px]:gap-6"
      >
        <PlatformHero me={me} />

        <div className="grid gap-3 min-[360px]:gap-4 xl:grid-cols-3">
          <PlatformCard
            title="Reseau"
            eyebrow="Etablissements"
            icon={Building2}
            accent="from-[#ffe2b8] via-[#fff2dc] to-white"
          >
            {loading ? (
              <div className="h-40 animate-pulse rounded-[18px] bg-white/80" />
            ) : (
              <div className="space-y-3">
                <PlatformLinkRow
                  href="/schools"
                  label="Ecoles"
                  value={
                    indicators ? formatCount(indicators.schoolsCount) : "Ouvrir"
                  }
                />
                <PlatformLinkRow
                  href="/classes"
                  label="Classes"
                  value="Gerer"
                />
              </div>
            )}
          </PlatformCard>

          <PlatformCard
            title="Comptes"
            eyebrow="Utilisateurs"
            icon={Users}
            accent="from-[#ffd9cf] via-[#fff2e8] to-white"
          >
            {loading ? (
              <div className="h-40 animate-pulse rounded-[18px] bg-white/80" />
            ) : (
              <div className="space-y-3">
                <PlatformLinkRow
                  href="/users"
                  label="Utilisateurs"
                  value={
                    indicators ? formatCount(indicators.usersCount) : "Ouvrir"
                  }
                />
                <PlatformLinkRow
                  href="/users"
                  label="Admins ecole"
                  value={
                    indicators
                      ? formatCount(indicators.schoolAdminsCount)
                      : "Suivre"
                  }
                />
              </div>
            )}
          </PlatformCard>

          <PlatformCard
            title="Activite"
            eyebrow="Pilotage"
            icon={BarChart3}
            accent="from-[#d6f2fb] via-[#edf9ff] to-white"
          >
            {loading ? (
              <div className="h-40 animate-pulse rounded-[18px] bg-white/80" />
            ) : (
              <div className="space-y-3">
                <PlatformLinkRow
                  href="/indicators"
                  label="Indicateurs"
                  value={
                    indicators ? formatCount(indicators.gradesCount) : "Ouvrir"
                  }
                />
                <PlatformLinkRow
                  href="/indicators"
                  label="Eleves / enseignants"
                  value={
                    indicators
                      ? `${formatCount(indicators.studentsCount)} / ${formatCount(indicators.teachersCount)}`
                      : "Vue"
                  }
                />
              </div>
            )}
          </PlatformCard>
        </div>
      </div>
    </AppShell>
  );
}
