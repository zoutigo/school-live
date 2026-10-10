import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SchoolUsersService } from "./school-users.service.js";

const SCHOOL_ID = "school-1";
const ACTOR_ID = "actor-1";
const USER_ID = "user-1";
const YEAR_ID = "year-1";

function makePrisma() {
  const tx = {
    enrollment: { updateMany: jest.fn() },
    schoolMembership: { deleteMany: jest.fn() },
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
      findFirst: jest.fn(),
    },
    school: {
      findUnique: jest.fn().mockResolvedValue({
        primaryAdminUserId: "platform-1",
        activeSchoolYearId: YEAR_ID,
      }),
    },
    enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
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

describe("SchoolUsersService.removeMember", () => {
  it("refuse l'auto-exclusion (403) sans toucher à la base", async () => {
    const { service, prisma } = setup(["TEACHER"]);
    await expect(
      service.removeMember(SCHOOL_ID, USER_ID, USER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("renvoie 404 si l'utilisateur n'est pas membre", async () => {
    const { service } = setup([]);
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuse d'exclure l'administrateur principal (409)", async () => {
    const { service, prisma } = setup(["SCHOOL_ADMIN"]);
    prisma.school.findUnique.mockResolvedValue({
      primaryAdminUserId: USER_ID,
      activeSchoolYearId: YEAR_ID,
    });
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuse d'exclure le dernier SCHOOL_ADMIN (409)", async () => {
    const { service, prisma } = setup(["SCHOOL_ADMIN"]);
    prisma.schoolMembership.count.mockResolvedValue(1);
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("autorise l'exclusion d'un SCHOOL_ADMIN secondaire", async () => {
    const { service, tx } = setup(["SCHOOL_ADMIN"]);
    const result = await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(result.action).toBe("EXCLUDED");
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID, userId: USER_ID, role: { not: "STUDENT" } },
    });
  });

  it("exclut un enseignant : membership, fiche, affectations et planning futurs, historique conservé", async () => {
    const { service, tx } = setup(["TEACHER"]);
    const result = await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);

    expect(result).toEqual({ action: "EXCLUDED", remainingRoles: [] });
    expect(tx.teacher.deleteMany).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID, userId: USER_ID },
    });
    // Seulement l'année active : jamais de deleteMany sans schoolYearId.
    expect(tx.teacherClassSubject.deleteMany).toHaveBeenCalledWith({
      where: {
        schoolId: SCHOOL_ID,
        schoolYearId: YEAR_ID,
        teacherUserId: USER_ID,
      },
    });
    // Créneaux passés conservés : recurrence close, jamais supprimée.
    const slotUpdate = tx.classTimetableSlot.updateMany.mock.calls[0][0];
    expect(slotUpdate.data.activeToDate).toBeInstanceOf(Date);
    expect(slotUpdate.where.schoolYearId).toBe(YEAR_ID);
    const slotDelete = tx.classTimetableSlot.deleteMany.mock.calls[0][0];
    expect(slotDelete.where.activeFromDate).toEqual({ gt: expect.any(Date) });
    const oneOffDelete =
      tx.classTimetableOneOffSlot.deleteMany.mock.calls[0][0];
    expect(oneOffDelete.where.occurrenceDate).toEqual({ gt: expect.any(Date) });
    expect(tx.enrollment.updateMany).not.toHaveBeenCalled();
  });

  it("exclut un parent sans toucher aux liens parent-élève", async () => {
    const { service, tx } = setup(["PARENT"]);
    const result = await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(result.action).toBe("EXCLUDED");
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.teacher.deleteMany).not.toHaveBeenCalled();
    expect(tx.classTimetableSlot.updateMany).not.toHaveBeenCalled();
  });

  it("réinitialise l'école active de l'utilisateur exclu", async () => {
    const { service, tx } = setup(["SCHOOL_STAFF"]);
    await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, activeSchoolId: SCHOOL_ID },
      data: { activeSchoolId: null },
    });
  });

  it("élève : retire seulement la classe de l'année active, garde le rôle STUDENT", async () => {
    const { service, prisma, tx } = setup(["STUDENT"]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: "enr-1" }]);

    const result = await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);

    expect(result).toEqual({
      action: "UNASSIGNED_FROM_CLASS",
      remainingRoles: ["STUDENT"],
    });
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolYearId: YEAR_ID,
          status: "ACTIVE",
          student: { userId: USER_ID },
        }),
      }),
    );
    expect(tx.enrollment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["enr-1"] } },
      data: { classId: null },
    });
    expect(tx.schoolMembership.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it("élève déjà sans classe : 409", async () => {
    const { service, prisma } = setup(["STUDENT"]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("élève sans année active : 409", async () => {
    const { service, prisma } = setup(["STUDENT"]);
    prisma.school.findUnique.mockResolvedValue({
      primaryAdminUserId: null,
      activeSchoolYearId: null,
    });
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("STUDENT + PARENT : retire la classe ET le rôle parent, garde STUDENT", async () => {
    const { service, prisma, tx } = setup(["STUDENT", "PARENT"]);
    prisma.enrollment.findMany.mockResolvedValue([{ id: "enr-9" }]);
    const result = await service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID);
    expect(result.action).toBe("EXCLUDED");
    expect(result.remainingRoles).toEqual(["STUDENT"]);
    expect(tx.enrollment.updateMany).toHaveBeenCalled();
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledWith({
      where: { schoolId: SCHOOL_ID, userId: USER_ID, role: { not: "STUDENT" } },
    });
  });

  it("propage l'échec transactionnel (aucune réussite silencieuse)", async () => {
    const { service, prisma } = setup(["TEACHER"]);
    prisma.$transaction.mockRejectedValue(new Error("db down"));
    await expect(
      service.removeMember(SCHOOL_ID, ACTOR_ID, USER_ID),
    ).rejects.toThrow("db down");
  });
});

describe("SchoolUsersService.updateMemberRoles — admin principal", () => {
  it("refuse de retirer SCHOOL_ADMIN à l'administrateur principal", async () => {
    const { prisma } = makePrisma();
    prisma.schoolMembership.findFirst = jest
      .fn()
      .mockResolvedValue({ id: "m1" });
    prisma.school.findUnique.mockResolvedValue({
      primaryAdminUserId: USER_ID,
      activeSchoolYearId: YEAR_ID,
    });
    const service = new SchoolUsersService(prisma as never);
    await expect(
      service.updateMemberRoles(SCHOOL_ID, USER_ID, {
        roles: ["TEACHER"],
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
