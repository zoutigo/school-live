import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  userPhoneCredential: {
    findUnique: jest.fn(),
  },
  schoolMembership: {
    upsert: jest.fn(),
  },
  schoolStaffFunction: {
    findFirst: jest.fn(),
  },
  schoolStaffAssignment: {
    upsert: jest.fn(),
    create: jest.fn(),
  },
  activationCode: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mailService = {
  sendTemporaryPasswordEmail: jest.fn(),
};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );
  prisma.school.findUnique.mockResolvedValue({
    id: "school-1",
    slug: "greenwich",
  });
  prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.user.findFirst.mockResolvedValue(null);
});

describe("ManagementService — createSchoolStaffMember", () => {
  it("rejette sans email ni telephone", async () => {
    await expect(
      service.createSchoolStaffMember("school-1", {
        role: "SCHOOL_MANAGER",
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejette si la fonction fournie n'existe pas dans l'ecole", async () => {
    prisma.schoolStaffFunction.findFirst.mockResolvedValue(null);

    await expect(
      service.createSchoolStaffMember("school-1", {
        role: "SCHOOL_STAFF",
        email: "staff@greenwich.cm",
        password: "StrongPass1",
        functionId: "fn-missing",
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejette un telephone sans PIN", async () => {
    await expect(
      service.createSchoolStaffMember("school-1", {
        role: "SUPERVISOR",
        phone: "699001122",
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette un email sans mot de passe", async () => {
    await expect(
      service.createSchoolStaffMember("school-1", {
        role: "SCHOOL_ACCOUNTANT",
        email: "compta@greenwich.cm",
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("cree un nouveau responsable par email et envoie le mot de passe temporaire", async () => {
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      firstName: "Jean",
      lastName: "Paul",
      email: "manager@greenwich.cm",
    });

    const result = await service.createSchoolStaffMember("school-1", {
      role: "SCHOOL_MANAGER",
      email: "manager@greenwich.cm",
      password: "StrongPass1",
    } as never);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "manager@greenwich.cm",
          mustChangePassword: true,
          profileCompleted: false,
          memberships: {
            create: { schoolId: "school-1", role: "SCHOOL_MANAGER" },
          },
        }),
      }),
    );
    expect(mailService.sendTemporaryPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "manager@greenwich.cm" }),
    );
    expect(prisma.schoolStaffAssignment.create).not.toHaveBeenCalled();
    expect(result.userExisted).toBe(false);
    expect(result.onboardingEmailSent).toBe(true);
  });

  it("cree un nouveau surveillant par telephone en PENDING avec code d'activation", async () => {
    prisma.user.create.mockResolvedValue({
      id: "user-phone-1",
      firstName: "Surveillant",
      lastName: "1122",
    });

    const result = await service.createSchoolStaffMember("school-1", {
      role: "SUPERVISOR",
      phone: "699001122",
      pin: "123456",
    } as never);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Surveillant",
          phone: "+237699001122",
          activationStatus: "PENDING",
          memberships: {
            create: { schoolId: "school-1", role: "SUPERVISOR" },
          },
        }),
      }),
    );
    expect(mailService.sendTemporaryPasswordEmail).not.toHaveBeenCalled();
    expect(result.userExisted).toBe(false);
    expect(result.activationRequired).toBe(true);
    expect(typeof (result as { activationCode?: string }).activationCode).toBe(
      "string",
    );
  });

  it("cree l'affectation de fonction quand functionId est fourni a la creation", async () => {
    prisma.schoolStaffFunction.findFirst.mockResolvedValue({ id: "fn-1" });
    prisma.user.create.mockResolvedValue({
      id: "user-2",
      firstName: "Marie",
      lastName: "Ela",
      email: "compta@greenwich.cm",
    });
    prisma.schoolStaffAssignment.create.mockResolvedValue({ id: "assign-1" });

    await service.createSchoolStaffMember("school-1", {
      role: "SCHOOL_ACCOUNTANT",
      email: "compta@greenwich.cm",
      password: "StrongPass1",
      functionId: "fn-1",
    } as never);

    expect(prisma.schoolStaffAssignment.create).toHaveBeenCalledWith({
      data: { schoolId: "school-1", functionId: "fn-1", userId: "user-2" },
    });
  });

  it("rattache un utilisateur existant avec le role choisi sans regenerer d'identifiants", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-existing",
      firstName: "Marc",
      lastName: "Etoundi",
      email: "marc@greenwich.cm",
    });

    const result = await service.createSchoolStaffMember("school-1", {
      role: "SCHOOL_STAFF",
      email: "marc@greenwich.cm",
    } as never);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.schoolMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          userId: "user-existing",
          schoolId: "school-1",
          role: "SCHOOL_STAFF",
        },
      }),
    );
    expect(result.userExisted).toBe(true);
  });

  it("upsert l'affectation de fonction pour un utilisateur existant", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-existing",
      firstName: "Marc",
      lastName: "Etoundi",
      email: "marc@greenwich.cm",
    });
    prisma.schoolStaffFunction.findFirst.mockResolvedValue({ id: "fn-1" });
    prisma.schoolStaffAssignment.upsert.mockResolvedValue({ id: "assign-1" });

    await service.createSchoolStaffMember("school-1", {
      role: "SCHOOL_STAFF",
      email: "marc@greenwich.cm",
      functionId: "fn-1",
    } as never);

    expect(prisma.schoolStaffAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          schoolId_functionId_userId: {
            schoolId: "school-1",
            functionId: "fn-1",
            userId: "user-existing",
          },
        },
      }),
    );
  });
});
