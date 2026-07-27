import { BadRequestException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findUnique: jest.fn(),
  },
  class: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  student: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  enrollment: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
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
  prisma.student.findFirst.mockResolvedValue({ id: "student-1" });
});

describe("ManagementService — capacite de classe", () => {
  describe("createStudent", () => {
    it("refuse d'ajouter un eleve quand la classe est deja pleine", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: "class-1",
        schoolYearId: "year-1",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "6eme A",
        capacity: 30,
      });
      prisma.enrollment.count.mockResolvedValue(30);

      await expect(
        service.createStudent("school-1", {
          firstName: "Jean",
          lastName: "Dupont",
          classId: "class-1",
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it("accepte le dernier eleve disponible (capacite tout juste atteinte apres coup)", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: "class-1",
        schoolYearId: "year-1",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "6eme A",
        capacity: 30,
      });
      prisma.enrollment.count.mockResolvedValue(29);
      prisma.student.create.mockResolvedValue({ id: "student-1" });

      const result = await service.createStudent("school-1", {
        firstName: "Jean",
        lastName: "Dupont",
        classId: "class-1",
      } as never);

      expect(prisma.student.create).toHaveBeenCalled();
      expect(prisma.enrollment.create).toHaveBeenCalled();
      expect(result).toEqual({ id: "student-1" });
    });

    it("n'applique aucune limite quand la classe n'a pas de capacite definie", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: "class-1",
        schoolYearId: "year-1",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "6eme A",
        capacity: null,
      });
      prisma.student.create.mockResolvedValue({ id: "student-2" });

      await service.createStudent("school-1", {
        firstName: "Paul",
        lastName: "Biya",
        classId: "class-1",
      } as never);

      expect(prisma.enrollment.count).not.toHaveBeenCalled();
      expect(prisma.student.create).toHaveBeenCalled();
    });
  });

  describe("createStudentEnrollment", () => {
    it("refuse une nouvelle inscription active dans une classe pleine", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: "class-full",
        schoolYearId: "year-1",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "5eme B",
        capacity: 2,
      });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.enrollment.count.mockResolvedValue(2);

      await expect(
        service.createStudentEnrollment("school-1", "student-1", {
          classId: "class-full",
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.enrollment.upsert).not.toHaveBeenCalled();
    });

    it("n'applique pas la limite si l'eleve est deja dans cette classe (pas de changement de classe)", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: "class-full",
        schoolYearId: "year-1",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "5eme B",
        capacity: 2,
      });
      prisma.enrollment.findUnique.mockResolvedValue({
        classId: "class-full",
      });
      prisma.enrollment.upsert.mockResolvedValue({
        id: "enr-1",
        schoolYearId: "year-1",
        status: "ACTIVE",
      });
      prisma.school.findUnique.mockResolvedValue({
        activeSchoolYearId: "year-1",
      });

      await service.createStudentEnrollment("school-1", "student-1", {
        classId: "class-full",
      } as never);

      expect(prisma.enrollment.count).not.toHaveBeenCalled();
      expect(prisma.enrollment.upsert).toHaveBeenCalled();
    });
  });

  describe("updateStudentEnrollment", () => {
    it("refuse de reactiver un eleve dans une classe pleine", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        classId: "class-full",
        schoolYearId: "year-1",
        status: "WITHDRAWN",
      });
      prisma.class.findUnique.mockResolvedValue({
        name: "4eme C",
        capacity: 1,
      });
      prisma.enrollment.count.mockResolvedValue(1);

      await expect(
        service.updateStudentEnrollment("school-1", "student-1", "enr-1", {
          status: "ACTIVE",
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it("autorise un changement de statut qui ne repasse pas par ACTIVE sans verifier la capacite", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        classId: "class-full",
        schoolYearId: "year-1",
        status: "ACTIVE",
      });
      prisma.enrollment.update.mockResolvedValue({
        id: "enr-1",
        schoolYearId: "year-1",
        status: "WITHDRAWN",
      });
      prisma.school.findUnique.mockResolvedValue({
        activeSchoolYearId: "year-1",
      });

      await service.updateStudentEnrollment("school-1", "student-1", "enr-1", {
        status: "WITHDRAWN",
      } as never);

      expect(prisma.class.findUnique).not.toHaveBeenCalled();
      expect(prisma.enrollment.update).toHaveBeenCalled();
    });
  });

  describe("bulkUpdateEnrollmentStatus", () => {
    it("refuse le lot si la classe n'a pas assez de places pour tous les eleves reactives", async () => {
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: "enr-1",
          classId: "class-full",
          schoolYearId: "year-1",
          status: "WITHDRAWN",
        },
        {
          id: "enr-2",
          classId: "class-full",
          schoolYearId: "year-1",
          status: "WITHDRAWN",
        },
      ]);
      prisma.class.findUnique.mockResolvedValue({
        name: "3eme D",
        capacity: 20,
      });
      prisma.enrollment.count.mockResolvedValue(19);

      await expect(
        service.bulkUpdateEnrollmentStatus("school-1", {
          enrollmentIds: ["enr-1", "enr-2"],
          status: "ACTIVE",
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.enrollment.updateMany).not.toHaveBeenCalled();
    });

    it("accepte le lot quand la capacite restante couvre tous les eleves reactives", async () => {
      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: "enr-1",
          classId: "class-full",
          schoolYearId: "year-1",
          status: "WITHDRAWN",
        },
      ]);
      prisma.class.findUnique.mockResolvedValue({
        name: "3eme D",
        capacity: 20,
      });
      prisma.enrollment.count.mockResolvedValue(19);
      prisma.enrollment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkUpdateEnrollmentStatus("school-1", {
        enrollmentIds: ["enr-1"],
        status: "ACTIVE",
      } as never);

      expect(prisma.enrollment.updateMany).toHaveBeenCalled();
      expect(result).toEqual({ success: true, updatedCount: 1 });
    });
  });
});
