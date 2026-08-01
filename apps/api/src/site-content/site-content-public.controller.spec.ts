import { Test, type TestingModule } from "@nestjs/testing";
import { ContactInfoService } from "./contact-info.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";
import { SiteContentPublicController } from "./site-content-public.controller.js";

describe("SiteContentPublicController", () => {
  let controller: SiteContentPublicController;
  let contactInfoService: { getContactInfo: jest.Mock };
  let legalDocumentsService: { getPublished: jest.Mock };

  beforeEach(async () => {
    contactInfoService = {
      getContactInfo: jest.fn().mockResolvedValue({
        email: "contact@scolive.cm",
        phone: "+237 6XX XXX XXX",
        address: "Cameroun",
      }),
    };
    legalDocumentsService = {
      getPublished: jest.fn().mockResolvedValue({
        slug: "cgu",
        locale: "fr",
        title: "CGU",
        contentHtml: "<p>x</p>",
        updatedAt: new Date("2026-01-01"),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteContentPublicController],
      providers: [
        { provide: ContactInfoService, useValue: contactInfoService },
        { provide: LegalDocumentsService, useValue: legalDocumentsService },
      ],
    }).compile();

    controller = module.get(SiteContentPublicController);
  });

  it("expose l'info de contact sans authentification requise", async () => {
    const result = await controller.getContactInfo();

    expect(contactInfoService.getContactInfo).toHaveBeenCalled();
    expect(result.email).toBe("contact@scolive.cm");
  });

  it("expose le document légal publié pour slug/locale", async () => {
    const result = await controller.getLegalDocument("cgu", "fr");

    expect(legalDocumentsService.getPublished).toHaveBeenCalledWith(
      "cgu",
      "fr",
    );
    expect(result.title).toBe("CGU");
  });
});
