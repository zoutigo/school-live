import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { ContactInfoService } from "./contact-info.service.js";
import { ContactSubmissionService } from "./contact-submission.service.js";
import { CreateLegalDocumentDto } from "./dto/create-legal-document.dto.js";
import { ListContactSubmissionsDto } from "./dto/list-contact-submissions.dto.js";
import { ListLegalDocumentsDto } from "./dto/list-legal-documents.dto.js";
import { UpdateContactInfoDto } from "./dto/update-contact-info.dto.js";
import { UpdateLegalDocumentDto } from "./dto/update-legal-document.dto.js";
import { LegalDocumentsService } from "./legal-documents.service.js";

@Controller("site-content/admin")
@UseGuards(JwtAuthGuard)
export class SiteContentAdminController {
  constructor(
    private readonly contactInfoService: ContactInfoService,
    private readonly legalDocumentsService: LegalDocumentsService,
    private readonly contactSubmissionService: ContactSubmissionService,
  ) {}

  @Get("contact")
  getContactInfo(@CurrentUser() user: AuthenticatedUser) {
    this.contactInfoService.assertCanManage(user);
    return this.contactInfoService.getContactInfo();
  }

  @Put("contact")
  updateContactInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateContactInfoDto,
  ) {
    return this.contactInfoService.updateContactInfo(user, dto);
  }

  @Get("legal-documents")
  listLegalDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLegalDocumentsDto,
  ) {
    return this.legalDocumentsService.list(user, query);
  }

  @Post("legal-documents")
  createLegalDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    return this.legalDocumentsService.create(user, dto);
  }

  @Patch("legal-documents/:id")
  updateLegalDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.legalDocumentsService.update(user, id, dto);
  }

  @Post("legal-documents/:id/publish")
  publishLegalDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.legalDocumentsService.publish(user, id);
  }

  @Delete("legal-documents/:id")
  deleteLegalDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.legalDocumentsService.delete(user, id);
  }

  @Get("contact-submissions")
  listContactSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContactSubmissionsDto,
  ) {
    return this.contactSubmissionService.list(user, query);
  }

  @Get("contact-submissions/:id")
  getContactSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.contactSubmissionService.getOne(user, id);
  }
}
