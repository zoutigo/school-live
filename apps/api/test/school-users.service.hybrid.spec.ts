/**
 * school-users.service.hybrid.spec.ts
 *
 * Tests for the hybrid listMembers path:
 * - no role filter => all school users + student-only
 * - role=STUDENT   => student users + student-only
 *
 * The hybrid branch no longer batches its four reads in a single
 * $transaction (conditional skips per hasAccount can't be expressed as
 * Prisma-native promises), so each Prisma call is mocked individually.
 */

import { Test } from "@nestjs/testing";
import { PrismaService } from "../src/prisma/prisma.service";
import { SchoolUsersService } from "../src/school-users/school-users.service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    firstName: "Ebelle",
    lastName: "Zara",
    email: "z@test.cm",
    phone: null,
    gender: null,
    avatarUrl: null,
    activationStatus: "ACTIVE",
    profileCompleted: true,
    createdAt: new Date("2025-01-02"),
    memberships: [{ role: "STUDENT" }],
    studentProfiles: [{ id: "sp-1" }],
    ...overrides,
  };
}

function makeStudentOnlyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "st-1",
    firstName: "Atangana",
    lastName: "Pierre",
    createdAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makePrismaMock() {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    student: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    school: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    schoolMembership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

/** Programs the four hybrid-branch Prisma reads at once. */
function mockHybridReads(
  prisma: ReturnType<typeof makePrismaMock>,
  users: unknown[],
  usersCount: number,
  studentsOnly: unknown[],
  studentsOnlyCount: number,
) {
  prisma.user.findMany.mockResolvedValue(users);
  prisma.user.count.mockResolvedValue(usersCount);
  prisma.student.findMany.mockResolvedValue(studentsOnly);
  prisma.student.count.mockResolvedValue(studentsOnlyCount);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SchoolUsersService.listMembers — mode hybride (STUDENT / sans filtre)", () => {
  let service: SchoolUsersService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        SchoolUsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SchoolUsersService);
  });

  // ── Sans filtre de rôle ────────────────────────────────────────────────────

  describe("sans filtre de rôle", () => {
    it("combine tous les users de l'ecole et les students-only", async () => {
      const userRow = makeUserRow({ memberships: [{ role: "TEACHER" }] });
      const studentRow = makeStudentOnlyRow();

      mockHybridReads(prisma, [userRow], 1, [studentRow], 1);

      const result = await service.listMembers(SCHOOL_ID, {});

      expect(result.total).toBe(2);
      const types = result.data.map((item) => item.type);
      expect(types).toContain("user");
      expect(types).toContain("student-only");
      expect(result.data.find((item) => item.type === "user")?.roles).toContain(
        "TEACHER",
      );
    });

    it("les items user ont hasAccount=true", async () => {
      mockHybridReads(
        prisma,
        [makeUserRow({ memberships: [{ role: "SCHOOL_ADMIN" }] })],
        1,
        [],
        0,
      );

      const result = await service.listMembers(SCHOOL_ID, {});
      const userItem = result.data.find((item) => item.type === "user");
      expect(userItem).toBeDefined();
      expect(userItem!.hasAccount).toBe(true);
    });

    it("les items student-only ont hasAccount=false et email/phone/gender/avatarUrl null", async () => {
      mockHybridReads(prisma, [], 0, [makeStudentOnlyRow()], 1);

      const result = await service.listMembers(SCHOOL_ID, {});
      const item = result.data.find((item) => item.type === "student-only");
      expect(item).toBeDefined();
      expect(item!.hasAccount).toBe(false);
      expect(item!.email).toBeNull();
      expect(item!.phone).toBeNull();
      expect(item!.gender).toBeNull();
      expect(item!.avatarUrl).toBeNull();
    });

    it("total = somme des deux counts", async () => {
      mockHybridReads(prisma, [], 3, [], 7);
      const result = await service.listMembers(SCHOOL_ID, {});
      expect(result.total).toBe(10);
    });

    it("hasMore est true quand des items dépassent la page", async () => {
      // total = 25, page 1 limit 20 → 5 items restants
      const users = Array.from({ length: 20 }, (_, i) =>
        makeUserRow({ id: `u-${i}` }),
      );
      mockHybridReads(prisma, users, 20, [], 5);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });

    it("hasMore est false quand tous les items tiennent dans la page", async () => {
      mockHybridReads(prisma, [makeUserRow()], 1, [makeStudentOnlyRow()], 1);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });
      expect(result.hasMore).toBe(false);
    });

    it("retourne une liste triée par lastName puis firstName", async () => {
      // Combined list: Zara Ebelle + Pierre Atangana
      // After sort: Atangana Pierre first, then Zara Ebelle
      const userRow = makeUserRow({
        id: "u-zara",
        firstName: "Ebelle",
        lastName: "Zara",
        createdAt: new Date("2025-01-02"),
      });
      const studentRow = makeStudentOnlyRow({
        id: "st-atangana",
        firstName: "Pierre",
        lastName: "Atangana",
        createdAt: new Date("2025-01-01"),
      });

      mockHybridReads(prisma, [userRow], 1, [studentRow], 1);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].lastName).toBe("Atangana");
      expect(result.data[1].lastName).toBe("Zara");
    });
  });

  // ── Avec filtre role: "STUDENT" ────────────────────────────────────────────

  describe("avec filtre role: 'STUDENT'", () => {
    it("retourne les deux types (user ET student-only)", async () => {
      mockHybridReads(
        prisma,
        [makeUserRow({ memberships: [{ role: "STUDENT" }] })],
        1,
        [makeStudentOnlyRow()],
        1,
      );

      const result = await service.listMembers(SCHOOL_ID, { role: "STUDENT" });

      const types = result.data.map((item) => item.type);
      expect(types).toContain("user");
      expect(types).toContain("student-only");
    });
  });

  // ── Avec filtre role: "TEACHER" ───────────────────────────────────────────

  describe("avec filtre role: 'TEACHER'", () => {
    it("retourne seulement des items type:user (pas de student-only)", async () => {
      const teacherRow = makeUserRow({
        memberships: [{ role: "TEACHER" }],
        studentProfiles: [],
      });
      // Non-student query uses the standard (non-hybrid) path with single $transaction
      prisma.$transaction.mockResolvedValue([[teacherRow], 1]);

      const result = await service.listMembers(SCHOOL_ID, { role: "TEACHER" });

      expect(result.data.every((item) => item.type === "user")).toBe(true);
      expect(result.data[0].roles).toContain("TEACHER");
    });

    it("n'inclut aucun student-only quand le rôle est TEACHER", async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.listMembers(SCHOOL_ID, { role: "TEACHER" });

      expect(result.data.some((item) => item.type === "student-only")).toBe(
        false,
      );
    });
  });

  // ── Recherche ──────────────────────────────────────────────────────────────

  describe("recherche (search)", () => {
    it("interroge les deux sources (user ET student) quand on cherche", async () => {
      mockHybridReads(prisma, [], 0, [], 0);

      await service.listMembers(SCHOOL_ID, { search: "Atang" });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(prisma.student.findMany).toHaveBeenCalled();
    });

    it("retourne seulement les éléments correspondant à la recherche", async () => {
      const matchingUser = makeUserRow({
        firstName: "Atangana",
        lastName: "Jean",
        memberships: [{ role: "TEACHER" }],
      });
      const matchingStudent = makeStudentOnlyRow({
        firstName: "Atangana",
        lastName: "Paul",
      });

      mockHybridReads(prisma, [matchingUser], 1, [matchingStudent], 1);

      const result = await service.listMembers(SCHOOL_ID, {
        search: "Atangana",
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((item) => item.firstName === "Atangana")).toBe(
        true,
      );
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  describe("pagination", () => {
    it("total est la somme des deux counts peu importe la page", async () => {
      mockHybridReads(prisma, [], 5, [], 8);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 2,
        limit: 10,
      });

      expect(result.total).toBe(13);
    });

    it("page 1 limit 5 avec 8 items → hasMore=true", async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        makeUserRow({ id: `u-${i}`, lastName: `Z${i}` }),
      );
      mockHybridReads(prisma, items, 5, [], 3);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 5,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(8);
    });

    it("page 2 limit 5 avec 8 items → hasMore=false", async () => {
      // page 2, skip=5 → combined has 8, paginated from 5 has 3 → skip+3 = 8 = total → hasMore false
      const items = Array.from({ length: 8 }, (_, i) =>
        makeUserRow({ id: `u-${i}`, lastName: `A${i}` }),
      );
      mockHybridReads(prisma, items, 8, [], 0);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 2,
        limit: 5,
      });

      expect(result.hasMore).toBe(false);
    });

    it("borne chaque source Prisma à (skip + limit) lignes, jamais la table entière", async () => {
      mockHybridReads(prisma, [], 0, [], 0);

      await service.listMembers(SCHOOL_ID, { page: 3, limit: 10 });
      // page 3, limit 10 → skip = 20 → take = skip + limit = 30

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 }),
      );
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 }),
      );
    });
  });

  // ── Filtre hasAccount ──────────────────────────────────────────────────────

  describe("filtre hasAccount", () => {
    it("hasAccount=true n'interroge pas Student (aucun student-only possible)", async () => {
      mockHybridReads(prisma, [makeUserRow()], 1, [], 0);

      const result = await service.listMembers(SCHOOL_ID, { hasAccount: true });

      expect(prisma.student.findMany).not.toHaveBeenCalled();
      expect(prisma.student.count).not.toHaveBeenCalled();
      expect(result.data.every((item) => item.type === "user")).toBe(true);
    });

    it("hasAccount=false n'interroge pas User (aucun compte possible)", async () => {
      mockHybridReads(prisma, [], 0, [makeStudentOnlyRow()], 1);

      const result = await service.listMembers(SCHOOL_ID, {
        hasAccount: false,
      });

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(result.data.every((item) => item.type === "student-only")).toBe(
        true,
      );
    });

    it("hasAccount=false avec un rôle non-STUDENT retourne une page vide sans requête Prisma", async () => {
      const result = await service.listMembers(SCHOOL_ID, {
        role: "TEACHER",
        hasAccount: false,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      });
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── Filtre schoolYearId ────────────────────────────────────────────────────

  describe("filtre schoolYearId", () => {
    it("appliqué avec role=STUDENT, filtre les deux sources par enrollments", async () => {
      mockHybridReads(prisma, [], 0, [], 0);

      await service.listMembers(SCHOOL_ID, {
        role: "STUDENT",
        schoolYearId: "sy-1",
      });

      const userArgs = prisma.user.findMany.mock.calls[0][0];
      expect(JSON.stringify(userArgs.where)).toContain("sy-1");
      const studentArgs = prisma.student.findMany.mock.calls[0][0];
      expect(JSON.stringify(studentArgs.where)).toContain("sy-1");
    });

    it("ignoré (no-op) quand aucun rôle n'est sélectionné (ALL)", async () => {
      mockHybridReads(prisma, [], 0, [], 0);

      await service.listMembers(SCHOOL_ID, { schoolYearId: "sy-1" });

      const userArgs = prisma.user.findMany.mock.calls[0][0];
      expect(JSON.stringify(userArgs.where)).not.toContain("sy-1");
    });
  });
});
