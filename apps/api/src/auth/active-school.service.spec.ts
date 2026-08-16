/**
 * Tests unitaires : AuthService — école active (getGlobalMe / setActiveSchool)
 *
 * Un utilisateur peut être membre de plusieurs écoles (ex: enseignant dans un
 * établissement, parent dans un autre). Ces tests couvrent la résolution du
 * schoolSlug par défaut (préférence à activeSchoolId) et le changement
 * d'école active exposé via PUT /me/active-school.
 */

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";

const USER_ID = "user-1";
const SCHOOL_A = "school-a";
const SCHOOL_B = "school-b";

function makeMembership(
  schoolId: string,
  slug: string,
  name: string,
  role:
    | "TEACHER"
    | "PARENT"
    | "SCHOOL_ADMIN"
    | "SCHOOL_STAFF"
    | "SCHOOL_HEALTH_OFFICER" = "TEACHER",
) {
  return {
    schoolId,
    role,
    school: { slug, name },
  };
}

function makeGlobalMeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    activeRole: null,
    activeSchoolId: null,
    profileCompleted: true,
    activationStatus: "ACTIVE",
    isTester: false,
    email: "jean@ecole.com",
    phone: null,
    avatarUrl: null,
    firstName: "Jean",
    lastName: "Mbarga",
    gender: null,
    preferredLocale: "FR",
    onboardingHelpEnabled: true,
    passwordHash: "hash",
    platformRoles: [],
    memberships: [
      makeMembership(SCHOOL_A, "college-a", "Collège A"),
      makeMembership(SCHOOL_B, "college-b", "Collège B"),
    ],
    phoneCredential: null,
    ...overrides,
  };
}

const makePrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  schoolMembership: {
    findFirst: jest.fn(),
  },
});

