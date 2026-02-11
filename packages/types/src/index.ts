export type PlatformRole = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";
export type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
export type Role = PlatformRole | SchoolRole;
export type Term = "TERM_1" | "TERM_2" | "TERM_3";
export type SchoolLevel = "primary" | "middle" | "high" | "college" | "lycee";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface School {
  id: string;
  slug?: string;
  name: string;
  city?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export interface StudentProfile {
  studentId: string;
  schoolId: string;
  className: string;
  level: SchoolLevel;
}

export interface AcademicPeriod {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  score: number;
  outOf: number;
  coefficient: number;
  periodId: string;
  gradedAt: string;
}

export interface TimetableEntry {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  startsAt: string;
  endsAt: string;
}

export interface Homework {
  id: string;
  className: string;
  subject: string;
  title: string;
  dueAt: string;
  completed: boolean;
}
