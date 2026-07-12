import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makePrismaMock() {
  const mock = {
    school: { count: jest.fn().mockResolvedValue(0) },
    user: { count: jest.fn().mockResolvedValue(0) },
    student: { count: jest.fn().mockResolvedValue(0) },
    teacher: { count: jest.fn().mockResolvedValue(0) },
    studentGrade: { count: jest.fn().mockResolvedValue(0) },
    platformRoleAssignment: { count: jest.fn().mockResolvedValue(0) },
    schoolMembership: { count: jest.fn().mockResolvedValue(0) },
    resource: { count: jest.fn().mockResolvedValue(0) },
    resourceSubmission: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    ),
  };
  return mock;
}

describe("ManagementService.getIndicators", () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: ManagementService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ManagementService(
      prisma as unknown as PrismaService,
      {} as unknown as MailService,
    );
  });

  it("returns platform-wide counts alongside resource approval counters", async () => {
    prisma.school.count.mockResolvedValueOnce(3);
    prisma.user.count.mockResolvedValueOnce(42);
    prisma.student.count.mockResolvedValueOnce(20);
    prisma.teacher.count.mockResolvedValueOnce(5);
    prisma.studentGrade.count.mockResolvedValueOnce(100);
    prisma.platformRoleAssignment.count.mockResolvedValueOnce(2);
    prisma.schoolMembership.count.mockResolvedValueOnce(3);
    prisma.resource.count
      .mockResolvedValueOnce(4) // assessments without statement
      .mockResolvedValueOnce(6) // assessments without correction
      .mockResolvedValueOnce(1) // exams without statement
      .mockResolvedValueOnce(2); // exams without correction
    prisma.resourceSubmission.count
      .mockResolvedValueOnce(7) // assessments statements to approve
      .mockResolvedValueOnce(8) // assessments corrections to approve
      .mockResolvedValueOnce(9) // exams statements to approve
      .mockResolvedValueOnce(10); // exams corrections to approve

    const result = await service.getIndicators();

    expect(result).toEqual({
      schoolsCount: 3,
      usersCount: 42,
      studentsCount: 20,
      teachersCount: 5,
      gradesCount: 100,
      adminsCount: 2,
      schoolAdminsCount: 3,
      resources: {
        assessments: {
          withoutStatement: 4,
          withoutCorrection: 6,
          statementsToApprove: 7,
          correctionsToApprove: 8,
        },
        exams: {
          withoutStatement: 1,
          withoutCorrection: 2,
          statementsToApprove: 9,
          correctionsToApprove: 10,
        },
      },
    });
  });

  it("scopes the resource counters to the correct kind and submission part", async () => {
    await service.getIndicators();

    expect(prisma.resource.count).toHaveBeenNthCalledWith(1, {
      where: { kind: "ASSESSMENT", statementContent: null },
    });
    expect(prisma.resource.count).toHaveBeenNthCalledWith(2, {
      where: { kind: "ASSESSMENT", correctionContent: null },
    });
    expect(prisma.resource.count).toHaveBeenNthCalledWith(3, {
      where: { kind: "EXAM", statementContent: null },
    });
    expect(prisma.resource.count).toHaveBeenNthCalledWith(4, {
      where: { kind: "EXAM", correctionContent: null },
    });

    expect(prisma.resourceSubmission.count).toHaveBeenNthCalledWith(1, {
      where: {
        part: "STATEMENT",
        status: "AWAITING",
        resource: { kind: "ASSESSMENT" },
      },
    });
    expect(prisma.resourceSubmission.count).toHaveBeenNthCalledWith(2, {
      where: {
        part: "CORRECTION",
        status: "AWAITING",
        resource: { kind: "ASSESSMENT" },
      },
    });
    expect(prisma.resourceSubmission.count).toHaveBeenNthCalledWith(3, {
      where: {
        part: "STATEMENT",
        status: "AWAITING",
        resource: { kind: "EXAM" },
      },
    });
    expect(prisma.resourceSubmission.count).toHaveBeenNthCalledWith(4, {
      where: {
        part: "CORRECTION",
        status: "AWAITING",
        resource: { kind: "EXAM" },
      },
    });
  });
});
