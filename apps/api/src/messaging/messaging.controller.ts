import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { ArchiveMessageDto } from "./dto/archive-message.dto.js";
import { CreateMessageDto } from "./dto/create-message.dto.js";
import { ListMessagesDto } from "./dto/list-messages.dto.js";
import { MarkMessageReadDto } from "./dto/mark-message-read.dto.js";
import { UpdateDraftMessageDto } from "./dto/update-draft-message.dto.js";
import { MessagingService } from "./messaging.service.js";

@Controller("schools/:schoolSlug/messages")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
  "STUDENT",
  "ADMIN",
  "SUPER_ADMIN",
)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.messagingService.listMessages(user, schoolId, query);
  }

  @Post("uploads/inline-image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadInlineImage(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }
    const uploaded = await this.mediaClientService.uploadImage(
      "messaging-inline-image",
      file,
    );
    await this.inlineMediaService.registerTempUpload({
      schoolId,
      uploadedByUserId: user.id,
      scope: "MESSAGING",
      url: uploaded.url,
    });
    return uploaded;
  }

  @Get("unread-count")
  unreadCount(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
  ) {
    return this.messagingService.getUnreadCount(user, schoolId);
  }

  @Get(":messageId")
  details(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.getMessage(user, schoolId, messageId);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor("attachments", 10, {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: Record<string, unknown>,
    @UploadedFiles()
    attachments?: Array<{
      originalname?: string;
      buffer: Buffer;
      mimetype: string;
      size: number;
    }>,
  ) {
    return this.messagingService.createMessage(
      user,
      schoolId,
      this.normalizeCreatePayload(payload),
      attachments ?? [],
    );
  }

  @Patch(":messageId/draft")
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
    @Body() payload: UpdateDraftMessageDto,
  ) {
    return this.messagingService.updateDraft(
      user,
      schoolId,
      messageId,
      payload,
    );
  }

  @Post(":messageId/send")
  sendDraft(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.sendDraft(user, schoolId, messageId);
  }

  @Patch(":messageId/read")
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
    @Body() payload: MarkMessageReadDto,
  ) {
    return this.messagingService.markRead(
      user,
      schoolId,
      messageId,
      payload.read,
    );
  }

  @Patch(":messageId/archive")
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
    @Body() payload: ArchiveMessageDto,
  ) {
    return this.messagingService.archiveMessage(
      user,
      schoolId,
      messageId,
      payload.archived,
    );
  }

  @Delete(":messageId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.deleteFromMailbox(user, schoolId, messageId);
  }

  private normalizeCreatePayload(payload: Record<string, unknown>) {
    const subject = this.ensureStringField(payload.subject, "subject");
    const body = this.ensureStringField(payload.body, "body");
    const recipientUserIds = this.normalizeRecipientIds(
      payload.recipientUserIds,
    );
    const isDraft = this.normalizeBoolean(payload.isDraft);

    return {
      subject,
      body,
      recipientUserIds,
      ...(isDraft === undefined ? {} : { isDraft }),
    } satisfies CreateMessageDto;
  }

  private ensureStringField(value: unknown, fieldName: string) {
    if (typeof value !== "string") {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return value;
  }

  private normalizeRecipientIds(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => String(entry));
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Invalid recipientUserIds");
    }

    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    if (normalized.startsWith("[")) {
      try {
        const parsed = JSON.parse(normalized) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry));
        }
      } catch {
        throw new BadRequestException("Invalid recipientUserIds");
      }
    }

    if (normalized.includes(",")) {
      return normalized
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    return [normalized];
  }

  private normalizeBoolean(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Invalid isDraft");
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }

    throw new BadRequestException("Invalid isDraft");
  }
}
