import { NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  class: {
    findFirst: jest.fn(),
  },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService.getClassroom", () => {
  const CLASSROOM_ROW = {
    id: "class-1",
    name: "6e A",
    capacity: 30,
    schoolYear: { id: "sy-1", label: "2025-2026" },
    academicLevel: { id: "lvl-6e", code: "6E", label: "6e" },
    track: null,
    curriculum: { id: "curr-1", name: "Tronc commun" },
    referentTeacher: {
      id: "teacher-1",
      firstName: "Amina",
      lastName: "Fouda",
      email: "amina@example.com",
    },
    _count: { enrollments: 24 },
  };

  it("renvoie la classe avec le compte d'inscriptions actives", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASSROOM_ROW);

    const result = await service.getClassroom("school-1", "class-1");

    expect(prisma.class.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "class-1", schoolId: "school-1" },
        include: expect.objectContaining({
          _count: {
            select: { enrollments: { where: { status: "ACTIVE" } } },
          },
        }),
      }),
    );
    expect(result).toEqual(CLASSROOM_ROW);
  });

  it("lève NotFoundException si la classe n'existe pas dans cette école", async () => {
    prisma.class.findFirst.mockResolvedValue(null);

    await expect(
      service.getClassroom("school-1", "class-unknown"),
    ).rejects.toThrow(NotFoundException);
  });

  it("scope la recherche à l'école (n'expose pas une classe d'une autre école)", async () => {
    prisma.class.findFirst.mockResolvedValue(null);

    await expect(
      service.getClassroom("school-2", "class-1"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.class.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "class-1", schoolId: "school-2" },
      }),
    );
  });
});
