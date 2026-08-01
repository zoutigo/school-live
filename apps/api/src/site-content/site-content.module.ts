import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module.js";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";
import { SiteContentAdminController } from "./site-content-admin.controller.js";
import { SiteContentPublicController } from "./site-content-public.controller.js";

@Module({
  imports: [MailModule],
  controllers: [SiteContentPublicController, SiteContentAdminController],
  providers: [
    ContactInfoService,
    LegalDocumentsService,
    ContactSubmissionService,
  ],
})
export class SiteContentModule {}
