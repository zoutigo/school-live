import { PromotionDecisionNotificationsProjectionService } from "../src/notifications/promotion-decision-notifications-projection.service";

describe("PromotionDecisionNotificationsProjectionService", () => {
  function buildReport(overrides?: Record<string, unknown>) {
    return {
      decision: "PROMOTED",
      studentId: "student-1",
      student: {
        firstName: "Eloi",
        lastName: "Talla",
        user: null,
        parentLinks: [
          {
            parent: { id: "parent-1", activationStatus: "ACTIVE" },
          },
          {
            parent: { id: "parent-suspended", activationStatus: "SUSPENDED" },
          },
        ],
      },
      nextAcademicLevel: { label: "5ème" },
      school: { slug: "college-vogt-qa" },
      ...overrides,
    };
  }

  function buildPrisma(overrides?: {
    report?: unknown;
    pushTokens?: Array<{ token: string }>;
  }) {
    return {
      studentTermReport: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            overrides && "report" in overrides ? overrides.report : buildReport(),
          ),
      },
      mobilePushToken: {
        findMany: jest.fn().mockResolvedValue(overrides?.pushTokens ?? []),
      },
    };
  }

  function buildPushService() {
    return { sendPromotionDecisionNotification: jest.fn() };
  }

  it("does nothing when the report cannot be found", async () => {
    const prisma = buildPrisma({ report: null });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(
      pushService.sendPromotionDecisionNotification,
    ).not.toHaveBeenCalled();
  });

  it("does nothing when the report has no decision yet", async () => {
    const prisma = buildPrisma({ report: buildReport({ decision: null }) });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(
      pushService.sendPromotionDecisionNotification,
    ).not.toHaveBeenCalled();
  });

  it("does nothing when there is no active student user nor active parent", async () => {
    const prisma = buildPrisma({
      report: buildReport({
        student: {
          firstName: "Eloi",
          lastName: "Talla",
          user: null,
          parentLinks: [
            { parent: { id: "parent-suspended", activationStatus: "SUSPENDED" } },
          ],
        },
      }),
    });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(
      pushService.sendPromotionDecisionNotification,
    ).not.toHaveBeenCalled();
  });

  it("notifies active parents and active student user with a PROMOTED message and the target level", async () => {
    const prisma = buildPrisma({
      report: buildReport({
        student: {
          firstName: "Eloi",
          lastName: "Talla",
          user: { id: "student-user-1", activationStatus: "ACTIVE" },
          parentLinks: [
            { parent: { id: "parent-1", activationStatus: "ACTIVE" } },
            { parent: { id: "parent-suspended", activationStatus: "SUSPENDED" } },
          ],
        },
      }),
      pushTokens: [{ token: "ExponentPushToken[abc]" }],
    });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["student-user-1", "parent-1"] },
          isActive: true,
        }),
      }),
    );
    expect(pushService.sendPromotionDecisionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["ExponentPushToken[abc]"],
        body: expect.stringContaining("Eloi Talla est admis(e) en 5ème"),
        data: expect.objectContaining({
          type: "PROMOTION_DECISION",
          schoolSlug: "college-vogt-qa",
          studentId: "student-1",
          decision: "PROMOTED",
        }),
      }),
    );
  });

  it("builds a REPEATED message with the repeated level", async () => {
    const prisma = buildPrisma({
      report: buildReport({ decision: "REPEATED", nextAcademicLevel: { label: "6ème" } }),
    });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(pushService.sendPromotionDecisionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Eloi Talla redouble en 6ème"),
        data: expect.objectContaining({ decision: "REPEATED" }),
      }),
    );
  });

  it("builds a generic LEFT message without a target level", async () => {
    const prisma = buildPrisma({
      report: buildReport({ decision: "LEFT", nextAcademicLevel: null }),
    });
    const pushService = buildPushService();
    const service = new PromotionDecisionNotificationsProjectionService(
      prisma as never,
      pushService as never,
    );

    await service.project({ schoolId: "school-1", reportId: "report-1" });

    expect(pushService.sendPromotionDecisionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Eloi Talla"),
        data: expect.objectContaining({ decision: "LEFT" }),
      }),
    );
  });
});
