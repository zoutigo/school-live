import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { SchoolUsersService } from "./school-users.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";
const USER_ID = "user-1";

function makePrismaUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    firstName: "Ebelle",
    lastName: "Marie",
    email: "m.ebelle@test.cm",
    phone: "+237691234567",
    gender: "F",
    avatarUrl: null,
    activationStatus: "ACTIVE",
    profileCompleted: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    memberships: [{ role: "TEACHER" }],
    studentProfiles: [],
    parentLinks: [],
    teachingAssignments: [],
    staffAssignments: [],
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
    findFirst: jest.fn(),
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

describe("SchoolUsersService", () => {
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

  // ── listMembers — unitaires ──────────────────────────────────────────────────

  describe("listMembers", () => {
    it("retourne la liste avec le format attendu par le mobile", async () => {
      const users = [
        makePrismaUser(),
        makePrismaUser({
          id: "user-2",
          firstName: "Atangana",
          lastName: "Pierre",
          memberships: [{ role: "PARENT" }],
        }),
      ];
      prisma.$transaction.mockResolvedValue([users, 2, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });

      expect(result).toMatchObject({
        total: 2,
        page: 1,
        limit: 20,
        hasMore: false,
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        id: USER_ID,
        firstName: "Ebelle",
        lastName: "Marie",
        email: "m.ebelle@test.cm",
        roles: ["TEACHER"],
        activationStatus: "ACTIVE",
        profileCompleted: true,
      });
    });

    it("hasMore est true quand il reste des pages", async () => {
      const users = Array.from({ length: 20 }, (_, i) =>
        makePrismaUser({ id: `u-${i}` }),
      );
      prisma.$transaction.mockResolvedValue([users, 42, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(42);
    });

    it("hasMore est false sur la dernière page", async () => {
      const users = [makePrismaUser()];
      prisma.$transaction.mockResolvedValue([users, 21]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 2,
        limit: 20,
        role: "TEACHER",
      });

      expect(result.hasMore).toBe(false);
    });

    it("retourne une liste vide si aucun membre", async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, {});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    // ── Intégration : vérification des appels Prisma ─────────────────────────

    it("filtre par schoolId dans le membership", async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      await service.listMembers(SCHOOL_ID, {});

      // $transaction reçoit [findMany, count] — on vérifie l'arg de findMany
      // on vérifie que prisma.user.findMany a été appelé avec le bon where
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberships: { some: { schoolId: SCHOOL_ID } },
          }),
        }),
      );
    });

    it("ajoute le filtre de recherche sur nom, prénom, email, téléphone", async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      await service.listMembers(SCHOOL_ID, { search: "Kouam" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { firstName: { contains: "Kouam", mode: "insensitive" } },
                  { lastName: { contains: "Kouam", mode: "insensitive" } },
                  { email: { contains: "Kouam", mode: "insensitive" } },
                  { phone: { contains: "Kouam", mode: "insensitive" } },
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    it("ajoute le filtre de rôle dans le membership", async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listMembers(SCHOOL_ID, { role: "TEACHER" });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberships: { some: { schoolId: SCHOOL_ID, role: "TEACHER" } },
          }),
        }),
      );
    });

    it("calcule correctement le skip selon la page", async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listMembers(SCHOOL_ID, {
        page: 3,
        limit: 20,
        role: "TEACHER",
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it("ne sélectionne que les memberships de l'école dans le select", async () => {
      prisma.$transaction.mockResolvedValue([[], 0, [], 0]);

      await service.listMembers(SCHOOL_ID, {});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            memberships: {
              where: { schoolId: SCHOOL_ID },
              select: { role: true },
            },
          }),
        }),
      );
    });

    it("filtre par rôle STUDENT et retourne les membres ayant ce rôle", async () => {
      const students = [
        makePrismaUser({ id: "s-1", memberships: [{ role: "STUDENT" }] }),
        makePrismaUser({ id: "s-2", memberships: [{ role: "STUDENT" }] }),
      ];
      prisma.$transaction.mockResolvedValue([students, 2, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, { role: "STUDENT" });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data.every((u) => u.roles.includes("STUDENT"))).toBe(true);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberships: { some: { schoolId: SCHOOL_ID, role: "STUDENT" } },
          }),
        }),
      );
    });

    it("retourne les deux types quand aucun filtre de rôle n'est appliqué", async () => {
      const mixed = [
        makePrismaUser({ id: "u-1", memberships: [{ role: "TEACHER" }] }),
        makePrismaUser({ id: "u-2", memberships: [{ role: "PARENT" }] }),
        makePrismaUser({ id: "u-3", memberships: [{ role: "STUDENT" }] }),
      ];
      prisma.$transaction.mockResolvedValue([mixed, 3, [], 0]);

      const result = await service.listMembers(SCHOOL_ID, {});

      expect(result.total).toBe(3);
      const roles = result.data.flatMap((u) => u.roles);
      expect(roles).toContain("TEACHER");
      expect(roles).toContain("PARENT");
      expect(roles).toContain("STUDENT");
    });

    it("pagination correcte sur le total combiné (page 2 de 3)", async () => {
      const page2Items = Array.from({ length: 10 }, (_, i) =>
        makePrismaUser({ id: `u-p2-${i}` }),
      );
      prisma.$transaction.mockResolvedValue([page2Items, 25]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 2,
        limit: 10,
        role: "TEACHER",
      });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(10);
      expect(result.hasMore).toBe(true); // 2*10=20 < 25

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it("hasMore false sur la dernière page du total combiné", async () => {
      const lastPageItems = [makePrismaUser({ id: "last" })];
      prisma.$transaction.mockResolvedValue([lastPageItems, 21]);

      const result = await service.listMembers(SCHOOL_ID, {
        page: 3,
        limit: 10,
        role: "TEACHER",
      });

      // skip=20, 20+1=21 which equals total → no more
      expect(result.hasMore).toBe(false);
    });
  });

  // ── getMemberDetail — unitaires ──────────────────────────────────────────────

  describe("getMemberDetail", () => {
    it("retourne le détail complet d'un enseignant", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makePrismaUser({
          memberships: [{ role: "TEACHER" }],
          studentProfiles: [],
          parentLinks: [],
        }),
      );

      const result = await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(result).toMatchObject({
        id: USER_ID,
        firstName: "Ebelle",
        lastName: "Marie",
        email: "m.ebelle@test.cm",
        roles: ["TEACHER"],
        activationStatus: "ACTIVE",
        lastLoginAt: null,
        enrollments: [],
        children: [],
      });
      expect(result).toHaveProperty("updatedAt");
    });

    it("retourne les inscriptions pour un élève avec classId", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makePrismaUser({
          memberships: [{ role: "STUDENT" }],
          studentProfiles: [
            {
              parentLinks: [],
              enrollments: [
                {
                  id: "enr-1",
                  class: {
                    id: "cls-6eA",
                    name: "6e A",
                    schoolYear: { label: "2025-2026" },
                  },
                },
              ],
            },
          ],
          parentLinks: [],
          teachingAssignments: [],
          staffAssignments: [],
        }),
      );

      const result = await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(result.enrollments).toEqual([
        {
          id: "enr-1",
          classId: "cls-6eA",
          className: "6e A",
          schoolYear: "2025-2026",
        },
      ]);
      expect(result.children).toHaveLength(0);
    });

    it("retourne les enfants pour un parent", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makePrismaUser({
          memberships: [{ role: "PARENT" }],
          studentProfiles: [],
          parentLinks: [
            {
              student: {
                id: "child-1",
                firstName: "Cédric",
                lastName: "Atangana",
                enrollments: [{ class: { name: "3e B" } }],
              },
            },
          ],
        }),
      );

      const result = await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(result.children).toEqual([
        {
          id: "child-1",
          firstName: "Cédric",
          lastName: "Atangana",
          className: "3e B",
        },
      ]);
      expect(result.enrollments).toHaveLength(0);
    });

    it("className est null si l'enfant n'a pas d'inscription active", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makePrismaUser({
          memberships: [{ role: "PARENT" }],
          studentProfiles: [],
          parentLinks: [
            {
              student: {
                id: "child-2",
                firstName: "Sylvie",
                lastName: "Biya",
                enrollments: [],
              },
            },
          ],
        }),
      );

      const result = await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(result.children[0]?.className).toBeNull();
    });

    it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMemberDetail(SCHOOL_ID, "ghost")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lève NotFoundException si l'utilisateur n'est pas membre de cette école", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makePrismaUser({ memberships: [] }),
      );

      await expect(service.getMemberDetail(SCHOOL_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ── Intégration : vérification des appels Prisma ─────────────────────────

    it("filtre les studentProfiles par schoolId", async () => {
      prisma.user.findUnique.mockResolvedValue(makePrismaUser());

      await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            studentProfiles: expect.objectContaining({
              where: { schoolId: SCHOOL_ID },
            }),
          }),
        }),
      );
    });

    it("filtre les parentLinks par schoolId", async () => {
      prisma.user.findUnique.mockResolvedValue(makePrismaUser());

      await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            parentLinks: expect.objectContaining({
              where: { schoolId: SCHOOL_ID },
            }),
          }),
        }),
      );
    });

    it("sélectionne classId dans les enrollments", async () => {
      prisma.user.findUnique.mockResolvedValue(makePrismaUser());

      await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            studentProfiles: expect.objectContaining({
              select: expect.objectContaining({
                enrollments: expect.objectContaining({
                  select: expect.objectContaining({
                    class: expect.objectContaining({
                      select: expect.objectContaining({ id: true }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("filtre les inscriptions avec status ACTIVE", async () => {
      prisma.user.findUnique.mockResolvedValue(makePrismaUser());

      await service.getMemberDetail(SCHOOL_ID, USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            studentProfiles: expect.objectContaining({
              select: expect.objectContaining({
                enrollments: expect.objectContaining({
                  where: expect.objectContaining({ status: "ACTIVE" }),
                }),
              }),
            }),
          }),
        }),
      );
    });
  });

  // ── updateMemberRoles — unitaires ────────────────────────────────────────────

  describe("updateMemberRoles", () => {
    it("remplace tous les rôles et retourne les nouveaux rôles", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
      });
      prisma.$transaction.mockResolvedValue([undefined, undefined]);
      prisma.schoolMembership.findMany.mockResolvedValue([
        { role: "TEACHER" },
        { role: "PARENT" },
      ]);

      const result = await service.updateMemberRoles(SCHOOL_ID, USER_ID, {
        roles: ["TEACHER", "PARENT"],
      });

      expect(result.roles).toEqual(["TEACHER", "PARENT"]);
    });

    it("appelle deleteMany et createMany avec les bons arguments", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
      });
      prisma.$transaction.mockResolvedValue([undefined, undefined]);
      prisma.schoolMembership.findMany.mockResolvedValue([
        { role: "SCHOOL_ADMIN" },
      ]);

      await service.updateMemberRoles(SCHOOL_ID, USER_ID, {
        roles: ["SCHOOL_ADMIN"],
      });

      expect(prisma.schoolMembership.deleteMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_ID, userId: USER_ID },
      });
      expect(prisma.schoolMembership.createMany).toHaveBeenCalledWith({
        data: [{ schoolId: SCHOOL_ID, userId: USER_ID, role: "SCHOOL_ADMIN" }],
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("lève BadRequestException si le tableau de rôles est vide", async () => {
      await expect(
        service.updateMemberRoles(SCHOOL_ID, USER_ID, { roles: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève NotFoundException si l'utilisateur n'est pas membre", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMemberRoles(SCHOOL_ID, USER_ID, { roles: ["TEACHER"] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("crée un membership par rôle dans createMany", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
      });
      prisma.$transaction.mockResolvedValue([undefined, undefined]);
      prisma.schoolMembership.findMany.mockResolvedValue([
        { role: "TEACHER" },
        { role: "PARENT" },
        { role: "STUDENT" },
      ]);

      await service.updateMemberRoles(SCHOOL_ID, USER_ID, {
        roles: ["TEACHER", "PARENT", "STUDENT"],
      });

      expect(prisma.schoolMembership.createMany).toHaveBeenCalledWith({
        data: [
          { schoolId: SCHOOL_ID, userId: USER_ID, role: "TEACHER" },
          { schoolId: SCHOOL_ID, userId: USER_ID, role: "PARENT" },
          { schoolId: SCHOOL_ID, userId: USER_ID, role: "STUDENT" },
        ],
      });
    });
  });
});
