"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
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
      email: string;
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

function optionalId(value: string) {
  return value.trim() === "" ? undefined : value;
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

  const [className, setClassName] = useState("");
  const [classSchoolYearId, setClassSchoolYearId] = useState("");
  const [classCurriculumId, setClassCurriculumId] = useState("");

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassSchoolYearId, setEditClassSchoolYearId] = useState("");
  const [editClassCurriculumId, setEditClassCurriculumId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [submittingClass, setSubmittingClass] = useState(false);

  const [assignmentTeacherUserId, setAssignmentTeacherUserId] = useState("");
  const [assignmentSubjectId, setAssignmentSubjectId] = useState("");
  const [submittingTeacherAssignment, setSubmittingTeacherAssignment] =
    useState(false);

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );
  const [editAssignmentTeacherUserId, setEditAssignmentTeacherUserId] =
    useState("");
  const [editAssignmentSubjectId, setEditAssignmentSubjectId] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignStudentStatus, setAssignStudentStatus] = useState<
    "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
  >("ACTIVE");
  const [assigningStudent, setAssigningStudent] = useState(false);

  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      return;
    }

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

      if (!classSchoolYearId && schoolYearsPayload.length > 0) {
        setClassSchoolYearId(
          schoolYearsPayload.find((schoolYear) => schoolYear.isActive)?.id ??
            schoolYearsPayload[0].id,
        );
      }

      if (!assignmentTeacherUserId && teachersPayload.length > 0) {
        setAssignmentTeacherUserId(teachersPayload[0].userId);
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

      setClassAssignments(assignmentsPayload);
      setClassStudents(studentsPayload);
      setClassSubjectOverrides(overridesPayload);
      setClassCurriculumSubjects(curriculumSubjectsPayload);

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

      if (!assignStudentId && studentsPayload.length > 0) {
        setAssignStudentId(studentsPayload[0].id);
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingClassDetails(false);
    }
  }

  async function onCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!schoolSlug) {
      return;
    }

    const parsed = createClassroomSchema.safeParse({
      name: className,
      schoolYearId: classSchoolYearId,
      curriculumId: classCurriculumId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
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
          ...parsed.data,
          curriculumId: optionalId(parsed.data.curriculumId ?? ""),
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

      setClassName("");
      setClassCurriculumId("");
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
    setEditClassName(entry.name);
    setEditClassSchoolYearId(entry.schoolYear.id);
    setEditClassCurriculumId(entry.curriculum?.id ?? "");
  }

  async function saveClass(classId: string) {
    if (!schoolSlug) {
      return;
    }
    setError(null);
    const parsed = updateClassroomSchema.safeParse({
      name: editClassName,
      schoolYearId: editClassSchoolYearId,
      curriculumId: editClassCurriculumId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

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
            ...parsed.data,
            curriculumId: optionalId(parsed.data.curriculumId ?? ""),
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

  async function createTeacherAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolSlug || !selectedClass) {
      return;
    }

    setError(null);
    setSuccess(null);

    const parsed = createTeacherAssignmentSchema.safeParse({
      teacherUserId: assignmentTeacherUserId,
      subjectId: assignmentSubjectId,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

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
            teacherUserId: parsed.data.teacherUserId,
            subjectId: parsed.data.subjectId,
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
    setEditAssignmentTeacherUserId(assignment.teacherUserId);
    setEditAssignmentSubjectId(assignment.subjectId);
  }

  async function saveAssignment(assignmentId: string) {
    if (!schoolSlug || !selectedClass) {
      return;
    }

    const parsed = createTeacherAssignmentSchema.safeParse({
      teacherUserId: editAssignmentTeacherUserId,
      subjectId: editAssignmentSubjectId,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
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
            teacherUserId: parsed.data.teacherUserId,
            subjectId: parsed.data.subjectId,
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
      setSuccess("Affectation enseignant modifiee.");
      await loadClassDetails(schoolSlug, selectedClass);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function assignStudentToSelectedClass() {
    if (!schoolSlug || !selectedClass || !assignStudentId) {
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
        buildAdminPath(schoolSlug, `students/${assignStudentId}/enrollments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId: selectedClass.id,
            status: assignStudentStatus,
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
              Liste
            </button>
            <button
              type="button"
              onClick={() => setTab("details")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "details"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Voir
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
              Affectations
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
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
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
                onSubmit={onCreateClass}
              >
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="text-text-secondary">Nom de classe</span>
                  <input
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    placeholder="Ex: 6e A"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={classSchoolYearId}
                    onChange={(event) =>
                      setClassSchoolYearId(event.target.value)
                    }
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
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Curriculum</span>
                  <select
                    value={classCurriculumId}
                    onChange={(event) =>
                      setClassCurriculumId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucun</option>
                    {curriculums.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-6">
                  <Button type="submit" disabled={submittingClass}>
                    {submittingClass ? "Creation..." : "Ajouter"}
                  </Button>
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
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Nom de classe
                                    </span>
                                    <input
                                      value={editClassName}
                                      onChange={(event) =>
                                        setEditClassName(event.target.value)
                                      }
                                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Annee scolaire
                                    </span>
                                    <select
                                      value={editClassSchoolYearId}
                                      onChange={(event) =>
                                        setEditClassSchoolYearId(
                                          event.target.value,
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
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Curriculum
                                    </span>
                                    <select
                                      value={editClassCurriculumId}
                                      onChange={(event) =>
                                        setEditClassCurriculumId(
                                          event.target.value,
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
                                  </label>
                                  <div className="flex gap-2 md:col-span-3">
                                    <Button
                                      type="button"
                                      disabled={savingClass}
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
                            colSpan={4}
                          >
                            Chargement...
                          </td>
                        </tr>
                      ) : effectiveSubjects.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={4}
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
                                          `${link.parent.lastName} ${link.parent.firstName} (${link.parent.email})`,
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
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Eleve</span>
                  <select
                    value={assignStudentId}
                    onChange={(event) => setAssignStudentId(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {allStudentsForAssignment.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Statut d'inscription
                  </span>
                  <select
                    value={assignStudentStatus}
                    onChange={(event) =>
                      setAssignStudentStatus(
                        event.target.value as
                          | "ACTIVE"
                          | "TRANSFERRED"
                          | "WITHDRAWN"
                          | "GRADUATED",
                      )
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRANSFERRED">TRANSFERRED</option>
                    <option value="WITHDRAWN">WITHDRAWN</option>
                    <option value="GRADUATED">GRADUATED</option>
                  </select>
                </label>
                <div className="self-end">
                  <Button
                    type="button"
                    disabled={assigningStudent || !assignStudentId}
                    onClick={() => {
                      void assignStudentToSelectedClass();
                    }}
                  >
                    {assigningStudent ? "Affectation..." : "Affecter eleve"}
                  </Button>
                </div>
              </div>

              <form
                className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3"
                onSubmit={createTeacherAssignment}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Enseignant</span>
                  <select
                    value={assignmentTeacherUserId}
                    onChange={(event) =>
                      setAssignmentTeacherUserId(event.target.value)
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
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Matiere</span>
                  <select
                    value={assignmentSubjectId}
                    onChange={(event) =>
                      setAssignmentSubjectId(event.target.value)
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
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submittingTeacherAssignment}>
                    {submittingTeacherAssignment
                      ? "Affectation..."
                      : "Affecter enseignant"}
                  </Button>
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
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Enseignant
                                    </span>
                                    <select
                                      value={editAssignmentTeacherUserId}
                                      onChange={(event) =>
                                        setEditAssignmentTeacherUserId(
                                          event.target.value,
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
                                  </label>
                                  <label className="grid gap-1 text-sm">
                                    <span className="text-text-secondary">
                                      Matiere
                                    </span>
                                    <select
                                      value={editAssignmentSubjectId}
                                      onChange={(event) =>
                                        setEditAssignmentSubjectId(
                                          event.target.value,
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
                                  </label>
                                  <div className="flex items-end gap-2">
                                    <Button
                                      type="button"
                                      disabled={savingAssignment}
                                      onClick={() => {
                                        void saveAssignment(assignment.id);
                                      }}
                                    >
                                      {savingAssignment
                                        ? "Enregistrement..."
                                        : "Enregistrer"}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() =>
                                        setEditingAssignmentId(null)
                                      }
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
    </AppShell>
  );
}
