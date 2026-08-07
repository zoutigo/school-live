import { ForbiddenException } from "@nestjs/common";
import { ManagementService } from "./management.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makeUser(
  id: string,
  memberships: Array<{
    schoolId: string;
    role: AuthenticatedUser["memberships"][number]["role"];
  }>,
): AuthenticatedUser {
  return {
    id,
    platformRoles: [],
    memberships,
    profileCompleted: true,
    firstName: "Test",
    lastName: "User",
  };
}

function makePrismaMock(input: {
  student: { id: string; schoolId: string } | null;
  parentLink: { id: string } | null;
  events?: unknown[];
  activeSchoolYearId?: string | null;
}) {
  return {
    student: {
      findFirst: jest.fn().mockResolvedValue(input.student),
    },
    parentStudent: {
      findFirst: jest.fn().mockResolvedValue(input.parentLink),
    },
    school: {
      findUnique: jest.fn().mockResolvedValue({
        activeSchoolYearId: input.activeSchoolYearId ?? "sy-1",
      }),
    },
    studentLifeEvent: {
      findMany: jest.fn().mockResolvedValue(input.events ?? []),
    },
  };
}

describe("ManagementService.listStudentLifeEvents — self (STUDENT) access", () => {
  function makeService(prisma: ReturnType<typeof makePrismaMock>) {
    return new ManagementService(
      prisma as unknown as PrismaService,
      {} as unknown as MailService,
    );
  }

  it("allows a STUDENT to read their own life-events", async () => {
    const prisma = makePrismaMock({
      student: { id: "student-1", schoolId: "school-1" },
      parentLink: null,
      events: [{ id: "evt-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("user-1", [
      { schoolId: "school-1", role: "STUDENT" },
    ]);

    const result = await service.listStudentLifeEvents(
      "school-1",
      user,
      "student-1",
      { scope: "all" },
    );

    expect(result).toEqual([{ id: "evt-1" }]);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-1",
          userId: "user-1",
        }),
      }),
    );
  });

  it("forbids a STUDENT from reading another student's life-events", async () => {
    const prisma = makePrismaMock({
      student: { id: "student-1", schoolId: "school-1" },
      parentLink: null,
    });
    const service = makeService(prisma);
    const user = makeUser("user-1", [
      { schoolId: "school-1", role: "STUDENT" },
    ]);

    await expect(
      service.listStudentLifeEvents("school-1", user, "student-2", {
        scope: "all",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("still allows a PARENT to read their linked child's life-events (regression)", async () => {
    const prisma = makePrismaMock({
      student: { id: "child-1", schoolId: "school-1" },
      parentLink: { id: "link-1" },
      events: [{ id: "evt-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("user-1", [{ schoolId: "school-1", role: "PARENT" }]);

    const result = await service.listStudentLifeEvents(
      "school-1",
      user,
      "child-1",
      { scope: "all" },
    );

    expect(result).toEqual([{ id: "evt-1" }]);
  });
});
