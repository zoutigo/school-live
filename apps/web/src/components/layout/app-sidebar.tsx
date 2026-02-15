"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  UserRound,
  UserSquare2,
  Users,
} from "lucide-react";
import { Badge } from "../ui/badge";
import type { Role } from "../../lib/role-view";

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

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

type TeacherClassNav = {
  classId: string;
  className: string;
  schoolYearId: string;
};

type TeacherClassWithItems = TeacherClassNav & {
  items: NavItem[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
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
        label: "Matieres",
        href: "/subjects",
        icon: BookOpen,
        matchPrefix: "/subjects",
      },
      {
        label: "Curriculums",
        href: "/curriculums",
        icon: GraduationCap,
        matchPrefix: "/curriculums",
      },
      {
        label: "Inscriptions",
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: "Eleves",
        href: "/eleves",
        icon: UserSquare2,
        matchPrefix: "/eleves",
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
        label: "Parametres",
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR"
  ) {
    return [
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
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
        label: "Matieres",
        href: "/subjects",
        icon: BookOpen,
        matchPrefix: "/subjects",
      },
      {
        label: "Curriculums",
        href: "/curriculums",
        icon: GraduationCap,
        matchPrefix: "/curriculums",
      },
      {
        label: "Inscriptions",
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: "Eleves",
        href: "/eleves",
        icon: UserSquare2,
        matchPrefix: "/eleves",
      },
      {
        label: "Enseignants",
        href: "/teachers",
        icon: GraduationCap,
        matchPrefix: "/teachers",
      },
      {
        label: "Parents-eleves",
        href: `${schoolBase}/dashboard#parents`,
        icon: Users,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Notes",
        href: `${schoolBase}/grades`,
        icon: BookOpen,
        matchPrefix: `${schoolBase}/grades`,
      },
      {
        label: "Parametres",
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (role === "TEACHER") {
    return [
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: "Tableau de bord",
        href: `${schoolBase}/dashboard`,
        icon: LayoutDashboard,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Mes classes",
        href: `${schoolBase}/mes-classes`,
        icon: School,
        matchPrefix: `${schoolBase}/mes-classes`,
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
        label: "Parametres",
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (role === "PARENT") {
    return [
      {
        label: "Mon compte",
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
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
        label: "Formulaires & sondages",
        href: `${schoolBase}/dashboard#forms`,
        icon: FileText,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: "Parametres",
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  return [
    {
      label: "Mon compte",
      href: "/account",
      icon: UserSquare2,
      matchPrefix: "/account",
    },
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
      label: "Parametres",
      href: "/settings",
      icon: Settings,
      matchPrefix: "/settings",
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
  ];
}

function buildParentChildItems(schoolSlug: string, childId: string): NavItem[] {
  const base = `/schools/${schoolSlug}/children/${childId}`;

  return [
    {
      label: "Accueil",
      href: `${base}/accueil`,
      icon: Home,
      matchPrefix: `${base}/accueil`,
    },
    {
      label: "Vie scolaire",
      href: `${base}/vie-scolaire`,
      icon: UserRound,
      matchPrefix: `${base}/vie-scolaire`,
    },
    {
      label: "Vie de classe",
      href: `${base}/vie-de-classe`,
      icon: Users,
      matchPrefix: `${base}/vie-de-classe`,
    },
    {
      label: "Notes",
      href: `${base}/notes`,
      icon: BookOpen,
      matchPrefix: `${base}/notes`,
    },
    {
      label: "Messagerie",
      href: `${base}/messagerie`,
      icon: MessageSquare,
      matchPrefix: `${base}/messagerie`,
    },
    {
      label: "Cahier de texte",
      href: `${base}/cahier-de-texte`,
      icon: FileText,
      matchPrefix: `${base}/cahier-de-texte`,
    },
    {
      label: "Manuels & resources",
      href: `${base}/manuels-ressources`,
      icon: FileText,
      matchPrefix: `${base}/manuels-ressources`,
    },
    {
      label: "Formulaires & sondages",
      href: `${base}/formulaires-sondages`,
      icon: FileText,
      matchPrefix: `${base}/formulaires-sondages`,
    },
    {
      label: "Cursus",
      href: `${base}/cursus`,
      icon: GraduationCap,
      matchPrefix: `${base}/cursus`,
    },
  ];
}

function buildTeacherClassItems(
  schoolSlug: string,
  classId: string,
): NavItem[] {
  const base = `/schools/${schoolSlug}/classes/${classId}`;

  return [
    {
      label: "Notes",
      href: `${base}/notes`,
      icon: BookOpen,
      matchPrefix: `${base}/notes`,
    },
    {
      label: "Discipline",
      href: `${base}/discipline`,
      icon: ShieldCheck,
      matchPrefix: `${base}/discipline`,
    },
    {
      label: "Agenda",
      href: `${base}/agenda`,
      icon: CalendarDays,
      matchPrefix: `${base}/agenda`,
    },
    {
      label: "Devoirs",
      href: `${base}/devoirs`,
      icon: FileText,
      matchPrefix: `${base}/devoirs`,
    },
  ];
}

export function AppSidebar({ schoolSlug, role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = buildItems(role, schoolSlug);
  const isFamilySpace = role === "PARENT" || role === "STUDENT";
  const [parentChildren, setParentChildren] = useState<ParentChild[]>([]);
  const [openParentSection, setOpenParentSection] = useState<string>("general");
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassNav[]>([]);
  const [openTeacherSection, setOpenTeacherSection] =
    useState<string>("classes");

  useEffect(() => {
    if (role !== "PARENT" || !schoolSlug) {
      setParentChildren([]);
      return;
    }

    void loadParentChildren(schoolSlug);
  }, [role, schoolSlug]);

  useEffect(() => {
    if (role !== "TEACHER" || !schoolSlug) {
      setTeacherClasses([]);
      return;
    }

    void loadTeacherClasses(schoolSlug);
  }, [role, schoolSlug]);

  async function loadParentChildren(currentSchoolSlug: string) {
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        linkedStudents?: ParentChild[];
      };

      setParentChildren(payload.linkedStudents ?? []);
    } catch {
      // Keep sidebar available if children lookup fails.
    }
  }

  async function loadTeacherClasses(currentSchoolSlug: string) {
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/grades/context`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        assignments?: Array<{
          classId: string;
          className: string;
          schoolYearId: string;
        }>;
      };

      const byClassId = new Map<string, TeacherClassNav>();
      (payload.assignments ?? []).forEach((entry) => {
        if (!byClassId.has(entry.classId)) {
          byClassId.set(entry.classId, {
            classId: entry.classId,
            className: entry.className,
            schoolYearId: entry.schoolYearId,
          });
        }
      });

      const rows = Array.from(byClassId.values()).sort((a, b) =>
        a.className.localeCompare(b.className),
      );
      setTeacherClasses(rows);
    } catch {
      // Keep sidebar available if classes lookup fails.
    }
  }

  const parentChildrenWithItems = useMemo(() => {
    if (!schoolSlug) {
      return [];
    }

    return parentChildren.map((child) => ({
      ...child,
      items: buildParentChildItems(schoolSlug, child.id),
    }));
  }, [parentChildren, schoolSlug]);

  const teacherClassesWithItems = useMemo<TeacherClassWithItems[]>(() => {
    if (!schoolSlug) {
      return [];
    }

    return teacherClasses.map((entry) => ({
      ...entry,
      items: buildTeacherClassItems(schoolSlug, entry.classId),
    }));
  }, [teacherClasses, schoolSlug]);

  const teacherGeneralItems = useMemo(
    () => items.filter((item) => item.href !== "/settings"),
    [items],
  );
  const teacherSettingsItem = useMemo(
    () => items.find((item) => item.href === "/settings") ?? null,
    [items],
  );

  useEffect(() => {
    if (role !== "TEACHER") {
      return;
    }

    const activeClass = teacherClassesWithItems.find((entry) =>
      entry.items.some((item) =>
        item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href,
      ),
    );

    if (activeClass) {
      setOpenTeacherSection(`class-${activeClass.classId}`);
      return;
    }

    if (
      openTeacherSection !== "classes" &&
      !teacherClassesWithItems.some(
        (entry) => openTeacherSection === `class-${entry.classId}`,
      )
    ) {
      setOpenTeacherSection("classes");
    }
  }, [role, pathname, teacherClassesWithItems, openTeacherSection]);

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
      {role === "TEACHER" ? (
        <div className="grid gap-3">
          <div className="rounded-card border border-surface/20 bg-primary-dark/40 p-2">
            <button
              type="button"
              onClick={() => setOpenTeacherSection("classes")}
              className={`flex w-full items-center rounded-card px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${
                openTeacherSection === "classes"
                  ? "bg-surface text-primary"
                  : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  openTeacherSection === "classes"
                    ? "bg-background text-primary"
                    : "bg-primary-dark text-surface"
                }`}
              >
                <School className="h-4 w-4" />
              </span>
              <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                Menu enseignant
              </span>
            </button>

            {openTeacherSection === "classes" ? (
              <nav
                className="mt-2 grid gap-1"
                aria-label="Menu general enseignant"
              >
                {teacherGeneralItems.map((item) => {
                  const active = item.matchPrefix
                    ? pathname.startsWith(item.matchPrefix)
                    : pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={`teacher-general-${item.label}-${item.href}`}
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center rounded-card px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${
                        active
                          ? "bg-surface text-primary"
                          : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          active
                            ? "bg-background text-primary"
                            : "bg-primary-dark text-surface"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                        {item.label}
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
            ) : null}
          </div>

          {teacherClassesWithItems.map((entry) => {
            const sectionKey = `class-${entry.classId}`;
            const isOpen = openTeacherSection === sectionKey;

            return (
              <div
                key={entry.classId}
                className="rounded-card border border-surface/20 bg-primary-dark/40 p-2"
              >
                <button
                  type="button"
                  onClick={() => setOpenTeacherSection(sectionKey)}
                  className={`flex w-full items-center rounded-card px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${
                    isOpen
                      ? "bg-surface text-primary"
                      : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isOpen
                        ? "bg-background text-primary"
                        : "bg-primary-dark text-surface"
                    }`}
                  >
                    <School className="h-4 w-4" />
                  </span>
                  <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                    {entry.className}
                  </span>
                </button>

                {isOpen ? (
                  <nav
                    className="mt-2 grid gap-1"
                    aria-label={`Menu classe ${entry.className}`}
                  >
                    {entry.items.map((item) => {
                      const active = item.matchPrefix
                        ? pathname.startsWith(item.matchPrefix)
                        : pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={`${entry.classId}-${item.label}-${item.href}`}
                          href={item.href}
                          onClick={onNavigate}
                          className={`flex items-center rounded-card px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${
                            active
                              ? "bg-surface text-primary"
                              : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              active
                                ? "bg-background text-primary"
                                : "bg-primary-dark text-surface"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
            );
          })}

          {teacherSettingsItem ? (
            <Link
              href={teacherSettingsItem.href}
              onClick={onNavigate}
              className={`flex items-center rounded-card px-2 py-2 text-sm font-heading font-semibold transition-colors ${
                pathname.startsWith(teacherSettingsItem.matchPrefix ?? "")
                  ? "bg-surface text-primary"
                  : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  pathname.startsWith(teacherSettingsItem.matchPrefix ?? "")
                    ? "bg-background text-primary"
                    : "bg-primary-dark text-surface"
                }`}
              >
                <Settings className="h-4 w-4" />
              </span>
              <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                {teacherSettingsItem.label}
              </span>
            </Link>
          ) : null}
        </div>
      ) : role !== "PARENT" ? (
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
                    : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
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
      ) : (
        <div className="grid gap-3">
          <div className="rounded-card border border-surface/20 bg-primary-dark/40 p-2">
            <button
              type="button"
              onClick={() => setOpenParentSection("general")}
              className={`flex w-full items-center rounded-card px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${
                openParentSection === "general"
                  ? "bg-surface text-primary"
                  : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  openParentSection === "general"
                    ? "bg-background text-primary"
                    : "bg-primary-dark text-surface"
                }`}
              >
                <Home className="h-4 w-4" />
              </span>
              <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                Menu general
              </span>
            </button>

            {openParentSection === "general" ? (
              <nav className="mt-2 grid gap-1" aria-label="Menu general parent">
                {items.map((item) => {
                  const active = item.matchPrefix
                    ? pathname.startsWith(item.matchPrefix)
                    : pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={`general-${item.label}-${item.href}`}
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center rounded-card px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${
                        active
                          ? "bg-surface text-primary"
                          : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          active
                            ? "bg-background text-primary"
                            : "bg-primary-dark text-surface"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                        {item.label}
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
            ) : null}
          </div>

          {parentChildrenWithItems.map((child) => {
            const sectionKey = `child-${child.id}`;
            const isOpen = openParentSection === sectionKey;

            return (
              <div
                key={child.id}
                className="rounded-card border border-surface/20 bg-primary-dark/40 p-2"
              >
                <button
                  type="button"
                  onClick={() => setOpenParentSection(sectionKey)}
                  className={`flex w-full items-center rounded-card px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${
                    isOpen
                      ? "bg-surface text-primary"
                      : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                  }`}
                >
                  {child.avatarUrl ? (
                    <img
                      src={child.avatarUrl}
                      alt={`${child.firstName} ${child.lastName}`}
                      className="h-8 w-8 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isOpen
                          ? "bg-background text-primary"
                          : "bg-primary-dark text-surface"
                      }`}
                    >
                      <UserRound className="h-4 w-4" />
                    </span>
                  )}

                  <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                    {child.lastName} {child.firstName}
                  </span>
                </button>

                {isOpen ? (
                  <nav
                    className="mt-2 grid gap-1"
                    aria-label={`Menu ${child.lastName} ${child.firstName}`}
                  >
                    {child.items.map((item) => {
                      const active = item.matchPrefix
                        ? pathname.startsWith(item.matchPrefix)
                        : pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={`${child.id}-${item.label}-${item.href}`}
                          href={item.href}
                          onClick={onNavigate}
                          className={`flex items-center rounded-card px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${
                            active
                              ? "bg-surface text-primary"
                              : "text-surface hover:bg-[#09529C] focus-visible:bg-[#09529C] hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              active
                                ? "bg-background text-primary"
                                : "bg-primary-dark text-surface"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
