/**
 * school-users.service.hybrid.spec.ts
 *
 * Tests for the hybrid listMembers path:
 * - no role filter => all school users + student-only
 * - role=STUDENT   => student users + student-only
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

const makePrismaMock = () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  student: {
    findMany: jest.fn(),
    count: jest.fn(),
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
});

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

      prisma.$transaction.mockResolvedValue([
        [userRow], // users with STUDENT membership
        1, // usersCount
        [studentRow], // students-only (userId null)
        1, // studentsOnlyCount
      ]);

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
      prisma.$transaction.mockResolvedValue([
        [makeUserRow({ memberships: [{ role: "SCHOOL_ADMIN" }] })],
        1,
        [],
        0,
      ]);

      const result = await service.listMembers(SCHOOL_ID, {});
      const userItem = result.data.find((item) => item.type === "user");
      expect(userItem).toBeDefined();
      expect(userItem!.hasAccount).toBe(true);
    });

    it("les items student-only ont hasAccount=false et email/phone/gender/avatarUrl null", async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [makeStudentOnlyRow()], 1]);

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
      prisma.$transaction.mockResolvedValue([[], 3, [], 7]);
      const result = await service.listMembers(SCHOOL_ID, {});
      expect(result.total).toBe(10);
    });

    it("hasMore est true quand des items dépassent la page", async () => {
      // total = 25, page 1 limit 20 → 5 items restants
      const users = Array.from({ length: 20 }, (_, i) =>
        makeUserRow({ id: `u-${i}` }),
      );
      prisma.$transaction.mockResolvedValue([users, 20, [], 5]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });

    it("hasMore est false quand tous les items tiennent dans la page", async () => {
      prisma.$transaction.mockResolvedValue([
        [makeUserRow()],
        1,
        [makeStudentOnlyRow()],
        1,
      ]);

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

      prisma.$transaction.mockResolvedValue([[userRow], 1, [studentRow], 1]);

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
      prisma.$transaction.mockResolvedValue([
        [makeUserRow({ memberships: [{ role: "STUDENT" }] })],
        1,
        [makeStudentOnlyRow()],
        1,
      ]);

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
    it("filtre sur firstName/lastName pour les deux types quand on cherche", async () => {
      // The hybrid path builds two separate WHERE clauses; we just verify
      // that $transaction is called (the merged result is empty here).
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      await service.listMembers(SCHOOL_ID, { search: "Atang" });

      // $transaction receives an array of 4 promises in hybrid mode
      const transactionArg = prisma.$transaction.mock.calls[0][0];
      expect(transactionArg).toHaveLength(4);
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

      prisma.$transaction.mockResolvedValue([
        [matchingUser],
        1,
        [matchingStudent],
        1,
      ]);

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
      prisma.$transaction.mockResolvedValue([[], 5, [], 8]);

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
      prisma.$transaction.mockResolvedValue([items, 5, [], 3]);

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
      prisma.$transaction.mockResolvedValue([items, 8, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 2,
        limit: 5,
      });

      expect(result.hasMore).toBe(false);
    });
  });
});
