import { ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ContactInfoService } from "./contact-info.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    activeRole: "SUPER_ADMIN",
    profileCompleted: true,
    platformRoles: ["SUPER_ADMIN"],
    memberships: [],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  siteSetting: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

describe("ContactInfoService", () => {
  let service: ContactInfoService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        ContactInfoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ContactInfoService);
  });

  it("retourne le fallback en dur si aucune ligne SiteSetting n'existe", async () => {
    prisma.siteSetting.findUnique.mockResolvedValue(null);

    const result = await service.getContactInfo();

    expect(result).toEqual({
      email: "contact@scolive.cm",
      phone: "+237 6XX XXX XXX",
      address: "Cameroun",
    });
  });

  it("retourne le fallback si la valeur stockée est malformée", async () => {
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: "contact",
      value: { foo: "bar" },
    });

    const result = await service.getContactInfo();

    expect(result.email).toBe("contact@scolive.cm");
  });

  it("retourne la valeur persistée quand elle existe", async () => {
    prisma.siteSetting.findUnique.mockResolvedValue({
      key: "contact",
      value: {
        email: "hello@scolive.cm",
        phone: "+237 690000000",
        address: "Yaoundé, Cameroun",
      },
    });

    const result = await service.getContactInfo();

    expect(result).toEqual({
      email: "hello@scolive.cm",
      phone: "+237 690000000",
      address: "Yaoundé, Cameroun",
    });
  });

  it("refuse la mise à jour pour un utilisateur non SUPER_ADMIN", async () => {
    const user = makeUser({ activeRole: "SCHOOL_ADMIN", platformRoles: [] });

    await expect(
      service.updateContactInfo(user, {
        email: "a@b.cm",
        phone: "+237 690000000",
        address: "Douala",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
  });

  it("persiste la nouvelle valeur pour un SUPER_ADMIN", async () => {
    const user = makeUser();
    prisma.siteSetting.upsert.mockResolvedValue({});

    const result = await service.updateContactInfo(user, {
      email: " a@b.cm ",
      phone: " +237 690000000 ",
      address: " Douala ",
    });

    expect(result).toEqual({
      email: "a@b.cm",
      phone: "+237 690000000",
      address: "Douala",
    });
    expect(prisma.siteSetting.upsert).toHaveBeenCalledWith({
      where: { key: "contact" },
      create: {
        key: "contact",
        value: result,
        updatedById: "user-1",
      },
      update: {
        value: result,
        updatedById: "user-1",
      },
    });
  });
});
