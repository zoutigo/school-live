/**
 * student-management.controller.spec.ts
 *
 * Unit tests for StudentManagementController — delegates correctly to
 * StudentManagementService and SchoolUsersService.
 */

import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../src/auth/guards/jwt-auth.guard";
import { SchoolScopeGuard } from "../src/access/school-scope.guard";
import { RolesGuard } from "../src/access/roles.guard";
import { StudentManagementController } from "../src/student-management/student-management.controller";
import { StudentManagementService } from "../src/student-management/student-management.service";
import { SchoolUsersService } from "../src/school-users/school-users.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOW_ALL = { canActivate: () => true };
const SCHOOL_ID = "school-1";
const ADMIN_USER = {
  id: "admin-1",
  username: "admin",
  email: "admin@ecole.cm",
  activeRole: "SCHOOL_ADMIN" as const,
  schoolSlug: "ecole-pilote",
  memberships: [{ schoolId: SCHOOL_ID, role: "SCHOOL_ADMIN" as const }],
  platformRoles: [] as Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">,
  profileCompleted: true,
  firstName: "Admin",
  lastName: "Test",
};

// ── Service mocks ─────────────────────────────────────────────────────────────

const makeStudentManagementServiceMock = () => ({
  suggestUsername: jest.fn().mockResolvedValue({ username: "JeanDUPONT" }),
  promoteStudent: jest.fn().mockResolvedValue({
    username: "JeanDUPONT",
    temporaryPassword: "TempPass1",
  }),
  resetStudentPassword: jest
    .fn()
    .mockResolvedValue({ temporaryPassword: "TempPass2" }),
});

