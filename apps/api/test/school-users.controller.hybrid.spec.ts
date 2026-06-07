/**
 * school-users.controller.hybrid.spec.ts
 *
 * Tests for GET /schools/:slug/users with hybrid listMembers:
 * - No role filter  → all user roles + type:"student-only"
 * - role=STUDENT    → student users + student-only
 * - role=TEACHER    → only type:"user" with role TEACHER
 */

import { Test, type TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { SchoolScopeGuard } from "../src/access/school-scope.guard";
import { RolesGuard } from "../src/access/roles.guard";
import { SchoolUsersController } from "../src/school-users/school-users.controller";
import { SchoolUsersService } from "../src/school-users/school-users.service";

const ALLOW_ALL = { canActivate: () => true };
const SCHOOL_ID = "school-1";

function makeHybridResult(
  data: Array<{ type: "user" | "student-only"; roles: string[] }>,
  total = data.length,
) {
  return {
    data,
    total,
    page: 1,
    limit: 20,
    hasMore: false,
  };
}

describe("SchoolUsersController — liste hybride", () => {
  let controller: SchoolUsersController;
  let service: {
    listMembers: jest.Mock;
    getMemberDetail: jest.Mock;
    updateMemberRoles: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listMembers: jest.fn(),
      getMemberDetail: jest.fn(),
      updateMemberRoles: jest.fn(),
    };

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

  // ── Sans filtre de rôle ─────────────────────────────────────────────────────

  describe("GET /schools/:slug/users (sans role)", () => {
    it("retourne data avec type:user ET type:student-only", async () => {
      service.listMembers.mockResolvedValue(
        makeHybridResult([
          { type: "user", roles: ["SCHOOL_ADMIN"] },
          { type: "student-only", roles: ["STUDENT"] },
        ]),
      );

      const result = await controller.list(SCHOOL_ID, {});

      const types = result.data.map((item) => item.type);
      expect(types).toContain("user");
      expect(types).toContain("student-only");
      expect(result.data.find((item) => item.type === "user")?.roles).toContain(
        "SCHOOL_ADMIN",
      );
    });

    it("délègue à service.listMembers sans filtre de rôle", async () => {
      service.listMembers.mockResolvedValue(makeHybridResult([]));

      await controller.list(SCHOOL_ID, {});

      expect(service.listMembers).toHaveBeenCalledWith(SCHOOL_ID, {});
    });
  });

  // ── Avec role=STUDENT ───────────────────────────────────────────────────────

  describe("GET /schools/:slug/users?role=STUDENT", () => {
    it("retourne data avec type:user ET type:student-only", async () => {
      service.listMembers.mockResolvedValue(
        makeHybridResult([
          { type: "user", roles: ["STUDENT"] },
          { type: "student-only", roles: ["STUDENT"] },
        ]),
      );

      const result = await controller.list(SCHOOL_ID, { role: "STUDENT" });

      const types = result.data.map((item) => item.type);
      expect(types).toContain("user");
      expect(types).toContain("student-only");
    });

    it("transmet role=STUDENT au service", async () => {
      service.listMembers.mockResolvedValue(makeHybridResult([]));

      await controller.list(SCHOOL_ID, { role: "STUDENT" });

      expect(service.listMembers).toHaveBeenCalledWith(
        SCHOOL_ID,
        expect.objectContaining({ role: "STUDENT" }),
      );
    });
  });

  // ── Avec role=TEACHER ───────────────────────────────────────────────────────

  describe("GET /schools/:slug/users?role=TEACHER", () => {
    it("retourne seulement des items type:user avec role TEACHER", async () => {
      service.listMembers.mockResolvedValue(
        makeHybridResult([
          { type: "user", roles: ["TEACHER"] },
          { type: "user", roles: ["TEACHER"] },
        ]),
      );

      const result = await controller.list(SCHOOL_ID, { role: "TEACHER" });

      expect(result.data.every((item) => item.type === "user")).toBe(true);
      expect(result.data.some((item) => item.type === "student-only")).toBe(
        false,
      );
    });

    it("transmet role=TEACHER au service", async () => {
      service.listMembers.mockResolvedValue(makeHybridResult([]));

      await controller.list(SCHOOL_ID, { role: "TEACHER" });

      expect(service.listMembers).toHaveBeenCalledWith(
        SCHOOL_ID,
        expect.objectContaining({ role: "TEACHER" }),
      );
    });
  });

  // ── Format de la réponse ────────────────────────────────────────────────────

  describe("format de la réponse", () => {
    it("retourne le résultat du service tel quel (pass-through)", async () => {
      const expected = makeHybridResult(
        [
          { type: "user", roles: ["STUDENT"] },
          { type: "student-only", roles: ["STUDENT"] },
        ],
        2,
      );
      service.listMembers.mockResolvedValue(expected);

      const result = await controller.list(SCHOOL_ID, {});

      expect(result).toEqual(expected);
    });

    it("total est présent dans la réponse", async () => {
      service.listMembers.mockResolvedValue(makeHybridResult([], 42));

      const result = await controller.list(SCHOOL_ID, {});

      expect(result).toHaveProperty("total", 42);
    });

    it("hasMore est présent dans la réponse", async () => {
      service.listMembers.mockResolvedValue({
        data: [],
        total: 50,
        page: 1,
        limit: 20,
        hasMore: true,
      });

      const result = await controller.list(SCHOOL_ID, {});

      expect(result).toHaveProperty("hasMore", true);
    });
  });
});
