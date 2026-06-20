import { BadRequestException } from "@nestjs/common";
import { TestsController } from "../src/tests/tests.controller";

describe("TestsController", () => {
  const testsService = {
    listCampaigns: jest.fn(),
    getCampaign: jest.fn(),
    getTestCase: jest.fn(),
    createExecution: jest.fn(),
    listMyExecutions: jest.fn(),
    getMyExecution: jest.fn(),
  };

  const controller = new TestsController(testsService as never);

  const user = {
    id: "user-1",
    isTester: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
    profileCompleted: true,
    firstName: "Valery",
    lastName: "MBELE",
  };

  beforeEach(() => {
    Object.values(testsService).forEach((fn) => fn.mockReset());
  });

  it("delegates campaign listing and detail retrieval to the service", async () => {
    await controller.listCampaigns(user);
    expect(testsService.listCampaigns).toHaveBeenCalledWith(user);

    await controller.getCampaign(user, "camp-1");
    expect(testsService.getCampaign).toHaveBeenCalledWith(user, "camp-1");

    await controller.getTestCase(user, "case-1");
    expect(testsService.getTestCase).toHaveBeenCalledWith(user, "case-1");
  });

  it("delegates execution listing and detail retrieval to the service", async () => {
    const query = { status: "FAILED" as const };
    await controller.listMyExecutions(user, query);
    expect(testsService.listMyExecutions).toHaveBeenCalledWith(user, query);

    await controller.getMyExecution(user, "exec-1");
    expect(testsService.getMyExecution).toHaveBeenCalledWith(user, "exec-1");
  });

  it("rejects invalid execution status values", async () => {
    expect(() =>
      controller.createExecution(
        user,
        "case-1",
        { status: "NOPE", resultText: "Observed" },
        [],
      ),
    ).toThrow(BadRequestException);
  });

  it("normalizes multipart execution payload before delegating", async () => {
    const attachment = {
      originalname: "capture.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
      size: 1024,
    };

    await controller.createExecution(
      user,
      "case-1",
      {
        status: "FAILED",
        resultText: "Scenario failed",
        comment: "Button hidden",
        deviceInfo: "android",
        appVersion: "1.0.0",
      },
      [attachment],
    );

    expect(testsService.createExecution).toHaveBeenCalledWith(
      user,
      "case-1",
      {
        status: "FAILED",
        resultText: "Scenario failed",
        comment: "Button hidden",
        deviceInfo: "android",
        appVersion: "1.0.0",
      },
      [attachment],
    );
  });
});
