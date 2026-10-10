import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SchoolUsersService } from "./school-users.service.js";

const SCHOOL_ID = "school-1";
const ACTOR_ID = "actor-1";
const USER_ID = "user-1";
const STUDENT_ID = "student-1";
const YEAR_ID = "year-1";

function makePrisma() {
  const tx = {
    enrollment: { upsert: jest.fn(), update: jest.fn() },
    schoolMembership: { deleteMany: jest.fn(), createMany: jest.fn() },
    schoolStaffAssignment: { deleteMany: jest.fn() },
    teacher: { deleteMany: jest.fn() },
    teacherClassSubject: { deleteMany: jest.fn() },
    classTimetableSlot: { deleteMany: jest.fn(), updateMany: jest.fn() },
    classTimetableOneOffSlot: { deleteMany: jest.fn() },
    user: { updateMany: jest.fn() },
    schoolMemberExclusion: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    schoolMembership: {
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
    },
    school: {
      findUnique: jest.fn().mockResolvedValue({
        name: "Ecole Test",
        primaryAdminUserId: "platform-1",
        activeSchoolYearId: YEAR_ID,
      }),
    },
    student: {
      findFirst: jest.fn().mockResolvedValue({ id: STUDENT_ID, userId: null }),
    },
    enrollment: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    schoolMemberExclusion: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    internalMessage: { create: jest.fn().mockResolvedValue({ id: "msg-1" }) },
    internalMessageRecipient: { create: jest.fn() },
    class: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (t: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma, tx };
}

function setup(roles: string[]) {
  const { prisma, tx } = makePrisma();
  prisma.schoolMembership.findMany.mockResolvedValue(
    roles.map((role) => ({ role })),
  );
  const service = new SchoolUsersService(prisma as never);
  return { service, prisma, tx };
}

describe("SchoolUsersService.excludeMember", () => {
  it("refuse l'auto-exclusion (403)", async () => {
    const { service, prisma } = setup(["TEACHER"]);
    await expect(
      service.excludeMember(SCHOOL_ID, USER_ID, USER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("404 si la personne n'est pas membre", async () => {
    const { service } = setup([]);
    await expect(
      service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("409 pour l'administrateur principal et le dernier SCHOOL_ADMIN", async () => {
    const primary = setup(["SCHOOL_ADMIN"]);
    primary.prisma.school.findUnique.mockResolvedValue({
      primaryAdminUserId: USER_ID,
      activeSchoolYearId: YEAR_ID,
    });
    await expect(
      primary.service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);

    const last = setup(["SCHOOL_ADMIN"]);
    last.prisma.schoolMembership.count.mockResolvedValue(1);
    await expect(
      last.service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(last.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("enseignant : rôles retirés, trace ouverte avec le snapshot des rôles et le motif", async () => {
    const { service, tx } = setup(["TEACHER"]);
    const result = await service.excludeMember(
      SCHOOL_ID,
      ACTOR_ID,
      USER_ID,
      "  Fin de contrat  ",
    );

    expect(result.action).toBe("EXCLUDED");
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID, userId: USER_ID, role: { not: "STUDENT" } },
    });
    expect(tx.teacher.deleteMany).toHaveBeenCalled();
    expect(tx.enrollment.upsert).not.toHaveBeenCalled();
    expect(tx.schoolMemberExclusion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: SCHOOL_ID,
        userId: USER_ID,
        studentId: null,
        rolesSnapshot: ["TEACHER"],
        reason: "Fin de contrat",
        excludedByUserId: ACTOR_ID,
      }),
    });
  });

  it("parent : membership retiré, jamais les liens parent-élève", async () => {
    const { service, tx } = setup(["PARENT"]);
    await service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.teacher.deleteMany).not.toHaveBeenCalled();
  });

  it("élève avec compte : inscription WITHDRAWN (classe conservée), membership STUDENT conservé", async () => {
    const { service, prisma, tx } = setup(["STUDENT"]);
    prisma.student.findFirst.mockResolvedValue({ id: STUDENT_ID });

    await service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID);

    expect(tx.enrollment.upsert).toHaveBeenCalledWith({
      where: {
        schoolYearId_studentId: {
          schoolYearId: YEAR_ID,
          studentId: STUDENT_ID,
        },
      },
      update: { status: "WITHDRAWN" },
      create: expect.objectContaining({ status: "WITHDRAWN" }),
    });
    // Le compte reste connectable (lecture seule) : le membership n'est pas touché.
    expect(tx.schoolMembership.deleteMany).not.toHaveBeenCalled();
    expect(tx.schoolMemberExclusion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        studentId: STUDENT_ID,
        rolesSnapshot: ["STUDENT"],
      }),
    });
  });

  it("élève déjà exclu : 409", async () => {
    const { service, prisma } = setup(["STUDENT"]);
    prisma.student.findFirst.mockResolvedValue({ id: STUDENT_ID });
    prisma.enrollment.findFirst.mockResolvedValue({ id: "enr-1" });
    await expect(
      service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("élève sans année scolaire active : 409", async () => {
    const { service, prisma } = setup(["STUDENT"]);
    prisma.school.findUnique.mockResolvedValue({
      primaryAdminUserId: null,
      activeSchoolYearId: null,
    });
    await expect(
      service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("une exclusion encore ouverte est refermée avant d'ouvrir la nouvelle (une seule trace courante)", async () => {
    const { service, tx } = setup(["TEACHER"]);
    await service.excludeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(tx.schoolMemberExclusion.updateMany).toHaveBeenCalledWith({
      where: {
        schoolId: SCHOOL_ID,
        reinvitedAt: null,
        OR: [{ userId: USER_ID }],
      },
      data: { reinvitedAt: expect.any(Date) },
    });
    const order = [
      tx.schoolMemberExclusion.updateMany.mock.invocationCallOrder[0],
      tx.schoolMemberExclusion.create.mock.invocationCallOrder[0],
    ];
    expect(order[0]).toBeLessThan(order[1]);
  });
});

describe("SchoolUsersService.excludeStudent (élève sans compte)", () => {
  it("404 si l'élève n'existe pas dans l'école", async () => {
    const { service, prisma } = setup([]);
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(
      service.excludeStudent(SCHOOL_ID, ACTOR_ID, STUDENT_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("passe l'inscription en WITHDRAWN et ouvre une trace sans userId", async () => {
    const { service, tx } = setup([]);
    await service.excludeStudent(SCHOOL_ID, ACTOR_ID, STUDENT_ID, "Départ");
    expect(tx.enrollment.upsert).toHaveBeenCalled();
    expect(tx.schoolMemberExclusion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        studentId: STUDENT_ID,
        rolesSnapshot: ["STUDENT"],
        reason: "Départ",
      }),
    });
  });

  it("409 si l'élève est déjà exclu", async () => {
    const { service, prisma } = setup([]);
    prisma.enrollment.findFirst.mockResolvedValue({ id: "enr-1" });
    await expect(
      service.excludeStudent(SCHOOL_ID, ACTOR_ID, STUDENT_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("délègue à la route utilisateur quand l'élève a un compte", async () => {
    const { service, prisma } = setup(["STUDENT"]);
    prisma.student.findFirst.mockResolvedValue({
      id: STUDENT_ID,
      userId: USER_ID,
    });
    const result = await service.excludeStudent(
      SCHOOL_ID,
      ACTOR_ID,
      STUDENT_ID,
    );
    expect(result.roles).toEqual(["STUDENT"]);
    expect(prisma.schoolMembership.findMany).toHaveBeenCalled();
  });
});

describe("SchoolUsersService.reinviteMember", () => {
  const openTrace = (overrides: Record<string, unknown> = {}) => ({
    id: "exc-1",
    schoolId: SCHOOL_ID,
    userId: USER_ID,
    studentId: null,
    rolesSnapshot: ["TEACHER", "PARENT"],
    reason: null,
    excludedAt: new Date("2026-10-01"),
    reinvitedAt: null,
    ...overrides,
  });

  it("exige un identifiant", async () => {
    const { service } = setup([]);
    await expect(
      service.reinviteMember(SCHOOL_ID, ACTOR_ID, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404 si aucune exclusion courante", async () => {
    const { service, prisma } = setup([]);
    prisma.schoolMemberExclusion.findFirst.mockResolvedValue(null);
    await expect(
      service.reinviteMember(SCHOOL_ID, ACTOR_ID, { userId: USER_ID }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("recrée les memberships du snapshot, clôt la trace et notifie", async () => {
    const { service, prisma, tx } = setup([]);
    prisma.schoolMemberExclusion.findFirst.mockResolvedValue(openTrace());

    const result = await service.reinviteMember(SCHOOL_ID, ACTOR_ID, {
      userId: USER_ID,
    });

    expect(result).toEqual({
      action: "REINVITED",
      roles: ["TEACHER", "PARENT"],
    });
    expect(tx.schoolMembership.createMany).toHaveBeenCalledWith({
      data: [
        { userId: USER_ID, schoolId: SCHOOL_ID, role: "TEACHER" },
        { userId: USER_ID, schoolId: SCHOOL_ID, role: "PARENT" },
      ],
      skipDuplicates: true,
    });
    expect(tx.enrollment.update).not.toHaveBeenCalled();
    expect(tx.schoolMemberExclusion.updateMany).toHaveBeenCalledWith({
      where: {
        schoolId: SCHOOL_ID,
        reinvitedAt: null,
        OR: [{ userId: USER_ID }],
      },
      data: { reinvitedAt: expect.any(Date), reinvitedByUserId: ACTOR_ID },
    });
    expect(prisma.internalMessageRecipient.create).toHaveBeenCalled();
  });

  it("élève : l'inscription WITHDRAWN redevient ACTIVE, capacité vérifiée", async () => {
    const { service, prisma, tx } = setup([]);
    prisma.schoolMemberExclusion.findFirst.mockResolvedValue(
      openTrace({
        userId: null,
        studentId: STUDENT_ID,
        rolesSnapshot: ["STUDENT"],
      }),
    );
    prisma.enrollment.findFirst.mockResolvedValue({
      id: "enr-1",
      classId: "class-1",
      schoolYearId: YEAR_ID,
    });

    await service.reinviteMember(SCHOOL_ID, ACTOR_ID, {
      studentId: STUDENT_ID,
    });

    expect(prisma.class.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "class-1" } }),
    );
    expect(tx.enrollment.update).toHaveBeenCalledWith({
      where: { id: "enr-1" },
      data: { status: "ACTIVE" },
    });
    // Pas de compte : ni membership ni message.
    expect(tx.schoolMembership.createMany).not.toHaveBeenCalled();
    expect(prisma.internalMessage.create).not.toHaveBeenCalled();
  });

  it("classe pleine : la réintégration est refusée et rien n'est modifié", async () => {
    const { service, prisma, tx } = setup([]);
    prisma.schoolMemberExclusion.findFirst.mockResolvedValue(
      openTrace({
        userId: null,
        studentId: STUDENT_ID,
        rolesSnapshot: ["STUDENT"],
      }),
    );
    prisma.enrollment.findFirst.mockResolvedValue({
      id: "enr-1",
      classId: "class-1",
      schoolYearId: YEAR_ID,
    });
    prisma.class.findUnique.mockResolvedValue({ name: "6A", capacity: 1 });
    (
      prisma as unknown as { enrollment: { count: jest.Mock } }
    ).enrollment.count = jest.fn().mockResolvedValue(1);

    await expect(
      service.reinviteMember(SCHOOL_ID, ACTOR_ID, { studentId: STUDENT_ID }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.enrollment.update).not.toHaveBeenCalled();
    expect(tx.schoolMemberExclusion.updateMany).not.toHaveBeenCalled();
  });

  it("l'échec de la notification ne fait pas échouer la réintégration", async () => {
    const { service, prisma } = setup([]);
    prisma.schoolMemberExclusion.findFirst.mockResolvedValue(openTrace());
    prisma.internalMessage.create.mockRejectedValue(new Error("boom"));
    await expect(
      service.reinviteMember(SCHOOL_ID, ACTOR_ID, { userId: USER_ID }),
    ).resolves.toEqual(expect.objectContaining({ action: "REINVITED" }));
  });
});

describe("SchoolUsersService.listMembers — exclus", () => {
  it("liste les exclus depuis la trace, scopée par école, non réinvités", async () => {
    const { service, prisma } = setup([]);
    prisma.schoolMemberExclusion.findMany.mockResolvedValue([
      {
        id: "exc-1",
        userId: USER_ID,
        studentId: null,
        rolesSnapshot: ["TEACHER"],
        reason: "Fin de contrat",
        excludedAt: new Date("2026-10-01"),
        user: {
          firstName: "Paul",
          lastName: "Mbarga",
          email: "paul@example.com",
          phone: null,
          gender: null,
          avatarUrl: null,
          activationStatus: "ACTIVE",
          profileCompleted: true,
          createdAt: new Date("2026-01-01"),
        },
        student: null,
      },
      {
        id: "exc-2",
        userId: null,
        studentId: STUDENT_ID,
        rolesSnapshot: ["STUDENT"],
        reason: null,
        excludedAt: new Date("2026-09-30"),
        user: null,
        student: {
          firstName: "Eli",
          lastName: "Talla",
          createdAt: new Date("2026-02-01"),
        },
      },
    ]);
    prisma.schoolMemberExclusion.count.mockResolvedValue(2);

    const result = await service.listMembers(SCHOOL_ID, {
      membershipStatus: "excluded",
    });

    expect(prisma.schoolMemberExclusion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: SCHOOL_ID, reinvitedAt: null },
        orderBy: [{ excludedAt: "desc" }, { id: "asc" }],
      }),
    );
    expect(result.total).toBe(2);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        type: "user",
        id: USER_ID,
        roles: ["TEACHER"],
        excluded: true,
        exclusionReason: "Fin de contrat",
        hasAccount: true,
      }),
    );
    expect(result.data[1]).toEqual(
      expect.objectContaining({
        type: "student-only",
        id: STUDENT_ID,
        studentId: STUDENT_ID,
        hasAccount: false,
        excluded: true,
      }),
    );
  });

  it("filtre exclus par rôle, compte et recherche", async () => {
    const { service, prisma } = setup([]);
    await service.listMembers(SCHOOL_ID, {
      membershipStatus: "excluded",
      role: "TEACHER",
      hasAccount: true,
      search: "Mba",
    });
    const where = prisma.schoolMemberExclusion.findMany.mock.calls[0][0].where;
    expect(where.rolesSnapshot).toEqual({ has: "TEACHER" });
    expect(where.userId).toEqual({ not: null });
    expect(where.OR).toHaveLength(2);
  });
});
