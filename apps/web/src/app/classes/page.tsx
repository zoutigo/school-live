"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

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
type Tab = "list" | "details" | "assignments" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type SchoolYearRow = {
  id: string;
  label: string;
  isActive: boolean;
};

type CurriculumRow = {
  id: string;
  name: string;
};

type ClassroomRow = {
  id: string;
  schoolId: string;
  name: string;
  referentTeacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  schoolYear: {
    id: string;
    label: string;
  };
  academicLevel: {
    id: string;
    code: string;
    label: string;
  } | null;
  track: {
    id: string;
    code: string;
    label: string;
  } | null;
  curriculum: {
    id: string;
    name: string;
  } | null;
  _count: {
    enrollments: number;
  };
};

type SubjectRow = {
  id: string;
  name: string;
};

type TeacherRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

type AssignmentRow = {
  id: string;
  schoolYearId: string;
  teacherUserId: string;
  classId: string;
  subjectId: string;
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

type EnrollmentRow = {
  id: string;
  schoolYearId: string;
  status: "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED";
  isCurrent: boolean;
  schoolYear: { id: string; label: string };
  class: {
    id: string;
    name: string;
  };
};

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  parentLinks: Array<{
    id: string;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone?: string | null;
    };
  }>;
  currentEnrollment: EnrollmentRow | null;
  enrollments: EnrollmentRow[];
};

type CurriculumSubjectRow = {
  id: string;
  subjectId: string;
  isMandatory: boolean;
  coefficient: number | null;
  weeklyHours: number | null;
  subject: {
    id: string;
    name: string;
  };
};

type ClassSubjectOverrideRow = {
  id: string;
  subjectId: string;
  action: "ADD" | "REMOVE";
  coefficientOverride: number | null;
  weeklyHoursOverride: number | null;
  subject: {
    id: string;
    name: string;
  };
};

type EffectiveSubjectRow = {
  subjectId: string;
  subjectName: string;
  coefficient: number | null;
  weeklyHours: number | null;
  source: "curriculum" | "override";
};

type TimetableClassReadResponse = {
  subjectStyles?: Array<{
    subjectId: string;
    colorHex: string;
  }>;
};

const createClassroomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  curriculumId: z.string().trim().min(1, "Le curriculum est obligatoire."),
});

const updateClassroomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  curriculumId: z.string().trim().optional(),
});

const createTeacherAssignmentSchema = z.object({
  teacherUserId: z.string().trim().min(1, "L'enseignant est obligatoire."),
  subjectId: z.string().trim().min(1, "La matiere est obligatoire."),
});

const assignStudentSchema = z.object({
  studentId: z.string().trim().min(1, "L'eleve est obligatoire."),
  status: z.enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"]),
});

const classReferentSchema = z.object({
  teacherUserId: z
    .string()
    .trim()
    .min(1, "L'enseignant referent est obligatoire."),
});

function optionalId(value: string) {
  return value.trim() === "" ? undefined : value;
}

const SUBJECT_COLOR_FALLBACK_PALETTE = [
  "#2563EB",
  "#DC2626",
  "#0891B2",
  "#4D7C0F",
  "#7C3AED",
  "#B45309",
  "#0E7490",
  "#BE123C",
  "#0F766E",
  "#374151",
];

const SUBJECT_COLOR_PICKER_PALETTE = [
  "#2563EB",
  "#DC2626",
  "#0891B2",
  "#4D7C0F",
  "#7C3AED",
  "#B45309",
  "#0E7490",
  "#BE123C",
  "#0F766E",
  "#374151",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#06B6D4",
  "#1D4ED8",
  "#1E40AF",
  "#4338CA",
  "#5B21B6",
  "#7E22CE",
  "#A21CAF",
  "#BE185D",
  "#C2410C",
  "#EA580C",
  "#D97706",
  "#CA8A04",
  "#65A30D",
  "#16A34A",
  "#15803D",
  "#0F766E",
  "#0D9488",
  "#0284C7",
  "#0369A1",
  "#075985",
  "#334155",
  "#475569",
  "#64748B",
  "#9A3412",
  "#A16207",
  "#0F172A",
  "#5B3C00",
  "#4C1D95",
  "#9D174D",
  "#991B1B",
];

function fallbackSubjectColor(subjectId: string) {
  let hash = 0;
  for (let index = 0; index < subjectId.length; index += 1) {
    hash = (hash * 31 + subjectId.charCodeAt(index)) >>> 0;
  }
  return SUBJECT_COLOR_FALLBACK_PALETTE[
    hash % SUBJECT_COLOR_FALLBACK_PALETTE.length
  ];
}

