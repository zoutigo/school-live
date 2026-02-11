"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  UserSquare2,
  Users,
} from "lucide-react";
import { Badge } from "../ui/badge";

type Role =
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

type SidebarProps = {
  schoolSlug?: string | null;
  role: Role;
  onNavigate?: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefix?: string;
  unread?: number;
};

function buildItems(role: Role, schoolSlug?: string | null): NavItem[] {
  const schoolBase = schoolSlug ? `/schools/${schoolSlug}` : "/acceuil";

  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return [
      {
        label: "Accueil plateforme",
        href: "/acceuil",
        icon: ShieldCheck,
        matchPrefix: "/acceuil",
      },
      {
        label: "Ecoles",
        href: "/schools",
        icon: School,
        matchPrefix: "/schools",
      },
      {
        label: "Classes",
        href: "/classes",
        icon: Building2,
        matchPrefix: "/classes",
      },
      {
        label: "Inscriptions",
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: "Utilisateurs",
        href: "/users",
        icon: Users,
        matchPrefix: "/users",
      },
      {
        label: "Indicateurs",
        href: "/indicators",
        icon: BarChart3,
        matchPrefix: "/indicators",
      },
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: "Parametres",
        href: "/acceuil#settings",
        icon: Settings,
        matchPrefix: "/acceuil",
      },
    ];
  }

  if (role === "SCHOOL_ADMIN") {
    return [
      {
        label: "Accueil",
        href: `${schoolBase}/dashboard`,
        icon: LayoutDashboard,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Classes",
        href: "/classes",
        icon: Building2,
        matchPrefix: "/classes",
      },
      {
        label: "Inscriptions",
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: "Enseignants",
        href: `${schoolBase}/dashboard#teachers`,
        icon: GraduationCap,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Parents-eleves",
        href: `${schoolBase}/dashboard#parents`,
        icon: Users,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Eleves",
        href: `${schoolBase}/dashboard#students`,
        icon: UserSquare2,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Notes",
        href: `${schoolBase}/grades`,
        icon: BookOpen,
        matchPrefix: `${schoolBase}/grades`,
      },
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
    ];
  }

  if (role === "TEACHER") {
    return [
      {
        label: "Tableau de bord",
        href: `${schoolBase}/dashboard`,
        icon: LayoutDashboard,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Mes classes",
        href: `${schoolBase}/dashboard#my-classes`,
        icon: School,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Cahier de notes",
        href: `${schoolBase}/grades`,
        icon: BookOpen,
        matchPrefix: `${schoolBase}/grades`,
      },
      {
        label: "Messagerie",
        href: `${schoolBase}/dashboard#messages`,
        icon: MessageSquare,
        unread: 2,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
    ];
  }

  return [
    {
      label: "Accueil",
      href: `${schoolBase}/dashboard`,
      icon: Home,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Vos informations",
      href: `${schoolBase}/dashboard#infos`,
      icon: UserSquare2,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Situation financiere",
      href: `${schoolBase}/dashboard#finance`,
      icon: CreditCard,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Paiements en ligne",
      href: `${schoolBase}/dashboard#payments`,
      icon: CreditCard,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Messagerie",
      href: `${schoolBase}/dashboard#messages`,
      icon: MessageSquare,
      unread: 3,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Documents",
      href: `${schoolBase}/dashboard#docs`,
      icon: FileText,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: "Notes & devoirs",
      href: `${schoolBase}/grades`,
      icon: BookOpen,
      matchPrefix: `${schoolBase}/grades`,
    },
    {
      label: "Mon compte",
      href: "/account",
      icon: UserSquare2,
      matchPrefix: "/account",
    },
  ];
}

export function AppSidebar({ schoolSlug, role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = buildItems(role, schoolSlug);
  const isFamilySpace = role === "PARENT" || role === "STUDENT";

  return (
    <aside className="group h-full w-[236px] shrink-0 bg-sidebar-bg px-2 py-4 text-surface transition-all duration-300 md:w-[72px] md:hover:w-[236px] md:px-3">
      {isFamilySpace ? (
        <div className="mb-4 rounded-card bg-primary-dark/80 px-3 py-2 text-center font-heading text-xs font-bold tracking-wide text-surface">
          <div className="flex items-center justify-center md:justify-start">
            <Home className="h-4 w-4 md:mx-auto md:group-hover:mx-0" />
            <span className="ml-2 md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[140px] md:group-hover:opacity-100">
              MON ESPACE FAMILLE
            </span>
          </div>
        </div>
      ) : null}
      <nav className="flex flex-col gap-1" aria-label="Navigation principale">
        {items.map((item) => {
          const active = item.matchPrefix
            ? pathname.startsWith(item.matchPrefix)
            : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center rounded-card px-2 py-2 text-sm font-heading font-semibold transition-colors ${
                active
                  ? "bg-surface text-primary"
                  : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C]"
              }`}
            >
              <span className="flex min-w-0 items-center">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    active
                      ? "bg-background text-primary"
                      : "bg-primary-dark text-surface"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                  {item.label}
                </span>
              </span>
              {typeof item.unread === "number" ? (
                <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                  <Badge variant="notification">{item.unread}</Badge>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
