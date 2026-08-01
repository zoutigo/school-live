import { Module } from "@nestjs/common";
import { ContactInfoService } from "./contact-info.service.js";
import { LegalDocumentsService } from "./legal-documents.service.js";
import { SiteContentAdminController } from "./site-content-admin.controller.js";
import { SiteContentPublicController } from "./site-content-public.controller.js";

@Module({
  controllers: [SiteContentPublicController, SiteContentAdminController],
  providers: [ContactInfoService, LegalDocumentsService],
})
export class SiteContentModule {}
