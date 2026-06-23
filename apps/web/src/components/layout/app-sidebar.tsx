"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  UserRound,
  UserSquare2,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "../ui/badge";
import {
  getUnreadSummary,
  readCachedUnreadSummary,
  type ChildBadgeSummary,
  type TeacherClassBadgeSummary,
  type UnreadSummary,
} from "./badges-api";
import type { Role } from "../../lib/role-view";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";

type SidebarProps = {
  schoolSlug?: string | null;
  role: Role;
  onNavigate?: () => void;
  onLogoutClick?: () => void;
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

function toUnread(count: number | undefined): number | undefined {
  return count && count > 0 ? count : undefined;
}

function buildItems(
  role: Role,
  schoolSlug: string | null | undefined,
  t: TranslateFn,
  badges: UnreadSummary | null,
): NavItem[] {
  const schoolBase = schoolSlug ? `/schools/${schoolSlug}` : "/acceuil";
  const messagesUnread = toUnread(badges?.messagesUnread);
  const feedUnread = toUnread(badges?.feedUnread);

  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return [
      {
        label: t("sidebar.nav.myAccount"),
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: t("sidebar.nav.platformHome"),
        href: "/acceuil",
        icon: ShieldCheck,
        matchPrefix: "/acceuil",
      },
      {
        label: t("sidebar.nav.schools"),
        href: "/schools",
        icon: School,
        matchPrefix: "/schools",
      },
      {
        label: t("sidebar.nav.classes"),
        href: "/classes",
        icon: Building2,
        matchPrefix: "/classes",
      },
      {
        label: t("sidebar.nav.subjects"),
        href: "/subjects",
        icon: BookOpen,
        matchPrefix: "/subjects",
      },
      {
        label: t("sidebar.nav.rooms"),
        href: "/salles",
        icon: DoorOpen,
        matchPrefix: "/salles",
      },
      {
        label: t("sidebar.nav.curriculums"),
        href: "/curriculums",
        icon: GraduationCap,
        matchPrefix: "/curriculums",
      },
      {
        label: t("sidebar.nav.enrollments"),
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: t("sidebar.nav.students"),
        href: "/eleves",
        icon: UserSquare2,
        matchPrefix: "/eleves",
      },
      {
        label: t("sidebar.nav.users"),
        href: "/users",
        icon: Users,
        matchPrefix: "/users",
      },
      {
        label: t("sidebar.nav.indicators"),
        href: "/indicators",
        icon: BarChart3,
        matchPrefix: "/indicators",
      },
      ...(role === "SUPER_ADMIN" || role === "ADMIN"
        ? [
            {
              label: t("sidebar.nav.testCampaigns"),
              href: "/admin-tests",
              icon: ClipboardList,
              matchPrefix: "/admin-tests",
            },
          ]
        : []),
      {
        label: t("sidebar.nav.settings"),
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR" ||
    role === "SCHOOL_ACCOUNTANT" ||
    role === "SCHOOL_STAFF"
  ) {
    return [
      {
        label: t("sidebar.nav.myAccount"),
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: t("sidebar.nav.home"),
        href: `${schoolBase}/dashboard`,
        icon: LayoutDashboard,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: t("sidebar.nav.newsFeed"),
        href: `${schoolBase}/fil`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/fil`,
        unread: feedUnread,
      },
      {
        label: t("sidebar.nav.classes"),
        href: "/classes",
        icon: Building2,
        matchPrefix: "/classes",
      },
      {
        label: t("sidebar.nav.subjects"),
        href: "/subjects",
        icon: BookOpen,
        matchPrefix: "/subjects",
      },
      {
        label: t("sidebar.nav.rooms"),
        href: "/salles",
        icon: DoorOpen,
        matchPrefix: "/salles",
      },
      {
        label: t("sidebar.nav.curriculums"),
        href: "/curriculums",
        icon: GraduationCap,
        matchPrefix: "/curriculums",
      },
      {
        label: t("sidebar.nav.enrollments"),
        href: "/enrollments",
        icon: BookOpen,
        matchPrefix: "/enrollments",
      },
      {
        label: t("sidebar.nav.students"),
        href: "/eleves",
        icon: UserSquare2,
        matchPrefix: "/eleves",
      },
      {
        label: t("sidebar.nav.teachers"),
        href: "/teachers",
        icon: GraduationCap,
        matchPrefix: "/teachers",
      },
      {
        label: t("sidebar.nav.parentsStudents"),
        href: `${schoolBase}/dashboard#parents`,
        icon: Users,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: t("sidebar.nav.grades"),
        href: `${schoolBase}/student-grades`,
        icon: BookOpen,
        matchPrefix: `${schoolBase}/student-grades`,
      },
      {
        label: t("messaging.nav.title"),
        href: `${schoolBase}/messagerie`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/messagerie`,
        unread: messagesUnread,
      },
      {
        label: t("sidebar.nav.settings"),
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (role === "TEACHER") {
    return [
      {
        label: t("sidebar.nav.myAccount"),
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: t("sidebar.nav.dashboard"),
        href: `${schoolBase}/dashboard`,
        icon: LayoutDashboard,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: t("sidebar.nav.newsFeed"),
        href: `${schoolBase}/fil`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/fil`,
        unread: feedUnread,
      },
      {
        label: t("sidebar.nav.myClasses"),
        href: `${schoolBase}/mes-classes`,
        icon: School,
        matchPrefix: `${schoolBase}/mes-classes`,
      },
      {
        label: t("sidebar.nav.gradesNotebook"),
        href: `${schoolBase}/student-grades`,
        icon: BookOpen,
        matchPrefix: `${schoolBase}/student-grades`,
      },
      {
        label: t("messaging.nav.title"),
        href: `${schoolBase}/messagerie`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/messagerie`,
        unread: messagesUnread,
      },
      {
        label: t("sidebar.nav.settings"),
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  if (role === "PARENT") {
    return [
      {
        label: t("sidebar.nav.home"),
        href: `${schoolBase}/dashboard`,
        icon: Home,
        matchPrefix: `${schoolBase}/dashboard`,
      },
      {
        label: t("sidebar.nav.myAccount"),
        href: "/account",
        icon: UserSquare2,
        matchPrefix: "/account",
      },
      {
        label: t("sidebar.nav.newsFeed"),
        href: `${schoolBase}/fil`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/fil`,
        unread: feedUnread,
      },
      {
        label: t("sidebar.nav.financialSituation"),
        href: `${schoolBase}/situation-financiere`,
        icon: Wallet,
        matchPrefix: `${schoolBase}/situation-financiere`,
      },
      {
        label: t("sidebar.nav.onlineShop"),
        href: `${schoolBase}/boutique-en-ligne`,
        icon: CreditCard,
        matchPrefix: `${schoolBase}/boutique-en-ligne`,
      },
      {
        label: t("messaging.nav.title"),
        href: `${schoolBase}/messagerie`,
        icon: MessageSquare,
        matchPrefix: `${schoolBase}/messagerie`,
        unread: messagesUnread,
      },
      {
        label: t("sidebar.nav.documents"),
        href: `${schoolBase}/documents`,
        icon: FileText,
        matchPrefix: `${schoolBase}/documents`,
      },
      {
        label: t("sidebar.nav.forms"),
        href: `${schoolBase}/formulaire`,
        icon: FileText,
        matchPrefix: `${schoolBase}/formulaire`,
      },
      {
        label: t("sidebar.nav.settings"),
        href: "/settings",
        icon: Settings,
        matchPrefix: "/settings",
      },
    ];
  }

  return [
    {
      label: t("sidebar.nav.myAccount"),
      href: "/account",
      icon: UserSquare2,
      matchPrefix: "/account",
    },
    {
      label: t("sidebar.nav.home"),
      href: `${schoolBase}/dashboard`,
      icon: Home,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: t("sidebar.nav.yourInfo"),
      href: `${schoolBase}/dashboard#infos`,
      icon: UserSquare2,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: t("sidebar.nav.financialSituation"),
      href: `${schoolBase}/dashboard#finance`,
      icon: Wallet,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: t("sidebar.nav.onlinePayments"),
      href: `${schoolBase}/dashboard#payments`,
      icon: CreditCard,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: t("sidebar.nav.settings"),
      href: "/settings",
      icon: Settings,
      matchPrefix: "/settings",
    },
    {
      label: t("messaging.nav.title"),
      href: `${schoolBase}/messagerie`,
      icon: MessageSquare,
      matchPrefix: `${schoolBase}/messagerie`,
      unread: messagesUnread,
    },
    {
      label: t("sidebar.nav.documents"),
      href: `${schoolBase}/dashboard#docs`,
      icon: FileText,
      matchPrefix: `${schoolBase}/dashboard`,
    },
    {
      label: t("sidebar.nav.gradesAndHomework"),
      href: `${schoolBase}/student-grades`,
      icon: BookOpen,
      matchPrefix: `${schoolBase}/student-grades`,
    },
  ];
}

function buildParentChildItems(
  schoolSlug: string,
  childId: string,
  t: TranslateFn,
  childBadge: ChildBadgeSummary | undefined,
): NavItem[] {
  const base = `/schools/${schoolSlug}/children/${childId}`;

  return [
    {
      label: t("sidebar.nav.home"),
      href: `${base}/accueil`,
      icon: Home,
      matchPrefix: `${base}/accueil`,
    },
    {
      label: t("discipline.sidebar.vieScolaire"),
      href: `${base}/vie-scolaire`,
      icon: UserRound,
      matchPrefix: `${base}/vie-scolaire`,
      unread: toUnread(childBadge?.disciplineUnread),
    },
    {
      label: t("feed.vieDeClasse.title"),
      href: `${base}/vie-de-classe`,
      icon: Users,
      matchPrefix: `${base}/vie-de-classe`,
    },
    {
      label: t("timetable.sidebar.emploiDuTemps"),
      href: `/schools/${schoolSlug}/emploi-du-temps?childId=${encodeURIComponent(
        childId,
      )}`,
      icon: CalendarDays,
      matchPrefix: `/schools/${schoolSlug}/emploi-du-temps`,
    },
    {
      label: t("sidebar.nav.grades"),
      href: `${base}/notes`,
      icon: BookOpen,
      matchPrefix: `${base}/notes`,
      unread: toUnread(childBadge?.notesUnread),
    },
    {
      label: t("messaging.nav.title"),
      href: `${base}/messagerie`,
      icon: MessageSquare,
      matchPrefix: `${base}/messagerie`,
    },
    {
      label: t("homework.sidebar.cahierDeTexte"),
      href: `${base}/cahier-de-texte`,
      icon: FileText,
      matchPrefix: `${base}/cahier-de-texte`,
      unread: toUnread(childBadge?.homeworkPending),
    },
    {
      label: t("sidebar.nav.manuals"),
      href: `${base}/manuels-ressources`,
      icon: FileText,
      matchPrefix: `${base}/manuels-ressources`,
    },
    {
      label: t("sidebar.nav.formsSurveys"),
      href: `${base}/formulaires-sondages`,
      icon: FileText,
      matchPrefix: `${base}/formulaires-sondages`,
    },
    {
      label: t("sidebar.nav.curriculum"),
      href: `${base}/cursus`,
      icon: GraduationCap,
      matchPrefix: `${base}/cursus`,
    },
  ];
}

function buildTeacherClassItems(
  schoolSlug: string,
  classId: string,
  t: TranslateFn,
  classBadge: TeacherClassBadgeSummary | undefined,
): NavItem[] {
  const base = `/schools/${schoolSlug}/classes/${classId}`;

  return [
    {
      label: t("sidebar.nav.classFeed"),
      href: `${base}/fil`,
      icon: MessageSquare,
      matchPrefix: `${base}/fil`,
    },
    {
      label: t("sidebar.nav.grades"),
      href: `${base}/notes`,
      icon: BookOpen,
      matchPrefix: `${base}/notes`,
      unread: toUnread(classBadge?.evaluationsToGrade),
    },
    {
      label: t("discipline.sidebar.discipline"),
      href: `${base}/discipline`,
      icon: ShieldCheck,
      matchPrefix: `${base}/discipline`,
    },
    {
      label: t("timetable.sidebar.emploiDuTemps"),
      href: `${base}/emploi-du-temps`,
      icon: CalendarDays,
      matchPrefix: `${base}/emploi-du-temps`,
    },
    {
      label: t("homework.sidebar.devoirs"),
      href: `${base}/devoirs`,
      icon: FileText,
      matchPrefix: `${base}/devoirs`,
    },
  ];
}

export function AppSidebar({
  schoolSlug,
  role,
  onNavigate,
  onLogoutClick,
}: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isFamilySpace = role === "PARENT" || role === "STUDENT";
  const [parentChildren, setParentChildren] = useState<ParentChild[]>([]);
  const [openParentSection, setOpenParentSection] = useState<string>("general");
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassNav[]>([]);
  const [openTeacherSection, setOpenTeacherSection] =
    useState<string>("classes");
  const [badgeSummary, setBadgeSummary] = useState<UnreadSummary | null>(
    null,
  );
  const items = buildItems(role, schoolSlug, t, badgeSummary);
  const ticketsUnread = toUnread(
    (badgeSummary?.ticketsNeedingResponse ?? 0) +
      (badgeSummary?.ticketsUnreadReplies ?? 0),
  );

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

  useEffect(() => {
    if (!schoolSlug) {
      setBadgeSummary(null);
      return;
    }

    const allowedRoles: Role[] = [
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "SCHOOL_STAFF",
      "TEACHER",
      "PARENT",
      "STUDENT",
      "ADMIN",
      "SUPER_ADMIN",
    ];

    if (!allowedRoles.includes(role)) {
      setBadgeSummary(null);
      return;
    }

    // Show the last known counts immediately (useful offline / on a flaky
    // connection), then refresh from the API.
    setBadgeSummary((current) => current ?? readCachedUnreadSummary(schoolSlug));
    void loadBadgeSummary(schoolSlug);
  }, [schoolSlug, role, pathname]);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    const reload = () => void loadBadgeSummary(schoolSlug);
    window.addEventListener("messaging:updated", reload);
    window.addEventListener("online", reload);
    return () => {
      window.removeEventListener("messaging:updated", reload);
      window.removeEventListener("online", reload);
    };
  }, [schoolSlug]);

  async function loadBadgeSummary(currentSchoolSlug: string) {
    try {
      const summary = await getUnreadSummary(currentSchoolSlug);
      setBadgeSummary(summary);
    } catch {
      // Offline or transient failure: keep showing the last known counts
      // (already in state, or from the cache) instead of resetting to zero.
      setBadgeSummary(
        (current) => current ?? readCachedUnreadSummary(currentSchoolSlug),
      );
    }
  }

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
        `${API_URL}/schools/${currentSchoolSlug}/student-grades/context`,
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
      items: buildParentChildItems(
        schoolSlug,
        child.id,
        t,
        badgeSummary?.children.find((entry) => entry.studentId === child.id),
      ),
    }));
  }, [parentChildren, schoolSlug, t, badgeSummary]);

  const teacherClassesWithItems = useMemo<TeacherClassWithItems[]>(() => {
    if (!schoolSlug) {
      return [];
    }

    return teacherClasses.map((entry) => ({
      ...entry,
      items: buildTeacherClassItems(
        schoolSlug,
        entry.classId,
        t,
        badgeSummary?.teacherClasses.find(
          (classBadge) => classBadge.classId === entry.classId,
        ),
      ),
    }));
  }, [teacherClasses, schoolSlug, t, badgeSummary]);

  const teacherGeneralItems = useMemo(
    () => items.filter((item) => item.href !== "/settings"),
    [items],
  );
  const teacherSettingsItem = useMemo(
    () => items.find((item) => item.href === "/settings") ?? null,
    [items],
  );

  useEffect(() => {
    if (role !== "PARENT") {
      return;
    }

    const activeChild = parentChildrenWithItems.find((child) =>
      child.items.some((item) => {
        if (!item.matchPrefix) {
          return pathname === item.href;
        }

        if (item.matchPrefix.includes("?")) {
          return pathname === item.matchPrefix;
        }

        return pathname.startsWith(item.matchPrefix);
      }),
    );

    if (activeChild) {
      setOpenParentSection(`child-${activeChild.id}`);
      return;
    }

    if (
      openParentSection !== "general" &&
      !parentChildrenWithItems.some(
        (child) => openParentSection === `child-${child.id}`,
      )
    ) {
      setOpenParentSection("general");
    }
  }, [role, pathname, parentChildrenWithItems, openParentSection]);

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

  const sidebarItemClass = (active: boolean) =>
    active
      ? "bg-warm-surface text-primary shadow-[0_10px_20px_rgba(77,56,32,0.08)]"
      : "text-surface hover:bg-white/10 focus-visible:bg-white/10 hover:text-surface focus-visible:text-surface hover:shadow-[inset_0_0_0_1px_rgba(255,248,240,0.18)]";

  const sidebarIconClass = (active: boolean) =>
    active
      ? "bg-warm-highlight text-primary"
      : "bg-primary-dark/80 text-surface";

  const parentHomeHref = schoolSlug
    ? `/schools/${schoolSlug}/dashboard`
    : "/acceuil";
  const teacherHomeHref = schoolSlug
    ? `/schools/${schoolSlug}/dashboard`
    : "/acceuil";

  function handleParentSpaceClick() {
    setOpenParentSection("general");

    if (role !== "PARENT" || pathname.startsWith(parentHomeHref)) {
      return;
    }

    router.push(parentHomeHref);
    onNavigate?.();
  }

  function handleTeacherMenuClick() {
    setOpenTeacherSection("classes");

    if (role !== "TEACHER" || pathname.startsWith(teacherHomeHref)) {
      return;
    }

    router.push(teacherHomeHref);
    onNavigate?.();
  }

  return (
    <aside className="group flex h-full w-[236px] shrink-0 flex-col bg-gradient-to-b from-sidebar-bg via-primary to-[#083a64] px-2 py-4 text-surface shadow-[10px_0_30px_rgba(8,38,66,0.12)] transition-all duration-300 md:w-[72px] md:hover:w-[236px] md:px-3">
      {isFamilySpace ? (
        <div className="mb-4 rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-center font-heading text-xs font-bold tracking-wide text-surface backdrop-blur">
          <div className="flex items-center justify-center md:justify-start">
            <Home className="h-4 w-4 md:mx-auto md:group-hover:mx-0" />
            <span className="ml-2 md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[140px] md:group-hover:opacity-100">
              {t("sidebar.familySpace")}
            </span>
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {role === "TEACHER" ? (
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-white/10 bg-white/8 p-2 backdrop-blur">
              <button
                type="button"
                onClick={handleTeacherMenuClick}
                className={`flex w-full items-center rounded-[16px] px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                  openTeacherSection === "classes",
                )}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                    openTeacherSection === "classes",
                  )}`}
                >
                  <School className="h-4 w-4" />
                </span>
                <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                  {t("sidebar.teacherMenu")}
                </span>
              </button>

              {openTeacherSection === "classes" ? (
                <nav
                  className="mt-2 grid gap-1"
                  aria-label={t("sidebar.ariaTeacherGeneralMenu")}
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
                        className={`flex items-center rounded-[14px] px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${sidebarItemClass(
                          active,
                        )}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                            active,
                          )}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                          {item.label}
                        </span>
                        {typeof item.unread === "number" ? (
                          <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                            <Badge variant="notification">
                              {item.unread}
                            </Badge>
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
                  className="rounded-[18px] border border-white/10 bg-white/8 p-2 backdrop-blur"
                >
                  <button
                    type="button"
                    onClick={() => setOpenTeacherSection(sectionKey)}
                    className={`flex w-full items-center rounded-[16px] px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                      isOpen,
                    )}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                        isOpen,
                      )}`}
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
                      aria-label={t("sidebar.ariaClassMenu").replace(
                        "{className}",
                        entry.className,
                      )}
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
                            className={`flex items-center rounded-[14px] px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${sidebarItemClass(
                              active,
                            )}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                                active,
                              )}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                              {item.label}
                            </span>
                            {typeof item.unread === "number" ? (
                              <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                                <Badge variant="notification">
                                  {item.unread}
                                </Badge>
                              </span>
                            ) : null}
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
                className={`flex items-center rounded-[16px] px-2 py-2 text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                  pathname.startsWith(teacherSettingsItem.matchPrefix ?? ""),
                )}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                    pathname.startsWith(teacherSettingsItem.matchPrefix ?? ""),
                  )}`}
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
          <nav
            className="flex flex-col gap-1"
            aria-label={t("sidebar.ariaMainNav")}
          >
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
                  className={`flex items-center rounded-[16px] px-2 py-2 text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                    active,
                  )}`}
                >
                  <span className="flex min-w-0 items-center">
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                        active,
                      )}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                      {item.label}
                    </span>
                  </span>
                  {typeof item.unread === "number" ? (
                    <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                      <Badge variant="notification">
                        {item.unread}
                      </Badge>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-[18px] border border-white/10 bg-white/8 p-2 backdrop-blur">
              <button
                type="button"
                onClick={handleParentSpaceClick}
                className={`flex w-full items-center rounded-[16px] px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                  openParentSection === "general",
                )}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                    openParentSection === "general",
                  )}`}
                >
                  <Home className="h-4 w-4" />
                </span>
                <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
                  {t("sidebar.familySpace")}
                </span>
              </button>

              {openParentSection === "general" ? (
                <nav
                  className="mt-2 grid gap-1"
                  aria-label={t("sidebar.ariaParentMenu")}
                >
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
                        className={`flex items-center rounded-[14px] px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${sidebarItemClass(
                          active,
                        )}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                            active,
                          )}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                          {item.label}
                        </span>
                        {typeof item.unread === "number" ? (
                          <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                            <Badge variant="notification">
                              {item.unread}
                            </Badge>
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
                  className="rounded-[18px] border border-white/10 bg-white/8 p-2 backdrop-blur"
                >
                  <button
                    type="button"
                    onClick={() => setOpenParentSection(sectionKey)}
                    className={`flex w-full items-center rounded-[16px] px-2 py-2 text-left text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
                      isOpen,
                    )}`}
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
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                          isOpen,
                        )}`}
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
                      aria-label={t("sidebar.ariaChildMenu").replace(
                        "{childName}",
                        `${child.lastName} ${child.firstName}`,
                      )}
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
                            className={`flex items-center rounded-[14px] px-2 py-1.5 text-xs font-heading font-semibold transition-colors ${sidebarItemClass(
                              active,
                            )}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
                                active,
                              )}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="ml-2 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[160px] md:group-hover:opacity-100">
                              {item.label}
                            </span>
                            {typeof item.unread === "number" ? (
                              <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
                                <Badge variant="notification">
                                  {item.unread}
                                </Badge>
                              </span>
                            ) : null}
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
      </div>

      <div className="mt-2">
        <Link
          href={
            role === "SUPER_ADMIN" ||
            role === "ADMIN" ||
            role === "SALES" ||
            role === "SUPPORT"
              ? "/tickets"
              : schoolSlug
                ? `/schools/${schoolSlug}/tickets`
                : "/tickets"
          }
          data-testid="sidebar-tickets-link"
          className={`flex w-full items-center rounded-[16px] px-2 py-2 text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
            pathname.startsWith("/tickets") ||
              (!!schoolSlug &&
                pathname.startsWith(`/schools/${schoolSlug}/tickets`)),
          )}`}
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
              pathname.startsWith("/tickets") ||
                (!!schoolSlug &&
                  pathname.startsWith(`/schools/${schoolSlug}/tickets`)),
            )}`}
          >
            <HelpCircle className="h-4 w-4" />
          </span>
          <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
            {t("sidebar.nav.assistance")}
          </span>
          {typeof ticketsUnread === "number" ? (
            <span className="ml-auto md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[40px] md:group-hover:opacity-100">
              <Badge variant="notification">{ticketsUnread}</Badge>
            </span>
          ) : null}
        </Link>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <button
          type="button"
          aria-label={t("sidebar.logout")}
          data-testid="sidebar-logout-button"
          onClick={onLogoutClick}
          className={`flex w-full items-center rounded-[16px] px-2 py-2 text-sm font-heading font-semibold transition-colors ${sidebarItemClass(
            false,
          )}`}
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sidebarIconClass(
              false,
            )}`}
          >
            <LogOut className="h-4 w-4" />
          </span>
          <span className="ml-3 whitespace-nowrap md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-200 md:group-hover:max-w-[180px] md:group-hover:opacity-100">
            {t("sidebar.logout")}
          </span>
        </button>
      </div>
    </aside>
  );
}
