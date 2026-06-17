import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CreateTestCampaignDto } from "./dto/create-test-campaign.dto.js";
import { CreateTestCaseDto } from "./dto/create-test-case.dto.js";
import { UpdateTestCampaignDto } from "./dto/update-test-campaign.dto.js";
import { UpdateTestCaseDto } from "./dto/update-test-case.dto.js";
import { TestsService } from "./tests.service.js";

@Controller("schools/:schoolSlug/admin/tests")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "ADMIN", "SUPER_ADMIN")
export class TestsAdminController {
  constructor(private readonly testsService: TestsService) {}

  @Get("campaigns")
  listCampaigns(@CurrentSchoolId() schoolId: string) {
    return this.testsService.listAdminCampaigns(schoolId);
  }

  @Get("campaigns/:campaignId")
  getCampaign(
    @CurrentSchoolId() schoolId: string,
    @Param("campaignId") campaignId: string,
  ) {
    return this.testsService.getAdminCampaign(schoolId, campaignId);
  }

  @Post("campaigns")
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateTestCampaignDto,
  ) {
    return this.testsService.createCampaign(user, schoolId, payload);
  }

  @Patch("campaigns/:campaignId")
  updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("campaignId") campaignId: string,
    @Body() payload: UpdateTestCampaignDto,
  ) {
    return this.testsService.updateCampaign(
      user,
      schoolId,
      campaignId,
      payload,
    );
  }

  @Delete("campaigns/:campaignId")
  deleteCampaign(
    @CurrentSchoolId() schoolId: string,
    @Param("campaignId") campaignId: string,
  ) {
    return this.testsService.deleteCampaign(schoolId, campaignId);
  }

  @Post("campaigns/:campaignId/cases")
  createTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("campaignId") campaignId: string,
    @Body() payload: CreateTestCaseDto,
  ) {
    return this.testsService.createTestCase(
      user,
      schoolId,
      campaignId,
      payload,
    );
  }

  @Patch("cases/:testCaseId")
  updateTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("testCaseId") testCaseId: string,
    @Body() payload: UpdateTestCaseDto,
  ) {
    return this.testsService.updateTestCase(
      user,
      schoolId,
      testCaseId,
      payload,
    );
  }

  @Delete("cases/:testCaseId")
  deleteTestCase(
    @CurrentSchoolId() schoolId: string,
    @Param("testCaseId") testCaseId: string,
  ) {
    return this.testsService.deleteTestCase(schoolId, testCaseId);
  }
}
