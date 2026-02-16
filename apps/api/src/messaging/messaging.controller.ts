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
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
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
  uploadInlineImage(
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }
    return this.mediaClientService.uploadImage("messaging-inline-image", file);
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
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateMessageDto,
  ) {
    return this.messagingService.createMessage(user, schoolId, payload);
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
}