const makeSchoolUsersServiceMock = () => ({
  getStudentProfile: jest.fn().mockResolvedValue({
    id: "s-1",
    firstName: "Jean",
    lastName: "DUPONT",
    hasAccount: false,
    userId: null,
    enrollments: [],
    parents: [],
  }),
  listMembers: jest.fn(),
  getMemberDetail: jest.fn(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StudentManagementController", () => {
  let controller: StudentManagementController;
  let studentService: ReturnType<typeof makeStudentManagementServiceMock>;
  let schoolUsersService: ReturnType<typeof makeSchoolUsersServiceMock>;

  beforeEach(async () => {
    studentService = makeStudentManagementServiceMock();
    schoolUsersService = makeSchoolUsersServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentManagementController],
      providers: [
        { provide: StudentManagementService, useValue: studentService },
        { provide: SchoolUsersService, useValue: schoolUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(SchoolScopeGuard)
      .useValue(ALLOW_ALL)
      .overrideGuard(RolesGuard)
      .useValue(ALLOW_ALL)
      .compile();

    controller = module.get(StudentManagementController);
  });

  // ── suggestUsername ──────────────────────────────────────────────────────────

  describe("GET :studentId/suggest-username", () => {
    it("délègue à service.suggestUsername avec studentId et schoolId", async () => {
      await controller.suggestUsername(SCHOOL_ID, "s-1");
      expect(studentService.suggestUsername).toHaveBeenCalledWith(
        "s-1",
        SCHOOL_ID,
      );
    });

    it("retourne le username suggéré", async () => {
      const result = await controller.suggestUsername(SCHOOL_ID, "s-1");
      expect(result).toEqual({ username: "JeanDUPONT" });
    });

    it("propage NotFoundException si l'élève n'existe pas", async () => {
      studentService.suggestUsername.mockRejectedValueOnce(
        new NotFoundException("Student not found"),
      );
      await expect(
        controller.suggestUsername(SCHOOL_ID, "s-ghost"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── promoteStudent ───────────────────────────────────────────────────────────

  describe("POST :studentId/promote", () => {
    it("délègue à service.promoteStudent avec les bons arguments", async () => {
      await controller.promoteStudent(SCHOOL_ID, "s-1", ADMIN_USER, {});
      expect(studentService.promoteStudent).toHaveBeenCalledWith(
        "s-1",
        SCHOOL_ID,
        ADMIN_USER.id,
        undefined, // no proposed username in empty dto
      );
    });

    it("retourne username et temporaryPassword", async () => {
      const result = await controller.promoteStudent(
        SCHOOL_ID,
        "s-1",
        ADMIN_USER,
        {},
      );
      expect(result).toHaveProperty("username");
      expect(result).toHaveProperty("temporaryPassword");
    });

    it("transmet le username proposé au service", async () => {
      const dto = { username: "JeanDUPONT" };
      await controller.promoteStudent(SCHOOL_ID, "s-1", ADMIN_USER, dto);
      expect(studentService.promoteStudent).toHaveBeenCalledWith(
        "s-1",
        SCHOOL_ID,
        ADMIN_USER.id,
        "JeanDUPONT",
      );
    });

    it("propage ConflictException si l'élève a déjà un compte", async () => {
      studentService.promoteStudent.mockRejectedValueOnce(
        new ConflictException("Student already has a user account"),
      );
      await expect(
        controller.promoteStudent(SCHOOL_ID, "s-1", ADMIN_USER, {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("une deuxième promotion du même élève propage ConflictException", async () => {
      // First call succeeds
      await controller.promoteStudent(SCHOOL_ID, "s-1", ADMIN_USER, {});

      // Second call: service raises ConflictException
      studentService.promoteStudent.mockRejectedValueOnce(
        new ConflictException("Student already has a user account"),
      );

      await expect(
        controller.promoteStudent(SCHOOL_ID, "s-1", ADMIN_USER, {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("propage NotFoundException si l'élève est introuvable", async () => {
      studentService.promoteStudent.mockRejectedValueOnce(
        new NotFoundException("Student not found"),
      );
      await expect(
        controller.promoteStudent(SCHOOL_ID, "s-ghost", ADMIN_USER, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── resetStudentPassword ─────────────────────────────────────────────────────

  describe("POST :studentId/reset-password", () => {
    it("délègue à service.resetStudentPassword avec studentId et schoolId", async () => {
      await controller.resetStudentPassword(SCHOOL_ID, "s-1");
      expect(studentService.resetStudentPassword).toHaveBeenCalledWith(
        "s-1",
        SCHOOL_ID,
      );
    });

    it("retourne temporaryPassword", async () => {
      const result = await controller.resetStudentPassword(SCHOOL_ID, "s-1");
      expect(result).toHaveProperty("temporaryPassword");
    });

    it("propage NotFoundException si l'élève n'a pas de compte", async () => {
      studentService.resetStudentPassword.mockRejectedValueOnce(
        new NotFoundException("This student does not have a user account yet"),
      );
      await expect(
        controller.resetStudentPassword(SCHOOL_ID, "s-no-account"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── Routes protégées (métadonnées de guards) ─────────────────────────────────

  describe("protection des routes", () => {
    it("JwtAuthGuard est déclaré sur le contrôleur", () => {
      // Reflector-based check: the guards are listed in the USE_GUARDS metadata
      const guards: (new (...args: unknown[]) => unknown)[] =
        Reflect.getMetadata("__guards__", StudentManagementController) ?? [];
      expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
    });

    it("SchoolScopeGuard est déclaré sur le contrôleur", () => {
      const guards: (new (...args: unknown[]) => unknown)[] =
        Reflect.getMetadata("__guards__", StudentManagementController) ?? [];
      expect(guards.some((g) => g === SchoolScopeGuard)).toBe(true);
    });

    it("RolesGuard est déclaré sur le contrôleur", () => {
      const guards: (new (...args: unknown[]) => unknown)[] =
        Reflect.getMetadata("__guards__", StudentManagementController) ?? [];
      expect(guards.some((g) => g === RolesGuard)).toBe(true);
    });
  });
});
