import "reflect-metadata";
import { Test, type TestingModule } from "@nestjs/testing";
import { ROLES_KEY } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { ResourcesAdminController } from "./resources-admin.controller.js";
import { ResourcesService } from "./resources.service.js";

const ALLOW_ALL = { canActivate: () => true };

function makeAdmin(): AuthenticatedUser {
  return {
    id: "admin-1",
    firstName: "Ada",
    lastName: "Admin",
    profileCompleted: true,
    platformRoles: ["ADMIN"],
    memberships: [],
    activeRole: "ADMIN",
    preferredLocale: "FR",
  };
}

describe("ResourcesAdminController", () => {
  let controller: ResourcesAdminController;
  let service: {
    listAdminSubmissions: jest.Mock;
    updateSubmissionContent: jest.Mock;
    approveSubmission: jest.Mock;
    rejectSubmission: jest.Mock;
    revokeSubmission: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listAdminSubmissions: jest.fn(),
      updateSubmissionContent: jest.fn(),
      approveSubmission: jest.fn(),
      rejectSubmission: jest.fn(),
      revokeSubmission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesAdminController],
      providers: [{ provide: ResourcesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(RolesGuard)
      .useValue(ALLOW_ALL)
      .compile();

    controller = module.get(ResourcesAdminController);
  });

  it("is restricted to ADMIN and SUPER_ADMIN platform roles", () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      ResourcesAdminController,
    ) as string[];

    expect(requiredRoles).toEqual(["ADMIN", "SUPER_ADMIN"]);
  });

  it("delegates listAdminSubmissions to the service", async () => {
    service.listAdminSubmissions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const query = { part: "correction" as const };
    const result = await controller.listAdminSubmissions(query);

    expect(service.listAdminSubmissions).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it("delegates updateSubmissionContent with the current admin, submissionId and payload", async () => {
    const admin = makeAdmin();
    service.updateSubmissionContent.mockResolvedValue({
      id: "submission-1",
      content: "<p>Corrigé</p>",
    });

    const payload = {
      content: "<p>Corrigé</p>",
      attachments: [] as never[],
    };
    await controller.updateSubmissionContent(admin, "submission-1", payload);

    expect(service.updateSubmissionContent).toHaveBeenCalledWith(
      admin,
      "submission-1",
      payload,
    );
  });

  it("delegates approveSubmission with the current admin and submissionId", async () => {
    const admin = makeAdmin();
    service.approveSubmission.mockResolvedValue({ id: "resource-1" });

    await controller.approveSubmission(admin, "submission-1");

    expect(service.approveSubmission).toHaveBeenCalledWith(
      admin,
      "submission-1",
    );
  });

  it("delegates rejectSubmission with the current admin, submissionId and reason payload", async () => {
    const admin = makeAdmin();
    service.rejectSubmission.mockResolvedValue({
      id: "submission-1",
      status: "REJECTED",
    });

    await controller.rejectSubmission(admin, "submission-1", {
      reason: "Contenu incomplet",
    });

    expect(service.rejectSubmission).toHaveBeenCalledWith(
      admin,
      "submission-1",
      { reason: "Contenu incomplet" },
    );
  });

  it("delegates revokeSubmission with the current admin and submissionId", async () => {
    const admin = makeAdmin();
    service.revokeSubmission.mockResolvedValue({ id: "resource-1" });

    await controller.revokeSubmission(admin, "submission-1");

    expect(service.revokeSubmission).toHaveBeenCalledWith(
      admin,
      "submission-1",
    );
  });
});
