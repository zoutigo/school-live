/**
 * Tests unitaires pour les règles de permission de suppression d'événements disciplinaires.
 *
 * Règles métier :
 * - SCHOOL_ADMIN / SCHOOL_MANAGER / SUPERVISOR : peut supprimer tout événement
 * - TEACHER : peut supprimer uniquement ses propres événements (authorUserId === soi)
 *             ET uniquement ceux de l'année scolaire active
 * - Autres rôles : refus systématique
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AppRole } from "../src/auth/auth.types.js";
import { ManagementService } from "../src/management/management.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Role = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";
type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

function makeUser(
  id: string,
  schoolRole: SchoolRole,
  platformRoles: Role[] = [],
) {
  return {
    id,
    activeRole: schoolRole as AppRole,
    platformRoles,
    memberships: [{ schoolId: "school-1", role: schoolRole }],
    profileCompleted: true,
    firstName: "User",
    lastName: id,
  };
}

function makeEvent(overrides: {
  authorUserId?: string;
  schoolYearId?: string | null;
} = {}) {
  return {
    id: "event-1",
    schoolId: "school-1",
    studentId: "student-1",
    authorUserId: overrides.authorUserId ?? "teacher-1",
    schoolYearId: overrides.schoolYearId !== undefined ? overrides.schoolYearId : "sy-active",
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const prisma = {
  studentLifeEvent: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
  },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();

  // Stub helpers
  (service as any).getActiveSchoolYearId = jest
    .fn()
    .mockResolvedValue("sy-active");

  prisma.studentLifeEvent.findFirst.mockResolvedValue(makeEvent());
  prisma.studentLifeEvent.delete.mockResolvedValue({ id: "event-1" });
});

// ─── Cas : événement introuvable ─────────────────────────────────────────────

describe("deleteStudentLifeEvent — événement introuvable", () => {
  it("lève NotFoundException si l'événement n'existe pas", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-missing"),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── Cas : SCHOOL_ADMIN ───────────────────────────────────────────────────────

describe("deleteStudentLifeEvent — SCHOOL_ADMIN", () => {
  it("autorise le SCHOOL_ADMIN à supprimer n'importe quel événement", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });

  it("autorise le SCHOOL_ADMIN même si l'événement appartient à une autre année", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ schoolYearId: "sy-past" }),
    );
    const user = makeUser("admin-1", "SCHOOL_ADMIN");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });

  it("autorise le SCHOOL_ADMIN même s'il n'est pas l'auteur", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ authorUserId: "other-teacher" }),
    );
    const user = makeUser("admin-1", "SCHOOL_ADMIN");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });
});

// ─── Cas : SCHOOL_MANAGER / SUPERVISOR ───────────────────────────────────────

describe("deleteStudentLifeEvent — SCHOOL_MANAGER / SUPERVISOR", () => {
  it("autorise le SCHOOL_MANAGER à supprimer n'importe quel événement", async () => {
    const user = makeUser("manager-1", "SCHOOL_MANAGER");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });

  it("autorise le SUPERVISOR à supprimer n'importe quel événement", async () => {
    const user = makeUser("supervisor-1", "SUPERVISOR");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });
});

// ─── Cas : TEACHER — auteur, année active ────────────────────────────────────

describe("deleteStudentLifeEvent — TEACHER autorisé", () => {
  it("autorise l'enseignant auteur de l'événement de l'année active", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ authorUserId: "teacher-1", schoolYearId: "sy-active" }),
    );
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).resolves.toEqual({ id: "event-1", deleted: true });
  });
});

// ─── Cas : TEACHER — refus ───────────────────────────────────────────────────

describe("deleteStudentLifeEvent — TEACHER refusé", () => {
  it("refuse l'enseignant qui n'est pas l'auteur", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ authorUserId: "other-teacher", schoolYearId: "sy-active" }),
    );
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse l'enseignant auteur si l'événement est d'une année passée", async () => {
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ authorUserId: "teacher-1", schoolYearId: "sy-past" }),
    );
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse l'enseignant auteur si aucune année scolaire active n'est définie", async () => {
    (service as any).getActiveSchoolYearId = jest.fn().mockResolvedValue(null);
    prisma.studentLifeEvent.findFirst.mockResolvedValue(
      makeEvent({ authorUserId: "teacher-1", schoolYearId: "sy-active" }),
    );
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─── Cas : rôles non autorisés ────────────────────────────────────────────────

describe("deleteStudentLifeEvent — rôles non autorisés", () => {
  it("refuse un PARENT", async () => {
    const user = makeUser("parent-1", "PARENT");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un STUDENT", async () => {
    const user = makeUser("student-1", "STUDENT");

    await expect(
      service.deleteStudentLifeEvent("school-1", user as never, "student-1", "event-1"),
    ).rejects.toThrow(ForbiddenException);
  });
});
