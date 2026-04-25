import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateHelpFaqDto } from "./dto/create-help-faq.dto.js";
import { CreateHelpFaqItemDto } from "./dto/create-help-faq-item.dto.js";
import { CreateHelpFaqThemeDto } from "./dto/create-help-faq-theme.dto.js";
import { GetCurrentHelpFaqDto } from "./dto/get-current-help-faq.dto.js";
import { ListHelpFaqsAdminDto } from "./dto/list-help-faqs-admin.dto.js";
import { SearchHelpFaqItemsDto } from "./dto/search-help-faq-items.dto.js";
import { UpdateHelpFaqDto } from "./dto/update-help-faq.dto.js";
import { UpdateHelpFaqItemDto } from "./dto/update-help-faq-item.dto.js";
import { UpdateHelpFaqThemeDto } from "./dto/update-help-faq-theme.dto.js";
import { HelpFaqsService } from "./help-faqs.service.js";

@Controller("help-faqs")
@UseGuards(JwtAuthGuard)
export class HelpFaqsController {
  constructor(private readonly helpFaqsService: HelpFaqsService) {}

  @Get("current")
  getCurrentFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetCurrentHelpFaqDto,
  ) {
    return this.helpFaqsService.getCurrentFaq(user, query);
  }

  @Get("current/themes")
  getCurrentThemes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetCurrentHelpFaqDto,
  ) {
    return this.helpFaqsService.getCurrentThemes(user, query);
  }

  @Get("current/search")
  searchCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchHelpFaqItemsDto & GetCurrentHelpFaqDto,
  ) {
    return this.helpFaqsService.searchCurrent(user, query);
  }

  @Get("admin/global/faqs")
  listGlobalFaqsAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHelpFaqsAdminDto,
  ) {
    return this.helpFaqsService.listGlobalFaqsAdmin(user, query);
  }

  @Get("admin/school/faqs")
  listSchoolFaqsAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHelpFaqsAdminDto,
  ) {
    return this.helpFaqsService.listSchoolFaqsAdmin(user, query);
  }

  @Post("admin/global/faqs")
  createGlobalFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpFaqDto,
  ) {
    return this.helpFaqsService.createGlobalFaq(user, dto);
  }

  @Post("admin/school/faqs")
  createSchoolFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpFaqDto,
  ) {
    return this.helpFaqsService.createSchoolFaq(user, dto);
  }

  @Patch("admin/global/faqs/:faqId")
  updateGlobalFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
    @Body() dto: UpdateHelpFaqDto,
  ) {
    return this.helpFaqsService.updateGlobalFaq(user, faqId, dto);
  }

  @Patch("admin/school/faqs/:faqId")
  updateSchoolFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
    @Body() dto: UpdateHelpFaqDto,
  ) {
    return this.helpFaqsService.updateSchoolFaq(user, faqId, dto);
  }

  @Delete("admin/global/faqs/:faqId")
  deleteGlobalFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
  ) {
    return this.helpFaqsService.deleteGlobalFaq(user, faqId);
  }

  @Delete("admin/school/faqs/:faqId")
  deleteSchoolFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
  ) {
    return this.helpFaqsService.deleteSchoolFaq(user, faqId);
  }

  @Post("admin/global/faqs/:faqId/themes")
  createGlobalTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
    @Body() dto: CreateHelpFaqThemeDto,
  ) {
    return this.helpFaqsService.createGlobalTheme(user, faqId, dto);
  }

  @Post("admin/school/faqs/:faqId/themes")
  createSchoolTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("faqId") faqId: string,
    @Body() dto: CreateHelpFaqThemeDto,
  ) {
    return this.helpFaqsService.createSchoolTheme(user, faqId, dto);
  }

  @Patch("admin/global/themes/:themeId")
  updateGlobalTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
    @Body() dto: UpdateHelpFaqThemeDto,
  ) {
    return this.helpFaqsService.updateGlobalTheme(user, themeId, dto);
  }

  @Patch("admin/school/themes/:themeId")
  updateSchoolTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
    @Body() dto: UpdateHelpFaqThemeDto,
  ) {
    return this.helpFaqsService.updateSchoolTheme(user, themeId, dto);
  }

  @Delete("admin/global/themes/:themeId")
  deleteGlobalTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
  ) {
    return this.helpFaqsService.deleteGlobalTheme(user, themeId);
  }

  @Delete("admin/school/themes/:themeId")
  deleteSchoolTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
  ) {
    return this.helpFaqsService.deleteSchoolTheme(user, themeId);
  }

  @Post("admin/global/themes/:themeId/items")
  createGlobalItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
    @Body() dto: CreateHelpFaqItemDto,
  ) {
    return this.helpFaqsService.createGlobalItem(user, themeId, dto);
  }

  @Post("admin/school/themes/:themeId/items")
  createSchoolItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("themeId") themeId: string,
    @Body() dto: CreateHelpFaqItemDto,
  ) {
    return this.helpFaqsService.createSchoolItem(user, themeId, dto);
  }

  @Patch("admin/global/items/:itemId")
  updateGlobalItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateHelpFaqItemDto,
  ) {
    return this.helpFaqsService.updateGlobalItem(user, itemId, dto);
  }

  @Patch("admin/school/items/:itemId")
  updateSchoolItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateHelpFaqItemDto,
  ) {
    return this.helpFaqsService.updateSchoolItem(user, itemId, dto);
  }

  @Delete("admin/global/items/:itemId")
  deleteGlobalItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ) {
    return this.helpFaqsService.deleteGlobalItem(user, itemId);
  }

  @Delete("admin/school/items/:itemId")
  deleteSchoolItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ) {
    return this.helpFaqsService.deleteSchoolItem(user, itemId);
  }
}
