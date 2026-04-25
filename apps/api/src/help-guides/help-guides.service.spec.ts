import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { HelpGuidesService } from "./help-guides.service.js";

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
  helpGuide: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  helpChapter: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
  },
});

describe("HelpGuidesService", () => {
  let service: HelpGuidesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        HelpGuidesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(HelpGuidesService);
  });

  it("résout un guide publié pour un parent", async () => {
    prisma.helpGuide.findMany.mockResolvedValue([
      {
        id: "guide-global",
        schoolId: null,
        school: null,
        audience: "PARENT",
        title: "Guide parent Scolive",
        slug: "guide-parent-scolive",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { chapters: 3 },
      },
      {
        id: "guide-parent",
        schoolId: "school-1",
        school: { name: "College Vogt" },
        audience: "PARENT",
        title: "Guide parent",
        slug: "guide-parent",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { chapters: 3 },
      },
    ]);

    const result = await service.getCurrentGuide(makeUser(), {});

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]?.scopeType).toBe("GLOBAL");
    expect(result.sources[1]?.scopeType).toBe("SCHOOL");
    expect(result.resolvedAudience).toBe("PARENT");
    expect(result.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });
  });

  it("calcule les breadcrumbs dans la recherche", async () => {
    prisma.helpGuide.findMany.mockResolvedValue([
      {
        id: "guide-parent",
        schoolId: "school-1",
        school: { name: "College Vogt" },
        audience: "PARENT",
        title: "Guide parent",
        slug: "guide-parent",
        description: null,
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { chapters: 2 },
      },
    ]);

    prisma.helpChapter.findMany
      .mockResolvedValueOnce([
        {
          id: "c2",
          guideId: "guide-parent",
          parentId: "c1",
          orderIndex: 2,
          title: "Créer un message",
          slug: "creer-message",
          summary: null,
          contentType: "RICH_TEXT",
          contentHtml: "<p>Étapes</p>",
          contentJson: null,
          videoUrl: null,
          contentText: "Etapes",
          status: "PUBLISHED",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        { id: "c1", parentId: null, title: "Messagerie" },
        { id: "c2", parentId: "c1", title: "Créer un message" },
      ]);

    const result = await service.searchCurrent(makeUser(), { q: "message" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.breadcrumb).toEqual([
      "Messagerie",
      "Créer un message",
    ]);
    expect(result.items[0]?.scopeLabel).toBe("College Vogt");
  });

  it("bloque la création d'un chapitre vidéo sans url en global", async () => {
    prisma.helpGuide.findUnique.mockResolvedValue({
      id: "guide-1",
      schoolId: null,
    });

    await expect(
      service.createGlobalChapter(
        makeUser({ platformRoles: ["SUPER_ADMIN"] }),
        "guide-1",
        {
          title: "Vidéo onboarding",
          contentType: "VIDEO",
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse la liste admin aux non platform admins", async () => {
    await expect(
      service.listGlobalGuidesAdmin(makeUser(), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
