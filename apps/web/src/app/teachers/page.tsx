"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmailInput } from "../../components/ui/email-input";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { PasswordInput } from "../../components/ui/password-input";
import { PinInput } from "../../components/ui/pin-input";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

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

type Tab = "list" | "assignments" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type TeacherRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
};

type SchoolYearOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type ClassroomOption = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
};

type SubjectRow = {
  id: string;
  name: string;
};

type AssignmentRow = {
  id: string;
  schoolYearId: string;
  teacherUserId: string;
  classId: string;
  subjectId: string;
  createdAt: string;
  schoolYear: { id: string; label: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
  };
};

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PHONE_PIN_REGEX = /^\d{6}$/;
const CAMEROON_LOCAL_PHONE_REGEX = /^\d{9}$/;

const createTeacherSchema = z
  .object({
    mode: z.enum(["email", "phone"]),
    email: z.union([z.string().trim().email("Email invalide."), z.literal("")]),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || CAMEROON_LOCAL_PHONE_REGEX.test(value), {
        message: "Le numero doit contenir exactement 9 chiffres.",
      }),
    password: z.union([
      z
        .string()
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      z.literal(""),
    ]),
    pin: z.union([
      z.string().regex(PHONE_PIN_REGEX, "Le PIN doit contenir 6 chiffres."),
      z.literal(""),
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "email") {
      if (!value.email.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email enseignant obligatoire.",
        });
      }
      if (!value.password.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Mot de passe initial obligatoire.",
        });
      }
    }

    if (value.mode === "phone") {
      if (!value.phone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Telephone enseignant obligatoire.",
        });
      }
      if (!value.pin.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pin"],
          message: "PIN initial obligatoire.",
        });
      }
    }
  });

function normalizeCmPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

const assignmentSchema = z.object({
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  teacherUserId: z.string().trim().min(1, "L'enseignant est obligatoire."),
  classId: z.string().trim().min(1, "La classe est obligatoire."),
  subjectId: z.string().trim().min(1, "La matiere est obligatoire."),
});

