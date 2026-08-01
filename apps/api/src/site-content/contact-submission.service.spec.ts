import {
  ForbiddenException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";

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
  contactSubmission: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
});

const makeMailServiceMock = () => ({
  sendContactFormSubmissionNotification: jest.fn().mockResolvedValue(undefined),
});

const makeContactInfoServiceMock = () => ({
  getContactInfo: jest.fn().mockResolvedValue({
    email: "contact@scolive.cm",
    phone: "+237 690000000",
    address: "Douala",
    legalRepresentativeFirstName: "",
    legalRepresentativeLastName: "",
  }),
});

describe("ContactSubmissionService", () => {
  let service: ContactSubmissionService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mailService: ReturnType<typeof makeMailServiceMock>;
  let contactInfoService: ReturnType<typeof makeContactInfoServiceMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    mailService = makeMailServiceMock();
    contactInfoService = makeContactInfoServiceMock();
    const module = await Test.createTestingModule({
      providers: [
        ContactSubmissionService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: ContactInfoService, useValue: contactInfoService },
      ],
    }).compile();
    service = module.get(ContactSubmissionService);
  });

  describe("create", () => {
    const baseDto = {
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "690000000",
      subject: "Question sur les tarifs",
      message: "Bonjour, je souhaite en savoir plus sur vos offres.",
    };

    it("sanitize les champs texte (strip HTML) avant de stocker", async () => {
      prisma.contactSubmission.create.mockResolvedValue({
        id: "sub-1",
        name: "Jean Dupont",
        email: "jean@example.com",
        phone: "690000000",
        subject: "alert",
        message: "Bonjour",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      await service.create(
        {
          ...baseDto,
          name: "<b>Jean</b> Dupont",
          subject: "<script>alert(1)</script>",
        },
        "1.2.3.4",
      );

      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Jean Dupont",
          subject: "",
        }),
      });
    });

    it("ignore silencieusement une soumission avec honeypot rempli", async () => {
      await service.create(
        { ...baseDto, website: "http://spam.example" },
        "1.2.3.4",
      );

      expect(prisma.contactSubmission.create).not.toHaveBeenCalled();
      expect(
        mailService.sendContactFormSubmissionNotification,
      ).not.toHaveBeenCalled();
    });

    it("envoie un mail à l'adresse de contact configurée après création", async () => {
      prisma.contactSubmission.create.mockResolvedValue({
        id: "sub-1",
        name: "Jean Dupont",
        email: "jean@example.com",
        phone: "690000000",
        subject: "Question sur les tarifs",
        message: "Bonjour, je souhaite en savoir plus sur vos offres.",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      await service.create(baseDto, "1.2.3.4");

      expect(contactInfoService.getContactInfo).toHaveBeenCalled();
      expect(
        mailService.sendContactFormSubmissionNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "contact@scolive.cm",
          name: "Jean Dupont",
          email: "jean@example.com",
        }),
      );
    });

    it("rejette au-delà de la limite de fréquence par IP", async () => {
      prisma.contactSubmission.count.mockResolvedValue(5);

      await expect(service.create(baseDto, "1.2.3.4")).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(prisma.contactSubmission.create).not.toHaveBeenCalled();
    });

    it("n'applique pas de limite de fréquence quand l'IP est indisponible", async () => {
      prisma.contactSubmission.create.mockResolvedValue({
        id: "sub-1",
        ...baseDto,
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      });

      await service.create(baseDto, undefined);

      expect(prisma.contactSubmission.count).not.toHaveBeenCalled();
      expect(prisma.contactSubmission.create).toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("refuse pour un utilisateur non plateforme admin", async () => {
      const user = makeUser({ activeRole: "SCHOOL_ADMIN", platformRoles: [] });

      await expect(service.list(user, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("retourne la liste paginée pour un admin plateforme", async () => {
      prisma.contactSubmission.findMany.mockResolvedValue([{ id: "sub-1" }]);
      prisma.contactSubmission.count.mockResolvedValue(1);

      const result = await service.list(makeUser(), { page: 1, limit: 20 });

      expect(result).toEqual({
        items: [{ id: "sub-1" }],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  describe("getOne", () => {
    it("refuse pour un utilisateur non plateforme admin", async () => {
      const user = makeUser({ activeRole: "SCHOOL_ADMIN", platformRoles: [] });

      await expect(service.getOne(user, "sub-1")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("lève une NotFoundException si la soumission n'existe pas", async () => {
      prisma.contactSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.getOne(makeUser(), "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("marque la soumission comme lue lors de la première consultation", async () => {
      prisma.contactSubmission.findUnique.mockResolvedValue({
        id: "sub-1",
        readAt: null,
      });
      prisma.contactSubmission.update.mockResolvedValue({
        id: "sub-1",
        readAt: new Date("2026-08-01T12:00:00.000Z"),
        readById: "user-1",
      });

      const result = await service.getOne(makeUser(), "sub-1");

      expect(prisma.contactSubmission.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { readAt: expect.any(Date), readById: "user-1" },
      });
      expect(result.readById).toBe("user-1");
    });

    it("ne met pas à jour une soumission déjà lue", async () => {
      const existing = {
        id: "sub-1",
        readAt: new Date("2026-08-01T09:00:00.000Z"),
      };
      prisma.contactSubmission.findUnique.mockResolvedValue(existing);

      const result = await service.getOne(makeUser(), "sub-1");

      expect(prisma.contactSubmission.update).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });
  });
});
