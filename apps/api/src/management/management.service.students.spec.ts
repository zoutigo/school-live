import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makeStudent(id: string, firstName: string, lastName: string) {
  return {
    id,
    firstName,
    lastName,
    parentLinks: [],
    enrollments: [],
  };
}

function makePrismaMock(students: ReturnType<typeof makeStudent>[]) {
  return {
    school: {
      findUnique: jest.fn().mockResolvedValue({ activeSchoolYearId: null }),
    },
    student: {
      findMany: jest.fn().mockResolvedValue(students),
    },
    schoolYear: { findFirst: jest.fn() },
    classroom: { findFirst: jest.fn() },
  };
}

describe("ManagementService.listStudentsWithEnrollments", () => {
  function makeService(students: ReturnType<typeof makeStudent>[]) {
    const prisma = makePrismaMock(students);
    const service = new ManagementService(
      prisma as unknown as PrismaService,
      {} as unknown as MailService,
    );
    return { service, prisma };
  }

  it("wraps the result in a paginated envelope with defaults", async () => {
    const students = Array.from({ length: 5 }, (_, i) =>
      makeStudent(`s${i}`, `First${i}`, `Last${i}`),
    );
    const { service } = makeService(students);

    const result = await service.listStudentsWithEnrollments("school-1", {});

    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.students).toHaveLength(5);
    expect(result.hasMore).toBe(false);
  });

  it("applies page/limit and reports hasMore correctly", async () => {
    const students = Array.from({ length: 25 }, (_, i) =>
      makeStudent(`s${i}`, `First${i}`, `Last${i}`),
    );
    const { service } = makeService(students);

    const page1 = await service.listStudentsWithEnrollments("school-1", {
      page: "1",
      limit: "20",
    });
    expect(page1.students).toHaveLength(20);
    expect(page1.total).toBe(25);
    expect(page1.page).toBe(1);
    expect(page1.hasMore).toBe(true);

    const page2 = await service.listStudentsWithEnrollments("school-1", {
      page: "2",
      limit: "20",
    });
    expect(page2.students).toHaveLength(5);
    expect(page2.page).toBe(2);
    expect(page2.hasMore).toBe(false);
  });

  it("returns an empty page (never undefined) when nothing matches", async () => {
    const { service } = makeService([]);

    const result = await service.listStudentsWithEnrollments("school-1", {
      search: "nonexistent",
    });

    expect(result.students).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
