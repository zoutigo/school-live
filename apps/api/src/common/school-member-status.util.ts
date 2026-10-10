import type { PrismaService } from "../prisma/prisma.service.js";

/**
 * Source de vérité unique de la notion « élève exclu ».
 *
 * - Une inscription `ACTIVE` fait partie des effectifs : listes d'appel, saisie
 *   de notes, suivi des devoirs, notifications, capacité de classe…
 * - Une inscription `WITHDRAWN` correspond à un élève exclu de l'école : il garde
 *   un accès en lecture seule à son historique (lui-même et ses parents) mais
 *   n'apparaît plus dans aucun effectif, ne reçoit plus de notification et ne
 *   peut plus agir.
 */
export const ENROLLMENT_ROSTER_STATUS = "ACTIVE" as const;

/** Statuts permettant de consulter l'historique d'un élève (lecture seule). */
export const ENROLLMENT_VIEWABLE_STATUSES = ["ACTIVE", "WITHDRAWN"] as const;

type SchoolMemberStatusPrisma = Pick<
  PrismaService,
  "school" | "student" | "parentStudent"
>;

/**
 * Renvoie true si l'utilisateur ne doit plus pouvoir écrire dans l'école parce
 * qu'il est un élève exclu, ou un parent dont tous les enfants sont exclus.
 * Les rôles de gestion (enseignant, staff…) ne sont jamais concernés : leur
 * exclusion supprime directement leur membership.
 */
export async function isReadOnlySchoolMember(
  prisma: SchoolMemberStatusPrisma,
  schoolId: string,
  userId: string,
  roles: string[],
): Promise<boolean> {
  if (roles.length === 0) return false;
  if (!roles.every((role) => role === "STUDENT" || role === "PARENT")) {
    return false;
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { activeSchoolYearId: true },
  });
  const activeSchoolYearId = school?.activeSchoolYearId;
  if (!activeSchoolYearId) return false;

  // Un compte cumulant plusieurs rôles (élève + parent) garde la main tant
  // qu'un seul de ces rôles reste « actif ».
  if (roles.includes("STUDENT")) {
    const student = await prisma.student.findFirst({
      where: { schoolId, userId },
      select: {
        enrollments: {
          where: { schoolId, schoolYearId: activeSchoolYearId },
          select: { status: true },
        },
      },
    });
    const studentExcluded = Boolean(
      student?.enrollments.some((e) => e.status === "WITHDRAWN"),
    );
    if (!studentExcluded) return false;
  }

  if (roles.includes("PARENT")) {
    const links = await prisma.parentStudent.findMany({
      where: { schoolId, parentUserId: userId },
      select: {
        student: {
          select: {
            enrollments: {
              where: { schoolId, schoolYearId: activeSchoolYearId },
              select: { status: true },
            },
          },
        },
      },
    });
    const parentExcluded =
      links.length > 0 &&
      links.every((link) =>
        link.student.enrollments.some((e) => e.status === "WITHDRAWN"),
      );
    if (!parentExcluded) return false;
  }

  return true;
}

/**
 * Vrai si l'élève est exclu de l'école pour l'année active (inscription
 * `WITHDRAWN`). Garde-fou commun des notifications : un élève exclu et ses
 * parents ne sont plus notifiés de quoi que ce soit.
 */
export async function isStudentExcludedInSchool(
  prisma: Pick<PrismaService, "school" | "enrollment">,
  schoolId: string,
  studentId: string,
): Promise<boolean> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { activeSchoolYearId: true },
  });
  if (!school?.activeSchoolYearId) return false;
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      schoolId,
      studentId,
      schoolYearId: school.activeSchoolYearId,
      status: "WITHDRAWN",
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}

/**
 * Filtre Prisma `Student` écartant les élèves exclus (inscription `WITHDRAWN`
 * pour l'année active) des listes opérationnelles (santé, effectifs…).
 */
export function notExcludedStudentFilter(
  activeSchoolYearId: string | null | undefined,
) {
  if (!activeSchoolYearId) return {};
  return {
    NOT: {
      enrollments: {
        some: {
          schoolYearId: activeSchoolYearId,
          status: "WITHDRAWN" as const,
        },
      },
    },
  };
}

type ExclusionTraceDb = Pick<
  PrismaService,
  "schoolMemberExclusion" | "student"
>;

/**
 * Ouvre (si besoin) la trace d'exclusion d'un élève. Idempotent : une seule
 * trace « courante » (`reinvitedAt` null) par élève et par école.
 */
export async function openStudentExclusionTrace(
  db: ExclusionTraceDb,
  input: {
    schoolId: string;
    studentId: string;
    excludedByUserId?: string | null;
    reason?: string | null;
  },
) {
  const open = await db.schoolMemberExclusion.findFirst({
    where: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      reinvitedAt: null,
    },
    select: { id: true },
  });
  if (open) return open;

  const student = await db.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId },
    select: { userId: true },
  });
  return db.schoolMemberExclusion.create({
    data: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      userId: student?.userId ?? null,
      rolesSnapshot: ["STUDENT"],
      reason: input.reason?.trim() || null,
      excludedByUserId: input.excludedByUserId ?? null,
    },
    select: { id: true },
  });
}

/** Clôt la trace d'exclusion courante d'un élève (réintégration). */
export async function closeStudentExclusionTrace(
  db: Pick<PrismaService, "schoolMemberExclusion">,
  input: {
    schoolId: string;
    studentId: string;
    reinvitedByUserId?: string | null;
  },
) {
  return db.schoolMemberExclusion.updateMany({
    where: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      reinvitedAt: null,
    },
    data: {
      reinvitedAt: new Date(),
      reinvitedByUserId: input.reinvitedByUserId ?? null,
    },
  });
}
