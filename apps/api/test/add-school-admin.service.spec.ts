import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  schoolMembership: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mailService = {
  sendTemporaryPasswordEmail: jest.fn(),
};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — addSchoolAdmin", () => {
  it("rejette si l'ecole n'existe pas", async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await expect(
      service.addSchoolAdmin("school-missing", { email: "a@b.com" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejette un email invalide", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      slug: "greenwich",
    });

    await expect(
      service.addSchoolAdmin("school-1", { email: "not-an-email" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rattache un utilisateur existant comme SCHOOL_ADMIN de l'ecole", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      slug: "greenwich",
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Jane",
      mustChangePassword: false,
    });
    prisma.schoolMembership.findFirst.mockResolvedValue(null);

    const result = await service.addSchoolAdmin("school-1", {
      email: "Jane@Greenwich.cm",
    });

    expect(prisma.schoolMembership.create).toHaveBeenCalledWith({
      data: { userId: "user-1", schoolId: "school-1", role: "SCHOOL_ADMIN" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      schoolAdmin: {
        id: "user-1",
        email: "jane@greenwich.cm",
        firstName: "Jane",
      },
      userExisted: true,
      setupCompleted: true,
    });
  });

  it("rejette si l'utilisateur est deja membre de cette ecole", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      slug: "greenwich",
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      firstName: "Jane",
      mustChangePassword: false,
    });
    prisma.schoolMembership.findFirst.mockResolvedValue({ id: "member-1" });

    await expect(
      service.addSchoolAdmin("school-1", { email: "jane@greenwich.cm" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.schoolMembership.create).not.toHaveBeenCalled();
  });

  it("cree un nouvel utilisateur SCHOOL_ADMIN et envoie l'email de mot de passe temporaire", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      slug: "greenwich",
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-2",
      firstName: "Paul",
      lastName: "Nkomo",
      email: "paul.nkomo@greenwich.cm",
    });

    const result = await service.addSchoolAdmin("school-1", {
      email: "paul.nkomo@greenwich.cm",
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "paul.nkomo@greenwich.cm",
          mustChangePassword: true,
          profileCompleted: false,
          memberships: {
            create: { schoolId: "school-1", role: "SCHOOL_ADMIN" },
          },
        }),
      }),
    );
    expect(mailService.sendTemporaryPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "paul.nkomo@greenwich.cm",
        schoolSlug: "greenwich",
      }),
    );
    expect(result.userExisted).toBe(false);
    expect(result.setupCompleted).toBe(false);
  });
});
