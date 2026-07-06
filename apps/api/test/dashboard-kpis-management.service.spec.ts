import { NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: { findUnique: jest.fn() },
  class: { count: jest.fn() },
  enrollment: { findMany: jest.fn() },
  teacherClassSubject: { findMany: jest.fn() },
  parentStudent: { findMany: jest.fn() },
  room: { count: jest.fn() },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — getDashboardKpis", () => {
  it("lève une NotFoundException si l'école n'existe pas", async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await expect(service.getDashboardKpis("school-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("renvoie des compteurs à zéro si aucune année scolaire active n'est définie", async () => {
    prisma.school.findUnique.mockResolvedValue({
      activeSchoolYearId: null,
      activeSchoolYear: null,
      _count: { rooms: 4 },
    });

    const result = await service.getDashboardKpis("school-1");

    expect(result).toEqual({
      academicYear: null,
      classesCount: 0,
      studentsCount: 0,
      teachersCount: 0,
      subjectsCount: 0,
      parentsCount: 0,
      roomsCount: 4,
    });
    expect(prisma.class.count).not.toHaveBeenCalled();
  });

  it("calcule les KPI relatifs à l'année scolaire active, sauf les salles", async () => {
    prisma.school.findUnique.mockResolvedValue({
      activeSchoolYearId: "year-1",
      activeSchoolYear: { id: "year-1", label: "2025-2026" },
      _count: { rooms: 7 },
    });
    prisma.class.count.mockResolvedValue(12);
    prisma.enrollment.findMany.mockResolvedValue([
      { studentId: "s1" },
      { studentId: "s2" },
      { studentId: "s3" },
    ]);
    prisma.teacherClassSubject.findMany.mockResolvedValue([
      { teacherUserId: "t1", subjectId: "math" },
      { teacherUserId: "t1", subjectId: "physics" },
      { teacherUserId: "t2", subjectId: "math" },
    ]);
    prisma.parentStudent.findMany.mockResolvedValue([
      { parentUserId: "p1" },
      { parentUserId: "p2" },
    ]);
    prisma.room.count.mockResolvedValue(7);

    const result = await service.getDashboardKpis("school-1");

    expect(prisma.class.count).toHaveBeenCalledWith({
      where: { schoolId: "school-1", schoolYearId: "year-1" },
    });
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { schoolId: "school-1", schoolYearId: "year-1", status: "ACTIVE" },
      distinct: ["studentId"],
      select: { studentId: true },
    });
    expect(prisma.room.count).toHaveBeenCalledWith({
      where: { schoolId: "school-1" },
    });

    expect(result).toEqual({
      academicYear: { id: "year-1", label: "2025-2026" },
      classesCount: 12,
      studentsCount: 3,
      teachersCount: 2,
      subjectsCount: 2,
      parentsCount: 2,
      roomsCount: 7,
    });
  });
});
