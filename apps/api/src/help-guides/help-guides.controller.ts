import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { CreateHelpChapterDto } from "./dto/create-help-chapter.dto.js";
import { CreateHelpGuideDto } from "./dto/create-help-guide.dto.js";
import { GetCurrentGuideDto } from "./dto/get-current-guide.dto.js";
import { ListHelpGuidesAdminDto } from "./dto/list-help-guides-admin.dto.js";
import { SearchHelpChaptersDto } from "./dto/search-help-chapters.dto.js";
import { UpdateHelpChapterDto } from "./dto/update-help-chapter.dto.js";
import { UpdateHelpGuideDto } from "./dto/update-help-guide.dto.js";
import { HelpGuidesService } from "./help-guides.service.js";

@Controller("help-guides")
@UseGuards(JwtAuthGuard)
export class HelpGuidesController {
  constructor(
    private readonly helpGuidesService: HelpGuidesService,
    private readonly mediaClientService: MediaClientService,
  ) {}

  @Get("current")
  getCurrentGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetCurrentGuideDto,
  ) {
    return this.helpGuidesService.getCurrentGuide(user, query);
  }

  @Get("current/plan")
  getCurrentPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetCurrentGuideDto,
  ) {
    return this.helpGuidesService.getCurrentPlan(user, query);
  }

  @Get("current/search")
  searchCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchHelpChaptersDto & GetCurrentGuideDto,
  ) {
    return this.helpGuidesService.searchCurrent(user, query);
  }

  @Get("current/chapters/:chapterId")
  getCurrentChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
    @Query() query: GetCurrentGuideDto,
  ) {
    return this.helpGuidesService.getCurrentChapter(user, chapterId, query);
  }

  @Get("admin/guides")
  listGuidesAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHelpGuidesAdminDto,
  ) {
    return this.helpGuidesService.listGuidesAdmin(user, query);
  }

  @Post("admin/guides")
  createGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpGuideDto,
  ) {
    return this.helpGuidesService.createGuide(user, dto);
  }

  @Patch("admin/guides/:guideId")
  updateGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: UpdateHelpGuideDto,
  ) {
    return this.helpGuidesService.updateGuide(user, guideId, dto);
  }

  @Delete("admin/guides/:guideId")
  deleteGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
  ) {
    return this.helpGuidesService.deleteGuide(user, guideId);
  }

  @Post("admin/guides/:guideId/chapters")
  createChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: CreateHelpChapterDto,
  ) {
    return this.helpGuidesService.createChapter(user, guideId, dto);
  }

  @Patch("admin/chapters/:chapterId")
  updateChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
    @Body() dto: UpdateHelpChapterDto,
  ) {
    return this.helpGuidesService.updateChapter(user, chapterId, dto);
  }

  @Delete("admin/chapters/:chapterId")
  deleteChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
  ) {
    return this.helpGuidesService.deleteChapter(user, chapterId);
  }

  @Post("admin/uploads/inline-image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadInlineImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier image manquant");
    }

    try {
      this.helpGuidesService.assertCanManage(user);
    } catch {
      throw new ForbiddenException("Réservé aux utilisateurs plateforme");
    }

    return this.mediaClientService.uploadImage("messaging-inline-image", file);
  }

  @Post("admin/uploads/inline-video")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 80 * 1024 * 1024,
      },
    }),
  )
  async uploadInlineVideo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException("Fichier video manquant");
    }

    try {
      this.helpGuidesService.assertCanManage(user);
    } catch {
      throw new ForbiddenException("Réservé aux utilisateurs plateforme");
    }

    return this.mediaClientService.uploadImage("guide-inline-video", file);
  }
}
