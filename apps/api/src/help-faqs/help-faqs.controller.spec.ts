import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { HelpFaqsController } from "./help-faqs.controller.js";
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

const makeServiceMock = () => ({
  getCurrentFaq: jest.fn().mockResolvedValue({
    permissions: { canManageGlobal: false, canManageSchool: false },
    schoolScope: null,
    sources: [],
    defaultSourceKey: null,
    resolvedAudience: "PARENT",
  }),
  getCurrentThemes: jest.fn().mockResolvedValue({ faq: null, themes: [] }),
  searchCurrent: jest.fn().mockResolvedValue({ faq: null, items: [] }),
  listGlobalFaqsAdmin: jest.fn().mockResolvedValue({ items: [] }),
  listSchoolFaqsAdmin: jest.fn().mockResolvedValue({ items: [] }),
  createGlobalFaq: jest.fn().mockResolvedValue({ id: "faq-1" }),
  createSchoolFaq: jest.fn().mockResolvedValue({ id: "faq-1" }),
  updateGlobalFaq: jest.fn().mockResolvedValue({ id: "faq-1" }),
  updateSchoolFaq: jest.fn().mockResolvedValue({ id: "faq-1" }),
  deleteGlobalFaq: jest.fn().mockResolvedValue({ deleted: true }),
  deleteSchoolFaq: jest.fn().mockResolvedValue({ deleted: true }),
  createGlobalTheme: jest.fn().mockResolvedValue({ id: "theme-1" }),
  createSchoolTheme: jest.fn().mockResolvedValue({ id: "theme-1" }),
  updateGlobalTheme: jest.fn().mockResolvedValue({ id: "theme-1" }),
  updateSchoolTheme: jest.fn().mockResolvedValue({ id: "theme-1" }),
  deleteGlobalTheme: jest.fn().mockResolvedValue({ deleted: true }),
  deleteSchoolTheme: jest.fn().mockResolvedValue({ deleted: true }),
  createGlobalItem: jest.fn().mockResolvedValue({ id: "item-1" }),
  createSchoolItem: jest.fn().mockResolvedValue({ id: "item-1" }),
  updateGlobalItem: jest.fn().mockResolvedValue({ id: "item-1" }),
  updateSchoolItem: jest.fn().mockResolvedValue({ id: "item-1" }),
  deleteGlobalItem: jest.fn().mockResolvedValue({ deleted: true }),
  deleteSchoolItem: jest.fn().mockResolvedValue({ deleted: true }),
});

describe("HelpFaqsController", () => {
  let controller: HelpFaqsController;
  let service: ReturnType<typeof makeServiceMock>;

  beforeEach(async () => {
    service = makeServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelpFaqsController],
      providers: [{ provide: HelpFaqsService, useValue: service }],
    }).compile();

    controller = module.get<HelpFaqsController>(HelpFaqsController);
  });

  it("délègue getCurrentFaq", async () => {
    const user = makeUser();
    const query = { faqId: "faq-1" };

    await controller.getCurrentFaq(user, query);

    expect(service.getCurrentFaq).toHaveBeenCalledWith(user, query);
  });

  it("délègue searchCurrent", async () => {
    const user = makeUser();
    const query = { q: "connexion" };

    await controller.searchCurrent(user, query);

    expect(service.searchCurrent).toHaveBeenCalledWith(user, query);
  });

  it("délègue createGlobalItem", async () => {
    const admin = makeUser({ platformRoles: ["SUPER_ADMIN"], memberships: [] });
    const dto = {
      question: "Comment me connecter ?",
      answerHtml: "<p>Utilisez votre email</p>",
    };

    await controller.createGlobalItem(admin, "theme-1", dto);

    expect(service.createGlobalItem).toHaveBeenCalledWith(
      admin,
      "theme-1",
      dto,
    );
  });
});
