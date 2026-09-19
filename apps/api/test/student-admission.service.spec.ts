import { NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findUnique: jest.fn(),
  },
  schoolYear: {
    findFirst: jest.fn(),
  },
  academicLevel: {
    findFirst: jest.fn(),
  },
  track: {
    findFirst: jest.fn(),
  },
  student: {
    create: jest.fn(),
  },
  studentAdmission: {
    create: jest.fn(),
  },
  enrollment: {
    findMany: jest.fn(),
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
    activeSchoolYearId: "year-active",
  });
  prisma.academicLevel.findFirst.mockResolvedValue({ id: "level-1" });
  prisma.student.create.mockResolvedValue({
    id: "student-new",
    firstName: "Awa",
    lastName: "Njoya",
  });
  prisma.studentAdmission.create.mockResolvedValue({
    id: "admission-1",
    studentId: "student-new",
    schoolYearId: "year-active",
    academicLevelId: "level-1",
  });
});

describe("ManagementService — admission d'un nouvel eleve", () => {
  describe("createStudentAdmission", () => {
    it("cree l'eleve et son admission SANS creer d'Enrollment (pas de classe a l'admission)", async () => {
      const result = await service.createStudentAdmission(
        "school-1",
        "registrar-1",
        {
          firstName: "Awa",
          lastName: "Njoya",
          academicLevelId: "level-1",
        } as never,
      );

      expect(prisma.student.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: "school-1",
          firstName: "Awa",
          lastName: "Njoya",
        }),
      });
      expect(prisma.studentAdmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: "school-1",
          studentId: "student-new",
          schoolYearId: "year-active",
          academicLevelId: "level-1",
          createdByUserId: "registrar-1",
        }),
      });
      expect(result).toEqual({
        student: expect.objectContaining({ id: "student-new" }),
        admission: expect.objectContaining({ id: "admission-1" }),
      });
      // Point clé de la fonctionnalité : aucun Enrollment créé à ce stade.
      expect(
        (prisma as unknown as { enrollment: { create?: jest.Mock } }).enrollment
          .create,
      ).toBeUndefined();
    });

    it("refuse si le niveau academique n'existe pas pour cette ecole", async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.createStudentAdmission("school-1", "registrar-1", {
          firstName: "Awa",
          lastName: "Njoya",
          academicLevelId: "level-inconnu",
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it("refuse si l'annee scolaire ciblee n'appartient pas a cette ecole", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue(null);

      await expect(
        service.createStudentAdmission("school-1", "registrar-1", {
          firstName: "Awa",
          lastName: "Njoya",
          academicLevelId: "level-1",
          schoolYearId: "year-autre-ecole",
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it("refuse si la filiere n'existe pas pour cette ecole", async () => {
      prisma.track.findFirst.mockResolvedValue(null);

      await expect(
        service.createStudentAdmission("school-1", "registrar-1", {
          firstName: "Awa",
          lastName: "Njoya",
          academicLevelId: "level-1",
          trackId: "track-inconnu",
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });
  });

  describe("listUnassignedEnrollmentPool", () => {
    it("ne retourne que les enrollments confirmes sans classe assignee pour l'annee active", async () => {
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: "enr-1",
          studentId: "student-new",
          student: { id: "student-new", firstName: "Awa", lastName: "Njoya" },
        },
      ]);

      const result = await service.listUnassignedEnrollmentPool("school-1");

      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: "school-1",
            schoolYearId: "year-active",
            classId: null,
            status: "ACTIVE",
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
