export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type Role =
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

export type MeResponse = {
  role: Role;
};

export type GradesContext = {
  schoolYears: Array<{ id: string; label: string; isActive: boolean }>;
  selectedSchoolYearId: string | null;
  assignments: Array<{
    classId: string;
    subjectId: string;
    className: string;
    subjectName: string;
    schoolYearId: string;
  }>;
  students: Array<{
    classId: string;
    className: string;
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
  }>;
};

export type ClassContext = {
  classId: string;
  className: string;
  subjects: string[];
  students: Array<{ id: string; firstName: string; lastName: string }>;
};

export function getClassContext(
  context: GradesContext | null,
  classId: string,
): ClassContext | null {
  if (!context) {
    return null;
  }

  const assignments = context.assignments.filter(
    (entry) => entry.classId === classId,
  );
  if (assignments.length === 0) {
    return null;
  }

  const subjectSet = new Set(assignments.map((entry) => entry.subjectName));
  const students = context.students
    .filter((entry) => entry.classId === classId)
    .map((entry) => ({
      id: entry.studentId,
      firstName: entry.studentFirstName,
      lastName: entry.studentLastName,
    }))
    .sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      ),
    );

  return {
    classId,
    className: assignments[0].className,
    subjects: Array.from(subjectSet).sort((a, b) => a.localeCompare(b)),
    students,
  };
}

export function formatShortDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
