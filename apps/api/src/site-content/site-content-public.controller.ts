import { Controller, Get, Param } from "@nestjs/common";
import { ContactInfoService } from "./contact-info.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";

@Controller("public/site-content")
export class SiteContentPublicController {
  constructor(
    private readonly contactInfoService: ContactInfoService,
    private readonly legalDocumentsService: LegalDocumentsService,
  ) {}

  @Get("contact")
  getContactInfo() {
    return this.contactInfoService.getContactInfo();
  }

  @Get("legal/:slug/:locale")
  getLegalDocument(
    @Param("slug") slug: string,
    @Param("locale") locale: string,
  ) {
    return this.legalDocumentsService.getPublished(slug, locale);
  }
}
