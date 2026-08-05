import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PromotionsService } from "./promotions.service.js";
import { SetTermReportDecisionDto } from "./dto/set-term-report-decision.dto.js";
import { ListWaitingEnrollmentsQueryDto } from "./dto/list-waiting-enrollments-query.dto.js";
import { AssignEnrollmentToClassDto } from "./dto/assign-enrollment-to-class.dto.js";

const PROMOTION_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

@Controller("schools/:schoolSlug/admin/promotions")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(...PROMOTION_ROLES)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("classes/:classId/term-reports")
  listTermReportsForDecision(
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
  ) {
    return this.promotionsService.listTermReportsForDecision(schoolId, classId);
  }

  @Patch("term-reports/:reportId/decision")
  setTermReportDecision(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string,
    @Body() payload: SetTermReportDecisionDto,
  ) {
    return this.promotionsService.setTermReportDecision(
      schoolId,
      reportId,
      payload,
      user.id,
    );
  }

  @Get("waiting-enrollments")
  listWaitingEnrollments(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListWaitingEnrollmentsQueryDto,
  ) {
    return this.promotionsService.listWaitingEnrollments(schoolId, query);
  }

  @Patch("enrollments/:enrollmentId/assign-class")
  assignEnrollmentToClass(
    @CurrentSchoolId() schoolId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() payload: AssignEnrollmentToClassDto,
  ) {
    return this.promotionsService.assignEnrollmentToClass(
      schoolId,
      enrollmentId,
      payload,
    );
  }

  @Post("students/:studentId/confirm-reinscription")
  confirmReinscriptionManually(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Body("schoolYearId") schoolYearId: string,
  ) {
    return this.promotionsService.confirmReinscriptionManually(
      schoolId,
      studentId,
      schoolYearId,
      user.id,
    );
  }
}