export default function ClassesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingClassDetails, setLoadingClassDetails] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [classAssignments, setClassAssignments] = useState<AssignmentRow[]>([]);
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);
  const [classCurriculumSubjects, setClassCurriculumSubjects] = useState<
    CurriculumSubjectRow[]
  >([]);
  const [classSubjectOverrides, setClassSubjectOverrides] = useState<
    ClassSubjectOverrideRow[]
  >([]);
  const [classSubjectColorsById, setClassSubjectColorsById] = useState<
    Record<string, string>
  >({});

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [submittingClass, setSubmittingClass] = useState(false);

  const [submittingTeacherAssignment, setSubmittingTeacherAssignment] =
    useState(false);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingClassReferent, setSavingClassReferent] = useState(false);
  const [assigningStudent, setAssigningStudent] = useState(false);

  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<
    string | null
  >(null);
  const [colorPickerSubject, setColorPickerSubject] = useState<{
    subjectId: string;
    subjectName: string;
  } | null>(null);
  const [savingSubjectColor, setSavingSubjectColor] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const createTeacherAssignmentForm = useForm<
    z.input<typeof createTeacherAssignmentSchema>,
    unknown,
    z.output<typeof createTeacherAssignmentSchema>
  >({
    resolver: zodResolver(createTeacherAssignmentSchema),
    mode: "onChange",
    defaultValues: {
      teacherUserId: "",
      subjectId: "",
    },
  });
  const createTeacherAssignmentValues = createTeacherAssignmentForm.watch();
  const editTeacherAssignmentForm = useForm<
    z.input<typeof createTeacherAssignmentSchema>,
    unknown,
    z.output<typeof createTeacherAssignmentSchema>
  >({
    resolver: zodResolver(createTeacherAssignmentSchema),
    mode: "onChange",
    defaultValues: {
      teacherUserId: "",
      subjectId: "",
    },
  });
  const editTeacherAssignmentValues = editTeacherAssignmentForm.watch();
  const editClassForm = useForm<
    z.input<typeof updateClassroomSchema>,
    unknown,
    z.output<typeof updateClassroomSchema>
  >({
    resolver: zodResolver(updateClassroomSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      schoolYearId: "",
      curriculumId: "",
    },
  });
  const editClassValues = editClassForm.watch();
  const assignStudentForm = useForm<
    z.input<typeof assignStudentSchema>,
    unknown,
    z.output<typeof assignStudentSchema>
  >({
    resolver: zodResolver(assignStudentSchema),
    mode: "onChange",
    defaultValues: {
      studentId: "",
      status: "ACTIVE",
    },
  });
  const assignStudentValues = assignStudentForm.watch();
  const referentForm = useForm<
    z.input<typeof classReferentSchema>,
    unknown,
    z.output<typeof classReferentSchema>
  >({
    resolver: zodResolver(classReferentSchema),
    mode: "onChange",
    defaultValues: {
      teacherUserId: "",
    },
  });
  const referentValues = referentForm.watch();
  const createClassForm = useForm<
    z.input<typeof createClassroomSchema>,
    unknown,
    z.output<typeof createClassroomSchema>
  >({
    resolver: zodResolver(createClassroomSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      schoolYearId: "",
      curriculumId: "",
    },
  });
  const createClassValues = createClassForm.watch();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  const selectedClass = useMemo(
    () => classrooms.find((entry) => entry.id === selectedClassId) ?? null,
    [classrooms, selectedClassId],
  );

  useEffect(() => {
    if (!schoolSlug || !selectedClass) {
      setClassAssignments([]);
      setClassStudents([]);
      setClassCurriculumSubjects([]);
      setClassSubjectOverrides([]);
      referentForm.reset({ teacherUserId: "" });
      return;
    }

    referentForm.reset({
      teacherUserId: selectedClass.referentTeacher?.id ?? "",
    });
    void loadClassDetails(schoolSlug, selectedClass);
  }, [schoolSlug, selectedClass?.id]);

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

      const schoolsResponse = await fetch(`${API_URL}/system/schools`, {
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
    try {
      const [
        classesResponse,
        schoolYearsResponse,
        curriculumsResponse,
        teachersResponse,
        subjectsResponse,
        studentsResponse,
      ] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "curriculums"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "teachers"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "students"), {
          credentials: "include",
        }),
      ]);

      if (
        !classesResponse.ok ||
        !schoolYearsResponse.ok ||
        !curriculumsResponse.ok ||
        !teachersResponse.ok ||
        !subjectsResponse.ok ||
        !studentsResponse.ok
      ) {
        setError("Impossible de charger les donnees des classes.");
        return;
      }

      const classesPayload = (await classesResponse.json()) as ClassroomRow[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];
      const curriculumsPayload =
        (await curriculumsResponse.json()) as CurriculumRow[];
      const teachersPayload = (await teachersResponse.json()) as TeacherRow[];
      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const studentsPayload = (await studentsResponse.json()) as StudentRow[];

      setClassrooms(classesPayload);
      setSchoolYears(schoolYearsPayload);
      setCurriculums(curriculumsPayload);
      setTeachers(teachersPayload);
      setSubjects(subjectsPayload);
      setAllStudents(studentsPayload);

      if (!selectedClassId && classesPayload.length > 0) {
        setSelectedClassId(classesPayload[0].id);
      }

      if (
        selectedClassId &&
        classesPayload.length > 0 &&
        !classesPayload.some((row) => row.id === selectedClassId)
      ) {
        setSelectedClassId(classesPayload[0].id);
      }

      if (
        !(createClassForm.getValues("schoolYearId") ?? "") &&
        schoolYearsPayload.length > 0
      ) {
        createClassForm.setValue(
          "schoolYearId",
          schoolYearsPayload.find((schoolYear) => schoolYear.isActive)?.id ??
            schoolYearsPayload[0].id,
          { shouldValidate: true },
        );
      }

      if (
        !(createTeacherAssignmentForm.getValues("teacherUserId") ?? "") &&
        teachersPayload.length > 0
      ) {
        createTeacherAssignmentForm.setValue(
          "teacherUserId",
          teachersPayload[0].userId,
          { shouldValidate: true },
        );
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function loadClassDetails(
    currentSchoolSlug: string,
    classEntity: ClassroomRow,
  ) {
    setLoadingClassDetails(true);
    try {
      const studentsParams = new URLSearchParams({
        classId: classEntity.id,
        schoolYearId: classEntity.schoolYear.id,
      });

      const curriculumSubjectsPromise = classEntity.curriculum?.id
        ? fetch(
            buildAdminPath(
              currentSchoolSlug,
              `curriculums/${classEntity.curriculum.id}/subjects`,
            ),
            { credentials: "include" },
          )
        : Promise.resolve(null);

      const [
        assignmentsResponse,
        studentsResponse,
        overridesResponse,
        curriculumResponse,
        timetableResponse,
      ] = await Promise.all([
        fetch(
          buildAdminPath(
            currentSchoolSlug,
            `teacher-assignments?classId=${classEntity.id}`,
          ),
          { credentials: "include" },
        ),
        fetch(
          buildAdminPath(
            currentSchoolSlug,
            `students?${studentsParams.toString()}`,
          ),
          {
            credentials: "include",
          },
        ),
        fetch(
          buildAdminPath(
            currentSchoolSlug,
            `classrooms/${classEntity.id}/subject-overrides`,
          ),
          { credentials: "include" },
        ),
        curriculumSubjectsPromise,
        fetch(
          `${API_URL}/schools/${currentSchoolSlug}/timetable/classes/${classEntity.id}?schoolYearId=${encodeURIComponent(classEntity.schoolYear.id)}`,
          { credentials: "include" },
        ),
      ]);

      if (
        !assignmentsResponse.ok ||
        !studentsResponse.ok ||
        !overridesResponse.ok
      ) {
        setError("Impossible de charger le detail de la classe.");
        return;
      }

      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];
      const studentsPayload = (await studentsResponse.json()) as StudentRow[];
      const overridesPayload =
        (await overridesResponse.json()) as ClassSubjectOverrideRow[];

      let curriculumSubjectsPayload: CurriculumSubjectRow[] = [];
      if (curriculumResponse && curriculumResponse.ok) {
        curriculumSubjectsPayload =
          (await curriculumResponse.json()) as CurriculumSubjectRow[];
      }

      let subjectColorMap: Record<string, string> = {};
      if (timetableResponse.ok) {
        const timetablePayload =
          (await timetableResponse.json()) as TimetableClassReadResponse;
        subjectColorMap = Object.fromEntries(
          (timetablePayload.subjectStyles ?? [])
            .filter(
              (entry) =>
                typeof entry.subjectId === "string" &&
                /^#[0-9A-Fa-f]{6}$/.test(entry.colorHex),
            )
            .map((entry) => [entry.subjectId, entry.colorHex.toUpperCase()]),
        );
      }

      setClassAssignments(assignmentsPayload);
      setClassStudents(studentsPayload);
      setClassSubjectOverrides(overridesPayload);
      setClassCurriculumSubjects(curriculumSubjectsPayload);
      setClassSubjectColorsById(subjectColorMap);

      const draft: Record<
        string,
        "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
      > = {};
      studentsPayload.forEach((student) => {
        student.enrollments.forEach((enrollment) => {
          draft[enrollment.id] = enrollment.status;
        });
      });
      setStatusDraftByEnrollmentId(draft);

      if (
        !(assignStudentForm.getValues("studentId") ?? "") &&
        studentsPayload.length > 0
      ) {
        assignStudentForm.setValue("studentId", studentsPayload[0].id, {
          shouldValidate: true,
        });
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingClassDetails(false);
    }
  }

  async function onCreateClass(values: z.output<typeof createClassroomSchema>) {
    setError(null);
    setSuccess(null);
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingClass(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "classrooms"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          ...values,
          curriculumId: optionalId(values.curriculumId ?? ""),
        }),
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

      createClassForm.reset({
        name: "",
        schoolYearId: createClassForm.getValues("schoolYearId") ?? "",
        curriculumId: "",
      });
      setSuccess("Classe creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingClass(false);
    }
  }

  function startEditClass(entry: ClassroomRow) {
    setEditingClassId(entry.id);
    editClassForm.reset({
      name: entry.name,
      schoolYearId: entry.schoolYear.id,
      curriculumId: entry.curriculum?.id ?? "",
    });
  }

  async function saveClass(classId: string) {
    if (!schoolSlug) {
      return;
    }
    setError(null);
    const isValid = await editClassForm.trigger();
    if (!isValid) return;
    const values = editClassForm.getValues();

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingClass(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `classrooms/${classId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            ...values,
            curriculumId: optionalId(values.curriculumId ?? ""),
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
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingClassId(null);
      setSuccess("Classe modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingClass(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !schoolSlug) {
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
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `classrooms/${deleteTarget.id}`),
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
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      setDeleteTarget(null);
      setSuccess("Classe supprimee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  async function createTeacherAssignment(
    values: z.output<typeof createTeacherAssignmentSchema>,
  ) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    setError(null);
    setSuccess(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingTeacherAssignment(true);
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
          body: JSON.stringify({
            schoolYearId: selectedClass.schoolYear.id,
            classId: selectedClass.id,
            teacherUserId: values.teacherUserId,
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
            : (payload?.message ?? "Affectation impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Affectation enseignant creee.");
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingTeacherAssignment(false);
    }
  }

  function startEditAssignment(assignment: AssignmentRow) {
    setEditingAssignmentId(assignment.id);
    editTeacherAssignmentForm.reset({
      teacherUserId: assignment.teacherUserId,
      subjectId: assignment.subjectId,
    });
  }

  async function saveAssignment(
    assignmentId: string,
    values: z.output<typeof createTeacherAssignmentSchema>,
  ) {
    if (!schoolSlug || !selectedClass) {
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
            schoolYearId: selectedClass.schoolYear.id,
            classId: selectedClass.id,
            teacherUserId: values.teacherUserId,
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
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingAssignmentId(null);
      editTeacherAssignmentForm.reset({
        teacherUserId: "",
        subjectId: "",
      });
      setSuccess("Affectation enseignant modifiee.");
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function assignStudentToSelectedClass(
    values: z.output<typeof assignStudentSchema>,
  ) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setAssigningStudent(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${values.studentId}/enrollments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId: selectedClass.id,
            status: values.status,
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
            : (payload?.message ?? "Affectation eleve impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Eleve affecte a la classe.");
      await Promise.all([
        loadData(schoolSlug),
        loadClassDetails(schoolSlug, selectedClass),
      ]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setAssigningStudent(false);
    }
  }

  async function updateSelectedClassReferentTeacher(
    values: z.output<typeof classReferentSchema>,
  ) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingClassReferent(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `classrooms/${selectedClass.id}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            referentTeacherUserId: values.teacherUserId,
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
            : (payload?.message ?? "Affectation du referent impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Enseignant referent affecte a la classe.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingClassReferent(false);
    }
  }

  async function updateOneEnrollmentStatus(
    studentId: string,
    enrollmentId: string,
  ) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    const draft = statusDraftByEnrollmentId[enrollmentId];
    if (!draft) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingEnrollmentId(enrollmentId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `students/${studentId}/enrollments/${enrollmentId}`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ status: draft }),
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

      setSuccess("Statut d'affectation eleve mis a jour.");
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setUpdatingEnrollmentId(null);
    }
  }

  async function updateSubjectColor(subjectId: string, colorHex: string) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSavingSubjectColor(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/timetable/classes/${selectedClass.id}/subjects/${subjectId}/style`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            schoolYearId: selectedClass.schoolYear.id,
            colorHex,
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
            : (payload?.message ?? "Mise a jour couleur impossible.");
        setError(String(message));
        return;
      }

      setClassSubjectColorsById((current) => ({
        ...current,
        [subjectId]: colorHex.toUpperCase(),
      }));
      setSuccess("Couleur de la matiere mise a jour.");
      setColorPickerSubject(null);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingSubjectColor(false);
    }
  }

  const sortedClasses = useMemo(
    () =>
      [...classrooms].sort((a, b) =>
        `${a.schoolYear.label}-${a.name}`.localeCompare(
          `${b.schoolYear.label}-${b.name}`,
        ),
      ),
    [classrooms],
  );

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      ),
    [teachers],
  );

  const effectiveSubjects = useMemo<EffectiveSubjectRow[]>(() => {
    const map = new Map<string, EffectiveSubjectRow>();

    for (const row of classCurriculumSubjects) {
      map.set(row.subjectId, {
        subjectId: row.subjectId,
        subjectName: row.subject.name,
        coefficient: row.coefficient,
        weeklyHours: row.weeklyHours,
        source: "curriculum",
      });
    }

    for (const override of classSubjectOverrides) {
      const existing = map.get(override.subjectId);
      if (override.action === "REMOVE") {
        map.delete(override.subjectId);
        continue;
      }

      if (!existing) {
        map.set(override.subjectId, {
          subjectId: override.subjectId,
          subjectName: override.subject.name,
          coefficient: override.coefficientOverride,
          weeklyHours: override.weeklyHoursOverride,
          source: "override",
        });
        continue;
      }

      map.set(override.subjectId, {
        ...existing,
        coefficient:
          override.coefficientOverride !== null
            ? override.coefficientOverride
            : existing.coefficient,
        weeklyHours:
          override.weeklyHoursOverride !== null
            ? override.weeklyHoursOverride
            : existing.weeklyHours,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    );
  }, [classCurriculumSubjects, classSubjectOverrides]);

  const classTeacherBySubject = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const assignment of classAssignments) {
      const fullName = `${assignment.teacherUser.lastName} ${assignment.teacherUser.firstName}`;
      const current = map.get(assignment.subjectId) ?? [];
      if (!current.includes(fullName)) {
        current.push(fullName);
      }
      map.set(assignment.subjectId, current);
    }

    return map;
  }, [classAssignments]);

  const canEditSubjectColors =
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "SCHOOL_ADMIN";

  function getSubjectColor(subjectId: string) {
    return classSubjectColorsById[subjectId] ?? fallbackSubjectColor(subjectId);
  }

  const availableColorsForPicker = useMemo(() => {
    if (!colorPickerSubject) {
      return [] as string[];
    }

    const usedByOtherSubjects = new Set(
      effectiveSubjects
        .filter((row) => row.subjectId !== colorPickerSubject.subjectId)
        .map((row) => getSubjectColor(row.subjectId).toUpperCase()),
    );

    const uniquePalette = Array.from(
      new Set(SUBJECT_COLOR_PICKER_PALETTE.map((color) => color.toUpperCase())),
    );

    return uniquePalette.filter(
      (color) => !usedByOtherSubjects.has(color.toUpperCase()),
    );
  }, [colorPickerSubject, effectiveSubjects, classSubjectColorsById]);

  const allStudentsForAssignment = useMemo(
    () =>
      [...allStudents]
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
          ),
        )
        .map((entry) => ({
          id: entry.id,
          label: `${entry.lastName} ${entry.firstName}`,
        })),
    [allStudents],
  );

  if (loading) {
    return (
      <AppShell schoolSlug={schoolSlug} schoolName="Gestion des classes">
        <Card title="Classes" subtitle="Chargement...">
          <p className="text-sm text-text-secondary">Chargement...</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des classes">
      <div className="grid gap-4">
        <Card
          title="Classes"
          subtitle="Structure des classes basee sur annee scolaire et curriculum"
        >
          <div className="section-tabs mb-4">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`section-tab ${tab === "list" ? "section-tab-active" : ""}`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setTab("details")}
              className={`section-tab ${tab === "details" ? "section-tab-active" : ""}`}
            >
              Voir
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`section-tab ${tab === "assignments" ? "section-tab-active" : ""}`}
            >
              Affectations
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`section-tab ${tab === "help" ? "section-tab-active" : ""}`}
            >
              Aide
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">Ecole</span>
                <select
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selectionner une ecole</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {tab !== "list" && tab !== "help" ? (
            <label className="mb-4 grid gap-1 text-sm md:max-w-[420px]">
              <span className="text-text-secondary">Classe</span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selectionner</option>
                {sortedClasses.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} ({entry.schoolYear.label})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Classes"
              moduleSummary="ce module centralise la liste des classes, leur detail pedagogique et les affectations eleves/enseignants."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ajouter une classe avec annee scolaire et curriculum.",
                  howTo:
                    "dans l'onglet Liste, remplir le formulaire puis valider.",
                  moduleImpact:
                    "la classe devient visible et selectionnable dans les onglets Voir et Affectations.",
                  crossModuleImpact:
                    "les modules inscriptions, enseignants et notes utilisent cette classe.",
                },
                {
                  name: "Voir",
                  purpose: "consulter le detail complet d'une classe.",
                  howTo:
                    "cliquer sur le nom de la classe dans la liste ou selectionner une classe dans l'onglet Voir.",
                  moduleImpact:
                    "affiche niveau, curriculum, matieres, enseignants, eleves et parents lies.",
                  crossModuleImpact:
                    "permet de controler la coherence des donnees avant saisie des notes.",
                },
                {
                  name: "Affecter / Modifier",
                  purpose:
                    "gerer les affectations eleves et enseignants de la classe.",
                  howTo:
                    "utiliser l'onglet Affectations pour ajouter ou mettre a jour les liaisons.",
                  moduleImpact:
                    "les tables d'affectations classe sont synchronisees.",
                  crossModuleImpact:
                    "les droits enseignants et les inscriptions eleves sont alignes pour les autres modules.",
                },
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer ses classes.
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={createClassForm.handleSubmit(onCreateClass)}
              >
                <FormField
                  label="Nom de classe"
                  className="md:col-span-2"
                  error={createClassForm.formState.errors.name?.message}
                >
                  <input
                    aria-label="Nom de classe"
                    value={createClassValues.name ?? ""}
                    onChange={(event) => {
                      createClassForm.setValue("name", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: 6e A"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <FormField
                  label="Annee scolaire"
                  error={createClassForm.formState.errors.schoolYearId?.message}
                >
                  <select
                    aria-label="Annee scolaire"
                    value={createClassValues.schoolYearId ?? ""}
                    onChange={(event) => {
                      createClassForm.setValue(
                        "schoolYearId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {schoolYears.map((schoolYear) => (
                      <option key={schoolYear.id} value={schoolYear.id}>
                        {schoolYear.label}
                        {schoolYear.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Curriculum"
                  error={createClassForm.formState.errors.curriculumId?.message}
                >
                  <select
                    aria-label="Curriculum"
                    value={createClassValues.curriculumId ?? ""}
                    onChange={(event) => {
                      createClassForm.setValue(
                        "curriculumId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucun</option>
                    {curriculums.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="md:col-span-6">
                  <SubmitButton
                    disabled={
                      submittingClass || !createClassForm.formState.isValid
                    }
                  >
                    {submittingClass ? "Creation..." : "Ajouter"}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Classe</th>
                      <th className="px-3 py-2 font-medium">Niveau</th>
                      <th className="px-3 py-2 font-medium">Filiere</th>
                      <th className="px-3 py-2 font-medium">Curriculum</th>
                      <th className="px-3 py-2 font-medium">Annee</th>
                      <th className="px-3 py-2 font-medium">Eleves</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={7}
                        >
                          Chargement...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedClasses.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="font-medium text-primary underline-offset-2 hover:underline"
                                onClick={() => {
                                  setSelectedClassId(entry.id);
                                  setTab("details");
                                }}
                              >
                                {entry.name}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              {entry.academicLevel
                                ? `${entry.academicLevel.code} - ${entry.academicLevel.label}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.track
                                ? `${entry.track.code} - ${entry.track.label}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.curriculum?.name ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {entry._count.enrollments}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditClass(entry)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: entry.id,
                                      label: `${entry.name} (${entry.schoolYear.label})`,
                                    })
                                  }
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingClassId === entry.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={7}>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <FormField
                                    label="Nom de classe"
                                    error={
                                      editClassForm.formState.errors.name
                                        ?.message
                                    }
                                  >
                                    <input
                                      value={editClassValues.name ?? ""}
                                      onChange={(event) =>
                                        editClassForm.setValue(
                                          "name",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </FormField>
                                  <FormField
                                    label="Annee scolaire"
                                    error={
                                      editClassForm.formState.errors
                                        .schoolYearId?.message
                                    }
                                  >
                                    <select
                                      value={editClassValues.schoolYearId ?? ""}
                                      onChange={(event) =>
                                        editClassForm.setValue(
                                          "schoolYearId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">
                                        Selectionner annee
                                      </option>
                                      {schoolYears.map((schoolYear) => (
                                        <option
                                          key={schoolYear.id}
                                          value={schoolYear.id}
                                        >
                                          {schoolYear.label}
                                        </option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <FormField
                                    label="Curriculum"
                                    error={
                                      editClassForm.formState.errors
                                        .curriculumId?.message
                                    }
                                  >
                                    <select
                                      value={editClassValues.curriculumId ?? ""}
                                      onChange={(event) =>
                                        editClassForm.setValue(
                                          "curriculumId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Aucun</option>
                                      {curriculums.map((curriculum) => (
                                        <option
                                          key={curriculum.id}
                                          value={curriculum.id}
                                        >
                                          {curriculum.name}
                                        </option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <div className="flex gap-2 md:col-span-3">
                                    <Button
                                      type="button"
                                      disabled={
                                        savingClass ||
                                        !editClassForm.formState.isValid
                                      }
                                      onClick={() => {
                                        void saveClass(entry.id);
                                      }}
                                    >
                                      {savingClass
                                        ? "Enregistrement..."
                                        : "Enregistrer"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingClassId(null);
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading && !loadingData && sortedClasses.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={7}
                        >
                          Aucune classe trouvee.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !selectedClass ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une classe pour voir ses details et gerer ses
              affectations.
            </p>
          ) : tab === "details" ? (
            <div className="grid gap-4">
              <div className="rounded-card border border-border bg-background p-3 text-sm">
                <p className="font-medium text-text-primary">
                  Informations de la classe
                </p>
                <p className="mt-1 text-text-secondary">
                  Nom: {selectedClass.name}
                </p>
                <p className="mt-1 text-text-secondary">
                  Annee: {selectedClass.schoolYear.label}
                </p>
                <p className="mt-1 text-text-secondary">
                  Niveau:{" "}
                  {selectedClass.academicLevel
                    ? `${selectedClass.academicLevel.code} - ${selectedClass.academicLevel.label}`
                    : "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  Filiere:{" "}
                  {selectedClass.track
                    ? `${selectedClass.track.code} - ${selectedClass.track.label}`
                    : "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  Curriculum: {selectedClass.curriculum?.name ?? "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  Enseignant referent:{" "}
                  {selectedClass.referentTeacher
                    ? `${selectedClass.referentTeacher.lastName} ${selectedClass.referentTeacher.firstName}`
                    : "-"}
                </p>
                {schoolSlug ? (
                  <div className="mt-3">
                    <Link
                      href={`/schools/${schoolSlug}/classes/${selectedClass.id}/fil`}
                      className="inline-flex h-9 items-center rounded-card border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      Ouvrir le fil de classe
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Matieres et enseignants
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">Matiere</th>
                        <th className="px-3 py-2 font-medium">Couleur</th>
                        <th className="px-3 py-2 font-medium">Coefficient</th>
                        <th className="px-3 py-2 font-medium">Heures/sem.</th>
                        <th className="px-3 py-2 font-medium">Enseignant(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingClassDetails ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={5}
                          >
                            Chargement...
                          </td>
                        </tr>
                      ) : effectiveSubjects.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={5}
                          >
                            Aucune matiere definie pour cette classe.
                          </td>
                        </tr>
                      ) : (
                        effectiveSubjects.map((row) => (
                          <tr
                            key={row.subjectId}
                            className="border-b border-border text-text-primary"
                          >
                            <td className="px-3 py-2">{row.subjectName}</td>
                            <td className="px-3 py-2">
                              {canEditSubjectColors ? (
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/80 transition hover:scale-105 hover:border-primary/70"
                                  style={{
                                    backgroundColor: getSubjectColor(
                                      row.subjectId,
                                    ),
                                  }}
                                  onClick={() =>
                                    setColorPickerSubject({
                                      subjectId: row.subjectId,
                                      subjectName: row.subjectName,
                                    })
                                  }
                                  title={`Modifier couleur ${row.subjectName}`}
                                  aria-label={`Modifier couleur ${row.subjectName}`}
                                >
                                  <span className="sr-only">
                                    Modifier couleur
                                  </span>
                                </button>
                              ) : (
                                <span
                                  className="inline-block h-6 w-6 rounded-full border border-border/80"
                                  style={{
                                    backgroundColor: getSubjectColor(
                                      row.subjectId,
                                    ),
                                  }}
                                  aria-hidden="true"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.coefficient ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {row.weeklyHours ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {(classTeacherBySubject.get(row.subjectId) ?? [])
                                .length === 0
                                ? "-"
                                : (
                                    classTeacherBySubject.get(row.subjectId) ??
                                    []
                                  ).join(", ")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Eleves et parents
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">Eleve</th>
                        <th className="px-3 py-2 font-medium">
                          Statut inscription
                        </th>
                        <th className="px-3 py-2 font-medium">Parents lies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingClassDetails ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={3}
                          >
                            Chargement...
                          </td>
                        </tr>
                      ) : classStudents.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={3}
                          >
                            Aucun eleve dans cette classe.
                          </td>
                        </tr>
                      ) : (
                        classStudents.map((student) => {
                          const enrollment =
                            student.enrollments[0] ?? student.currentEnrollment;
                          return (
                            <tr
                              key={student.id}
                              className="border-b border-border text-text-primary"
                            >
                              <td className="px-3 py-2">
                                {student.lastName} {student.firstName}
                              </td>
                              <td className="px-3 py-2">
                                {enrollment?.status ?? "-"}
                              </td>
                              <td className="px-3 py-2">
                                {student.parentLinks.length === 0
                                  ? "-"
                                  : student.parentLinks
                                      .map(
                                        (link) =>
                                          `${link.parent.lastName} ${link.parent.firstName} (${link.parent.email ?? link.parent.phone ?? "-"})`,
                                      )
                                      .join(", ")}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                <FormField
                  label="Enseignant referent de la classe"
                  className="md:col-span-2"
                  error={referentForm.formState.errors.teacherUserId?.message}
                >
                  <select
                    value={referentValues.teacherUserId ?? ""}
                    onChange={(event) =>
                      referentForm.setValue(
                        "teacherUserId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {sortedTeachers.map((teacher) => (
                      <option key={teacher.userId} value={teacher.userId}>
                        {teacher.lastName} {teacher.firstName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="self-end">
                  <Button
                    type="button"
                    disabled={
                      savingClassReferent || !referentForm.formState.isValid
                    }
                    onClick={() => {
                      void referentForm.handleSubmit(
                        updateSelectedClassReferentTeacher,
                      )();
                    }}
                  >
                    {savingClassReferent
                      ? "Affectation..."
                      : "Affecter referent"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                <FormField
                  label="Eleve"
                  error={assignStudentForm.formState.errors.studentId?.message}
                >
                  <select
                    value={assignStudentValues.studentId ?? ""}
                    onChange={(event) =>
                      assignStudentForm.setValue(
                        "studentId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {allStudentsForAssignment.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Statut d'inscription">
                  <select
                    value={assignStudentValues.status ?? "ACTIVE"}
                    onChange={(event) =>
                      assignStudentForm.setValue(
                        "status",
                        event.target.value as
                          | "ACTIVE"
                          | "TRANSFERRED"
                          | "WITHDRAWN"
                          | "GRADUATED",
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                    <option value="GRADUATED">GRADUATED</option>
                  </select>
                </FormField>
                <div className="self-end">
                  <Button
                    type="button"
                    disabled={
                      assigningStudent || !assignStudentForm.formState.isValid
                    }
                    onClick={() => {
                      void assignStudentForm.handleSubmit(
                        assignStudentToSelectedClass,
                      )();
                    }}
                  >
                    {assigningStudent ? "Affectation..." : "Affecter eleve"}
                  </Button>
                </div>
              </div>

              <form
                className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
                onSubmit={createTeacherAssignmentForm.handleSubmit(
                  createTeacherAssignment,
                )}
              >
                <FormField
                  label="Enseignant"
                  error={
                    createTeacherAssignmentForm.formState.errors.teacherUserId
                      ?.message
                  }
                >
                  <select
                    aria-label="Enseignant"
                    value={createTeacherAssignmentValues.teacherUserId ?? ""}
                    onChange={(event) => {
                      createTeacherAssignmentForm.setValue(
                        "teacherUserId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {sortedTeachers.map((teacher) => (
                      <option key={teacher.userId} value={teacher.userId}>
                        {teacher.lastName} {teacher.firstName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Matiere"
                  error={
                    createTeacherAssignmentForm.formState.errors.subjectId
                      ?.message
                  }
                >
                  <select
                    aria-label="Matiere"
                    value={createTeacherAssignmentValues.subjectId ?? ""}
                    onChange={(event) => {
                      createTeacherAssignmentForm.setValue(
                        "subjectId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {(effectiveSubjects.length > 0
                      ? effectiveSubjects.map((entry) => ({
                          id: entry.subjectId,
                          name: entry.subjectName,
                        }))
                      : subjects
                    ).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={
                      submittingTeacherAssignment ||
                      !createTeacherAssignmentForm.formState.isValid
                    }
                  >
                    {submittingTeacherAssignment
                      ? "Affectation..."
                      : "Affecter enseignant"}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Affectations enseignants
                </p>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Annee</th>
                      <th className="px-3 py-2 font-medium">Enseignant</th>
                      <th className="px-3 py-2 font-medium">Matiere</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingClassDetails ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          Chargement...
                        </td>
                      </tr>
                    ) : classAssignments.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          Aucune affectation enseignant.
                        </td>
                      </tr>
                    ) : (
                      classAssignments.map((assignment) => (
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
                              {assignment.subject.name}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => startEditAssignment(assignment)}
                              >
                                Modifier
                              </Button>
                            </td>
                          </tr>
                          {editingAssignmentId === assignment.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={4}>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <FormField
                                    label="Enseignant edition affectation"
                                    error={
                                      editTeacherAssignmentForm.formState.errors
                                        .teacherUserId?.message
                                    }
                                  >
                                    <select
                                      aria-label="Enseignant edition affectation"
                                      value={
                                        editTeacherAssignmentValues.teacherUserId ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        editTeacherAssignmentForm.setValue(
                                          "teacherUserId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {sortedTeachers.map((teacher) => (
                                        <option
                                          key={teacher.userId}
                                          value={teacher.userId}
                                        >
                                          {teacher.lastName} {teacher.firstName}
                                        </option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <FormField
                                    label="Matiere edition affectation"
                                    error={
                                      editTeacherAssignmentForm.formState.errors
                                        .subjectId?.message
                                    }
                                  >
                                    <select
                                      aria-label="Matiere edition affectation"
                                      value={
                                        editTeacherAssignmentValues.subjectId ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        editTeacherAssignmentForm.setValue(
                                          "subjectId",
                                          event.target.value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    >
                                      <option value="">Selectionner</option>
                                      {(effectiveSubjects.length > 0
                                        ? effectiveSubjects.map((entry) => ({
                                            id: entry.subjectId,
                                            name: entry.subjectName,
                                          }))
                                        : subjects
                                      ).map((subject) => (
                                        <option
                                          key={subject.id}
                                          value={subject.id}
                                        >
                                          {subject.name}
                                        </option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <div className="flex items-end gap-2">
                                    <Button
                                      type="button"
                                      disabled={
                                        savingAssignment ||
                                        !editTeacherAssignmentForm.formState
                                          .isValid
                                      }
                                      onClick={() =>
                                        void editTeacherAssignmentForm.handleSubmit(
                                          (values) =>
                                            saveAssignment(
                                              assignment.id,
                                              values,
                                            ),
                                        )()
                                      }
                                    >
                                      {savingAssignment
                                        ? "Enregistrement..."
                                        : "Enregistrer"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingAssignmentId(null);
                                        editTeacherAssignmentForm.reset({
                                          teacherUserId: "",
                                          subjectId: "",
                                        });
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Affectations eleves
                </p>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Eleve</th>
                      <th className="px-3 py-2 font-medium">Parents</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingClassDetails ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          Chargement...
                        </td>
                      </tr>
                    ) : classStudents.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          Aucun eleve affecte.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((student) => {
                        const enrollment =
                          student.enrollments[0] ?? student.currentEnrollment;
                        if (!enrollment) {
                          return null;
                        }

                        return (
                          <tr
                            key={student.id}
                            className="border-b border-border text-text-primary"
                          >
                            <td className="px-3 py-2">
                              {student.lastName} {student.firstName}
                            </td>
                            <td className="px-3 py-2">
                              {student.parentLinks.length === 0
                                ? "-"
                                : student.parentLinks
                                    .map(
                                      (link) =>
                                        `${link.parent.lastName} ${link.parent.firstName}`,
                                    )
                                    .join(", ")}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={
                                  statusDraftByEnrollmentId[enrollment.id] ??
                                  enrollment.status
                                }
                                onChange={(event) =>
                                  setStatusDraftByEnrollmentId((current) => ({
                                    ...current,
                                    [enrollment.id]: event.target.value as
                                      | "ACTIVE"
                                      | "TRANSFERRED"
                                      | "WITHDRAWN"
                                      | "GRADUATED",
                                  }))
                                }
                                className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="TRANSFERRED">TRANSFERRED</option>
                                <option value="WITHDRAWN">WITHDRAWN</option>
                                <option value="GRADUATED">GRADUATED</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={
                                  updatingEnrollmentId === enrollment.id
                                }
                                onClick={() => {
                                  void updateOneEnrollmentStatus(
                                    student.id,
                                    enrollment.id,
                                  );
                                }}
                              >
                                {updatingEnrollmentId === enrollment.id
                                  ? "..."
                                  : "Maj"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
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
        title="Confirmer la suppression"
        message={
          deleteTarget
            ? `Voulez-vous supprimer la classe ${deleteTarget.label} ?`
            : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      {colorPickerSubject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-text-primary/45 backdrop-blur-[1px]"
            onClick={() => {
              if (!savingSubjectColor) {
                setColorPickerSubject(null);
              }
            }}
            aria-label="Fermer le selecteur de couleur"
          />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-soft">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Couleur de {colorPickerSubject.subjectName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choisissez une couleur non deja utilisee dans cette classe.
            </p>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {availableColorsForPicker.length === 0 ? (
                <p className="col-span-7 text-sm text-text-secondary">
                  Aucune couleur libre dans la palette actuelle.
                </p>
              ) : (
                availableColorsForPicker.map((colorHex, index) =>
                  (() => {
                    const isCurrent =
                      getSubjectColor(
                        colorPickerSubject.subjectId,
                      ).toUpperCase() === colorHex.toUpperCase();
                    return (
                      <button
                        key={`${colorPickerSubject.subjectId}-${colorHex}-${index}`}
                        type="button"
                        className={`relative h-8 w-8 rounded-full border transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isCurrent
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border/70 hover:border-primary"
                        }`}
                        style={{ backgroundColor: colorHex }}
                        disabled={savingSubjectColor}
                        onClick={() => {
                          void updateSubjectColor(
                            colorPickerSubject.subjectId,
                            colorHex,
                          );
                        }}
                        title={colorHex}
                        aria-label={`Choisir ${colorHex}`}
                      >
                        {isCurrent ? (
                          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    );
                  })(),
                )
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={savingSubjectColor}
                onClick={() => setColorPickerSubject(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
