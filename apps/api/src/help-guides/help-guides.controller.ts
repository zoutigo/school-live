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

  @Get("admin/global/guides")
  listGlobalGuidesAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHelpGuidesAdminDto,
  ) {
    return this.helpGuidesService.listGlobalGuidesAdmin(user, query);
  }

  @Get("admin/school/guides")
  listSchoolGuidesAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHelpGuidesAdminDto,
  ) {
    return this.helpGuidesService.listSchoolGuidesAdmin(user, query);
  }

  @Post("admin/global/guides")
  createGlobalGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpGuideDto,
  ) {
    return this.helpGuidesService.createGlobalGuide(user, dto);
  }

  @Post("admin/school/guides")
  createSchoolGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpGuideDto,
  ) {
    return this.helpGuidesService.createSchoolGuide(user, dto);
  }

  @Patch("admin/global/guides/:guideId")
  updateGlobalGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: UpdateHelpGuideDto,
  ) {
    return this.helpGuidesService.updateGlobalGuide(user, guideId, dto);
  }

  @Patch("admin/school/guides/:guideId")
  updateSchoolGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: UpdateHelpGuideDto,
  ) {
    return this.helpGuidesService.updateSchoolGuide(user, guideId, dto);
  }

  @Delete("admin/global/guides/:guideId")
  deleteGlobalGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
  ) {
    return this.helpGuidesService.deleteGlobalGuide(user, guideId);
  }

  @Delete("admin/school/guides/:guideId")
  deleteSchoolGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
  ) {
    return this.helpGuidesService.deleteSchoolGuide(user, guideId);
  }

  @Post("admin/global/guides/:guideId/chapters")
  createGlobalChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: CreateHelpChapterDto,
  ) {
    return this.helpGuidesService.createGlobalChapter(user, guideId, dto);
  }

  @Post("admin/school/guides/:guideId/chapters")
  createSchoolChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("guideId") guideId: string,
    @Body() dto: CreateHelpChapterDto,
  ) {
    return this.helpGuidesService.createSchoolChapter(user, guideId, dto);
  }

  @Patch("admin/global/chapters/:chapterId")
  updateGlobalChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
    @Body() dto: UpdateHelpChapterDto,
  ) {
    return this.helpGuidesService.updateGlobalChapter(user, chapterId, dto);
  }

  @Patch("admin/school/chapters/:chapterId")
  updateSchoolChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
    @Body() dto: UpdateHelpChapterDto,
  ) {
    return this.helpGuidesService.updateSchoolChapter(user, chapterId, dto);
  }

  @Delete("admin/global/chapters/:chapterId")
  deleteGlobalChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
  ) {
    return this.helpGuidesService.deleteGlobalChapter(user, chapterId);
  }

  @Delete("admin/school/chapters/:chapterId")
  deleteSchoolChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
  ) {
    return this.helpGuidesService.deleteSchoolChapter(user, chapterId);
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
