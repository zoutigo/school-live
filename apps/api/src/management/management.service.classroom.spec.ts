import { NotFoundException } from "@nestjs/common";
import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makeClassroom(overrides: Record<string, unknown> = {}) {
  return {
    id: "class-1",
    schoolId: "school-1",
    name: "6eB",
    schoolYear: { id: "sy-1", label: "2025-2026" },
    academicLevel: { id: "al-1", code: "6E", label: "6ème" },
    track: null,
    curriculum: null,
    referentTeacher: {
      id: "teacher-1",
      firstName: "Valery",
      lastName: "MBELE",
      email: "valery@example.com",
    },
    _count: { enrollments: 3 },
    ...overrides,
  };
}

function makeService(classroom: unknown) {
  const prisma = {
    class: {
      findFirst: jest.fn().mockResolvedValue(classroom),
    },
  };
  const service = new ManagementService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
  );
  return { service, prisma };
}

describe("ManagementService.getClassroom", () => {
  it("returns the classroom scoped to the requesting school", async () => {
    const classroom = makeClassroom();
    const { service, prisma } = makeService(classroom);

    const result = await service.getClassroom("school-1", "class-1");

    expect(prisma.class.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "class-1", schoolId: "school-1" },
      }),
    );
    expect(result).toEqual(classroom);
    expect(result.referentTeacher).toEqual(
      expect.objectContaining({ id: "teacher-1" }),
    );
  });

  it("returns a classroom without a referent teacher as null, not an error", async () => {
    const classroom = makeClassroom({ referentTeacher: null });
    const { service } = makeService(classroom);

    const result = await service.getClassroom("school-1", "class-1");

    expect(result.referentTeacher).toBeNull();
  });

  it("throws NotFoundException when the classroom does not exist for this school", async () => {
    const { service } = makeService(null);

    await expect(
      service.getClassroom("school-1", "missing-class"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
