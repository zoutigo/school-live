import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { StudentManagementService } from "../src/student-management/student-management.service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";
const ADMIN_ID = "admin-1";

function makePrismaMock() {
  return {
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
    },
    parentStudent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    schoolMembership2: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    internalMessage: {
      create: jest.fn().mockResolvedValue({ id: "msg-1" }),
    },
    internalMessageRecipient: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// suggestUsername — logique buildUsernameBase (pure — pas besoin de Prisma)
// ─────────────────────────────────────────────────────────────────────────────

describe("StudentManagementService.suggestUsername — construction du nom de base", () => {
  let service: StudentManagementService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new StudentManagementService(prisma as never);
  });

  it('"Jean" "DUPONT" → "JeanDUPONT"', async () => {
    prisma.student.findFirst.mockResolvedValue({
      firstName: "Jean",
      lastName: "DUPONT",
    });
    // No collision
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.suggestUsername("s-1", SCHOOL_ID);
    expect(result.username).toBe("JeanDUPONT");
  });

  it('"Jean-Claude" "Dupont" → "JeanclaudeDUPONT" (tiret supprimé, casse appliquée sur le token complet)', async () => {
    // buildUsernameBase strips non-alpha first → "JeanClaude",
    // then capitalizes first letter and lowercases the rest of the whole
    // merged token → "Jeanclaude", + lastName uppercased → "DUPONT".
    prisma.student.findFirst.mockResolvedValue({
      firstName: "Jean-Claude",
      lastName: "Dupont",
    });
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.suggestUsername("s-1", SCHOOL_ID);
    expect(result.username).toBe("JeanclaudeDUPONT");
  });

  it("avec collision → ajoute le suffixe 2 puis 3", async () => {
    prisma.student.findFirst.mockResolvedValue({
      firstName: "Jean",
      lastName: "DUPONT",
    });

    // First call: "JeanDUPONT" exists; second call: "JeanDUPONT2" exists;
    // third call: "JeanDUPONT3" is free.
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "existing-1" }) // JeanDUPONT taken
      .mockResolvedValueOnce({ id: "existing-2" }) // JeanDUPONT2 taken
      .mockResolvedValueOnce(null); // JeanDUPONT3 free

    const result = await service.suggestUsername("s-1", SCHOOL_ID);
    expect(result.username).toBe("JeanDUPONT3");
  });

  it("lève NotFoundException si l'élève n'existe pas", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.suggestUsername("s-ghost", SCHOOL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// promoteStudent
// ─────────────────────────────────────────────────────────────────────────────

describe("StudentManagementService.promoteStudent", () => {
  let service: StudentManagementService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new StudentManagementService(prisma as never);
  });

  it("crée User, Membership et met à jour Student.userId dans une transaction", async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId: null,
    });

    // No username collision
    prisma.user.findUnique.mockResolvedValue(null);

    type TxMock = {
      user: { create: jest.Mock };
      schoolMembership: { create: jest.Mock };
      student: { update: jest.Mock };
    };

    const tx: TxMock = {
      user: {
        create: jest.fn().mockResolvedValue({ id: "new-user-1" }),
      },
      schoolMembership: {
        create: jest.fn(),
      },
      student: {
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(
      async (fn: (t: TxMock) => Promise<unknown>) => fn(tx),
    );

    const result = await service.promoteStudent("s-1", SCHOOL_ID, ADMIN_ID);

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Jean",
          lastName: "DUPONT",
          mustChangePassword: true,
          profileCompleted: true,
          activationStatus: "ACTIVE",
        }),
      }),
    );

    expect(tx.schoolMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "new-user-1",
          schoolId: SCHOOL_ID,
          role: "STUDENT",
        }),
      }),
    );

    expect(tx.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s-1" },
        data: { userId: "new-user-1" },
      }),
    );

    expect(result).toHaveProperty("username");
    expect(result).toHaveProperty("temporaryPassword");
    // temporaryPassword must match complexity requirements
    expect(result.temporaryPassword).toMatch(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    );
  });

  it("lève ConflictException si l'élève a déjà un userId", async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId: "existing-user-id",
    });

    await expect(
      service.promoteStudent("s-1", SCHOOL_ID, ADMIN_ID),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("lève NotFoundException si l'élève n'existe pas", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.promoteStudent("s-ghost", SCHOOL_ID, ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lève ConflictException si le proposedUsername est déjà pris", async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId: null,
    });

    // Proposed username collision
    prisma.user.findUnique.mockResolvedValue({ id: "taken-user" });

    await expect(
      service.promoteStudent("s-1", SCHOOL_ID, ADMIN_ID, "TakenUsername"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("traduit une collision concurrente en ConflictException propre", async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId: null,
    });

    prisma.user.findUnique.mockResolvedValue(null);

    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      service.promoteStudent("s-1", SCHOOL_ID, ADMIN_ID, "JeanDUPONT"),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetStudentPassword
// ─────────────────────────────────────────────────────────────────────────────

describe("StudentManagementService.resetStudentPassword", () => {
  let service: StudentManagementService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new StudentManagementService(prisma as never);
  });

  it("met à jour mustChangePassword=true et change passwordHash", async () => {
    const userId = "user-student-1";
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId,
    });
    prisma.user.update.mockResolvedValue({});

    const result = await service.resetStudentPassword("s-1", SCHOOL_ID);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({
          mustChangePassword: true,
          passwordHash: expect.any(String),
        }),
      }),
    );

    expect(result).toHaveProperty("temporaryPassword");
    // temporaryPassword must satisfy complexity
    expect(result.temporaryPassword).toMatch(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    );
  });

  it("lève NotFoundException si l'élève n'a pas de userId (pas encore promu)", async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: "s-1",
      firstName: "Jean",
      lastName: "DUPONT",
      userId: null,
    });

    await expect(
      service.resetStudentPassword("s-1", SCHOOL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("lève NotFoundException si l'élève est introuvable", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.resetStudentPassword("s-ghost", SCHOOL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
