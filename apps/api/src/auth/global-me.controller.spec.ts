/**
 * Tests — GlobalMeController
 *
 * Régression couverte :
 * - Le endpoint GET /me est utilisé par le client mobile quand schoolSlug est
 *   absent de la réponse de login. Sans ce endpoint fonctionnel, le user
 *   restait null et l'app affichait un spinner infini.
 */

import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "./auth.types.js";
import { GlobalMeController } from "./global-me.controller.js";
import { AuthService } from "./auth.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Jean",
    lastName: "Mbarga",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    ...overrides,
  };
}

const GLOBAL_ME_RESULT = {
  id: "user-1",
  firstName: "Jean",
  lastName: "Mbarga",
  email: "jean@ecole.com",
  phone: "+237600000000",
  platformRoles: [],
  memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
  profileCompleted: true,
  activationStatus: "ACTIVE" as const,
  role: "TEACHER" as const,
  activeRole: "TEACHER" as const,
  schoolSlug: "college-vogt",
  schoolName: "Collège Vogt",
  hasPassword: false,
  hasPhoneCredential: true,
  gender: null,
};

const makeServiceMock = () => ({
  getGlobalMe: jest.fn().mockResolvedValue(GLOBAL_ME_RESULT),
  setActiveRole: jest.fn().mockResolvedValue(GLOBAL_ME_RESULT),
  updatePersonalProfile: jest.fn().mockResolvedValue(GLOBAL_ME_RESULT),
});

describe("GlobalMeController", () => {
  let controller: GlobalMeController;
  let service: ReturnType<typeof makeServiceMock>;

  beforeEach(async () => {
    service = makeServiceMock();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalMeController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get(GlobalMeController);
  });

  // ── GET /me ──────────────────────────────────────────────────────────────

  describe("GET /me", () => {
    it("retourne le profil complet de l'utilisateur authentifié", async () => {
      const user = makeUser();
      const result = await controller.me(user);

      expect(service.getGlobalMe).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(GLOBAL_ME_RESULT);
    });

    it("inclut schoolSlug dans la réponse (requis par le client mobile pour initialize())", async () => {
      const user = makeUser();
      const result = await controller.me(user);

      expect(result).toHaveProperty("schoolSlug");
    });

    it("délègue à AuthService.getGlobalMe avec l'id de l'utilisateur courant", async () => {
      const user = makeUser({ id: "specific-user-id" });
      await controller.me(user);

      expect(service.getGlobalMe).toHaveBeenCalledWith("specific-user-id");
      expect(service.getGlobalMe).toHaveBeenCalledTimes(1);
    });

    it("propage l'erreur si AuthService.getGlobalMe lève une exception", async () => {
      service.getGlobalMe.mockRejectedValue(new Error("User not found"));
      const user = makeUser();

      await expect(controller.me(user)).rejects.toThrow("User not found");
    });

    it("fonctionne pour un utilisateur plateforme (sans membership école)", async () => {
      const platformResult = {
        ...GLOBAL_ME_RESULT,
        platformRoles: ["SUPER_ADMIN" as const],
        memberships: [],
        schoolSlug: null,
        role: "SUPER_ADMIN" as const,
      };
      service.getGlobalMe.mockResolvedValue(platformResult);
      const user = makeUser({
        platformRoles: ["SUPER_ADMIN"],
        memberships: [],
      });

      const result = await controller.me(user);
      expect(result.schoolSlug).toBeNull();
      expect(result.platformRoles).toContain("SUPER_ADMIN");
    });
  });

  // ── PUT /me/active-role ───────────────────────────────────────────────────

  describe("PUT /me/active-role", () => {
    it("change le rôle actif et retourne le profil mis à jour", async () => {
      const user = makeUser();
      const result = await controller.setActiveRole(user, { role: "TEACHER" });

      expect(service.setActiveRole).toHaveBeenCalledWith("user-1", "TEACHER");
      expect(result).toEqual(GLOBAL_ME_RESULT);
    });
  });

  // ── PUT /me/profile ───────────────────────────────────────────────────────

  describe("PUT /me/profile", () => {
    it("met à jour le profil personnel et retourne le résultat", async () => {
      const user = makeUser();
      const payload = { firstName: "Jacques", lastName: "Dupont" };
      const result = await controller.updateProfile(user, payload as never);

      expect(service.updatePersonalProfile).toHaveBeenCalledWith(
        "user-1",
        payload,
      );
      expect(result).toEqual(GLOBAL_ME_RESULT);
    });
  });
});
