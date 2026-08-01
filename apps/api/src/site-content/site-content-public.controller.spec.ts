import { Test, type TestingModule } from "@nestjs/testing";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";
import { SiteContentPublicController } from "./site-content-public.controller.js";

describe("SiteContentPublicController", () => {
  let controller: SiteContentPublicController;
  let contactInfoService: { getContactInfo: jest.Mock };
  let legalDocumentsService: { getPublished: jest.Mock };
  let contactSubmissionService: { create: jest.Mock };

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
    contactSubmissionService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteContentPublicController],
      providers: [
        { provide: ContactInfoService, useValue: contactInfoService },
        { provide: LegalDocumentsService, useValue: legalDocumentsService },
        {
          provide: ContactSubmissionService,
          useValue: contactSubmissionService,
        },
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

  it("délègue la création d'une prise de contact au service", async () => {
    const dto = {
      name: "Jean Dupont",
      email: "jean@example.com",
      phone: "690000000",
      subject: "Sujet",
      message: "Un message suffisamment long.",
    };

    const result = await controller.createContactSubmission(dto, "127.0.0.1");

    expect(contactSubmissionService.create).toHaveBeenCalledWith(
      dto,
      "127.0.0.1",
    );
    expect(result).toEqual({ success: true });
  });
});
