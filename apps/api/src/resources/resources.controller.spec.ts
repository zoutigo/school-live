import "reflect-metadata";
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
  let service: { updateResource: jest.Mock };

  beforeEach(async () => {
    service = {
      updateResource: jest.fn(),
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

  it("exposes PATCH :resourceId to ADMIN and SUPER_ADMIN platform roles, not just TEACHER/SCHOOL_ADMIN", () => {
    const requiredRoles = Reflect.getMetadata(
      ROLES_KEY,
      ResourcesController.prototype.updateResource,
    ) as string[];

    expect(requiredRoles).toEqual(
      expect.arrayContaining([
        "TEACHER",
        "SCHOOL_ADMIN",
        "ADMIN",
        "SUPER_ADMIN",
      ]),
    );
  });
});
