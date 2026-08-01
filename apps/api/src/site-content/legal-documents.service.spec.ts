import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";

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
  legalDocument: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe("LegalDocumentsService", () => {
  let service: LegalDocumentsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        LegalDocumentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LegalDocumentsService);
  });

  describe("getPublished", () => {
    it("retourne le fallback si aucune version publiée n'existe", async () => {
      prisma.legalDocument.findFirst.mockResolvedValue(null);

      const result = await service.getPublished("cgu", "fr");

      expect(result.slug).toBe("cgu");
      expect(result.title).toBe("Conditions générales d'utilisation");
      expect(result.contentHtml).toContain("en cours de rédaction");
    });

    it("retourne le fallback anglais pour une locale en", async () => {
      prisma.legalDocument.findFirst.mockResolvedValue(null);

      const result = await service.getPublished("mentions-legales", "en");

      expect(result.title).toBe("Legal Notice");
      expect(result.contentHtml).toContain("being drafted");
    });

    it("retourne le document publié le plus récent", async () => {
      prisma.legalDocument.findFirst.mockResolvedValue({
        slug: "cgu",
        locale: "fr",
        title: "CGU v2",
        contentHtml: "<p>v2</p>",
        updatedAt: new Date("2026-01-01"),
      });

      const result = await service.getPublished("cgu", "fr");

      expect(result.title).toBe("CGU v2");
      expect(prisma.legalDocument.findFirst).toHaveBeenCalledWith({
        where: { slug: "cgu", locale: "fr", status: "PUBLISHED" },
        orderBy: { version: "desc" },
      });
    });
  });

  describe("gestion admin", () => {
    it("refuse list/create/update/publish/delete pour un non SUPER_ADMIN/ADMIN", async () => {
      const user = makeUser({ activeRole: "SCHOOL_ADMIN" });

      await expect(service.list(user, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.create(user, {
          slug: "cgu",
          locale: "fr",
          title: "t",
          contentHtml: "<p>x</p>",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("autorise list/create pour un ADMIN", async () => {
      const user = makeUser({ activeRole: "ADMIN", platformRoles: ["ADMIN"] });
      prisma.legalDocument.findMany.mockResolvedValue([]);
      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue({ id: "doc-1" });

      await expect(service.list(user, {})).resolves.toEqual([]);
      await expect(
        service.create(user, {
          slug: "cgu",
          locale: "fr",
          title: "t",
          contentHtml: "<p>x</p>",
        }),
      ).resolves.toEqual({ id: "doc-1" });
    });

    it("crée la première version en DRAFT avec version=1", async () => {
      const user = makeUser();
      prisma.legalDocument.findFirst.mockResolvedValue(null);
      prisma.legalDocument.create.mockResolvedValue({ id: "doc-1" });

      await service.create(user, {
        slug: "cgu",
        locale: "fr",
        title: "CGU",
        contentHtml: "<p>x</p>",
      });

      expect(prisma.legalDocument.create).toHaveBeenCalledWith({
        data: {
          slug: "cgu",
          locale: "fr",
          title: "CGU",
          contentHtml: "<p>x</p>",
          version: 1,
          status: "DRAFT",
          createdById: "user-1",
          updatedById: "user-1",
        },
      });
    });

    it("incrémente la version à partir de la dernière existante", async () => {
      const user = makeUser();
      prisma.legalDocument.findFirst.mockResolvedValue({ version: 3 });
      prisma.legalDocument.create.mockResolvedValue({ id: "doc-2" });

      await service.create(user, {
        slug: "cgu",
        locale: "fr",
        title: "CGU",
        contentHtml: "<p>x</p>",
      });

      expect(prisma.legalDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 4 }),
        }),
      );
    });

    it("refuse de modifier une version déjà publiée", async () => {
      const user = makeUser();
      prisma.legalDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        status: "PUBLISHED",
      });

      await expect(
        service.update(user, "doc-1", { title: "nouveau titre" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("lève NotFoundException si le document n'existe pas", async () => {
      const user = makeUser();
      prisma.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.update(user, "missing", { title: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("publish archive l'ancienne version publiée puis publie la nouvelle", async () => {
      const user = makeUser();
      prisma.legalDocument.findUnique.mockResolvedValue({
        id: "doc-2",
        slug: "cgu",
        locale: "fr",
        status: "DRAFT",
      });
      const updateMany = jest.fn();
      const update = jest
        .fn()
        .mockResolvedValue({ id: "doc-2", status: "PUBLISHED" });
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          legalDocument: { updateMany, update },
        }),
      );

      const result = await service.publish(user, "doc-2");

      expect(updateMany).toHaveBeenCalledWith({
        where: { slug: "cgu", locale: "fr", status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "doc-2" },
          data: expect.objectContaining({ status: "PUBLISHED" }),
        }),
      );
      expect(result.status).toBe("PUBLISHED");
    });

    it("refuse de supprimer une version publiée", async () => {
      const user = makeUser();
      prisma.legalDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        status: "PUBLISHED",
      });

      await expect(service.delete(user, "doc-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.legalDocument.delete).not.toHaveBeenCalled();
    });

    it("supprime un brouillon", async () => {
      const user = makeUser();
      prisma.legalDocument.findUnique.mockResolvedValue({
        id: "doc-1",
        status: "DRAFT",
      });

      await service.delete(user, "doc-1");

      expect(prisma.legalDocument.delete).toHaveBeenCalledWith({
        where: { id: "doc-1" },
      });
    });
  });
});
