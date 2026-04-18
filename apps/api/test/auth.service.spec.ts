import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../src/auth/auth.service";

describe("AuthService.getMe", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
    mailService as never,
  );

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it("retourne la classe courante de chaque enfant lié quand elle existe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
      parentLinks: [
        {
          student: {
            id: "student-1",
            firstName: "Remi",
            lastName: "Ntamack",
            user: { avatarUrl: null },
            enrollments: [
              {
                class: {
                  name: "6e C",
                },
              },
            ],
          },
        },
      ],
    });

    const result = await service.getMe("parent-1", "school-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "parent-1" },
        select: expect.objectContaining({
          parentLinks: expect.objectContaining({
            where: { schoolId: "school-1" },
          }),
        }),
      }),
    );
    expect(result.linkedStudents).toEqual([
      expect.objectContaining({
        id: "student-1",
        firstName: "Remi",
        lastName: "Ntamack",
        currentEnrollment: {
          class: {
            name: "6e C",
          },
        },
      }),
    ]);
  });

  it("retourne currentEnrollment à null quand aucun enrollment actif n'existe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
      parentLinks: [
        {
          student: {
            id: "student-2",
            firstName: "Paul",
            lastName: "Ntamack",
            user: { avatarUrl: null },
            enrollments: [],
          },
        },
      ],
    });

    const result = await service.getMe("parent-1", "school-1");

    expect(result.linkedStudents).toEqual([
      expect.objectContaining({
        id: "student-2",
        currentEnrollment: null,
      }),
    ]);
  });

  it("rejette si l'utilisateur n'a aucun accès sur l'école", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [],
      parentLinks: [],
    });

    await expect(service.getMe("parent-1", "school-1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
