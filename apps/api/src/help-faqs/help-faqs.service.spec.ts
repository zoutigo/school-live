import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { HelpFaqsService } from "./help-faqs.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  helpFaq: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  helpFaqTheme: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  helpFaqItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
  },
});

describe("HelpFaqsService", () => {
  let service: HelpFaqsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        HelpFaqsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(HelpFaqsService);
  });

  it("résout une faq publiée pour un parent", async () => {
    prisma.helpFaq.findMany.mockResolvedValue([
      {
        id: "faq-parent",
        schoolId: "school-1",
        school: { name: "College Vogt" },
        audience: "PARENT",
        title: "FAQ parent",
        slug: "faq-parent",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { themes: 3 },
      },
    ]);

    const result = await service.getCurrentFaq(makeUser(), {});

    expect(result.sources[0]?.faq.id).toBe("faq-parent");
    expect(result.sources[0]?.scopeType).toBe("SCHOOL");
    expect(result.resolvedAudience).toBe("PARENT");
    expect(result.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });
  });

  it("retourne des thèmes avec items publiés", async () => {
    prisma.helpFaq.findMany.mockResolvedValue([
      {
        id: "faq-parent",
        schoolId: "school-1",
        school: { name: "College Vogt" },
        audience: "PARENT",
        title: "FAQ parent",
        slug: "faq-parent",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { themes: 1 },
      },
    ]);
    prisma.helpFaqTheme.findMany.mockResolvedValue([
      {
        id: "theme-1",
        faqId: "faq-parent",
        orderIndex: 0,
        title: "Connexion",
        slug: "connexion",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item-1",
            themeId: "theme-1",
            orderIndex: 0,
            question: "Comment me connecter ?",
            answerHtml: "<p>Avec votre email</p>",
            answerJson: null,
            answerText: "Avec votre email",
            status: "PUBLISHED",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ]);

    const result = await service.getCurrentThemes(makeUser(), {});

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.themes).toHaveLength(1);
    expect(result.sources[0]?.themes[0]?.items).toHaveLength(1);
  });

  it("calcule la recherche sur question et réponse", async () => {
    prisma.helpFaq.findMany.mockResolvedValue([
      {
        id: "faq-parent",
        schoolId: "school-1",
        school: { name: "College Vogt" },
        audience: "PARENT",
        title: "FAQ parent",
        slug: "faq-parent",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { themes: 1 },
      },
    ]);
    prisma.helpFaqItem.findMany.mockResolvedValue([
      {
        id: "item-1",
        themeId: "theme-1",
        orderIndex: 0,
        question: "Comment récupérer mon mot de passe ?",
        answerHtml: "<p>Utilisez mot de passe oublié</p>",
        answerJson: null,
        answerText: "Utilisez mot de passe oublié",
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        theme: {
          id: "theme-1",
          title: "Connexion",
          faq: {
            id: "faq-parent",
            schoolId: "school-1",
            school: { name: "College Vogt" },
          },
        },
      },
    ]);

    const result = await service.searchCurrent(makeUser(), {
      q: "mot de passe",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.themeTitle).toBe("Connexion");
    expect(result.items[0]?.scopeLabel).toBe("College Vogt");
  });

  it("bloque la création d'une réponse vide", async () => {
    prisma.helpFaqTheme.findUnique.mockResolvedValue({
      id: "theme-1",
      faq: { id: "faq-1", schoolId: null },
    });

    await expect(
      service.createGlobalItem(
        makeUser({ platformRoles: ["SUPER_ADMIN"] }),
        "theme-1",
        {
          question: "Question",
          answerHtml: "",
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse la liste admin aux non platform", async () => {
    await expect(
      service.listGlobalFaqsAdmin(makeUser(), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