describe("AuthService — école active", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue("jwt") },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe("getGlobalMe", () => {
    it("retombe sur la première membership quand activeSchoolId est absent", async () => {
      prisma.user.findUnique.mockResolvedValue(makeGlobalMeUser());

      const result = await service.getGlobalMe(USER_ID);

      expect(result.schoolSlug).toBe("college-a");
      expect(result.activeSchoolId).toBeNull();
    });

    it("préfère l'école désignée par activeSchoolId sur la première membership", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ activeSchoolId: SCHOOL_B }),
      );

      const result = await service.getGlobalMe(USER_ID);

      expect(result.schoolSlug).toBe("college-b");
      expect(result.activeSchoolId).toBe(SCHOOL_B);
    });

    it("retombe sur la première membership si activeSchoolId ne correspond à aucune membership", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ activeSchoolId: "school-orphan" }),
      );

      const result = await service.getGlobalMe(USER_ID);

      expect(result.schoolSlug).toBe("college-a");
    });

    it("expose la liste dédupliquée des écoles de l'utilisateur", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({
          memberships: [
            makeMembership(SCHOOL_A, "college-a", "Collège A", "TEACHER"),
            makeMembership(SCHOOL_A, "college-a", "Collège A", "PARENT"),
            makeMembership(SCHOOL_B, "college-b", "Collège B", "TEACHER"),
          ],
        }),
      );

      const result = await service.getGlobalMe(USER_ID);

      expect(result.schools).toHaveLength(2);
      expect(result.schools.map((s) => s.slug)).toEqual([
        "college-a",
        "college-b",
      ]);
    });

    it("lève UnauthorizedException si l'utilisateur n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getGlobalMe(USER_ID)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("setActiveSchool", () => {
    it("met à jour activeSchoolId puis retourne le profil rafraîchi", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue({ id: "m-1" });
      prisma.user.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ activeSchoolId: SCHOOL_B }),
      );

      const result = await service.setActiveSchool(USER_ID, SCHOOL_B);

      expect(prisma.schoolMembership.findFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID, schoolId: SCHOOL_B },
        select: { id: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { activeSchoolId: SCHOOL_B },
      });
      expect(result.schoolSlug).toBe("college-b");
    });

    it("lève ForbiddenException si l'utilisateur n'a pas de membership dans cette école", async () => {
      prisma.schoolMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.setActiveSchool(USER_ID, "school-not-mine"),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("setActiveRole", () => {
    it("met à jour activeRole quand le rôle demandé fait partie des memberships de l'utilisateur, et retourne le profil global rafraîchi", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: USER_ID,
          platformRoles: [],
          memberships: [{ role: "SCHOOL_HEALTH_OFFICER" }, { role: "PARENT" }],
        })
        .mockResolvedValueOnce(
          makeGlobalMeUser({
            activeRole: "SCHOOL_HEALTH_OFFICER",
            memberships: [
              makeMembership(
                SCHOOL_A,
                "college-a",
                "Collège A",
                "SCHOOL_HEALTH_OFFICER",
              ),
              makeMembership(SCHOOL_B, "college-b", "Collège B"),
            ],
          }),
        );
      prisma.user.update.mockResolvedValue({});

      const result = await service.setActiveRole(
        USER_ID,
        "SCHOOL_HEALTH_OFFICER",
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { activeRole: "SCHOOL_HEALTH_OFFICER" },
      });
      expect(result.activeRole).toBe("SCHOOL_HEALTH_OFFICER");
      expect(result.firstName).toBe("Jean");
      expect(result.schools).toHaveLength(2);
    });

    it("accepte SCHOOL_STAFF comme rôle actif quand membership correspondante", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: USER_ID,
          platformRoles: [],
          memberships: [{ role: "SCHOOL_STAFF" }],
        })
        .mockResolvedValueOnce(
          makeGlobalMeUser({
            activeRole: "SCHOOL_STAFF",
            memberships: [
              makeMembership(
                SCHOOL_A,
                "college-a",
                "Collège A",
                "SCHOOL_STAFF",
              ),
            ],
          }),
        );
      prisma.user.update.mockResolvedValue({});

      const result = await service.setActiveRole(USER_ID, "SCHOOL_STAFF");

      expect(result.activeRole).toBe("SCHOOL_STAFF");
    });

    it("retombe sur le rôle prioritaire existant si le rôle demandé n'est assigné à aucune membership", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: USER_ID,
          platformRoles: [],
          memberships: [{ role: "PARENT" }],
        })
        .mockResolvedValueOnce(
          makeGlobalMeUser({
            activeRole: "PARENT",
            memberships: [
              makeMembership(SCHOOL_A, "college-a", "Collège A", "PARENT"),
            ],
          }),
        );
      prisma.user.update.mockResolvedValue({});

      const result = await service.setActiveRole(
        USER_ID,
        "SCHOOL_HEALTH_OFFICER",
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { activeRole: "PARENT" },
      });
      expect(result.activeRole).toBe("PARENT");
    });

    it("lève ForbiddenException si l'utilisateur n'a aucun rôle plateforme ni membership", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: USER_ID,
        platformRoles: [],
        memberships: [],
      });

      await expect(
        service.setActiveRole(USER_ID, "SCHOOL_HEALTH_OFFICER"),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("lève UnauthorizedException si l'utilisateur n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.setActiveRole(USER_ID, "TEACHER")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("updateOnboardingHelpEnabled", () => {
    it("active l'aide guidée puis retourne le profil rafraîchi", async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ onboardingHelpEnabled: true }),
      );

      const result = await service.updateOnboardingHelpEnabled(USER_ID, true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { onboardingHelpEnabled: true },
      });
      expect(result.onboardingHelpEnabled).toBe(true);
    });

    it("désactive l'aide guidée puis retourne le profil rafraîchi", async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ onboardingHelpEnabled: false }),
      );

      const result = await service.updateOnboardingHelpEnabled(USER_ID, false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { onboardingHelpEnabled: false },
      });
      expect(result.onboardingHelpEnabled).toBe(false);
    });

    it("lève UnauthorizedException si l'utilisateur n'existe pas au moment du refresh", async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOnboardingHelpEnabled(USER_ID, true),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getGlobalMe — onboardingHelpEnabled", () => {
    it("expose onboardingHelpEnabled dans le profil global", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeGlobalMeUser({ onboardingHelpEnabled: false }),
      );

      const result = await service.getGlobalMe(USER_ID);

      expect(result.onboardingHelpEnabled).toBe(false);
    });
  });
});
