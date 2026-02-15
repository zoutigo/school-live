"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { ImageUploadField } from "../../components/ui/image-upload-field";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

type Role =
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
type PlatformCreatableRole = "ADMIN" | "SALES" | "SUPPORT";
type SchoolCreatableRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "list" | "create" | "details" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type UserStateFilter = "ALL" | "ACTIVE" | "PASSWORD_CHANGE_REQUIRED";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role | null;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  schoolRoles: Array<
    | "SCHOOL_ADMIN"
    | "SCHOOL_MANAGER"
    | "SUPERVISOR"
    | "SCHOOL_ACCOUNTANT"
    | "TEACHER"
    | "PARENT"
    | "STUDENT"
  >;
  mustChangePassword: boolean;
  createdAt: string;
  school: { slug: string; name: string } | null;
};

type UsersListResponse = {
  items: UserRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type UserDetails = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  schoolMemberships: Array<{
    role:
      | "SCHOOL_ADMIN"
      | "SCHOOL_MANAGER"
      | "SUPERVISOR"
      | "SCHOOL_ACCOUNTANT"
      | "TEACHER"
      | "PARENT"
      | "STUDENT";
    school: { id: string; slug: string; name: string };
  }>;
  teacherProfiles: Array<{
    id: string;
    school: { id: string; slug: string; name: string };
  }>;
  studentProfiles: Array<{
    id: string;
    school: { id: string; slug: string; name: string };
    class: { id: string; name: string; schoolYear: { label: string } } | null;
  }>;
  parentStudents: Array<{
    id: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      school: { id: string; slug: string; name: string };
      class: { id: string; name: string; schoolYear: { label: string } } | null;
    };
  }>;
  stats: {
    gradesGivenCount: number;
    recoveryAnswersCount: number;
  };
};

type EnrollmentHistoryRow = {
  id: string;
  status: "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED";
  schoolYear: { id: string; label: string };
  class: {
    id: string;
    name: string;
  };
  isCurrent: boolean;
  createdAt: string;
};

type ClassroomEnrollmentOption = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
};

const PLATFORM_ROLE_OPTIONS: PlatformCreatableRole[] = [
  "ADMIN",
  "SALES",
  "SUPPORT",
];
const SCHOOL_ROLE_OPTIONS: SchoolCreatableRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "TEACHER",
  "PARENT",
  "STUDENT",
];
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const createUserSchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire."),
    email: z.string().trim().email("L'email est invalide."),
    phone: z
      .string()
      .trim()
      .min(6, "Le numero de telephone est trop court.")
      .max(30)
      .optional(),
    platformRoles: z.array(z.enum(["ADMIN", "SALES", "SUPPORT"])),
    schoolRoles: z.array(
      z.enum([
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
        "SCHOOL_ACCOUNTANT",
        "TEACHER",
        "PARENT",
        "STUDENT",
      ]),
    ),
    temporaryPassword: z
      .string()
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    schoolSlug: z.string().optional(),
    avatarUrl: z.string().trim().startsWith("/files/users/avatars/").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.platformRoles.length === 0 && value.schoolRoles.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformRoles"],
        message: "Selectionnez au moins un role.",
      });
    }

    if (value.schoolRoles.length > 0 && !value.schoolSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schoolSlug"],
        message: "L'ecole est obligatoire pour ce role.",
      });
    }
  });

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
  phone: z.string().trim().max(30).optional(),
  platformRoles: z.array(z.enum(["ADMIN", "SALES", "SUPPORT"])),
  schoolRoles: z.array(
    z.enum([
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "TEACHER",
      "PARENT",
      "STUDENT",
    ]),
  ),
});

