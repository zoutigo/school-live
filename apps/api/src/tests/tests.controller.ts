import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { TestExecutionStatus } from "@prisma/client";
import { AnyMembershipRolesGuard } from "../access/any-membership-roles.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import {
  testsLocaleFromUser,
  translateTestsError,
} from "./tests.translations.js";
import { TestsService } from "./tests.service.js";

// Les tests (campagnes/cas) sont globaux à l'application : leur visibilité dépend du
// rôle du testeur (audienceRoles), pas de l'école qu'il a active à l'instant T.
@Controller("tests")
@UseGuards(JwtAuthGuard, AnyMembershipRolesGuard, RolesGuard)
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
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get("campaigns")
  listCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.testsService.listCampaigns(user);
  }

  @Get("campaigns/:campaignId")
  getCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string,
  ) {
    return this.testsService.getCampaign(user, campaignId);
  }

  @Get("cases/:testCaseId")
  getTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param("testCaseId") testCaseId: string,
  ) {
    return this.testsService.getTestCase(user, testCaseId);
  }

  @Post("cases/:testCaseId/executions")
  @UseInterceptors(
    FilesInterceptor("attachments", 6, {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  createExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param("testCaseId") testCaseId: string,
    @Body() payload: Record<string, unknown>,
    @UploadedFiles()
    attachments?: Array<{
      originalname?: string;
      buffer: Buffer;
      mimetype: string;
      size: number;
    }>,
  ) {
    const locale = testsLocaleFromUser(user);
    const status = String(payload.status ?? "").trim() as TestExecutionStatus;
    if (!(status in TestExecutionStatus)) {
      throw new BadRequestException(
        translateTestsError(locale, "tests.errors.executionStatusInvalid"),
      );
    }

    const resultText =
      typeof payload.resultText === "string" ? payload.resultText : "";
    const comment =
      typeof payload.comment === "string" ? payload.comment : undefined;
    const deviceInfo =
      typeof payload.deviceInfo === "string" ? payload.deviceInfo : undefined;
    const appVersion =
      typeof payload.appVersion === "string" ? payload.appVersion : undefined;

    return this.testsService.createExecution(
      user,
      testCaseId,
      { status, resultText, comment, deviceInfo, appVersion },
      attachments ?? [],
    );
  }
}
