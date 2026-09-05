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
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { SearchableSelect } from "../../components/ui/searchable-select";
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
type Tab = "list" | "details" | "students" | "assignments" | "help";

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
  capacity: number | null;
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

const capacityFieldSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^[1-9]\d*$/.test(value), {
    message: "La capacite doit etre un nombre entier positif.",
  });

const createClassroomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  curriculumId: z.string().trim().min(1, "Le curriculum est obligatoire."),
  capacity: capacityFieldSchema,
});

const updateClassroomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la classe est obligatoire."),
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  curriculumId: z.string().trim().optional(),
  capacity: capacityFieldSchema,
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

function optionalCapacity(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
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
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("list");
  const [cardSearch, setCardSearch] = useState("");
  const [cardLevelFilter, setCardLevelFilter] = useState<string | null>(null);
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
      capacity: "",
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
      capacity: "",
    },
  });
  const createClassValues = createClassForm.watch();
  useEffect(() => {
    void createClassForm.trigger();
  }, [createClassForm]);

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
          setError(t("classes.error.noSchoolAdmin"));
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
      setError(t("classes.error.apiDown"));
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
        setError(t("classes.error.loadFailed"));
        return;
      }

      const classesPayload = (await classesResponse.json()) as ClassroomRow[];
      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];
      const curriculumsPayload =
        (await curriculumsResponse.json()) as CurriculumRow[];
      const teachersPayload = (await teachersResponse.json()) as TeacherRow[];
      const subjectsPayload = (await subjectsResponse.json()) as SubjectRow[];
      const studentsPayload = (await studentsResponse.json()) as {
        students: StudentRow[];
      };

      setClassrooms(classesPayload);
      setSchoolYears(schoolYearsPayload);
      setCurriculums(curriculumsPayload);
      setTeachers(teachersPayload);
      setSubjects(subjectsPayload);
      setAllStudents(studentsPayload.students);

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
      setError(t("classes.error.network"));
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
        limit: "100",
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
        setError(t("classes.error.loadDetailFailed"));
        return;
      }

      const assignmentsPayload =
        (await assignmentsResponse.json()) as AssignmentRow[];
      const studentsPayload = (
        (await studentsResponse.json()) as { students: StudentRow[] }
      ).students;
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
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
          capacity: optionalCapacity(values.capacity ?? ""),
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
        capacity: "",
      });
      setSuccess(t("classes.success.created"));
      await loadData(schoolSlug);
    } catch {
      setError(t("classes.error.network"));
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
      capacity: entry.capacity != null ? String(entry.capacity) : "",
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
      setError(t("classes.error.csrf"));
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
            capacity: optionalCapacity(values.capacity ?? ""),
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
      setSuccess(t("classes.success.edited"));
      await loadData(schoolSlug);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
      setSuccess(t("classes.success.deleted"));
      await loadData(schoolSlug);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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

      setSuccess(t("classes.success.teacherAssigned"));
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
      setSuccess(t("classes.success.teacherAssignmentEdited"));
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
            : (payload?.message ?? t("classes.error.studentAssignFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("classes.success.studentAssigned"));
      await Promise.all([
        loadData(schoolSlug),
        loadClassDetails(schoolSlug, selectedClass),
      ]);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
            : (payload?.message ?? t("classes.error.referentAssignFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("classes.success.referentAssigned"));
      await loadData(schoolSlug);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
            : (payload?.message ?? t("classes.error.updateFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("classes.success.enrollmentUpdated"));
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError(t("classes.error.network"));
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
      setError(t("classes.error.csrf"));
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
            : (payload?.message ?? t("classes.error.colorUpdateFailed"));
        setError(String(message));
        return;
      }

      setClassSubjectColorsById((current) => ({
        ...current,
        [subjectId]: colorHex.toUpperCase(),
      }));
      setSuccess(t("classes.success.colorUpdated"));
      setColorPickerSubject(null);
    } catch {
      setError(t("classes.error.network"));
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

  const cardLevelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of sortedClasses) {
      if (entry.academicLevel && !seen.has(entry.academicLevel.id)) {
        seen.set(
          entry.academicLevel.id,
          `${entry.academicLevel.code} - ${entry.academicLevel.label}`,
        );
      }
    }
    return Array.from(seen, ([id, label]) => ({ id, label }));
  }, [sortedClasses]);

  const cardGroups = useMemo(() => {
    const needle = cardSearch.trim().toLowerCase();
    const filtered = sortedClasses.filter((entry) => {
      if (needle && !entry.name.toLowerCase().includes(needle)) {
        return false;
      }
      if (cardLevelFilter && entry.academicLevel?.id !== cardLevelFilter) {
        return false;
      }
      return true;
    });

    const groups = new Map<
      string,
      { id: string; label: string; items: ClassroomRow[] }
    >();
    for (const entry of filtered) {
      const key = entry.academicLevel?.id ?? "__none__";
      const label = entry.academicLevel
        ? `${entry.academicLevel.code} - ${entry.academicLevel.label}`
        : t("classes.list.noLevel");
      if (!groups.has(key)) groups.set(key, { id: key, label, items: [] });
      groups.get(key)!.items.push(entry);
    }
    return Array.from(groups.values());
  }, [sortedClasses, cardSearch, cardLevelFilter, t]);

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
      <AppShell schoolSlug={schoolSlug} schoolName={t("classes.shellName")}>
        <Card title={t("classes.title")} subtitle={t("common.loading")}>
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("classes.shellName")}>
      <div className="grid gap-4">
        <Card title={t("classes.title")} subtitle={t("classes.subtitle")}>
          <div className="section-tabs mb-4">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`section-tab ${tab === "list" ? "section-tab-active" : ""}`}
            >
              {t("classes.tab.list")}
            </button>
            <button
              type="button"
              onClick={() => setTab("details")}
              className={`section-tab ${tab === "details" ? "section-tab-active" : ""}`}
            >
              {t("classes.tab.details")}
            </button>
            <button
              type="button"
              onClick={() => setTab("students")}
              className={`section-tab ${tab === "students" ? "section-tab-active" : ""}`}
            >
              {t("classes.tab.students")}
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`section-tab ${tab === "assignments" ? "section-tab-active" : ""}`}
            >
              {t("classes.tab.assignments")}
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`section-tab ${tab === "help" ? "section-tab-active" : ""}`}
            >
              {t("classes.tab.help")}
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("classes.schoolLabel")}
                </span>
                <SearchableSelect
                  options={schools.map((school) => ({
                    value: school.slug,
                    label: school.name,
                  }))}
                  value={schoolSlug ?? ""}
                  onChange={(value) => setSchoolSlug(value || null)}
                  placeholder={t("classes.schoolPlaceholder")}
                  searchPlaceholder={t("settings.form.searchPlaceholder")}
                  noResultsLabel={t("settings.form.noResults")}
                  ariaLabel={t("classes.schoolLabel")}
                  data-testid="classes-school-select"
                />
              </label>
            ) : null}
          </div>

          {tab !== "list" && tab !== "help" ? (
            <label className="mb-4 grid gap-1 text-sm md:max-w-[420px]">
              <span className="text-text-secondary">
                {t("classes.classLabel")}
              </span>
              <SearchableSelect
                options={sortedClasses.map((entry) => ({
                  value: entry.id,
                  label: `${entry.name} (${entry.schoolYear.label})`,
                }))}
                value={selectedClassId}
                onChange={setSelectedClassId}
                placeholder={t("common.select")}
                searchPlaceholder={t("settings.form.searchPlaceholder")}
                noResultsLabel={t("settings.form.noResults")}
                ariaLabel={t("classes.classLabel")}
                data-testid="classes-selected-class-select"
              />
            </label>
          ) : null}

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName={t("classes.help.moduleName")}
              moduleSummary={t("classes.help.moduleSummary")}
              actions={[
                {
                  name: t("classes.help.action1.name"),
                  purpose: t("classes.help.action1.purpose"),
                  howTo: t("classes.help.action1.howTo"),
                  moduleImpact: t("classes.help.action1.moduleImpact"),
                  crossModuleImpact: t(
                    "classes.help.action1.crossModuleImpact",
                  ),
                },
                {
                  name: t("classes.help.action2.name"),
                  purpose: t("classes.help.action2.purpose"),
                  howTo: t("classes.help.action2.howTo"),
                  moduleImpact: t("classes.help.action2.moduleImpact"),
                  crossModuleImpact: t(
                    "classes.help.action2.crossModuleImpact",
                  ),
                },
                {
                  name: t("classes.help.action3.name"),
                  purpose: t("classes.help.action3.purpose"),
                  howTo: t("classes.help.action3.howTo"),
                  moduleImpact: t("classes.help.action3.moduleImpact"),
                  crossModuleImpact: t(
                    "classes.help.action3.crossModuleImpact",
                  ),
                },
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              {t("classes.noSchool")}
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={createClassForm.handleSubmit(onCreateClass)}
              >
                <FormField
                  label={t("classes.list.nameLabel")}
                  className="md:col-span-2"
                  error={createClassForm.formState.errors.name?.message}
                >
                  <FormTextInput
                    aria-label={t("classes.list.nameLabel")}
                    {...createClassForm.register("name")}
                    placeholder={t("classes.list.namePlaceholder")}
                    invalid={
                      Boolean(createClassForm.formState.errors.name) ||
                      !String(createClassValues.name ?? "").trim()
                    }
                  />
                </FormField>

                <FormField
                  label={t("classes.list.yearLabel")}
                  error={createClassForm.formState.errors.schoolYearId?.message}
                >
                  <SearchableSelect
                    ariaLabel={t("classes.list.yearLabel")}
                    value={createClassValues.schoolYearId ?? ""}
                    onChange={(value) => {
                      createClassForm.setValue("schoolYearId", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    invalid={Boolean(
                      createClassForm.formState.errors.schoolYearId,
                    )}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-create-schoolyear-select"
                    options={schoolYears.map((schoolYear) => ({
                      value: schoolYear.id,
                      label: `${schoolYear.label}${schoolYear.isActive ? " (active)" : ""}`,
                    }))}
                  />
                </FormField>

                <FormField
                  label={t("classes.list.curriculumLabel")}
                  error={createClassForm.formState.errors.curriculumId?.message}
                >
                  <SearchableSelect
                    ariaLabel={t("classes.list.curriculumLabel")}
                    value={createClassValues.curriculumId ?? ""}
                    onChange={(value) => {
                      createClassForm.setValue("curriculumId", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    invalid={
                      Boolean(createClassForm.formState.errors.curriculumId) ||
                      !(createClassValues.curriculumId ?? "")
                    }
                    placeholder={t("classes.list.curriculumNone")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-create-curriculum-select"
                    options={[
                      { value: "", label: t("classes.list.curriculumNone") },
                      ...curriculums.map((entry) => ({
                        value: entry.id,
                        label: entry.name,
                      })),
                    ]}
                  />
                </FormField>

                <FormField
                  label={t("classes.list.capacityLabel")}
                  error={createClassForm.formState.errors.capacity?.message}
                >
                  <FormTextInput
                    aria-label={t("classes.list.capacityLabel")}
                    inputMode="numeric"
                    {...createClassForm.register("capacity")}
                    placeholder={t("classes.list.capacityPlaceholder")}
                    invalid={Boolean(createClassForm.formState.errors.capacity)}
                  />
                </FormField>

                <div className="md:col-span-6">
                  <FormSubmitHint
                    visible={!createClassForm.formState.isValid}
                  />
                  <SubmitButton
                    disabled={
                      submittingClass || !createClassForm.formState.isValid
                    }
                  >
                    {submittingClass
                      ? t("classes.list.creating")
                      : t("classes.list.add")}
                  </SubmitButton>
                </div>
              </form>

              <div
                className="grid gap-3 md:hidden"
                data-testid="classes-list-cards"
              >
                <div className="flex items-center gap-2">
                  <FormTextInput
                    aria-label={t("classes.list.searchLabel")}
                    value={cardSearch}
                    onChange={(event) => setCardSearch(event.target.value)}
                    placeholder={t("classes.list.searchPlaceholder")}
                    className="flex-1"
                  />
                </div>

                {cardLevelOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCardLevelFilter(null)}
                      className={`rounded-card border px-3 py-1.5 text-xs font-semibold transition ${
                        cardLevelFilter === null
                          ? "border-primary bg-primary text-surface"
                          : "border-border bg-background text-text-secondary"
                      }`}
                    >
                      {t("classes.list.allLevels")}
                    </button>
                    {cardLevelOptions.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setCardLevelFilter(level.id)}
                        className={`rounded-card border px-3 py-1.5 text-xs font-semibold transition ${
                          cardLevelFilter === level.id
                            ? "border-primary bg-primary text-surface"
                            : "border-border bg-background text-text-secondary"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {loading || loadingData ? (
                  <p className="text-sm text-text-secondary">
                    {t("common.loading")}
                  </p>
                ) : cardGroups.length === 0 ? (
                  <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">
                    {t("classes.list.empty")}
                  </p>
                ) : (
                  cardGroups.map((group) => (
                    <div key={group.id} className="grid gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                              setSelectedClassId(entry.id);
                              setTab("details");
                            }}
                            className="rounded-card border border-border bg-surface p-3 text-left transition hover:border-primary/60"
                          >
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {entry.name}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {entry.capacity != null
                                ? `${entry._count.enrollments} / ${entry.capacity}`
                                : entry._count.enrollments}{" "}
                              {t("classes.students.hero.studentsSuffix")}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-text-secondary">
                              {entry.referentTeacher
                                ? `${entry.referentTeacher.lastName} ${entry.referentTeacher.firstName}`
                                : t("classes.students.hero.noReferent")}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colClass")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colLevel")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colTrack")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colCurriculum")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colYear")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.list.colStudents")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("classes.list.colActions")}
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
                          {t("common.loading")}
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
                              {entry.capacity != null
                                ? `${entry._count.enrollments} / ${entry.capacity}`
                                : entry._count.enrollments}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditClass(entry)}
                                >
                                  {t("common.edit")}
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
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingClassId === entry.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={7}>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <FormField
                                    label={t("classes.list.nameLabel")}
                                    error={
                                      editClassForm.formState.errors.name
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      invalid={
                                        !!editClassForm.formState.errors.name
                                      }
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
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("classes.list.yearLabel")}
                                    error={
                                      editClassForm.formState.errors
                                        .schoolYearId?.message
                                    }
                                  >
                                    <SearchableSelect
                                      ariaLabel={t("classes.list.yearLabel")}
                                      invalid={
                                        !!editClassForm.formState.errors
                                          .schoolYearId
                                      }
                                      value={editClassValues.schoolYearId ?? ""}
                                      onChange={(value) =>
                                        editClassForm.setValue(
                                          "schoolYearId",
                                          value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      placeholder={t("common.select")}
                                      searchPlaceholder={t(
                                        "settings.form.searchPlaceholder",
                                      )}
                                      noResultsLabel={t(
                                        "settings.form.noResults",
                                      )}
                                      data-testid="classes-edit-schoolyear-select"
                                      options={schoolYears.map(
                                        (schoolYear) => ({
                                          value: schoolYear.id,
                                          label: schoolYear.label,
                                        }),
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("classes.list.curriculumLabel")}
                                    error={
                                      editClassForm.formState.errors
                                        .curriculumId?.message
                                    }
                                  >
                                    <SearchableSelect
                                      ariaLabel={t(
                                        "classes.list.curriculumLabel",
                                      )}
                                      invalid={
                                        !!editClassForm.formState.errors
                                          .curriculumId
                                      }
                                      value={editClassValues.curriculumId ?? ""}
                                      onChange={(value) =>
                                        editClassForm.setValue(
                                          "curriculumId",
                                          value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      placeholder={t(
                                        "classes.list.curriculumNone",
                                      )}
                                      searchPlaceholder={t(
                                        "settings.form.searchPlaceholder",
                                      )}
                                      noResultsLabel={t(
                                        "settings.form.noResults",
                                      )}
                                      data-testid="classes-edit-curriculum-select"
                                      options={[
                                        {
                                          value: "",
                                          label: t(
                                            "classes.list.curriculumNone",
                                          ),
                                        },
                                        ...curriculums.map((curriculum) => ({
                                          value: curriculum.id,
                                          label: curriculum.name,
                                        })),
                                      ]}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("classes.list.capacityLabel")}
                                    error={
                                      editClassForm.formState.errors.capacity
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      inputMode="numeric"
                                      {...editClassForm.register("capacity")}
                                      placeholder={t(
                                        "classes.list.capacityPlaceholder",
                                      )}
                                      invalid={Boolean(
                                        editClassForm.formState.errors.capacity,
                                      )}
                                    />
                                  </FormField>
                                  <div className="flex gap-2 md:col-span-3">
                                    <FormSubmitHint
                                      visible={!editClassForm.formState.isValid}
                                    />
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
                                        ? t("classes.list.saving")
                                        : t("common.save")}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingClassId(null);
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

                    {!loading && !loadingData && sortedClasses.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={7}
                        >
                          {t("classes.list.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !selectedClass ? (
            <p className="text-sm text-text-secondary">
              {t("classes.noClass")}
            </p>
          ) : tab === "details" ? (
            <div className="grid gap-4">
              <div className="rounded-card border border-border bg-background p-3 text-sm">
                <p className="font-medium text-text-primary">
                  {t("classes.details.info")}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.name")}: {selectedClass.name}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.year")}: {selectedClass.schoolYear.label}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.level")}:{" "}
                  {selectedClass.academicLevel
                    ? `${selectedClass.academicLevel.code} - ${selectedClass.academicLevel.label}`
                    : "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.track")}:{" "}
                  {selectedClass.track
                    ? `${selectedClass.track.code} - ${selectedClass.track.label}`
                    : "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.curriculum")}:{" "}
                  {selectedClass.curriculum?.name ?? "-"}
                </p>
                <p className="mt-1 text-text-secondary">
                  {t("classes.details.referent")}:{" "}
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
                      {t("classes.details.openFeed")}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  {t("classes.details.subjectsTeachers")}
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("classes.details.colSubject")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("classes.details.colColor")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("classes.details.colCoefficient")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("classes.details.colWeeklyHours")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("classes.details.colTeachers")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingClassDetails ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={5}
                          >
                            {t("common.loading")}
                          </td>
                        </tr>
                      ) : effectiveSubjects.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={5}
                          >
                            {t("classes.details.noSubjects")}
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
                                  title={t(
                                    "classes.details.editColorTitle",
                                  ).replace("{name}", row.subjectName)}
                                  aria-label={t(
                                    "classes.details.editColorTitle",
                                  ).replace("{name}", row.subjectName)}
                                >
                                  <span className="sr-only">
                                    {t("classes.details.editColor")}
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
            </div>
          ) : tab === "students" ? (
            <div className="grid gap-4">
              <div
                className="rounded-card border border-primary/30 bg-primary/5 p-4"
                data-testid="class-students-hero"
              >
                <p className="font-heading text-lg font-semibold text-text-primary">
                  {selectedClass.name}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {selectedClass.referentTeacher
                    ? `${selectedClass.referentTeacher.lastName} ${selectedClass.referentTeacher.firstName}`
                    : t("classes.students.hero.noReferent")}
                </p>
                <p className="mt-1 text-sm font-medium text-primary">
                  {selectedClass.capacity != null
                    ? `${selectedClass._count.enrollments} / ${selectedClass.capacity}`
                    : selectedClass._count.enrollments}{" "}
                  {t("classes.students.hero.studentsSuffix")}
                </p>
              </div>

              <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                <FormField
                  label={t("classes.assignments.referentLabel")}
                  className="md:col-span-2"
                  error={referentForm.formState.errors.teacherUserId?.message}
                >
                  <SearchableSelect
                    ariaLabel={t("classes.assignments.referentLabel")}
                    invalid={!!referentForm.formState.errors.teacherUserId}
                    value={referentValues.teacherUserId ?? ""}
                    onChange={(value) =>
                      referentForm.setValue("teacherUserId", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    placeholder={t("common.select")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-referent-teacher-select"
                    options={sortedTeachers.map((teacher) => ({
                      value: teacher.userId,
                      label: `${teacher.lastName} ${teacher.firstName}`,
                    }))}
                  />
                </FormField>
                <div className="self-end">
                  <FormSubmitHint visible={!referentForm.formState.isValid} />
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
                      ? t("classes.assignments.assigning")
                      : t("classes.assignments.assignReferent")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                <FormField
                  label={t("classes.assignments.studentLabel")}
                  error={assignStudentForm.formState.errors.studentId?.message}
                >
                  <SearchableSelect
                    ariaLabel={t("classes.assignments.studentLabel")}
                    invalid={!!assignStudentForm.formState.errors.studentId}
                    value={assignStudentValues.studentId ?? ""}
                    onChange={(value) =>
                      assignStudentForm.setValue("studentId", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    placeholder={t("common.select")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-assign-student-select"
                    options={allStudentsForAssignment.map((student) => ({
                      value: student.id,
                      label: student.label,
                    }))}
                  />
                </FormField>
                <FormField
                  label={t("classes.assignments.enrollmentStatusLabel")}
                >
                  <SearchableSelect
                    ariaLabel={t("classes.assignments.enrollmentStatusLabel")}
                    value={assignStudentValues.status ?? "ACTIVE"}
                    onChange={(value) =>
                      assignStudentForm.setValue(
                        "status",
                        value as
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
                    data-testid="classes-assign-status-select"
                    options={[
                      { value: "ACTIVE", label: "ACTIVE" },
                      { value: "TRANSFERRED", label: "TRANSFERRED" },
                      { value: "WITHDRAWN", label: "WITHDRAWN" },
                      { value: "GRADUATED", label: "GRADUATED" },
                    ]}
                  />
                </FormField>
                <div className="self-end">
                  <FormSubmitHint
                    visible={!assignStudentForm.formState.isValid}
                  />
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
                    {assigningStudent
                      ? t("classes.assignments.assigning")
                      : t("classes.assignments.assignStudent")}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  {t("classes.assignments.studentAssignments")}
                </p>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("classes.details.colStudent")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.details.colParents")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.assignments.colStatus")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("classes.assignments.colAction")}
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
                          {t("common.loading")}
                        </td>
                      </tr>
                    ) : classStudents.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          {t("classes.assignments.noStudents")}
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
                              <SearchableSelect
                                ariaLabel={t("classes.assignments.colStatus")}
                                value={
                                  statusDraftByEnrollmentId[enrollment.id] ??
                                  enrollment.status
                                }
                                onChange={(value) =>
                                  setStatusDraftByEnrollmentId((current) => ({
                                    ...current,
                                    [enrollment.id]: value as
                                      | "ACTIVE"
                                      | "TRANSFERRED"
                                      | "WITHDRAWN"
                                      | "GRADUATED",
                                  }))
                                }
                                data-testid={`classes-enrollment-status-select-${enrollment.id}`}
                                options={[
                                  { value: "ACTIVE", label: "ACTIVE" },
                                  {
                                    value: "TRANSFERRED",
                                    label: "TRANSFERRED",
                                  },
                                  { value: "WITHDRAWN", label: "WITHDRAWN" },
                                  { value: "GRADUATED", label: "GRADUATED" },
                                ]}
                              />
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
                                  : t("classes.assignments.updateStatus")}
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
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
                onSubmit={createTeacherAssignmentForm.handleSubmit(
                  createTeacherAssignment,
                )}
              >
                <FormField
                  label={t("classes.assignments.teacherLabel")}
                  error={
                    createTeacherAssignmentForm.formState.errors.teacherUserId
                      ?.message
                  }
                >
                  <SearchableSelect
                    ariaLabel={t("classes.assignments.teacherLabel")}
                    invalid={
                      !!createTeacherAssignmentForm.formState.errors
                        .teacherUserId
                    }
                    value={createTeacherAssignmentValues.teacherUserId ?? ""}
                    onChange={(value) => {
                      createTeacherAssignmentForm.setValue(
                        "teacherUserId",
                        value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-create-teacher-assignment-teacher-select"
                    options={sortedTeachers.map((teacher) => ({
                      value: teacher.userId,
                      label: `${teacher.lastName} ${teacher.firstName}`,
                    }))}
                  />
                </FormField>
                <FormField
                  label={t("classes.assignments.subjectLabel")}
                  error={
                    createTeacherAssignmentForm.formState.errors.subjectId
                      ?.message
                  }
                >
                  <SearchableSelect
                    ariaLabel={t("classes.assignments.subjectLabel")}
                    invalid={
                      !!createTeacherAssignmentForm.formState.errors.subjectId
                    }
                    value={createTeacherAssignmentValues.subjectId ?? ""}
                    onChange={(value) => {
                      createTeacherAssignmentForm.setValue("subjectId", value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="classes-create-teacher-assignment-subject-select"
                    options={(effectiveSubjects.length > 0
                      ? effectiveSubjects.map((entry) => ({
                          id: entry.subjectId,
                          name: entry.subjectName,
                        }))
                      : subjects
                    ).map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    }))}
                  />
                </FormField>
                <div className="self-end">
                  <FormSubmitHint
                    visible={!createTeacherAssignmentForm.formState.isValid}
                  />
                  <SubmitButton
                    disabled={
                      submittingTeacherAssignment ||
                      !createTeacherAssignmentForm.formState.isValid
                    }
                  >
                    {submittingTeacherAssignment
                      ? t("classes.assignments.assigning")
                      : t("classes.assignments.assignTeacher")}
                  </SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto rounded-card border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium text-text-primary">
                  {t("classes.assignments.teacherAssignments")}
                </p>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("classes.assignments.colYear")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.assignments.colTeacher")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("classes.assignments.colSubject")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("classes.assignments.colAction")}
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
                          {t("common.loading")}
                        </td>
                      </tr>
                    ) : classAssignments.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          {t("classes.assignments.noTeacherAssignments")}
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
                                {t("common.edit")}
                              </Button>
                            </td>
                          </tr>
                          {editingAssignmentId === assignment.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={4}>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <FormField
                                    label={t(
                                      "classes.assignments.teacherLabel",
                                    )}
                                    error={
                                      editTeacherAssignmentForm.formState.errors
                                        .teacherUserId?.message
                                    }
                                  >
                                    <SearchableSelect
                                      ariaLabel={t(
                                        "classes.assignments.teacherLabel",
                                      )}
                                      invalid={
                                        !!editTeacherAssignmentForm.formState
                                          .errors.teacherUserId
                                      }
                                      value={
                                        editTeacherAssignmentValues.teacherUserId ??
                                        ""
                                      }
                                      onChange={(value) =>
                                        editTeacherAssignmentForm.setValue(
                                          "teacherUserId",
                                          value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      placeholder={t("common.select")}
                                      searchPlaceholder={t(
                                        "settings.form.searchPlaceholder",
                                      )}
                                      noResultsLabel={t(
                                        "settings.form.noResults",
                                      )}
                                      data-testid="classes-edit-teacher-assignment-teacher-select"
                                      options={sortedTeachers.map(
                                        (teacher) => ({
                                          value: teacher.userId,
                                          label: `${teacher.lastName} ${teacher.firstName}`,
                                        }),
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t(
                                      "classes.assignments.subjectLabel",
                                    )}
                                    error={
                                      editTeacherAssignmentForm.formState.errors
                                        .subjectId?.message
                                    }
                                  >
                                    <SearchableSelect
                                      ariaLabel={t(
                                        "classes.assignments.subjectLabel",
                                      )}
                                      invalid={
                                        !!editTeacherAssignmentForm.formState
                                          .errors.subjectId
                                      }
                                      value={
                                        editTeacherAssignmentValues.subjectId ??
                                        ""
                                      }
                                      onChange={(value) =>
                                        editTeacherAssignmentForm.setValue(
                                          "subjectId",
                                          value,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      placeholder={t("common.select")}
                                      searchPlaceholder={t(
                                        "settings.form.searchPlaceholder",
                                      )}
                                      noResultsLabel={t(
                                        "settings.form.noResults",
                                      )}
                                      data-testid="classes-edit-teacher-assignment-subject-select"
                                      options={(effectiveSubjects.length > 0
                                        ? effectiveSubjects.map((entry) => ({
                                            id: entry.subjectId,
                                            name: entry.subjectName,
                                          }))
                                        : subjects
                                      ).map((subject) => ({
                                        value: subject.id,
                                        label: subject.name,
                                      }))}
                                    />
                                  </FormField>
                                  <div className="flex items-end gap-2">
                                    <FormSubmitHint
                                      visible={
                                        !editTeacherAssignmentForm.formState
                                          .isValid
                                      }
                                    />
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
                                        ? t("classes.list.saving")
                                        : t("common.save")}
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
                                      {t("common.cancel")}
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
        title={t("classes.delete.title")}
        message={
          deleteTarget
            ? t("classes.delete.message").replace("{label}", deleteTarget.label)
            : ""
        }
        confirmLabel={t("classes.delete.confirm")}
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
            aria-label={t("classes.colorPicker.closeAria")}
          />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-soft">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              {t("classes.colorPicker.title").replace(
                "{name}",
                colorPickerSubject.subjectName,
              )}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("classes.colorPicker.hint")}
            </p>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {availableColorsForPicker.length === 0 ? (
                <p className="col-span-7 text-sm text-text-secondary">
                  {t("classes.colorPicker.noColors")}
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
                        aria-label={t("classes.colorPicker.chooseAria").replace(
                          "{color}",
                          colorHex,
                        )}
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
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