export default function TeachersPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );

  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const createTeacherForm = useForm<
    z.input<typeof createTeacherSchema>,
    unknown,
    z.output<typeof createTeacherSchema>
  >({
    resolver: zodResolver(createTeacherSchema),
    mode: "onChange",
    defaultValues: {
      mode: "phone",
      email: "",
      phone: "",
      password: "",
      pin: "",
    },
  });
  const createTeacherValues = createTeacherForm.watch();
  const createAssignmentForm = useForm<
    z.input<typeof assignmentSchema>,
    unknown,
    z.output<typeof assignmentSchema>
  >({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      teacherUserId: "",
      classId: "",
      subjectId: "",
    },
  });
  const createAssignmentValues = createAssignmentForm.watch();
  const editAssignmentForm = useForm<
    z.input<typeof assignmentSchema>,
    unknown,
    z.output<typeof assignmentSchema>
  >({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      teacherUserId: "",
      classId: "",
      subjectId: "",
    },
  });
  const editAssignmentValues = editAssignmentForm.watch();
  const createTeacherMode = createTeacherValues.mode ?? "phone";
  const createTeacherPhoneInvalid =
    createTeacherMode === "phone" &&
    (!!createTeacherForm.formState.errors.phone ||
      !(createTeacherValues.phone ?? "").trim());
  const createTeacherPinInvalid =
    createTeacherMode === "phone" &&
    (!!createTeacherForm.formState.errors.pin ||
      !(createTeacherValues.pin ?? "").trim());
  const createTeacherEmailInvalid =
    createTeacherMode === "email" &&
    (!!createTeacherForm.formState.errors.email ||
      !(createTeacherValues.email ?? "").trim());
  const createTeacherPasswordInvalid =
    createTeacherMode === "email" &&
    (!!createTeacherForm.formState.errors.password ||
      !(createTeacherValues.password ?? "").trim());
  const createAssignmentSchoolYearInvalid =
    !!createAssignmentForm.formState.errors.schoolYearId ||
    !(createAssignmentValues.schoolYearId ?? "").trim();
  const createAssignmentTeacherInvalid =
    !!createAssignmentForm.formState.errors.teacherUserId ||
    !(createAssignmentValues.teacherUserId ?? "").trim();
  const createAssignmentClassInvalid =
    !!createAssignmentForm.formState.errors.classId ||
    !(createAssignmentValues.classId ?? "").trim();
  const createAssignmentSubjectInvalid =
    !!createAssignmentForm.formState.errors.subjectId ||
    !(createAssignmentValues.subjectId ?? "").trim();
  const editAssignmentSchoolYearInvalid =
    !!editAssignmentForm.formState.errors.schoolYearId ||
    !(editAssignmentValues.schoolYearId ?? "").trim();
  const editAssignmentTeacherInvalid =
    !!editAssignmentForm.formState.errors.teacherUserId ||
    !(editAssignmentValues.teacherUserId ?? "").trim();
  const editAssignmentClassInvalid =
    !!editAssignmentForm.formState.errors.classId ||
    !(editAssignmentValues.classId ?? "").trim();
  const editAssignmentSubjectInvalid =
    !!editAssignmentForm.formState.errors.subjectId ||
    !(editAssignmentValues.subjectId ?? "").trim();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  async function bootstrap() {
    try {
      const meResponse = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });
      if (!meResponse.ok) {
        router.replace("/");
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      setRole(me.role);

      const allowed =
        me.role === "SUPER_ADMIN" ||
        me.role === "ADMIN" ||
        me.role === "SCHOOL_ADMIN";

      if (!allowed) {
        router.replace(
          me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
        );
        return;
      }

      if (me.role === "SCHOOL_ADMIN") {
        if (!me.schoolSlug) {
          setError(t("teachers.error.noSchoolAdmin"));
          setLoading(false);
          return;
        }
        setSchoolSlug(me.schoolSlug);
        setLoading(false);
        return;
      }

      const schoolsResponse = await fetch(`${API_URL}/system/schools/options`, {
        credentials: "include",
      });
      if (!schoolsResponse.ok) {
        router.replace("/");
        return;
      }

      const schoolRows = (await schoolsResponse.json()) as SchoolOption[];
      setSchools(schoolRows);
      setSchoolSlug(schoolRows[0]?.slug ?? null);
      setLoading(false);
    } catch {
      setError(t("teachers.error.apiDown"));
      setLoading(false);
    }
  }

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const [
        teachersResponse,
        schoolYearsResponse,
        classroomsResponse,
        subjectsResponse,
        assignmentsResponse,
      ] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teacher-assignments"), {
          credentials: "include",
        }),
      ]);

      if (
        !teachersResponse.ok ||
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !subjectsResponse.ok ||
        !assignmentsResponse.ok
      ) {
        setError(t("teachers.error.loadFailed"));
        return;
      }

      const teachersPayload = (await teachersResponse.json()) as TeacherRow[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearOption[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomOption[];
      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];

      setTeachers(teachersPayload);
      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setSubjects(subjectsPayload);
      setAssignments(assignmentsPayload);

      if (
        !createAssignmentValues.schoolYearId &&
        schoolYearsPayload.length > 0
      ) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        createAssignmentForm.setValue(
          "schoolYearId",
          active?.id ?? schoolYearsPayload[0].id,
          { shouldDirty: false, shouldTouch: false, shouldValidate: true },
        );
      }

      if (!createAssignmentValues.teacherUserId && teachersPayload.length > 0) {
        createAssignmentForm.setValue(
          "teacherUserId",
          teachersPayload[0].userId,
          { shouldDirty: false, shouldTouch: false, shouldValidate: true },
        );
      }

      if (!createAssignmentValues.subjectId && subjectsPayload.length > 0) {
        createAssignmentForm.setValue("subjectId", subjectsPayload[0].id, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }
    } catch {
      setError(t("teachers.error.network"));
    } finally {
      setLoadingData(false);
    }
  }

  function filteredClassesForCreate() {
    return classrooms.filter(
      (entry) =>
        !createAssignmentValues.schoolYearId ||
        entry.schoolYear.id === createAssignmentValues.schoolYearId,
    );
  }

  function filteredClassesForEdit() {
    return classrooms.filter(
      (entry) =>
        !editAssignmentValues.schoolYearId ||
        entry.schoolYear.id === editAssignmentValues.schoolYearId,
    );
  }

  async function onCreateTeacher(values: z.output<typeof createTeacherSchema>) {
    if (!schoolSlug) {
      return;
    }

    setError(null);
    setSuccess(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("teachers.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingTeacher(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "teachers"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(
          values.mode === "email"
            ? {
                email: values.email.trim(),
                password: values.password.trim(),
              }
            : {
                phone: values.phone?.trim(),
                pin: values.pin.trim(),
              },
        ),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("teachers.error.createFallback"));
        setError(String(message));
        return;
      }

      createTeacherForm.reset({
        mode: values.mode,
        email: "",
        phone: "",
        password: "",
        pin: "",
      });
      setSuccess(
        values.mode === "phone"
          ? t("teachers.success.createPhone")
          : t("teachers.success.createEmail"),
      );
      await loadData(schoolSlug);
    } catch {
      setError(t("teachers.error.network"));
    } finally {
      setSubmittingTeacher(false);
    }
  }

  async function onCreateAssignment(values: z.output<typeof assignmentSchema>) {
    if (!schoolSlug) {
      return;
    }

    setError(null);
    setSuccess(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("teachers.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingAssignment(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "teacher-assignments"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        return;
      }

      createAssignmentForm.reset({
        schoolYearId: values.schoolYearId,
        teacherUserId: values.teacherUserId,
        classId: "",
        subjectId: values.subjectId,
      });
      setSuccess(t("teachers.success.assignmentCreated"));
      await loadData(schoolSlug);
    } catch {
      setError(t("teachers.error.network"));
    } finally {
      setSubmittingAssignment(false);
    }
  }

  function startEditAssignment(entry: AssignmentRow) {
    setEditingAssignmentId(entry.id);
    editAssignmentForm.reset({
      schoolYearId: entry.schoolYearId,
      teacherUserId: entry.teacherUserId,
      classId: entry.classId,
      subjectId: entry.subjectId,
    });
  }

  async function saveAssignment(
    assignmentId: string,
    values: z.output<typeof assignmentSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    setError(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("teachers.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingAssignment(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `teacher-assignments/${assignmentId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingAssignmentId(null);
      editAssignmentForm.reset({
        schoolYearId: "",
        teacherUserId: "",
        classId: "",
        subjectId: "",
      });
      setSuccess(t("teachers.success.assignmentEdited"));
      await loadData(schoolSlug);
    } catch {
      setError(t("teachers.error.network"));
    } finally {
      setSavingAssignment(false);
    }
  }

  async function confirmDeleteAssignment() {
    if (!schoolSlug || !deleteAssignment) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("teachers.error.csrf"));
      router.replace("/");
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `teacher-assignments/${deleteAssignment.id}`,
        ),
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("teachers.error.createFallback"));
        setError(String(message));
        return;
      }

      setDeleteAssignment(null);
      setSuccess(t("teachers.success.assignmentDeleted"));
      await loadData(schoolSlug);
    } catch {
      setError(t("teachers.error.network"));
    } finally {
      setDeleting(false);
    }
  }

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      ),
    [teachers],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        `${a.schoolYear.label}-${a.teacherUser.lastName}-${a.class.name}-${a.subject.name}`.localeCompare(
          `${b.schoolYear.label}-${b.teacherUser.lastName}-${b.class.name}-${b.subject.name}`,
        ),
      ),
    [assignments],
  );

  const assignmentsByTeacher = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        classId: string;
        className: string;
        subjectName: string;
        schoolYearLabel: string;
      }>
    >();

    for (const assignment of assignments) {
      const current = map.get(assignment.teacherUserId) ?? [];
      current.push({
        classId: assignment.classId,
        className: assignment.class.name,
        subjectName: assignment.subject.name,
        schoolYearLabel: assignment.schoolYear.label,
      });
      map.set(assignment.teacherUserId, current);
    }

    return map;
  }, [assignments]);

  if (loading) {
    return (
      <AppShell schoolSlug={schoolSlug} schoolName={t("teachers.shellName")}>
        <Card title={t("teachers.title")} subtitle={t("common.loading")}>
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("teachers.shellName")}>
      <div className="grid gap-4">
        <Card title={t("teachers.title")} subtitle={t("teachers.subtitle")}>
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("teachers.tab.list")}
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "assignments"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("teachers.tab.assignments")}
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("teachers.tab.help")}
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("teachers.school.label")}
                </span>
                <FormSelect
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                >
                  <option value="">{t("teachers.school.select")}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </FormSelect>
              </label>
            ) : null}
          </div>

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName={t("teachers.help.moduleName")}
              moduleSummary={t("teachers.help.moduleSummary")}
              actions={[
                {
                  name: t("teachers.help.action1.name"),
                  purpose: t("teachers.help.action1.purpose"),
                  howTo: t("teachers.help.action1.howTo"),
                  moduleImpact: t("teachers.help.action1.moduleImpact"),
                  crossModuleImpact: t(
                    "teachers.help.action1.crossModuleImpact",
                  ),
                },
                {
                  name: t("teachers.help.action2.name"),
                  purpose: t("teachers.help.action2.purpose"),
                  howTo: t("teachers.help.action2.howTo"),
                  moduleImpact: t("teachers.help.action2.moduleImpact"),
                  crossModuleImpact: t(
                    "teachers.help.action2.crossModuleImpact",
                  ),
                },
                {
                  name: t("teachers.help.action3.name"),
                  purpose: t("teachers.help.action3.purpose"),
                  howTo: t("teachers.help.action3.howTo"),
                  moduleImpact: t("teachers.help.action3.moduleImpact"),
                  crossModuleImpact: t(
                    "teachers.help.action3.crossModuleImpact",
                  ),
                },
              ]}
              tips={[t("teachers.help.tip1"), t("teachers.help.tip2")]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              {t("teachers.noSchool")}
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              {role === "ADMIN" ? (
                <p className="text-sm text-text-secondary">
                  {t("teachers.create.adminRestriction")}
                </p>
              ) : (
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  onSubmit={createTeacherForm.handleSubmit(onCreateTeacher)}
                >
                  <FormField
                    label={t("teachers.create.modeLabel")}
                    error={createTeacherForm.formState.errors.mode?.message}
                  >
                    <FormSelect
                      value={createTeacherMode}
                      invalid={false}
                      onChange={(event) => {
                        const nextMode = event.target.value as
                          | "email"
                          | "phone";
                        createTeacherForm.setValue("mode", nextMode, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        if (nextMode === "email") {
                          createTeacherForm.setValue("phone", "", {
                            shouldValidate: true,
                          });
                          createTeacherForm.setValue("pin", "", {
                            shouldValidate: true,
                          });
                        } else {
                          createTeacherForm.setValue("email", "", {
                            shouldValidate: true,
                          });
                          createTeacherForm.setValue("password", "", {
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <option value="phone">
                        {t("teachers.create.modePhone")}
                      </option>
                      <option value="email">
                        {t("teachers.create.modeEmail")}
                      </option>
                    </FormSelect>
                  </FormField>
                  <FormField
                    label={
                      createTeacherMode === "email"
                        ? t("teachers.create.emailLabel")
                        : t("teachers.create.phoneLabel")
                    }
                    error={
                      createTeacherMode === "email"
                        ? createTeacherForm.formState.errors.email?.message
                        : createTeacherForm.formState.errors.phone?.message
                    }
                  >
                    {createTeacherMode === "email" ? (
                      <EmailInput
                        value={createTeacherValues.email ?? ""}
                        invalid={createTeacherEmailInvalid}
                        onChange={(event) => {
                          createTeacherForm.setValue(
                            "email",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="enseignant@ecole.com"
                      />
                    ) : (
                      <FormTextInput
                        value={createTeacherValues.phone ?? ""}
                        invalid={createTeacherPhoneInvalid}
                        onChange={(event) => {
                          createTeacherForm.setValue(
                            "phone",
                            normalizeCmPhoneInput(event.target.value),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="6XXXXXXXX"
                      />
                    )}
                  </FormField>
                  <FormField
                    label={
                      createTeacherMode === "email"
                        ? t("teachers.create.passwordLabel")
                        : t("teachers.create.pinLabel")
                    }
                    error={
                      createTeacherMode === "email"
                        ? createTeacherForm.formState.errors.password?.message
                        : createTeacherForm.formState.errors.pin?.message
                    }
                  >
                    {createTeacherMode === "email" ? (
                      <PasswordInput
                        value={createTeacherValues.password ?? ""}
                        aria-invalid={
                          createTeacherPasswordInvalid ? "true" : "false"
                        }
                        onChange={(event) => {
                          createTeacherForm.setValue(
                            "password",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="MotDePasse123"
                      />
                    ) : (
                      <PinInput
                        value={createTeacherValues.pin ?? ""}
                        aria-invalid={
                          createTeacherPinInvalid ? "true" : "false"
                        }
                        onChange={(event) => {
                          createTeacherForm.setValue(
                            "pin",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder="123456"
                      />
                    )}
                  </FormField>
                  <div className="self-end">
                    <SubmitButton
                      disabled={
                        submittingTeacher ||
                        !createTeacherForm.formState.isValid
                      }
                    >
                      {submittingTeacher
                        ? t("teachers.create.submitting")
                        : t("teachers.create.submit")}
                    </SubmitButton>
                  </div>
                  <FormSubmitHint
                    visible={!createTeacherForm.formState.isValid}
                    className="md:col-span-3"
                  />
                  {error ? (
                    <p className="text-sm text-notification md:col-span-3">
                      {error}
                    </p>
                  ) : null}
                  {success ? (
                    <p className="text-sm text-primary md:col-span-3">
                      {success}
                    </p>
                  ) : null}
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.table.col.teacher")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.table.col.email")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.table.col.phone")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.table.col.assignedClasses")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      !loadingData &&
                      sortedTeachers.map((entry) => (
                        <tr
                          key={entry.userId}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">
                            {entry.lastName} {entry.firstName}
                          </td>
                          <td className="px-3 py-2">{entry.email ?? "-"}</td>
                          <td className="px-3 py-2">{entry.phone ?? "-"}</td>
                          <td className="px-3 py-2">
                            {(assignmentsByTeacher.get(entry.userId) ?? [])
                              .length === 0 ? (
                              <span className="text-text-secondary">
                                {t("teachers.table.noAssignment")}
                              </span>
                            ) : (
                              <div className="grid gap-1">
                                {Array.from(
                                  new Set(
                                    (
                                      assignmentsByTeacher.get(entry.userId) ??
                                      []
                                    ).map(
                                      (item) =>
                                        `${item.className} (${item.schoolYearLabel})`,
                                    ),
                                  ),
                                ).map((classLabel) => (
                                  <span key={classLabel}>{classLabel}</span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {!loading && !loadingData && sortedTeachers.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          {t("teachers.table.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-5"
                onSubmit={createAssignmentForm.handleSubmit(onCreateAssignment)}
              >
                <FormField
                  label={t("teachers.assignment.yearLabel")}
                  error={
                    createAssignmentForm.formState.errors.schoolYearId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("teachers.assignment.yearAria")}
                    invalid={createAssignmentSchoolYearInvalid}
                    value={createAssignmentValues.schoolYearId ?? ""}
                    onChange={(event) => {
                      createAssignmentForm.setValue(
                        "schoolYearId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                      createAssignmentForm.setValue("classId", "", {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">{t("common.select")}</option>
                    {schoolYears.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                        {entry.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label={t("teachers.assignment.teacherLabel")}
                  error={
                    createAssignmentForm.formState.errors.teacherUserId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("teachers.assignment.teacherAria")}
                    invalid={createAssignmentTeacherInvalid}
                    value={createAssignmentValues.teacherUserId ?? ""}
                    onChange={(event) =>
                      createAssignmentForm.setValue(
                        "teacherUserId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <option value="">{t("common.select")}</option>
                    {sortedTeachers.map((entry) => (
                      <option key={entry.userId} value={entry.userId}>
                        {entry.lastName} {entry.firstName}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label={t("teachers.assignment.classLabel")}
                  error={createAssignmentForm.formState.errors.classId?.message}
                >
                  <FormSelect
                    aria-label={t("teachers.assignment.classAria")}
                    invalid={createAssignmentClassInvalid}
                    value={createAssignmentValues.classId ?? ""}
                    onChange={(event) =>
                      createAssignmentForm.setValue(
                        "classId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <option value="">{t("common.select")}</option>
                    {filteredClassesForCreate().map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label={t("teachers.assignment.subjectLabel")}
                  error={
                    createAssignmentForm.formState.errors.subjectId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("teachers.assignment.subjectAria")}
                    invalid={createAssignmentSubjectInvalid}
                    value={createAssignmentValues.subjectId ?? ""}
                    onChange={(event) =>
                      createAssignmentForm.setValue(
                        "subjectId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <option value="">{t("common.select")}</option>
                    {subjects.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <div className="self-end">
                  <SubmitButton
                    disabled={
                      submittingAssignment ||
                      !createAssignmentForm.formState.isValid
                    }
                  >
                    {submittingAssignment
                      ? t("teachers.assignment.submitting")
                      : t("teachers.assignment.submit")}
                  </SubmitButton>
                </div>
                <FormSubmitHint
                  visible={!createAssignmentForm.formState.isValid}
                  className="md:col-span-5"
                />
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.assignment.colYear")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.assignment.colTeacher")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.assignment.colClass")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("teachers.assignment.colSubject")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("teachers.assignment.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedAssignments.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              {entry.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {entry.teacherUser.lastName}{" "}
                              {entry.teacherUser.firstName}
                            </td>
                            <td className="px-3 py-2">{entry.class.name}</td>
                            <td className="px-3 py-2">{entry.subject.name}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditAssignment(entry)}
                                >
                                  {t("teachers.assignment.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    setDeleteAssignment({
                                      id: entry.id,
                                      label: `${entry.teacherUser.lastName} ${entry.teacherUser.firstName} - ${entry.class.name} / ${entry.subject.name}`,
                                    })
                                  }
                                >
                                  {t("teachers.assignment.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingAssignmentId === entry.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-4">
                                  <FormField
                                    label={t("teachers.assignment.yearLabel")}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .schoolYearId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "teachers.assignment.yearAria",
                                      )}
                                      invalid={editAssignmentSchoolYearInvalid}
                                      value={
                                        editAssignmentValues.schoolYearId ?? ""
                                      }
                                      onChange={(event) => {
                                        editAssignmentForm.setValue(
                                          "schoolYearId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        );
                                        editAssignmentForm.setValue(
                                          "classId",
                                          "",
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        );
                                      }}
                                    >
                                      <option value="">
                                        {t("common.select")}
                                      </option>
                                      {schoolYears.map((year) => (
                                        <option key={year.id} value={year.id}>
                                          {year.label}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <FormField
                                    label={t(
                                      "teachers.assignment.teacherLabel",
                                    )}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .teacherUserId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "teachers.assignment.teacherAria",
                                      )}
                                      invalid={editAssignmentTeacherInvalid}
                                      value={
                                        editAssignmentValues.teacherUserId ?? ""
                                      }
                                      onChange={(event) =>
                                        editAssignmentForm.setValue(
                                          "teacherUserId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                    >
                                      <option value="">
                                        {t("common.select")}
                                      </option>
                                      {sortedTeachers.map((teacher) => (
                                        <option
                                          key={teacher.userId}
                                          value={teacher.userId}
                                        >
                                          {teacher.lastName} {teacher.firstName}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <FormField
                                    label={t("teachers.assignment.classLabel")}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .classId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "teachers.assignment.classAria",
                                      )}
                                      invalid={editAssignmentClassInvalid}
                                      value={editAssignmentValues.classId ?? ""}
                                      onChange={(event) =>
                                        editAssignmentForm.setValue(
                                          "classId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                    >
                                      <option value="">
                                        {t("common.select")}
                                      </option>
                                      {filteredClassesForEdit().map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <FormField
                                    label={t(
                                      "teachers.assignment.subjectLabel",
                                    )}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .subjectId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "teachers.assignment.subjectAria",
                                      )}
                                      invalid={editAssignmentSubjectInvalid}
                                      value={
                                        editAssignmentValues.subjectId ?? ""
                                      }
                                      onChange={(event) =>
                                        editAssignmentForm.setValue(
                                          "subjectId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                    >
                                      <option value="">
                                        {t("common.select")}
                                      </option>
                                      {subjects.map((subject) => (
                                        <option
                                          key={subject.id}
                                          value={subject.id}
                                        >
                                          {subject.name}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <FormSubmitHint
                                    visible={
                                      !editAssignmentForm.formState.isValid
                                    }
                                    className="md:col-span-4"
                                  />
                                  <div className="flex gap-2 md:col-span-4">
                                    <Button
                                      type="button"
                                      disabled={
                                        savingAssignment ||
                                        !editAssignmentForm.formState.isValid
                                      }
                                      onClick={() =>
                                        void editAssignmentForm.handleSubmit(
                                          (values) =>
                                            saveAssignment(entry.id, values),
                                        )()
                                      }
                                    >
                                      {savingAssignment
                                        ? t("teachers.assignment.saving")
                                        : t("teachers.assignment.save")}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingAssignmentId(null);
                                        editAssignmentForm.reset({
                                          schoolYearId: "",
                                          teacherUserId: "",
                                          classId: "",
                                          subjectId: "",
                                        });
                                      }}
                                    >
                                      {t("common.cancel")}
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading &&
                    !loadingData &&
                    sortedAssignments.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("teachers.assignment.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && !(tab === "list" && role !== "ADMIN") ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success && !(tab === "list" && role !== "ADMIN") ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteAssignment)}
        title={t("teachers.delete.title")}
        message={
          deleteAssignment
            ? t("teachers.delete.message").replace(
                "{label}",
                deleteAssignment.label,
              )
            : ""
        }
        confirmLabel={t("teachers.delete.confirm")}
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteAssignment(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteAssignment();
        }}
      />
    </AppShell>
  );
}
