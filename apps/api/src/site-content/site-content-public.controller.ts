import { Body, Controller, Get, Ip, Param, Post } from "@nestjs/common";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";
import { CreateContactSubmissionDto } from "./dto/create-contact-submission.dto.js";
import { LegalDocumentsService } from "./legal-documents.service.js";

@Controller("public/site-content")
export class SiteContentPublicController {
  constructor(
    private readonly contactInfoService: ContactInfoService,
    private readonly legalDocumentsService: LegalDocumentsService,
    private readonly contactSubmissionService: ContactSubmissionService,
  ) {}

  @Get("contact")
  getContactInfo() {
    return this.contactInfoService.getContactInfo();
  }

  @Post("contact-submissions")
  async createContactSubmission(
    @Body() dto: CreateContactSubmissionDto,
    @Ip() ip: string,
  ) {
    await this.contactSubmissionService.create(dto, ip);
    return { success: true };
  }

  @Get("legal/:slug/:locale")
  getLegalDocument(
    @Param("slug") slug: string,
    @Param("locale") locale: string,
  ) {
    return this.legalDocumentsService.getPublished(slug, locale);
  }
}
