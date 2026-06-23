import { Test, type TestingModule } from "@nestjs/testing";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { BadgesController } from "./badges.controller.js";
import { BadgesService } from "./badges.service.js";
import type { MarkReadDto } from "./dto/mark-read.dto.js";

const ALLOW_ALL = { canActivate: () => true };

function makeUser(): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
  };
}

describe("BadgesController", () => {
  let controller: BadgesController;
  let service: { getUnreadSummary: jest.Mock; markRead: jest.Mock };

  beforeEach(async () => {
    service = {
      getUnreadSummary: jest.fn(),
      markRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgesController],
      providers: [{ provide: BadgesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(SchoolScopeGuard)
      .useValue(ALLOW_ALL)
      .compile();

    controller = module.get(BadgesController);
  });

  it("delegates getUnreadSummary to the service with the current user and school id", async () => {
    const user = makeUser();
    service.getUnreadSummary.mockResolvedValue({ total: 0 });

    const result = await controller.getUnreadSummary(user, "school-1");

    expect(service.getUnreadSummary).toHaveBeenCalledWith(user, "school-1");
    expect(result).toEqual({ total: 0 });
  });

  it("delegates markRead to the service with scope and scopeRefId from the dto", async () => {
    const user = makeUser();
    const dto: MarkReadDto = { scope: "NOTES", scopeRefId: "student-1" };
    service.markRead.mockResolvedValue({ ok: true });

    const result = await controller.markRead(user, "school-1", dto);

    expect(service.markRead).toHaveBeenCalledWith(
      user,
      "NOTES",
      "student-1",
    );
    expect(result).toEqual({ ok: true });
  });

  it("overrides scopeRefId with the resolved school id for FEED, ignoring the dto value", async () => {
    const user = makeUser();
    const dto: MarkReadDto = { scope: "FEED", scopeRefId: "ignored" };
    service.markRead.mockResolvedValue({ ok: true });

    await controller.markRead(user, "school-1", dto);

    expect(service.markRead).toHaveBeenCalledWith(user, "FEED", "school-1");
  });

  it("throws a bad request when scopeRefId is missing for a non-FEED scope", () => {
    const user = makeUser();
    const dto: MarkReadDto = { scope: "NOTES" };

    expect(() => controller.markRead(user, "school-1", dto)).toThrow(
      "scopeRefId is required",
    );
    expect(service.markRead).not.toHaveBeenCalled();
  });
});
