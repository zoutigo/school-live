import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { AnyMembershipRolesGuard } from "../access/any-membership-roles.guard.js";
import { ROLES_KEY } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { ResourcesController } from "./resources.controller.js";
import { ResourcesService } from "./resources.service.js";

const ALLOW_ALL = { canActivate: () => true };

function makeUser(): AuthenticatedUser {
  return {
    id: "teacher-1",
    firstName: "Paul",
    lastName: "Martin",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    activeRole: "TEACHER",
    preferredLocale: "FR",
  };
}

describe("ResourcesController", () => {
  let controller: ResourcesController;
  let service: {
    updateResource: jest.Mock;
    saveSubmissionDraft: jest.Mock;
    submitSubmission: jest.Mock;
    listSubmissions: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      updateResource: jest.fn(),
      saveSubmissionDraft: jest.fn(),
      submitSubmission: jest.fn(),
      listSubmissions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [
        { provide: ResourcesService, useValue: service },
        { provide: MediaClientService, useValue: {} },
        { provide: InlineMediaService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(AnyMembershipRolesGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(RolesGuard)
      .useValue(ALLOW_ALL)
      .compile();

    controller = module.get(ResourcesController);
  });

  it("delegates updateResource to the service with the current user, id and payload", async () => {
    const user = makeUser();
    service.updateResource.mockResolvedValue({ id: "resource-1" });

    const result = await controller.updateResource(user, "resource-1", {
      title: "x",
    });

    expect(service.updateResource).toHaveBeenCalledWith(user, "resource-1", {
      title: "x",
    });
    expect(result).toEqual({ id: "resource-1" });
  });

  it("exposes PATCH :resourceId to every role allowed on the module (national module, no method-level restriction)", () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      ResourcesController,
    ) as string[];

    expect(requiredRoles).toEqual(
      expect.arrayContaining([
        "TEACHER",
        "SCHOOL_ADMIN",
        "PARENT",
        "STUDENT",
        "ADMIN",
        "SUPER_ADMIN",
      ]),
    );
  });

  it("saveSubmissionDraft maps the 'statement' url segment to the STATEMENT enum", async () => {
    const user = makeUser();
    service.saveSubmissionDraft.mockResolvedValue({ id: "submission-1" });

    await controller.saveSubmissionDraft(user, "resource-1", "statement", {
      content: "<p>x</p>",
      attachments: [],
    });

    expect(service.saveSubmissionDraft).toHaveBeenCalledWith(
      user,
      "resource-1",
      "STATEMENT",
      { content: "<p>x</p>", attachments: [] },
    );
  });

  it("saveSubmissionDraft maps the 'correction' url segment to the CORRECTION enum", async () => {
    const user = makeUser();
    service.saveSubmissionDraft.mockResolvedValue({ id: "submission-1" });

    await controller.saveSubmissionDraft(user, "resource-1", "correction", {
      content: "<p>x</p>",
      attachments: [],
    });

    expect(service.saveSubmissionDraft).toHaveBeenCalledWith(
      user,
      "resource-1",
      "CORRECTION",
      { content: "<p>x</p>", attachments: [] },
    );
  });

  it("saveSubmissionDraft rejects an invalid part segment", () => {
    const user = makeUser();

    expect(() =>
      controller.saveSubmissionDraft(user, "resource-1", "bogus", {
        content: "<p>x</p>",
        attachments: [],
      }),
    ).toThrow(BadRequestException);
    expect(service.saveSubmissionDraft).not.toHaveBeenCalled();
  });

  it("submitSubmission delegates to the service with resourceId and submissionId", async () => {
    const user = makeUser();
    service.submitSubmission.mockResolvedValue({ id: "submission-1" });

    await controller.submitSubmission(user, "resource-1", "submission-1");

    expect(service.submitSubmission).toHaveBeenCalledWith(
      user,
      "resource-1",
      "submission-1",
    );
  });

  it("listSubmissions maps the part query param and delegates to the service", async () => {
    const user = makeUser();
    service.listSubmissions.mockResolvedValue([]);

    await controller.listSubmissions(user, "resource-1", "correction");

    expect(service.listSubmissions).toHaveBeenCalledWith(
      user,
      "resource-1",
      "CORRECTION",
    );
  });
});
