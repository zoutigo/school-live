/**
 * Tests unitaires : StudentManagementService
 * - suggestUsername : génère JeanDUPONT, JeanDUPONT2 en cas de collision
 * - promoteStudent : transaction User + Membership + Student.userId, erreur si déjà lié
 * - resetStudentPassword : met mustChangePassword à true, erreur si student sans userId
 */

import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { StudentManagementService } from "./student-management.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const USER_ID = "user-new";
const ADMIN_USER_ID = "admin-1";

function makeStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: STUDENT_ID,
    firstName: "Jean",
    lastName: "DUPONT",
    userId: null,
    schoolId: SCHOOL_ID,
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    username: "JeanDUPONT",
    firstName: "Jean",
    lastName: "DUPONT",
    passwordHash: "hashed",
    mustChangePassword: true,
    profileCompleted: true,
    activationStatus: "ACTIVE",
    ...overrides,
  };
}

const makePrismaMock = () => ({
  student: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  schoolMembership: {
    create: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
  },
  parentStudent: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  internalMessage: {
    create: jest.fn().mockResolvedValue({ id: "msg-1" }),
  },
  internalMessageRecipient: {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  $transaction: jest.fn(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StudentManagementService", () => {
  let service: StudentManagementService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        StudentManagementService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudentManagementService);
  });

  // ── suggestUsername ──────────────────────────────────────────────────────────

  describe("suggestUsername", () => {
    it("génère JeanDUPONT pour un étudiant Jean DUPONT", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ firstName: "Jean", lastName: "DUPONT" }),
      );
      prisma.user.findUnique.mockResolvedValue(null); // username libre

      const result = await service.suggestUsername(STUDENT_ID, SCHOOL_ID);

      expect(result.username).toBe("JeanDUPONT");
    });

    it("génère JeanDUPONT2 si JeanDUPONT est déjà pris", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ firstName: "Jean", lastName: "DUPONT" }),
      );
      // First call: JeanDUPONT taken, second call (JeanDUPONT2) free
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "existing" }) // JeanDUPONT taken
        .mockResolvedValueOnce(null); // JeanDUPONT2 free

      const result = await service.suggestUsername(STUDENT_ID, SCHOOL_ID);

      expect(result.username).toBe("JeanDUPONT2");
    });

    it("génère JeanDUPONT3 si JeanDUPONT et JeanDUPONT2 sont pris", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ firstName: "Jean", lastName: "DUPONT" }),
      );
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "u1" }) // JeanDUPONT taken
        .mockResolvedValueOnce({ id: "u2" }) // JeanDUPONT2 taken
        .mockResolvedValueOnce(null); // JeanDUPONT3 free

      const result = await service.suggestUsername(STUDENT_ID, SCHOOL_ID);

      expect(result.username).toBe("JeanDUPONT3");
    });

    it("normalise les caractères accentués (Ébelle → Ebelle)", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ firstName: "Ébelle", lastName: "Marie" }),
      );
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.suggestUsername(STUDENT_ID, SCHOOL_ID);

      expect(result.username).toBe("EbelleMARIE");
    });

    it("lève NotFoundException si l'étudiant n'existe pas", async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.suggestUsername("ghost", SCHOOL_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── promoteStudent ───────────────────────────────────────────────────────────

  describe("promoteStudent", () => {
    beforeEach(() => {
      // Simulate the transaction: execute the callback and return its result
      prisma.$transaction.mockImplementation(
        async (callback: (tx: typeof prisma) => Promise<unknown>) => {
          return callback(prisma);
        },
      );
      prisma.user.create.mockResolvedValue(makeUser());
      prisma.schoolMembership.create.mockResolvedValue({});
      prisma.student.update.mockResolvedValue({});
      prisma.parentStudent.findMany.mockResolvedValue([]);
    });

    it("crée un User avec mustChangePassword true", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue(null); // username libre

      await service.promoteStudent(STUDENT_ID, SCHOOL_ID, ADMIN_USER_ID);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        }),
      );
    });

    it("crée un SchoolMembership avec rôle STUDENT", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue(null);

      await service.promoteStudent(STUDENT_ID, SCHOOL_ID, ADMIN_USER_ID);

      expect(prisma.schoolMembership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: SCHOOL_ID,
            role: "STUDENT",
          }),
        }),
      );
    });

    it("met à jour Student.userId avec l'id du nouvel utilisateur", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser({ id: USER_ID }));

      await service.promoteStudent(STUDENT_ID, SCHOOL_ID, ADMIN_USER_ID);

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: STUDENT_ID },
          data: { userId: USER_ID },
        }),
      );
    });

    it("retourne username et temporaryPassword", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.promoteStudent(
        STUDENT_ID,
        SCHOOL_ID,
        ADMIN_USER_ID,
      );

      expect(result).toHaveProperty("username");
      expect(result).toHaveProperty("temporaryPassword");
      expect(result.username).toBe("JeanDUPONT");
      expect(result.temporaryPassword).toHaveLength(12);
    });

    it("lève ConflictException si l'étudiant a déjà un userId", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ userId: "existing-user" }),
      );

      await expect(
        service.promoteStudent(STUDENT_ID, SCHOOL_ID, ADMIN_USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it("lève NotFoundException si l'étudiant n'existe pas", async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.promoteStudent("ghost", SCHOOL_ID, ADMIN_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève ConflictException si le username proposé est déjà pris", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue({ id: "taken" });

      await expect(
        service.promoteStudent(
          STUDENT_ID,
          SCHOOL_ID,
          ADMIN_USER_ID,
          "JeanDUPONT",
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("utilise le username proposé s'il est libre", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent());
      prisma.user.findUnique.mockResolvedValue(null); // proposed username free

      const result = await service.promoteStudent(
        STUDENT_ID,
        SCHOOL_ID,
        ADMIN_USER_ID,
        "CustomName",
      );

      expect(result.username).toBe("CustomName");
    });
  });

  // ── resetStudentPassword ─────────────────────────────────────────────────────

  describe("resetStudentPassword", () => {
    it("met à jour le mot de passe et mustChangePassword à true", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ userId: USER_ID }),
      );
      prisma.user.update.mockResolvedValue({});
      prisma.parentStudent.findMany.mockResolvedValue([]);

      await service.resetStudentPassword(STUDENT_ID, SCHOOL_ID);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: expect.objectContaining({
            mustChangePassword: true,
            passwordHash: expect.any(String),
          }),
        }),
      );
    });

    it("retourne un temporaryPassword non vide", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ userId: USER_ID }),
      );
      prisma.user.update.mockResolvedValue({});
      prisma.parentStudent.findMany.mockResolvedValue([]);

      const result = await service.resetStudentPassword(STUDENT_ID, SCHOOL_ID);

      expect(result).toHaveProperty("temporaryPassword");
      expect(result.temporaryPassword).toHaveLength(12);
    });

    it("lève NotFoundException si l'étudiant n'existe pas", async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.resetStudentPassword("ghost", SCHOOL_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève NotFoundException si l'étudiant n'a pas de userId", async () => {
      prisma.student.findFirst.mockResolvedValue(makeStudent({ userId: null }));

      await expect(
        service.resetStudentPassword(STUDENT_ID, SCHOOL_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("hashifie le nouveau mot de passe (pas en clair dans la DB)", async () => {
      prisma.student.findFirst.mockResolvedValue(
        makeStudent({ userId: USER_ID }),
      );
      prisma.user.update.mockResolvedValue({});
      prisma.parentStudent.findMany.mockResolvedValue([]);

      await service.resetStudentPassword(STUDENT_ID, SCHOOL_ID);

      const updateCall = prisma.user.update.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      const hash = updateCall.data.passwordHash;
      // A bcrypt hash starts with $2b$ or $2a$ and has a specific length
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
    });
  });
});
