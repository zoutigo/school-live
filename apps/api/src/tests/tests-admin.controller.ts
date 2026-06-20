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
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { AssignCampaignDto } from "./dto/assign-campaign.dto.js";
import { CreateTestCampaignDto } from "./dto/create-test-campaign.dto.js";
import { CreateTestCaseDto } from "./dto/create-test-case.dto.js";
import { ListAdminCampaignsQueryDto } from "./dto/list-admin-campaigns-query.dto.js";
import { ListAdminExecutionsQueryDto } from "./dto/list-admin-executions-query.dto.js";
import { ListTestersQueryDto } from "./dto/list-testers-query.dto.js";
import { ReviewExecutionDto } from "./dto/review-execution.dto.js";
import { UpdateTestCampaignDto } from "./dto/update-test-campaign.dto.js";
import { UpdateTestCaseDto } from "./dto/update-test-case.dto.js";
import { TestsService } from "./tests.service.js";

// Pilotage des tests réservé à SUPER_ADMIN/ADMIN : les campagnes sont globales à
// l'application, un SCHOOL_ADMIN n'a pas vocation à les gérer.
@Controller("admin/tests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
export class TestsAdminController {
  constructor(private readonly testsService: TestsService) {}

  @Get("synthesis")
  getSynthesis() {
    return this.testsService.getSynthesis();
  }

  @Get("testers")
  listTesters(@Query() query: ListTestersQueryDto) {
    return this.testsService.listTesters(query);
  }

  @Get("campaigns")
  listCampaigns(@Query() query: ListAdminCampaignsQueryDto) {
    return this.testsService.listAdminCampaigns(query);
  }

  @Get("executions")
  listExecutions(@Query() query: ListAdminExecutionsQueryDto) {
    return this.testsService.listAdminExecutions(query);
  }

  @Get("executions/:executionId")
  getExecution(@Param("executionId") executionId: string) {
    return this.testsService.getAdminExecution(executionId);
  }

  @Patch("executions/:executionId/review")
  reviewExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param("executionId") executionId: string,
    @Body() payload: ReviewExecutionDto,
  ) {
    return this.testsService.reviewExecution(user, executionId, payload);
  }

  @Get("campaigns/:campaignId")
  getCampaign(@Param("campaignId") campaignId: string) {
    return this.testsService.getAdminCampaign(campaignId);
  }

  @Post("campaigns")
  createCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateTestCampaignDto,
  ) {
    return this.testsService.createCampaign(user, payload);
  }

  @Patch("campaigns/:campaignId")
  updateCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string,
    @Body() payload: UpdateTestCampaignDto,
  ) {
    return this.testsService.updateCampaign(user, campaignId, payload);
  }

  @Delete("campaigns/:campaignId")
  deleteCampaign(@Param("campaignId") campaignId: string) {
    return this.testsService.deleteCampaign(campaignId);
  }

  @Get("campaigns/:campaignId/assignments")
  listAssignments(@Param("campaignId") campaignId: string) {
    return this.testsService.listAssignments(campaignId);
  }

  @Post("campaigns/:campaignId/assignments")
  assignCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string,
    @Body() payload: AssignCampaignDto,
  ) {
    return this.testsService.assignCampaign(
      user,
      campaignId,
      payload.testerId,
      payload.note,
    );
  }

  @Delete("assignments/:assignmentId")
  unassignCampaign(@Param("assignmentId") assignmentId: string) {
    return this.testsService.unassignCampaign(assignmentId);
  }

  @Post("campaigns/:campaignId/cases")
  createTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param("campaignId") campaignId: string,
    @Body() payload: CreateTestCaseDto,
  ) {
    return this.testsService.createTestCase(user, campaignId, payload);
  }

  @Patch("cases/:testCaseId")
  updateTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param("testCaseId") testCaseId: string,
    @Body() payload: UpdateTestCaseDto,
  ) {
    return this.testsService.updateTestCase(user, testCaseId, payload);
  }

  @Delete("cases/:testCaseId")
  deleteTestCase(@Param("testCaseId") testCaseId: string) {
    return this.testsService.deleteTestCase(testCaseId);
  }

  @Post("cases/:testCaseId/recycle")
  recycleTestCase(@Param("testCaseId") testCaseId: string) {
    return this.testsService.recycleTestCase(testCaseId);
  }
}
