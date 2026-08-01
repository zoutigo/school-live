import { ForbiddenException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";
import { SiteContentAdminController } from "./site-content-admin.controller.js";

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

describe("SiteContentAdminController", () => {
  let controller: SiteContentAdminController;
  let contactInfoService: {
    getContactInfo: jest.Mock;
    updateContactInfo: jest.Mock;
    assertCanManage: jest.Mock;
  };
  let legalDocumentsService: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    publish: jest.Mock;
    delete: jest.Mock;
  };
  let contactSubmissionService: {
    list: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    contactInfoService = {
      getContactInfo: jest.fn().mockResolvedValue({
        email: "contact@scolive.cm",
        phone: "+237 6XX XXX XXX",
        address: "Cameroun",
      }),
      updateContactInfo: jest.fn().mockResolvedValue({
        email: "new@scolive.cm",
        phone: "+237 690000000",
        address: "Douala",
      }),
      assertCanManage: jest.fn((user: AuthenticatedUser) => {
        if (user.activeRole !== "SUPER_ADMIN" && user.activeRole !== "ADMIN") {
          throw new ForbiddenException();
        }
      }),
    };
    legalDocumentsService = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "doc-1" }),
      update: jest.fn().mockResolvedValue({ id: "doc-1" }),
      publish: jest
        .fn()
        .mockResolvedValue({ id: "doc-1", status: "PUBLISHED" }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    contactSubmissionService = {
      list: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
      getOne: jest.fn().mockResolvedValue({ id: "sub-1" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteContentAdminController],
      providers: [
        { provide: ContactInfoService, useValue: contactInfoService },
        { provide: LegalDocumentsService, useValue: legalDocumentsService },
        {
          provide: ContactSubmissionService,
          useValue: contactSubmissionService,
        },
      ],
    }).compile();

    controller = module.get(SiteContentAdminController);
  });

  it("refuse getContactInfo pour un utilisateur non SUPER_ADMIN/ADMIN", () => {
    const user = makeUser({ activeRole: "SCHOOL_ADMIN" });

    expect(() => controller.getContactInfo(user)).toThrow(ForbiddenException);
  });

  it("autorise getContactInfo pour un utilisateur ADMIN", () => {
    const user = makeUser({ activeRole: "ADMIN", platformRoles: ["ADMIN"] });

    expect(() => controller.getContactInfo(user)).not.toThrow();
  });

  it("délègue la mise à jour du contact au service", async () => {
    const user = makeUser();

    const result = await controller.updateContactInfo(user, {
      email: "new@scolive.cm",
      phone: "+237 690000000",
      address: "Douala",
    });

    expect(contactInfoService.updateContactInfo).toHaveBeenCalledWith(user, {
      email: "new@scolive.cm",
      phone: "+237 690000000",
      address: "Douala",
    });
    expect(result.email).toBe("new@scolive.cm");
  });

  it("délègue create/publish/delete des documents légaux au service", async () => {
    const user = makeUser();

    await controller.createLegalDocument(user, {
      slug: "cgu",
      locale: "fr",
      title: "CGU",
      contentHtml: "<p>x</p>",
    });
    await controller.publishLegalDocument(user, "doc-1");
    await controller.deleteLegalDocument(user, "doc-1");

    expect(legalDocumentsService.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ slug: "cgu" }),
    );
    expect(legalDocumentsService.publish).toHaveBeenCalledWith(user, "doc-1");
    expect(legalDocumentsService.delete).toHaveBeenCalledWith(user, "doc-1");
  });

  it("délègue la liste et le détail des prises de contact au service", async () => {
    const user = makeUser();

    await controller.listContactSubmissions(user, { page: 1, limit: 20 });
    await controller.getContactSubmission(user, "sub-1");

    expect(contactSubmissionService.list).toHaveBeenCalledWith(user, {
      page: 1,
      limit: 20,
    });
    expect(contactSubmissionService.getOne).toHaveBeenCalledWith(user, "sub-1");
  });
});