export default function UsersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [createPlatformRoles, setCreatePlatformRoles] = useState<
    PlatformCreatableRole[]
  >([]);
  const [createSchoolRoles, setCreateSchoolRoles] = useState<
    SchoolCreatableRole[]
  >([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [schoolFilter, setSchoolFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<UserStateFilter>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [openActionsUserId, setOpenActionsUserId] = useState<string | null>(
    null,
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPlatformRoles, setEditPlatformRoles] = useState<
    PlatformCreatableRole[]
  >([]);
  const [editSchoolRoles, setEditSchoolRoles] = useState<SchoolCreatableRole[]>(
    [],
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [studentEnrollmentsByStudentId, setStudentEnrollmentsByStudentId] =
    useState<Record<string, EnrollmentHistoryRow[]>>({});
  const [classroomsBySchoolSlug, setClassroomsBySchoolSlug] = useState<
    Record<string, ClassroomEnrollmentOption[]>
  >({});
  const [selectedClassByStudentId, setSelectedClassByStudentId] = useState<
    Record<string, string>
  >({});
  const [savingEnrollmentByStudentId, setSavingEnrollmentByStudentId] =
    useState<Record<string, boolean>>({});
  const [savingEnrollmentStatusById, setSavingEnrollmentStatusById] = useState<
    Record<string, boolean>
  >({});
  const [enrollmentStatusDraftById, setEnrollmentStatusDraftById] = useState<
    Record<string, EnrollmentHistoryRow["status"]>
  >({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!isReady || tab !== "list") {
      return;
    }

    void loadUsers(1, {
      role: roleFilter,
      schoolSlug: schoolFilter,
      state: stateFilter,
    });
  }, [roleFilter, schoolFilter, stateFilter, isReady, tab]);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;
    setCurrentRole(me.role);

    if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }

    await loadUsersAndSchools();
    setLoading(false);
    setIsReady(true);
  }

  async function loadUsersAndSchools() {
    const schoolsResponse = await fetch(`${API_URL}/system/schools`, {
      credentials: "include",
    });

    if (!schoolsResponse.ok) {
      router.replace("/");
      return;
    }

    setSchools((await schoolsResponse.json()) as SchoolOption[]);
    await loadUsers(page);
  }

  async function loadUsers(
    targetPage = page,
    overrides?: Partial<{
      search: string;
      role: "ALL" | Role;
      schoolSlug: string;
      state: UserStateFilter;
    }>,
  ) {
    setLoadingUsers(true);
    const effectiveSearch = overrides?.search ?? search;
    const effectiveRole = overrides?.role ?? roleFilter;
    const effectiveSchool = overrides?.schoolSlug ?? schoolFilter;
    const effectiveState = overrides?.state ?? stateFilter;
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    params.set("limit", "10");
    if (effectiveSearch.trim()) {
      params.set("search", effectiveSearch.trim());
    }
    if (effectiveRole !== "ALL") {
      params.set("role", effectiveRole);
    }
    if (effectiveSchool !== "ALL") {
      params.set("schoolSlug", effectiveSchool);
    }
    if (effectiveState !== "ALL") {
      params.set("state", effectiveState);
    }

    const usersResponse = await fetch(
      `${API_URL}/system/users?${params.toString()}`,
      {
        credentials: "include",
      },
    );

    if (!usersResponse.ok) {
      router.replace("/");
      return;
    }

    const payload = (await usersResponse.json()) as UsersListResponse;
    setUsers(payload.items);
    setPagination(payload.meta);
    setPage(payload.meta.page);
    setLoadingUsers(false);
  }

  function toFileUrl(fileUrl: string | null) {
    if (!fileUrl) {
      return null;
    }

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }

    return `${API_ORIGIN}${fileUrl}`;
  }

  async function loadStudentEnrollmentHistory(
    profiles: UserDetails["studentProfiles"],
  ): Promise<Record<string, EnrollmentHistoryRow[]>> {
    if (profiles.length === 0) {
      return {};
    }

    const responses = await Promise.all(
      profiles.map(async (profile) => {
        const response = await fetch(
          `${API_URL}/schools/${profile.school.slug}/admin/students/${profile.id}/enrollments`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          return [profile.id, []] as const;
        }

        const payload = (await response
          .json()
          .catch(() => [])) as EnrollmentHistoryRow[];
        return [profile.id, Array.isArray(payload) ? payload : []] as const;
      }),
    );

    return Object.fromEntries(responses);
  }

  async function loadSchoolClassrooms(
    profiles: UserDetails["studentProfiles"],
  ): Promise<Record<string, ClassroomEnrollmentOption[]>> {
    const schoolSlugs = Array.from(
      new Set(profiles.map((profile) => profile.school.slug)),
    );
    if (schoolSlugs.length === 0) {
      return {};
    }

    const entries = await Promise.all(
      schoolSlugs.map(async (schoolSlug) => {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/admin/classrooms`,
          {
            credentials: "include",
          },
        );
        if (!response.ok) {
          return [schoolSlug, []] as const;
        }

        const payload = (await response
          .json()
          .catch(() => [])) as ClassroomEnrollmentOption[];
        const rows = Array.isArray(payload) ? payload : [];
        rows.sort((a, b) =>
          `${a.schoolYear.label}-${a.name}`.localeCompare(
            `${b.schoolYear.label}-${b.name}`,
          ),
        );

        return [schoolSlug, rows] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  function buildInitialSelectedClasses(
    profiles: UserDetails["studentProfiles"],
    classroomsMap: Record<string, ClassroomEnrollmentOption[]>,
  ) {
    const value: Record<string, string> = {};
    for (const profile of profiles) {
      if (profile.class?.id) {
        value[profile.id] = profile.class.id;
        continue;
      }

      const firstClass = classroomsMap[profile.school.slug]?.[0];
      if (firstClass) {
        value[profile.id] = firstClass.id;
      }
    }

    return value;
  }

  async function openUserDetails(userId: string) {
    setSubmitError(null);
    setSubmitSuccess(null);
    setStudentEnrollmentsByStudentId({});
    setClassroomsBySchoolSlug({});
    setSelectedClassByStudentId({});
    setSavingEnrollmentByStudentId({});
    setSavingEnrollmentStatusById({});
    setEnrollmentStatusDraftById({});
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_URL}/system/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        setSubmitError("Impossible de charger les details utilisateur.");
        return;
      }

      const details = (await response.json()) as UserDetails;
      setSelectedUser(details);
      const [enrollmentHistoryMap, classroomsMap] = await Promise.all([
        loadStudentEnrollmentHistory(details.studentProfiles),
        loadSchoolClassrooms(details.studentProfiles),
      ]);
      setStudentEnrollmentsByStudentId(enrollmentHistoryMap);
      setClassroomsBySchoolSlug(classroomsMap);
      setSelectedClassByStudentId(
        buildInitialSelectedClasses(details.studentProfiles, classroomsMap),
      );
      setTab("details");
    } catch {
      setSubmitError("Erreur reseau.");
    } finally {
      setLoadingDetails(false);
    }
  }

  async function onAssignStudentClass(
    profile: UserDetails["studentProfiles"][number],
  ) {
    const classId = selectedClassByStudentId[profile.id];
    if (!classId || !selectedUser) {
      setSubmitError("Selectionnez une classe.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setSavingEnrollmentByStudentId((current) => ({
      ...current,
      [profile.id]: true,
    }));
    try {
      const response = await fetch(
        `${API_URL}/schools/${profile.school.slug}/admin/students/${profile.id}/enrollments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId,
            status: "ACTIVE",
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Affectation impossible.");
        setSubmitError(String(message));
        return;
      }

      setSubmitSuccess("Affectation eleve mise a jour.");
      await openUserDetails(selectedUser.id);
    } catch {
      setSubmitError("Erreur reseau.");
    } finally {
      setSavingEnrollmentByStudentId((current) => ({
        ...current,
        [profile.id]: false,
      }));
    }
  }

  async function onUpdateEnrollmentStatus(
    profile: UserDetails["studentProfiles"][number],
    enrollment: EnrollmentHistoryRow,
  ) {
    const nextStatus =
      enrollmentStatusDraftById[enrollment.id] ?? enrollment.status;
    if (nextStatus === enrollment.status || !selectedUser) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setSavingEnrollmentStatusById((current) => ({
      ...current,
      [enrollment.id]: true,
    }));
    try {
      const response = await fetch(
        `${API_URL}/schools/${profile.school.slug}/admin/students/${profile.id}/enrollments/${enrollment.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour du statut impossible.");
        setSubmitError(String(message));
        return;
      }

      setSubmitSuccess("Statut d inscription mis a jour.");
      await openUserDetails(selectedUser.id);
    } catch {
      setSubmitError("Erreur reseau.");
    } finally {
      setSavingEnrollmentStatusById((current) => ({
        ...current,
        [enrollment.id]: false,
      }));
    }
  }

  async function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (createSchoolRoles.length > 0 && !schoolSlug) {
      setSubmitError("L'ecole est obligatoire pour ce role.");
      return;
    }

    if (
      createPlatformRoles.includes("ADMIN") &&
      currentRole !== "SUPER_ADMIN"
    ) {
      setSubmitError("Seul SUPER_ADMIN peut creer un ADMIN.");
      return;
    }

    const parsed = createUserSchema.safeParse({
      firstName,
      lastName,
      email,
      phone: phone.trim() ? phone.trim() : undefined,
      platformRoles: createPlatformRoles,
      schoolRoles: createSchoolRoles,
      temporaryPassword,
      schoolSlug: createSchoolRoles.length > 0 ? schoolSlug : undefined,
      avatarUrl: avatarUrl ?? undefined,
    });

    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/system/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation impossible.");
        setSubmitError(String(message));
        return;
      }

      setSubmitSuccess("Utilisateur cree et email envoye.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setTemporaryPassword("");
      setCreatePlatformRoles([]);
      setCreateSchoolRoles([]);
      setSchoolSlug("");
      setAvatarUrl(null);
      await loadUsers(page);
      setTab("list");
    } catch {
      setSubmitError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(user: UserRow) {
    setEditError(null);
    setEditingUserId(user.id);
    setOpenActionsUserId(null);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditPhone(user.phone ?? "");
    setEditPlatformRoles(
      user.platformRoles.filter(
        (entry) => entry !== "SUPER_ADMIN",
      ) as PlatformCreatableRole[],
    );
    setEditSchoolRoles(user.schoolRoles as SchoolCreatableRole[]);
  }

  async function onSaveUser(userId: string) {
    setEditError(null);
    const parsed = updateUserSchema.safeParse({
      firstName: editFirstName,
      lastName: editLastName,
      phone: editPhone.trim() ? editPhone.trim() : undefined,
      platformRoles: editPlatformRoles,
      schoolRoles: editSchoolRoles,
    });

    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setEditError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`${API_URL}/system/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setEditError(String(message));
        return;
      }

      setEditingUserId(null);
      await loadUsers(page);
      if (selectedUser?.id === userId) {
        await openUserDetails(userId);
      }
    } catch {
      setEditError("Erreur reseau.");
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeleteUser(user: UserRow) {
    setDeleteTarget({
      id: user.id,
      label: `${user.firstName} ${user.lastName}`.trim(),
    });
    setOpenActionsUserId(null);
  }

  async function onDeleteUser(userId: string) {
    setOpenActionsUserId(null);
    setDeletingUserId(userId);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setSubmitError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/system/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Suppression impossible.");
        setSubmitError(String(message));
        return;
      }

      if (editingUserId === userId) {
        setEditingUserId(null);
      }
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setTab("list");
      }

      await loadUsers(page);
    } catch {
      setSubmitError("Erreur reseau.");
    } finally {
      setDeletingUserId(null);
      setDeleteTarget(null);
    }
  }

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const roleA = a.role ?? "";
        const roleB = b.role ?? "";
        if (roleA !== roleB) {
          return roleA.localeCompare(roleB);
        }

        return `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        );
      }),
    [users],
  );

  return (
    <AppShell schoolName="School-Live Platform">
      <div className="grid gap-4">
        <Card
          title="Utilisateurs"
          subtitle="Gestion des comptes plateforme et ecoles"
        >
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Liste des utilisateurs
            </button>
            <button
              type="button"
              onClick={() => setTab("create")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "create"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Creer un utilisateur
            </button>
            {selectedUser ? (
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "details"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                Details
              </button>
            ) : null}
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

          {tab === "list" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-end justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowFilters((current) => !current)}
                  className="text-sm"
                >
                  Filtres
                </Button>

                {showFilters ? (
                  <>
                    <label className="grid min-w-[170px] gap-1 text-sm">
                      <span className="text-text-secondary">Role</span>
                      <select
                        value={roleFilter}
                        onChange={(event) =>
                          setRoleFilter(event.target.value as "ALL" | Role)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ALL">Tous</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SALES">SALES</option>
                        <option value="SUPPORT">SUPPORT</option>
                        <option value="SCHOOL_ADMIN">SCHOOL_ADMIN</option>
                        <option value="SCHOOL_MANAGER">SCHOOL_MANAGER</option>
                        <option value="SCHOOL_ACCOUNTANT">
                          SCHOOL_ACCOUNTANT
                        </option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="PARENT">PARENT</option>
                        <option value="STUDENT">STUDENT</option>
                      </select>
                    </label>

                    <label className="grid min-w-[190px] gap-1 text-sm">
                      <span className="text-text-secondary">Ecole</span>
                      <select
                        value={schoolFilter}
                        onChange={(event) =>
                          setSchoolFilter(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ALL">Toutes</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.slug}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid min-w-[190px] gap-1 text-sm">
                      <span className="text-text-secondary">Etat</span>
                      <select
                        value={stateFilter}
                        onChange={(event) =>
                          setStateFilter(event.target.value as UserStateFilter)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ALL">Tous</option>
                        <option value="ACTIVE">Actif</option>
                        <option value="PASSWORD_CHANGE_REQUIRED">
                          Mot de passe a changer
                        </option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-text-secondary">
                    Recherche (nom ou email)
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ex: Michelle ou mbele"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    void loadUsers(1);
                  }}
                >
                  Rechercher
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("ALL");
                    setSchoolFilter("ALL");
                    setStateFilter("ALL");
                    void loadUsers(1, {
                      search: "",
                      role: "ALL",
                      schoolSlug: "ALL",
                      state: "ALL",
                    });
                  }}
                >
                  Reinitialiser
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Firstname</th>
                      <th className="px-3 py-2 font-medium">Lastname</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Telephone</th>
                      <th className="px-3 py-2 font-medium">PlatformRoles</th>
                      <th className="px-3 py-2 font-medium">SchoolRoles</th>
                      <th className="px-3 py-2 font-medium">Ecole</th>
                      <th className="px-3 py-2 font-medium">Etat</th>
                      <th className="px-3 py-2 font-medium">Cree le</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || loadingUsers ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={10}
                        >
                          Chargement des utilisateurs...
                        </td>
                      </tr>
                    ) : null}

                    {!loading &&
                      sortedUsers.map((user) => (
                        <Fragment key={user.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="text-left text-primary hover:underline"
                                onClick={() => {
                                  void openUserDetails(user.id);
                                }}
                              >
                                {user.firstName}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="text-left text-primary hover:underline"
                                onClick={() => {
                                  void openUserDetails(user.id);
                                }}
                              >
                                {user.lastName}
                              </button>
                            </td>
                            <td className="px-3 py-2">{user.email}</td>
                            <td className="px-3 py-2">{user.phone ?? "-"}</td>
                            <td className="px-3 py-2">
                              {user.platformRoles.length
                                ? user.platformRoles.join(", ")
                                : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {user.schoolRoles.length
                                ? user.schoolRoles.join(", ")
                                : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {user.school ? user.school.name : "Plateforme"}
                            </td>
                            <td className="px-3 py-2">
                              {user.mustChangePassword
                                ? "Mot de passe a changer"
                                : "Actif"}
                            </td>
                            <td className="px-3 py-2">
                              {new Date(user.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </td>
                            <td className="relative px-3 py-2 text-right">
                              <button
                                type="button"
                                aria-label="Actions utilisateur"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-text-primary hover:bg-background"
                                onClick={() =>
                                  setOpenActionsUserId((current) =>
                                    current === user.id ? null : user.id,
                                  )
                                }
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openActionsUserId === user.id ? (
                                <div className="absolute right-3 top-11 z-10 w-36 rounded-card border border-border bg-surface p-1 shadow-soft">
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-text-primary hover:bg-background"
                                    onClick={() => startEdit(user)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full rounded-card px-3 py-2 text-left text-sm text-notification hover:bg-background"
                                    onClick={() => {
                                      requestDeleteUser(user);
                                    }}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>

                          {editingUserId === user.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={10}>
                                <div className="grid gap-3 md:grid-cols-5">
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Prenom
                                    </span>
                                    <input
                                      value={editFirstName}
                                      onChange={(event) =>
                                        setEditFirstName(event.target.value)
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </label>

                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Nom
                                    </span>
                                    <input
                                      value={editLastName}
                                      onChange={(event) =>
                                        setEditLastName(event.target.value)
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </label>

                                  <div className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      PlatformRoles
                                    </span>
                                    <div className="grid gap-1 rounded-card border border-border bg-surface px-3 py-2">
                                      {PLATFORM_ROLE_OPTIONS.map(
                                        (roleOption) => (
                                          <label
                                            key={roleOption}
                                            className="flex items-center gap-2 text-xs text-text-primary"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={editPlatformRoles.includes(
                                                roleOption,
                                              )}
                                              disabled={
                                                roleOption === "ADMIN" &&
                                                currentRole !== "SUPER_ADMIN"
                                              }
                                              onChange={(event) => {
                                                setEditPlatformRoles(
                                                  (current) =>
                                                    event.target.checked
                                                      ? Array.from(
                                                          new Set([
                                                            ...current,
                                                            roleOption,
                                                          ]),
                                                        )
                                                      : current.filter(
                                                          (value) =>
                                                            value !==
                                                            roleOption,
                                                        ),
                                                );
                                              }}
                                            />
                                            <span>{roleOption}</span>
                                          </label>
                                        ),
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      SchoolRoles
                                    </span>
                                    <div className="grid gap-1 rounded-card border border-border bg-surface px-3 py-2">
                                      {SCHOOL_ROLE_OPTIONS.map((roleOption) => (
                                        <label
                                          key={roleOption}
                                          className="flex items-center gap-2 text-xs text-text-primary"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={editSchoolRoles.includes(
                                              roleOption,
                                            )}
                                            onChange={(event) => {
                                              setEditSchoolRoles((current) =>
                                                event.target.checked
                                                  ? Array.from(
                                                      new Set([
                                                        ...current,
                                                        roleOption,
                                                      ]),
                                                    )
                                                  : current.filter(
                                                      (value) =>
                                                        value !== roleOption,
                                                    ),
                                              );
                                            }}
                                          />
                                          <span>{roleOption}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Telephone
                                    </span>
                                    <input
                                      value={editPhone}
                                      onChange={(event) =>
                                        setEditPhone(event.target.value)
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </label>
                                </div>
                                {editError ? (
                                  <p className="mt-2 text-sm text-notification">
                                    {editError}
                                  </p>
                                ) : null}
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    disabled={savingEdit}
                                    onClick={() => {
                                      void onSaveUser(user.id);
                                    }}
                                  >
                                    {savingEdit
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingUserId(null);
                                      setEditError(null);
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading && !loadingUsers && sortedUsers.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={10}
                        >
                          Aucun utilisateur trouve.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 text-sm text-text-secondary">
                <p>
                  {pagination.total} resultat(s) - page {pagination.page}/
                  {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pagination.page <= 1 || loadingUsers}
                    onClick={() => {
                      void loadUsers(pagination.page - 1);
                    }}
                  >
                    Precedent
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      pagination.page >= pagination.totalPages || loadingUsers
                    }
                    onClick={() => {
                      void loadUsers(pagination.page + 1);
                    }}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          ) : tab === "details" ? (
            <div className="grid gap-4">
              {loadingDetails ? (
                <p className="text-sm text-text-secondary">
                  Chargement des details...
                </p>
              ) : null}
              {!loadingDetails && selectedUser ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                    <div className="rounded-card border border-border bg-background p-3">
                      {selectedUser.avatarUrl ? (
                        <img
                          src={toFileUrl(selectedUser.avatarUrl) ?? ""}
                          alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                          className="h-36 w-full rounded-card border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded-card border border-border text-sm text-text-secondary">
                          Aucune photo
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <InfoLine label="Prenom" value={selectedUser.firstName} />
                      <InfoLine label="Nom" value={selectedUser.lastName} />
                      <InfoLine label="Email" value={selectedUser.email} />
                      <InfoLine
                        label="Telephone"
                        value={selectedUser.phone ?? "-"}
                      />
                      <InfoLine
                        label="Cree le"
                        value={new Date(selectedUser.createdAt).toLocaleString(
                          "fr-FR",
                        )}
                      />
                      <InfoLine
                        label="Mis a jour"
                        value={new Date(selectedUser.updatedAt).toLocaleString(
                          "fr-FR",
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <StatBox
                      label="Roles plateforme"
                      value={selectedUser.platformRoles.length}
                    />
                    <StatBox
                      label="Roles ecole"
                      value={selectedUser.schoolMemberships.length}
                    />
                    <StatBox
                      label="Notes donnees"
                      value={selectedUser.stats.gradesGivenCount}
                    />
                    <StatBox
                      label="Questions recup."
                      value={selectedUser.stats.recoveryAnswersCount}
                    />
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      Roles plateforme
                    </p>
                    <p className="text-sm text-text-primary">
                      {selectedUser.platformRoles.length
                        ? selectedUser.platformRoles.join(", ")
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-card border border-border bg-background p-3">
                    <p className="mb-2 text-sm font-medium text-text-primary">
                      Affectations ecole
                    </p>
                    {selectedUser.schoolMemberships.length === 0 ? (
                      <p className="text-sm text-text-secondary">
                        Aucune affectation.
                      </p>
                    ) : (
                      <ul className="grid gap-1 text-sm text-text-primary">
                        {selectedUser.schoolMemberships.map(
                          (membership, index) => (
                            <li
                              key={`${membership.school.id}-${membership.role}-${index}`}
                            >
                              {membership.school.name} ({membership.school.slug}
                              ) - {membership.role}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>

                  {selectedUser.studentProfiles.length > 0 ? (
                    <div className="rounded-card border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-medium text-text-primary">
                        Parcours eleve
                      </p>
                      <div className="grid gap-3">
                        {selectedUser.studentProfiles.map((profile) => (
                          <div
                            key={profile.id}
                            className="rounded-card border border-border bg-surface p-3"
                          >
                            <p className="text-sm text-text-primary">
                              {profile.school.name}
                              {profile.class
                                ? ` - classe actuelle: ${profile.class.name} (${profile.class.schoolYear.label})`
                                : " - classe actuelle: non assignee"}
                            </p>
                            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                              <select
                                value={
                                  selectedClassByStudentId[profile.id] ?? ""
                                }
                                onChange={(event) =>
                                  setSelectedClassByStudentId((current) => ({
                                    ...current,
                                    [profile.id]: event.target.value,
                                  }))
                                }
                                className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="">
                                  Selectionner une classe
                                </option>
                                {(
                                  classroomsBySchoolSlug[profile.school.slug] ??
                                  []
                                ).map((entry) => (
                                  <option key={entry.id} value={entry.id}>
                                    {entry.schoolYear.label} - {entry.name}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                disabled={Boolean(
                                  savingEnrollmentByStudentId[profile.id],
                                )}
                                onClick={() => {
                                  void onAssignStudentClass(profile);
                                }}
                              >
                                {savingEnrollmentByStudentId[profile.id]
                                  ? "Affectation..."
                                  : "Affecter"}
                              </Button>
                            </div>
                            <ul className="mt-2 grid gap-1 text-sm text-text-secondary">
                              {(
                                studentEnrollmentsByStudentId[profile.id] ?? []
                              ).map((enrollment) => (
                                <li
                                  key={enrollment.id}
                                  className="rounded-card border border-border bg-background px-2 py-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                      {enrollment.schoolYear.label} -{" "}
                                      {enrollment.class.name}
                                      {enrollment.isCurrent
                                        ? " - actuelle"
                                        : ""}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={
                                          enrollmentStatusDraftById[
                                            enrollment.id
                                          ] ?? enrollment.status
                                        }
                                        onChange={(event) =>
                                          setEnrollmentStatusDraftById(
                                            (current) => ({
                                              ...current,
                                              [enrollment.id]: event.target
                                                .value as EnrollmentHistoryRow["status"],
                                            }),
                                          )
                                        }
                                        className="rounded-card border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                      >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="TRANSFERRED">
                                          TRANSFERRED
                                        </option>
                                        <option value="WITHDRAWN">
                                          WITHDRAWN
                                        </option>
                                        <option value="GRADUATED">
                                          GRADUATED
                                        </option>
                                      </select>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={Boolean(
                                          savingEnrollmentStatusById[
                                            enrollment.id
                                          ],
                                        )}
                                        onClick={() => {
                                          void onUpdateEnrollmentStatus(
                                            profile,
                                            enrollment,
                                          );
                                        }}
                                      >
                                        {savingEnrollmentStatusById[
                                          enrollment.id
                                        ]
                                          ? "..."
                                          : "Maj statut"}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-text-secondary">
                                    Cree le{" "}
                                    {new Date(
                                      enrollment.createdAt,
                                    ).toLocaleDateString("fr-FR")}{" "}
                                    - statut actuel: {enrollment.status}
                                  </p>
                                </li>
                              ))}
                              {(studentEnrollmentsByStudentId[profile.id] ?? [])
                                .length === 0 ? (
                                <li>Aucun historique.</li>
                              ) : null}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedUser.parentStudents.length > 0 ? (
                    <div className="rounded-card border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-medium text-text-primary">
                        Liens parent-eleve
                      </p>
                      <ul className="grid gap-1 text-sm text-text-primary">
                        {selectedUser.parentStudents.map((link) => (
                          <li key={link.id}>
                            {link.student.lastName} {link.student.firstName} -{" "}
                            {link.student.school.name}
                            {link.student.class
                              ? ` (${link.student.class.name} ${link.student.class.schoolYear.label})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTab("list")}
                    >
                      Retour a la liste
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : tab === "help" ? (
            <ModuleHelpTab
              moduleName="Utilisateurs"
              moduleSummary="ce module pilote les comptes, roles plateforme/ecole, et l'etat de securite des acces."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ouvrir un compte avec les bons roles et une ecole cible.",
                  howTo:
                    "renseigner l'identite, les roles, l'ecole si necessaire, puis definir un mot de passe temporaire.",
                  moduleImpact:
                    "le compte apparait dans la liste avec son etat d'activation.",
                  crossModuleImpact:
                    "l'utilisateur gagne l'acces aux modules correspondant a ses roles (classes, inscriptions, notes, etc.).",
                },
                {
                  name: "Modifier",
                  purpose:
                    "ajuster roles, informations de profil ou telephone selon l'evolution des responsabilites.",
                  howTo:
                    "ouvrir les actions utilisateur, modifier les champs, puis enregistrer.",
                  moduleImpact:
                    "la fiche utilisateur et les filtres role/etat sont actualises.",
                  crossModuleImpact:
                    "les droits d'acces changent immediatement dans les autres modules.",
                },
                {
                  name: "Supprimer",
                  purpose:
                    "retirer un compte qui ne doit plus acceder a la plateforme.",
                  howTo:
                    "lancer Supprimer dans les actions utilisateur puis confirmer.",
                  moduleImpact: "le compte quitte la liste active.",
                  crossModuleImpact:
                    "les traces historiques restent possibles mais l'acces aux modules est coupe.",
                },
              ]}
              tips={[
                "Valider les roles avant creation pour limiter les erreurs d'autorisation.",
                "En cas de changement de poste, mettre a jour les roles avant de supprimer.",
              ]}
            />
          ) : (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Prenom</span>
                <input
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Nom</span>
                <input
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-text-secondary">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-text-secondary">Telephone</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+237 6 00 00 00 00"
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <div className="md:col-span-2">
                <ImageUploadField
                  kind="user-avatar"
                  label="Photo de profil (optionnel)"
                  helperText="Image JPG/PNG/WEBP, maximum 5MB. La photo est recadree et compressee automatiquement."
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                />
              </div>

              <div className="grid gap-1 text-sm">
                <span className="text-text-secondary">PlatformRoles</span>
                <div className="grid gap-1 rounded-card border border-border bg-surface px-3 py-2">
                  {PLATFORM_ROLE_OPTIONS.map((roleOption) => (
                    <label
                      key={`create-platform-${roleOption}`}
                      className="flex items-center gap-2 text-xs text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={createPlatformRoles.includes(roleOption)}
                        disabled={
                          roleOption === "ADMIN" &&
                          currentRole !== "SUPER_ADMIN"
                        }
                        onChange={(event) => {
                          setCreatePlatformRoles((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, roleOption]))
                              : current.filter((value) => value !== roleOption),
                          );
                        }}
                      />
                      <span>{roleOption}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-1 text-sm">
                <span className="text-text-secondary">SchoolRoles</span>
                <div className="grid gap-1 rounded-card border border-border bg-surface px-3 py-2">
                  {SCHOOL_ROLE_OPTIONS.map((roleOption) => (
                    <label
                      key={`create-school-${roleOption}`}
                      className="flex items-center gap-2 text-xs text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={createSchoolRoles.includes(roleOption)}
                        onChange={(event) => {
                          setCreateSchoolRoles((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, roleOption]))
                              : current.filter((value) => value !== roleOption),
                          );
                        }}
                      />
                      <span>{roleOption}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  Mot de passe provisoire
                </span>
                <input
                  type="text"
                  required
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
                  title="8 caracteres minimum avec au moins une majuscule, une minuscule et un chiffre."
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              {createSchoolRoles.length > 0 ? (
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-text-secondary">Ecole assignee</span>
                  <select
                    required
                    value={schoolSlug}
                    onChange={(event) => setSchoolSlug(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner une ecole</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.slug}>
                        {school.name} ({school.slug})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {submitError ? (
                <p className="text-sm text-notification md:col-span-2">
                  {submitError}
                </p>
              ) : null}
              {submitSuccess ? (
                <p className="text-sm text-primary md:col-span-2">
                  {submitSuccess}
                </p>
              ) : null}

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creation..." : "Creer le compte"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirmer la suppression"
        message={
          deleteTarget
            ? `Voulez-vous supprimer l'utilisateur ${deleteTarget.label} ? Cette action est irreversible.`
            : ""
        }
        confirmLabel="Supprimer"
        loading={Boolean(deletingUserId)}
        onCancel={() => {
          if (!deletingUserId) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void onDeleteUser(deleteTarget.id);
          }
        }}
      />
    </AppShell>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-background px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-heading font-semibold text-primary">{value}</p>
    </div>
  );
}
