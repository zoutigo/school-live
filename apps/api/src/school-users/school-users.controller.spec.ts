import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolUsersController } from "./school-users.controller.js";
import { SchoolUsersService } from "./school-users.service.js";
import type { ListSchoolUsersQueryDto } from "./dto/list-school-users-query.dto.js";

const ALLOW_ALL = { canActivate: () => true };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";

function makeListResult(overrides: object = {}) {
  return {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
    ...overrides,
  };
}

function makeDetailResult(overrides: object = {}) {
  return {
    id: "user-1",
    firstName: "Ebelle",
    lastName: "Marie",
    email: "m.ebelle@test.cm",
    phone: "+237691234567",
    gender: "F",
    avatarUrl: null,
    roles: ["TEACHER"],
    activationStatus: "ACTIVE",
    profileCompleted: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    lastLoginAt: null,
    enrollments: [],
    children: [],
    ...overrides,
  };
}

const makeServiceMock = () => ({
  listMembers: jest.fn().mockResolvedValue(makeListResult()),
  getMemberDetail: jest.fn().mockResolvedValue(makeDetailResult()),
  updateMemberRoles: jest.fn().mockResolvedValue({ roles: ["TEACHER"] }),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SchoolUsersController", () => {
  let controller: SchoolUsersController;
  let service: ReturnType<typeof makeServiceMock>;

  beforeEach(async () => {
    service = makeServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolUsersController],
      providers: [{ provide: SchoolUsersService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(SchoolScopeGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(RolesGuard)
      .useValue(ALLOW_ALL)
      .compile();

    controller = module.get(SchoolUsersController);
  });

  // ── Unitaires ────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("délègue à service.listMembers avec schoolId et query", async () => {
      const query: ListSchoolUsersQueryDto = {
        search: "Kou",
        page: 1,
        limit: 20,
      };
      await controller.list(SCHOOL_ID, query);
      expect(service.listMembers).toHaveBeenCalledWith(SCHOOL_ID, query);
    });

    it("retourne le résultat du service tel quel", async () => {
      const expected = makeListResult({ total: 5 });
      service.listMembers.mockResolvedValueOnce(expected);
      const result = await controller.list(SCHOOL_ID, {});
      expect(result).toEqual(expected);
    });

    it("fonctionne avec une query vide", async () => {
      await controller.list(SCHOOL_ID, {});
      expect(service.listMembers).toHaveBeenCalledWith(SCHOOL_ID, {});
    });

    it("transmet le filtre de rôle au service", async () => {
      const query: ListSchoolUsersQueryDto = { role: "TEACHER" };
      await controller.list(SCHOOL_ID, query);
      expect(service.listMembers).toHaveBeenCalledWith(
        SCHOOL_ID,
        expect.objectContaining({ role: "TEACHER" }),
      );
    });
  });

  describe("getDetail", () => {
    it("délègue à service.getMemberDetail avec schoolId et userId", async () => {
      await controller.getDetail(SCHOOL_ID, "user-1");
      expect(service.getMemberDetail).toHaveBeenCalledWith(SCHOOL_ID, "user-1");
    });

    it("retourne le détail du service tel quel", async () => {
      const expected = makeDetailResult({
        enrollments: [
          { id: "enr-1", className: "6e A", schoolYear: "2025-2026" },
        ],
      });
      service.getMemberDetail.mockResolvedValueOnce(expected);
      const result = await controller.getDetail(SCHOOL_ID, "user-1");
      expect(result).toEqual(expected);
    });

    it("propage NotFoundException si l'utilisateur n'est pas dans l'école", async () => {
      service.getMemberDetail.mockRejectedValueOnce(
        new NotFoundException(
          "Cet utilisateur n'est pas membre de cet établissement.",
        ),
      );
      await expect(controller.getDetail(SCHOOL_ID, "unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateRoles", () => {
    it("délègue à service.updateMemberRoles avec schoolId, userId et dto", async () => {
      const dto = { roles: ["TEACHER", "PARENT"] as never[] };
      await controller.updateRoles(SCHOOL_ID, "user-1", dto);
      expect(service.updateMemberRoles).toHaveBeenCalledWith(
        SCHOOL_ID,
        "user-1",
        dto,
      );
    });

    it("retourne les rôles mis à jour", async () => {
      service.updateMemberRoles.mockResolvedValueOnce({
        roles: ["TEACHER", "PARENT"],
      });
      const result = await controller.updateRoles(SCHOOL_ID, "user-1", {
        roles: ["TEACHER", "PARENT"] as never[],
      });
      expect(result).toEqual({ roles: ["TEACHER", "PARENT"] });
    });

    it("propage BadRequestException si le tableau de rôles est vide", async () => {
      service.updateMemberRoles.mockRejectedValueOnce(
        new BadRequestException("Au moins un rôle est requis."),
      );
      await expect(
        controller.updateRoles(SCHOOL_ID, "user-1", { roles: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("propage NotFoundException si l'utilisateur n'est pas membre", async () => {
      service.updateMemberRoles.mockRejectedValueOnce(
        new NotFoundException(
          "Cet utilisateur n'est pas membre de cet établissement.",
        ),
      );
      await expect(
        controller.updateRoles(SCHOOL_ID, "ghost", {
          roles: ["TEACHER"] as never[],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
