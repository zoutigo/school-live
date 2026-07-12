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
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
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

type Tab = "catalog" | "national" | "assignments" | "evaluation-types" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type SubjectRow = {
  id: string;
  schoolId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  branches: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  _count: {
    assignments: number;
    studentGrades: number;
    curriculumSubjects: number;
    classOverrides: number;
  };
};

type NationalSubjectRow = {
  id: string;
  code: string;
  name: string;
  _count: {
    assignments: number;
    studentGrades: number;
    curriculumSubjects: number;
    classOverrides: number;
  };
};

type TeacherOption = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
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

type EvaluationTypeRow = {
  id: string;
  code: string;
  label: string;
  isDefault: boolean;
};

const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la matiere est obligatoire."),
});

const createEvaluationTypeSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  label: z.string().trim().min(1, "Le libelle est obligatoire."),
});

const createNationalSubjectSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  name: z.string().trim().min(1, "Le nom de la matiere est obligatoire."),
});

const createAssignmentSchema = z.object({
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  teacherUserId: z.string().trim().min(1, "L'enseignant est obligatoire."),
  classId: z.string().trim().min(1, "La classe est obligatoire."),
  subjectId: z.string().trim().min(1, "La matiere est obligatoire."),
});

export default function SubjectsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("catalog");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [nationalSubjects, setNationalSubjects] = useState<
    NationalSubjectRow[]
  >([]);
  const [loadingNationalSubjects, setLoadingNationalSubjects] = useState(false);
  const [submittingNationalSubject, setSubmittingNationalSubject] =
    useState(false);
  const [evaluationTypes, setEvaluationTypes] = useState<EvaluationTypeRow[]>(
    [],
  );
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingEvaluationTypeId, setEditingEvaluationTypeId] = useState<
    string | null
  >(null);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );

  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [submittingBranchForSubjectId, setSubmittingBranchForSubjectId] =
    useState<string | null>(null);
  const [submittingEvaluationType, setSubmittingEvaluationType] =
    useState(false);
  const [savingEvaluationType, setSavingEvaluationType] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "subject"; id: string; label: string }
    | { kind: "branch"; id: string; label: string }
    | { kind: "evaluation-type"; id: string; label: string }
    | { kind: "assignment"; id: string; label: string }
    | { kind: "national-subject"; id: string; label: string }
    | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const createSubjectForm = useForm<z.input<typeof createSubjectSchema>>({
    resolver: zodResolver(createSubjectSchema),
    mode: "onChange",
    defaultValues: { name: "" },
  });
  const createEvaluationTypeForm = useForm<
    z.input<typeof createEvaluationTypeSchema>
  >({
    resolver: zodResolver(createEvaluationTypeSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const createAssignmentForm = useForm<z.input<typeof createAssignmentSchema>>({
    resolver: zodResolver(createAssignmentSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      teacherUserId: "",
      classId: "",
      subjectId: "",
    },
  });
  const editSubjectForm = useForm<z.input<typeof createSubjectSchema>>({
    resolver: zodResolver(createSubjectSchema),
    mode: "onChange",
    defaultValues: { name: "" },
  });
  const createNationalSubjectForm = useForm<
    z.input<typeof createNationalSubjectSchema>
  >({
    resolver: zodResolver(createNationalSubjectSchema),
    mode: "onChange",
    defaultValues: { code: "", name: "" },
  });
  const editEvaluationTypeForm = useForm<
    z.input<typeof createEvaluationTypeSchema>
  >({
    resolver: zodResolver(createEvaluationTypeSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const editAssignmentForm = useForm<z.input<typeof createAssignmentSchema>>({
    resolver: zodResolver(createAssignmentSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      teacherUserId: "",
      classId: "",
      subjectId: "",
    },
  });
  const createSubjectValues = createSubjectForm.watch();
  const createEvaluationTypeValues = createEvaluationTypeForm.watch();
  const createAssignmentValues = createAssignmentForm.watch();
  const editAssignmentValues = editAssignmentForm.watch();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    void createSubjectForm.trigger();
    void createEvaluationTypeForm.trigger();
  }, [createEvaluationTypeForm, createSubjectForm]);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      void loadNationalSubjects();
    }
  }, [role]);

  useEffect(() => {
    void createNationalSubjectForm.trigger();
  }, [createNationalSubjectForm]);

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
          setError("Aucune ecole rattachee a ce compte SCHOOL_ADMIN.");
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
      setError(
        "API indisponible. Verifiez que le serveur backend est demarre.",
      );
      setLoading(false);
    }
  }

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const [
        subjectsResponse,
        evaluationTypesResponse,
        teachersResponse,
        schoolYearsResponse,
        classroomsResponse,
        assignmentsResponse,
      ] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "evaluation-types"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teacher-assignments"), {
          credentials: "include",
        }),
      ]);

      if (
        !subjectsResponse.ok ||
        !evaluationTypesResponse.ok ||
        !teachersResponse.ok ||
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !assignmentsResponse.ok
      ) {
        setError("Impossible de charger le module matieres.");
        return;
      }

      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const evaluationTypesPayload =
        (await evaluationTypesResponse.json()) as EvaluationTypeRow[];
      const teachersPayload =
        (await teachersResponse.json()) as TeacherOption[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearOption[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomOption[];
      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];

      setSubjects(subjectsPayload);
      setEvaluationTypes(evaluationTypesPayload);
      setTeachers(teachersPayload);
      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setAssignments(assignmentsPayload);

      if (
        !createAssignmentForm.getValues("schoolYearId") &&
        schoolYearsPayload.length > 0
      ) {
        createAssignmentForm.setValue(
          "schoolYearId",
          schoolYearsPayload.find((entry) => entry.isActive)?.id ??
            schoolYearsPayload[0].id,
          { shouldValidate: true },
        );
      }
      if (
        !createAssignmentForm.getValues("teacherUserId") &&
        teachersPayload.length > 0
      ) {
        createAssignmentForm.setValue(
          "teacherUserId",
          teachersPayload[0].userId,
          {
            shouldValidate: true,
          },
        );
      }
      if (
        !createAssignmentForm.getValues("subjectId") &&
        subjectsPayload.length > 0
      ) {
        createAssignmentForm.setValue("subjectId", subjectsPayload[0].id, {
          shouldValidate: true,
        });
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  const filteredClassroomsForCreate = useMemo(
    () =>
      classrooms.filter(
        (entry) =>
          !createAssignmentValues.schoolYearId ||
          entry.schoolYear.id === createAssignmentValues.schoolYearId,
      ),
    [classrooms, createAssignmentValues.schoolYearId],
  );

  useEffect(() => {
    if (!createAssignmentValues.classId) {
      if (filteredClassroomsForCreate.length > 0) {
        createAssignmentForm.setValue(
          "classId",
          filteredClassroomsForCreate[0].id,
          { shouldValidate: true },
        );
      }
      return;
    }

    const exists = filteredClassroomsForCreate.some(
      (entry) => entry.id === createAssignmentValues.classId,
    );
    if (!exists) {
      createAssignmentForm.setValue(
        "classId",
        filteredClassroomsForCreate[0]?.id ?? "",
        { shouldValidate: true },
      );
    }
  }, [
    createAssignmentForm,
    createAssignmentValues.classId,
    filteredClassroomsForCreate,
  ]);

  async function onCreateSubject(values: z.output<typeof createSubjectSchema>) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(buildAdminPath(schoolSlug, "subjects"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(values),
      });

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

      createSubjectForm.reset({ name: "" });
      setSuccess("Matiere creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingSubject(false);
    }
  }

  async function loadNationalSubjects() {
    setLoadingNationalSubjects(true);
    try {
      const response = await fetch(`${API_URL}/system/subjects`, {
        credentials: "include",
      });
      if (!response.ok) {
        return;
      }
      const rows = (await response.json()) as NationalSubjectRow[];
      setNationalSubjects(rows);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingNationalSubjects(false);
    }
  }

  async function onCreateNationalSubject(
    values: z.output<typeof createNationalSubjectSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingNationalSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/system/subjects`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        createNationalSubjectForm.setFocus(
          payload?.message && String(payload.message).includes("code")
            ? "code"
            : "name",
        );
        return;
      }

      createNationalSubjectForm.reset({ code: "", name: "" });
      setSuccess("Matiere nationale creee.");
      await loadNationalSubjects();
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingNationalSubject(false);
    }
  }

  function onInvalidCreateNationalSubject(
    errors: typeof createNationalSubjectForm.formState.errors,
  ) {
    if (errors.code) {
      createNationalSubjectForm.setFocus("code");
    } else if (errors.name) {
      createNationalSubjectForm.setFocus("name");
    }
  }

  function askDeleteNationalSubject(subject: NationalSubjectRow) {
    setDeleteTarget({
      kind: "national-subject",
      id: subject.id,
      label: subject.name,
    });
  }

  function startEditSubject(subject: SubjectRow) {
    setEditingSubjectId(subject.id);
    editSubjectForm.reset({ name: subject.name });
    void editSubjectForm.trigger();
    setError(null);
    setSuccess(null);
  }

  async function saveSubject(
    subjectId: string,
    values: z.output<typeof createSubjectSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `subjects/${subjectId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ name: values.name }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour impossible.");
        setError(String(message));
        return;
      }

      setEditingSubjectId(null);
      setSuccess("Matiere modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSubject(false);
    }
  }

  function askDeleteSubject(subject: SubjectRow) {
    setDeleteTarget({ kind: "subject", id: subject.id, label: subject.name });
  }

  async function onCreateBranch(subjectId: string) {
    if (!schoolSlug) {
      return;
    }

    const name = branchDrafts[subjectId]?.trim();
    if (!name) {
      setError("Nom de sous-branche requis.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingBranchForSubjectId(subjectId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `subjects/${subjectId}/branches`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ name }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation sous-branche impossible.");
        setError(String(message));
        return;
      }

      setBranchDrafts((prev) => ({ ...prev, [subjectId]: "" }));
      setSuccess("Sous-branche creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingBranchForSubjectId(null);
    }
  }

  function askDeleteBranch(
    subject: SubjectRow,
    branchId: string,
    label: string,
  ) {
    setDeleteTarget({
      kind: "branch",
      id: branchId,
      label: `${subject.name} - ${label}`,
    });
  }

  async function onCreateEvaluationType(
    values: z.output<typeof createEvaluationTypeSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingEvaluationType(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "evaluation-types"),
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
            : (payload?.message ?? "Creation type impossible.");
        setError(String(message));
        return;
      }

      createEvaluationTypeForm.reset({ code: "", label: "" });
      setSuccess("Type d'evaluation cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingEvaluationType(false);
    }
  }

  function startEditEvaluationType(evaluationType: EvaluationTypeRow) {
    setEditingEvaluationTypeId(evaluationType.id);
    editEvaluationTypeForm.reset({
      code: evaluationType.code,
      label: evaluationType.label,
    });
    void editEvaluationTypeForm.trigger();
    setError(null);
    setSuccess(null);
  }

  async function saveEvaluationType(
    evaluationTypeId: string,
    values: z.output<typeof createEvaluationTypeSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingEvaluationType(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `evaluation-types/${evaluationTypeId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            code: values.code,
            label: values.label,
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
            : (payload?.message ?? "Mise a jour type impossible.");
        setError(String(message));
        return;
      }
      setEditingEvaluationTypeId(null);
      setSuccess("Type d'evaluation modifie.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingEvaluationType(false);
    }
  }

  function askDeleteEvaluationType(evaluationType: EvaluationTypeRow) {
    setDeleteTarget({
      kind: "evaluation-type",
      id: evaluationType.id,
      label: evaluationType.label,
    });
  }

  function startEditAssignment(assignment: AssignmentRow) {
    setEditingAssignmentId(assignment.id);
    editAssignmentForm.reset({
      schoolYearId: assignment.schoolYearId,
      teacherUserId: assignment.teacherUserId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
    });
    void editAssignmentForm.trigger();
    setError(null);
    setSuccess(null);
  }

  async function onCreateAssignment(
    values: z.output<typeof createAssignmentSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingAssignment(true);
    setError(null);
    setSuccess(null);

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
            : (payload?.message ?? "Creation affectation impossible.");
        setError(String(message));
        return;
      }

      createAssignmentForm.reset({
        schoolYearId: values.schoolYearId,
        teacherUserId: values.teacherUserId,
        classId: values.classId,
        subjectId: values.subjectId,
      });
      setSuccess("Affectation enseignant/matiere creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingAssignment(false);
    }
  }

  async function saveAssignment(
    assignmentId: string,
    values: z.output<typeof createAssignmentSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingAssignment(true);
    setError(null);
    setSuccess(null);

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
          body: JSON.stringify({
            schoolYearId: values.schoolYearId,
            teacherUserId: values.teacherUserId,
            classId: values.classId,
            subjectId: values.subjectId,
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
            : (payload?.message ?? "Mise a jour affectation impossible.");
        setError(String(message));
        return;
      }

      setEditingAssignmentId(null);
      setSuccess("Affectation modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingAssignment(false);
    }
  }

  function askDeleteAssignment(assignment: AssignmentRow) {
    setDeleteTarget({
      kind: "assignment",
      id: assignment.id,
      label: `${assignment.teacherUser.lastName} ${assignment.teacherUser.firstName} - ${assignment.subject.name}`,
    });
  }

  async function onConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.kind !== "national-subject" && !schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const url =
        deleteTarget.kind === "national-subject"
          ? `${API_URL}/system/subjects/${deleteTarget.id}`
          : buildAdminPath(
              schoolSlug as string,
              deleteTarget.kind === "subject"
                ? `subjects/${deleteTarget.id}`
                : deleteTarget.kind === "branch"
                  ? `subjects/branches/${deleteTarget.id}`
                  : deleteTarget.kind === "evaluation-type"
                    ? `evaluation-types/${deleteTarget.id}`
                    : `teacher-assignments/${deleteTarget.id}`,
            );

      const response = await fetch(url, {
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
        setError(String(message));
        return;
      }

      setDeleteTarget(null);
      setSuccess(
        deleteTarget.kind === "subject"
          ? "Matiere supprimee."
          : deleteTarget.kind === "branch"
            ? "Sous-branche supprimee."
            : deleteTarget.kind === "evaluation-type"
              ? "Type d'evaluation supprime."
              : deleteTarget.kind === "national-subject"
                ? "Matiere nationale supprimee."
                : "Affectation supprimee.",
      );
      if (deleteTarget.kind === "national-subject") {
        await loadNationalSubjects();
      } else if (schoolSlug) {
        await loadData(schoolSlug);
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        `${a.schoolYear.label}-${a.class.name}-${a.subject.name}-${a.teacherUser.lastName}-${a.teacherUser.firstName}`.localeCompare(
          `${b.schoolYear.label}-${b.class.name}-${b.subject.name}-${b.teacherUser.lastName}-${b.teacherUser.firstName}`,
        ),
      ),
    [assignments],
  );

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("subjects.shellName")}>
      <div className="grid gap-4">
        <Card title={t("subjects.title")} subtitle={t("subjects.subtitle")}>
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("catalog")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "catalog"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("subjects.tab.catalog")}
            </button>
            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => setTab("national")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "national"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("subjects.tab.national")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "assignments"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("subjects.tab.assignments")}
            </button>
            <button
              type="button"
              onClick={() => setTab("evaluation-types")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "evaluation-types"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("subjects.tab.evaluationTypes")}
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
              {t("subjects.tab.help")}
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("subjects.schoolLabel")}
                </span>
                <FormSelect
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                >
                  <option value="">{t("subjects.schoolPlaceholder")}</option>
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
              moduleName={t("subjects.help.moduleName")}
              moduleSummary={t("subjects.help.moduleSummary")}
              actions={[
                {
                  name: t("subjects.help.action1.name"),
                  purpose: t("subjects.help.action1.purpose"),
                  howTo: t("subjects.help.action1.howTo"),
                  moduleImpact: t("subjects.help.action1.moduleImpact"),
                  crossModuleImpact: t(
                    "subjects.help.action1.crossModuleImpact",
                  ),
                },
                {
                  name: t("subjects.help.action2.name"),
                  purpose: t("subjects.help.action2.purpose"),
                  howTo: t("subjects.help.action2.howTo"),
                  moduleImpact: t("subjects.help.action2.moduleImpact"),
                  crossModuleImpact: t(
                    "subjects.help.action2.crossModuleImpact",
                  ),
                },
                {
                  name: t("subjects.help.action3.name"),
                  purpose: t("subjects.help.action3.purpose"),
                  howTo: t("subjects.help.action3.howTo"),
                  moduleImpact: t("subjects.help.action3.moduleImpact"),
                  crossModuleImpact: t(
                    "subjects.help.action3.crossModuleImpact",
                  ),
                },
                {
                  name: t("subjects.help.action4.name"),
                  purpose: t("subjects.help.action4.purpose"),
                  howTo: t("subjects.help.action4.howTo"),
                  moduleImpact: t("subjects.help.action4.moduleImpact"),
                  crossModuleImpact: t(
                    "subjects.help.action4.crossModuleImpact",
                  ),
                },
              ]}
              tips={[t("subjects.help.tip1"), t("subjects.help.tip2")]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              {t("subjects.noSchool")}
            </p>
          ) : tab === "catalog" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_auto]"
                onSubmit={createSubjectForm.handleSubmit(onCreateSubject)}
              >
                <FormField
                  label={t("subjects.catalog.newSubjectLabel")}
                  error={createSubjectForm.formState.errors.name?.message}
                >
                  <FormTextInput
                    aria-label={t("subjects.catalog.newSubjectLabel")}
                    {...createSubjectForm.register("name")}
                    placeholder={t("subjects.catalog.newSubjectPlaceholder")}
                    invalid={
                      Boolean(createSubjectForm.formState.errors.name) ||
                      !String(createSubjectValues.name ?? "").trim()
                    }
                  />
                </FormField>
                <div className="self-end">
                  <FormSubmitHint
                    visible={!createSubjectForm.formState.isValid}
                  />
                  <SubmitButton
                    disabled={
                      submittingSubject || !createSubjectForm.formState.isValid
                    }
                  >
                    {submittingSubject
                      ? t("subjects.catalog.creating")
                      : t("subjects.catalog.add")}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.catalog.colSubject")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.catalog.colBranches")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.catalog.colCurriculums")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.catalog.colAssignments")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.catalog.colGrades")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("subjects.catalog.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={6}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedSubjects.map((subject) => (
                        <Fragment key={subject.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{subject.name}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {subject.branches.length === 0 ? (
                                  <span className="text-text-secondary">
                                    {t("subjects.catalog.noBranches")}
                                  </span>
                                ) : (
                                  subject.branches.map((branch) => (
                                    <span
                                      key={branch.id}
                                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                                    >
                                      {branch.name}
                                      <button
                                        type="button"
                                        className="font-semibold text-notification"
                                        onClick={() =>
                                          askDeleteBranch(
                                            subject,
                                            branch.id,
                                            branch.name,
                                          )
                                        }
                                      >
                                        x
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <FormTextInput
                                  value={branchDrafts[subject.id] ?? ""}
                                  onChange={(event) =>
                                    setBranchDrafts((prev) => ({
                                      ...prev,
                                      [subject.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={t(
                                    "subjects.catalog.newBranchPlaceholder",
                                  )}
                                  className="min-w-[180px] text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    void onCreateBranch(subject.id);
                                  }}
                                  disabled={
                                    submittingBranchForSubjectId === subject.id
                                  }
                                >
                                  {submittingBranchForSubjectId === subject.id
                                    ? t("subjects.catalog.adding")
                                    : t("subjects.catalog.add")}
                                </Button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {subject._count.curriculumSubjects}
                            </td>
                            <td className="px-3 py-2">
                              {subject._count.assignments}
                            </td>
                            <td className="px-3 py-2">
                              {subject._count.studentGrades}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditSubject(subject)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => askDeleteSubject(subject)}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingSubjectId === subject.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={6}>
                                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                  <FormField
                                    label={t("subjects.catalog.editNameLabel")}
                                    error={
                                      editSubjectForm.formState.errors.name
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "subjects.catalog.editNameLabel",
                                      )}
                                      {...editSubjectForm.register("name")}
                                      invalid={Boolean(
                                        editSubjectForm.formState.errors.name,
                                      )}
                                    />
                                  </FormField>
                                  <div className="self-end">
                                    <FormSubmitHint
                                      visible={
                                        !editSubjectForm.formState.isValid
                                      }
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    disabled={
                                      savingSubject ||
                                      !editSubjectForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editSubjectForm.handleSubmit(
                                        (values) =>
                                          saveSubject(subject.id, values),
                                      )();
                                    }}
                                  >
                                    {savingSubject
                                      ? t("subjects.catalog.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingSubjectId(null);
                                      editSubjectForm.reset();
                                    }}
                                  >
                                    {t("common.cancel")}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading && !loadingData && sortedSubjects.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={6}
                        >
                          {t("subjects.catalog.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === "national" ? (
            <div className="grid gap-4">
              <p className="text-sm text-text-secondary">
                {t("subjects.national.intro")}
              </p>
              <form
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                onSubmit={createNationalSubjectForm.handleSubmit(
                  onCreateNationalSubject,
                  onInvalidCreateNationalSubject,
                )}
              >
                <FormField
                  label={t("subjects.national.codeLabel")}
                  error={
                    createNationalSubjectForm.formState.errors.code?.message
                  }
                >
                  <FormTextInput
                    aria-label={t("subjects.national.codeLabel")}
                    {...createNationalSubjectForm.register("code")}
                    placeholder={t("subjects.national.codePlaceholder")}
                    invalid={Boolean(
                      createNationalSubjectForm.formState.errors.code,
                    )}
                  />
                </FormField>
                <FormField
                  label={t("subjects.national.nameLabel")}
                  error={
                    createNationalSubjectForm.formState.errors.name?.message
                  }
                >
                  <FormTextInput
                    aria-label={t("subjects.national.nameLabel")}
                    {...createNationalSubjectForm.register("name")}
                    placeholder={t("subjects.national.namePlaceholder")}
                    invalid={Boolean(
                      createNationalSubjectForm.formState.errors.name,
                    )}
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton disabled={submittingNationalSubject}>
                    {submittingNationalSubject
                      ? t("subjects.national.adding")
                      : t("subjects.national.add")}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.national.colCode")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.national.colName")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.national.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nationalSubjects.map((subject) => (
                      <tr key={subject.id} className="border-b border-border">
                        <td className="px-3 py-2 font-mono text-xs">
                          {subject.code}
                        </td>
                        <td className="px-3 py-2">{subject.name}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => askDeleteNationalSubject(subject)}
                          >
                            {t("subjects.delete.confirm")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!loadingNationalSubjects &&
                    nationalSubjects.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={3}
                        >
                          {t("subjects.national.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === "evaluation-types" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[180px_1fr_auto]"
                onSubmit={createEvaluationTypeForm.handleSubmit(
                  onCreateEvaluationType,
                )}
              >
                <FormField
                  label={t("subjects.evalType.codeLabel")}
                  error={
                    createEvaluationTypeForm.formState.errors.code?.message
                  }
                >
                  <FormTextInput
                    aria-label={t("subjects.evalType.codeLabel")}
                    {...createEvaluationTypeForm.register("code")}
                    placeholder={t("subjects.evalType.codePlaceholder")}
                    invalid={
                      Boolean(createEvaluationTypeForm.formState.errors.code) ||
                      !String(createEvaluationTypeValues.code ?? "").trim()
                    }
                  />
                </FormField>
                <FormField
                  label={t("subjects.evalType.labelLabel")}
                  error={
                    createEvaluationTypeForm.formState.errors.label?.message
                  }
                >
                  <FormTextInput
                    aria-label={t("subjects.evalType.labelLabel")}
                    {...createEvaluationTypeForm.register("label")}
                    placeholder={t("subjects.evalType.labelPlaceholder")}
                    invalid={
                      Boolean(
                        createEvaluationTypeForm.formState.errors.label,
                      ) ||
                      !String(createEvaluationTypeValues.label ?? "").trim()
                    }
                  />
                </FormField>
                <div className="self-end">
                  <FormSubmitHint
                    visible={!createEvaluationTypeForm.formState.isValid}
                  />
                  <SubmitButton
                    disabled={
                      submittingEvaluationType ||
                      !createEvaluationTypeForm.formState.isValid
                    }
                  >
                    {submittingEvaluationType
                      ? t("subjects.catalog.creating")
                      : t("subjects.catalog.add")}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.evalType.colCode")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.evalType.colLabel")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.evalType.colOrigin")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("subjects.catalog.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationTypes.map((evaluationType) => (
                      <Fragment key={evaluationType.id}>
                        <tr className="border-b border-border text-text-primary">
                          <td className="px-3 py-2 font-mono">
                            {evaluationType.code}
                          </td>
                          <td className="px-3 py-2">{evaluationType.label}</td>
                          <td className="px-3 py-2">
                            {evaluationType.isDefault
                              ? t("subjects.evalType.originDefault")
                              : t("subjects.evalType.originCustom")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  startEditEvaluationType(evaluationType)
                                }
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={evaluationType.isDefault}
                                onClick={() =>
                                  askDeleteEvaluationType(evaluationType)
                                }
                              >
                                {t("common.delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {editingEvaluationTypeId === evaluationType.id ? (
                          <tr className="border-b border-border bg-background">
                            <td className="px-3 py-3" colSpan={4}>
                              <div className="grid gap-3 md:grid-cols-[180px_1fr_auto_auto]">
                                <FormField
                                  label={t("subjects.evalType.codeLabel")}
                                  error={
                                    editEvaluationTypeForm.formState.errors.code
                                      ?.message
                                  }
                                >
                                  <FormTextInput
                                    aria-label={t(
                                      "subjects.evalType.codeEditAria",
                                    )}
                                    {...editEvaluationTypeForm.register("code")}
                                    invalid={Boolean(
                                      editEvaluationTypeForm.formState.errors
                                        .code,
                                    )}
                                  />
                                </FormField>
                                <FormField
                                  label={t("subjects.evalType.labelLabel")}
                                  error={
                                    editEvaluationTypeForm.formState.errors
                                      .label?.message
                                  }
                                >
                                  <FormTextInput
                                    aria-label={t(
                                      "subjects.evalType.labelEditAria",
                                    )}
                                    {...editEvaluationTypeForm.register(
                                      "label",
                                    )}
                                    invalid={Boolean(
                                      editEvaluationTypeForm.formState.errors
                                        .label,
                                    )}
                                  />
                                </FormField>
                                <div className="self-end">
                                  <FormSubmitHint
                                    visible={
                                      !editEvaluationTypeForm.formState.isValid
                                    }
                                  />
                                </div>
                                <Button
                                  type="button"
                                  disabled={
                                    savingEvaluationType ||
                                    !editEvaluationTypeForm.formState.isValid
                                  }
                                  onClick={() => {
                                    void editEvaluationTypeForm.handleSubmit(
                                      (values) =>
                                        saveEvaluationType(
                                          evaluationType.id,
                                          values,
                                        ),
                                    )();
                                  }}
                                >
                                  {savingEvaluationType
                                    ? t("subjects.catalog.saving")
                                    : t("common.save")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingEvaluationTypeId(null);
                                    editEvaluationTypeForm.reset();
                                  }}
                                >
                                  {t("common.cancel")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && !loadingData && evaluationTypes.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("subjects.evalType.emptyHint")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={createAssignmentForm.handleSubmit(onCreateAssignment)}
              >
                <FormField
                  label={t("subjects.assignment.yearLabel")}
                  error={
                    createAssignmentForm.formState.errors.schoolYearId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("subjects.assignment.yearLabel")}
                    invalid={
                      !!createAssignmentForm.formState.errors.schoolYearId
                    }
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
                  label={t("subjects.assignment.teacherLabel")}
                  error={
                    createAssignmentForm.formState.errors.teacherUserId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("subjects.assignment.teacherLabel")}
                    invalid={
                      !!createAssignmentForm.formState.errors.teacherUserId
                    }
                    value={createAssignmentValues.teacherUserId ?? ""}
                    onChange={(event) => {
                      createAssignmentForm.setValue(
                        "teacherUserId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">{t("common.select")}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.userId} value={teacher.userId}>
                        {teacher.lastName} {teacher.firstName}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label={t("subjects.assignment.classLabel")}
                  error={createAssignmentForm.formState.errors.classId?.message}
                >
                  <FormSelect
                    aria-label={t("subjects.assignment.classLabel")}
                    invalid={!!createAssignmentForm.formState.errors.classId}
                    value={createAssignmentValues.classId ?? ""}
                    onChange={(event) => {
                      createAssignmentForm.setValue(
                        "classId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">{t("common.select")}</option>
                    {filteredClassroomsForCreate.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label={t("subjects.assignment.subjectLabel")}
                  error={
                    createAssignmentForm.formState.errors.subjectId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("subjects.assignment.subjectLabel")}
                    invalid={!!createAssignmentForm.formState.errors.subjectId}
                    value={createAssignmentValues.subjectId ?? ""}
                    onChange={(event) => {
                      createAssignmentForm.setValue(
                        "subjectId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">{t("common.select")}</option>
                    {sortedSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <div className="md:col-span-4">
                  <SubmitButton
                    disabled={
                      submittingAssignment ||
                      !createAssignmentForm.formState.isValid
                    }
                  >
                    {submittingAssignment
                      ? t("subjects.catalog.creating")
                      : t("subjects.assignment.add")}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.assignment.colYear")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.assignment.colTeacher")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.assignment.colClass")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("subjects.assignment.colSubject")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("subjects.catalog.colActions")}
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
                      sortedAssignments.map((assignment) => (
                        <Fragment key={assignment.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              {assignment.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.teacherUser.lastName}{" "}
                              {assignment.teacherUser.firstName}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.class.name}
                            </td>
                            <td className="px-3 py-2">
                              {assignment.subject.name}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    startEditAssignment(assignment)
                                  }
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    askDeleteAssignment(assignment)
                                  }
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {editingAssignmentId === assignment.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-4">
                                  <FormField
                                    label={t("subjects.assignment.yearLabel")}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .schoolYearId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "subjects.assignment.yearLabel",
                                      )}
                                      invalid={
                                        !!editAssignmentForm.formState.errors
                                          .schoolYearId
                                      }
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
                                      {schoolYears.map((entry) => (
                                        <option key={entry.id} value={entry.id}>
                                          {entry.label}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>

                                  <FormField
                                    label={t(
                                      "subjects.assignment.teacherLabel",
                                    )}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .teacherUserId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "subjects.assignment.teacherLabel",
                                      )}
                                      invalid={
                                        !!editAssignmentForm.formState.errors
                                          .teacherUserId
                                      }
                                      value={
                                        editAssignmentValues.teacherUserId ?? ""
                                      }
                                      onChange={(event) => {
                                        editAssignmentForm.setValue(
                                          "teacherUserId",
                                          event.target.value,
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
                                      {teachers.map((teacher) => (
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
                                    label={t("subjects.assignment.classLabel")}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .classId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "subjects.assignment.classLabel",
                                      )}
                                      invalid={
                                        !!editAssignmentForm.formState.errors
                                          .classId
                                      }
                                      value={editAssignmentValues.classId ?? ""}
                                      onChange={(event) => {
                                        editAssignmentForm.setValue(
                                          "classId",
                                          event.target.value,
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
                                      {classrooms
                                        .filter(
                                          (entry) =>
                                            !editAssignmentValues.schoolYearId ||
                                            entry.schoolYear.id ===
                                              editAssignmentValues.schoolYearId,
                                        )
                                        .map((entry) => (
                                          <option
                                            key={entry.id}
                                            value={entry.id}
                                          >
                                            {entry.name}
                                          </option>
                                        ))}
                                    </FormSelect>
                                  </FormField>

                                  <FormField
                                    label={t(
                                      "subjects.assignment.subjectLabel",
                                    )}
                                    error={
                                      editAssignmentForm.formState.errors
                                        .subjectId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "subjects.assignment.subjectLabel",
                                      )}
                                      invalid={
                                        !!editAssignmentForm.formState.errors
                                          .subjectId
                                      }
                                      value={
                                        editAssignmentValues.subjectId ?? ""
                                      }
                                      onChange={(event) => {
                                        editAssignmentForm.setValue(
                                          "subjectId",
                                          event.target.value,
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
                                      {sortedSubjects.map((subject) => (
                                        <option
                                          key={subject.id}
                                          value={subject.id}
                                        >
                                          {subject.name}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <div className="md:col-span-4">
                                    <FormSubmitHint
                                      visible={
                                        !editAssignmentForm.formState.isValid
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    disabled={
                                      savingAssignment ||
                                      !editAssignmentForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editAssignmentForm.handleSubmit(
                                        (values) =>
                                          saveAssignment(assignment.id, values),
                                      )();
                                    }}
                                  >
                                    {savingAssignment
                                      ? t("subjects.catalog.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingAssignmentId(null);
                                      editAssignmentForm.reset();
                                    }}
                                  >
                                    {t("common.cancel")}
                                  </Button>
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
                          {t("subjects.assignment.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("subjects.delete.title")}
        message={
          deleteTarget
            ? t("subjects.delete.message").replace(
                "{label}",
                deleteTarget.label,
              )
            : ""
        }
        confirmLabel={t("subjects.delete.confirm")}
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void onConfirmDelete();
        }}
      />
    </AppShell>
  );
}
