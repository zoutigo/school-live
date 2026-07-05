import {
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
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { ArchiveMessageDto } from "./dto/archive-message.dto.js";
import { ListMessagesDto } from "./dto/list-messages.dto.js";
import { MarkMessageReadDto } from "./dto/mark-message-read.dto.js";
import { UpdateDraftMessageDto } from "./dto/update-draft-message.dto.js";
import { normalizeCreateMessagePayload } from "./messaging-payload.util.js";
import { messagingLocaleFromUser } from "./messaging.translations.js";
import { MessagingService } from "./messaging.service.js";

/**
 * Platform-role (SUPER_ADMIN/ADMIN) mailbox: aggregates every school where
 * the caller is sender or recipient into a single inbox, since they aren't
 * scoped to one school themselves. Never exposes messages between third
 * parties the caller isn't a party to (see MessagingService doc).
 */
@Controller("admin/messages")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "ADMIN")
export class AdminMessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMessagesDto,
  ) {
    return this.messagingService.listMessagesAcrossSchools(user, query);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getUnreadCountAcrossSchools(user);
  }

  @Get(":messageId")
  details(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.getMessageAcrossSchools(user, messageId);
  }

  @Post("uploads/inline-image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadInlineImage(
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    // Unlike the per-school controller, this doesn't call
    // inlineMediaService.registerTempUpload: no schoolId is known yet at
    // upload time (it's resolved once the recipients are picked). The image
    // still gets tracked for cleanup once the message is created/saved, via
    // syncEntityImages(schoolId) inside MessagingService#createMessage.
    return this.mediaClientService.uploadImage("messaging-inline-image", file);
  }

  @Post("uploads/attachment")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.mediaClientService.uploadImage("messaging-attachment", file);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor("attachments", 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: Record<string, unknown>,
    @UploadedFiles()
    attachments?: Array<{
      originalname?: string;
      buffer: Buffer;
      mimetype: string;
      size: number;
    }>,
  ) {
    const locale = messagingLocaleFromUser(user);
    const normalized = normalizeCreateMessagePayload(payload, locale);
    const groups = await this.messagingService.groupRecipientsBySchool(
      normalized.recipientUserIds ?? [],
      locale,
    );

    const schoolIds = Array.from(groups.keys());

    if (schoolIds.length === 1) {
      return this.messagingService.createMessage(
        user,
        schoolIds[0],
        normalized,
        attachments ?? [],
      );
    }

    // Broadcast across several schools at once (e.g. "message every school
    // admin"): one InternalMessage per school, always sent immediately —
    // a multi-school "draft" can't be represented coherently in one row.
    const created = await Promise.all(
      schoolIds.map((schoolId) =>
        this.messagingService.createMessage(
          user,
          schoolId,
          {
            ...normalized,
            recipientUserIds: groups.get(schoolId),
            isDraft: false,
          },
          attachments ?? [],
        ),
      ),
    );

    return { broadcast: true, schools: schoolIds.length, messages: created };
  }

  @Patch(":messageId/draft")
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
    @Body() payload: UpdateDraftMessageDto,
  ) {
    return this.messagingService.updateDraftAcrossSchools(
      user,
      messageId,
      payload,
    );
  }

  @Post(":messageId/send")
  sendDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.sendDraftAcrossSchools(user, messageId);
  }

  @Patch(":messageId/read")
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
    @Body() payload: MarkMessageReadDto,
  ) {
    return this.messagingService.markReadAcrossSchools(
      user,
      messageId,
      payload.read,
    );
  }

  @Patch(":messageId/archive")
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
    @Body() payload: ArchiveMessageDto,
  ) {
    return this.messagingService.archiveMessageAcrossSchools(
      user,
      messageId,
      payload.archived,
    );
  }

  @Delete(":messageId")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
  ) {
    return this.messagingService.deleteFromMailboxAcrossSchools(
      user,
      messageId,
    );
  }
}
