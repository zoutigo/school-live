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

// Un enseignant referent peut acceder aux routes de decision (term-reports),
// mais pas a la gestion des inscriptions en attente / affectation de classe :
// ces deux routes gardent PROMOTION_ROLES via un @Roles dedie sur leurs handlers.
const PROMOTION_DECISION_ROLES = [...PROMOTION_ROLES, "TEACHER"] as const;

@Controller("schools/:schoolSlug/admin/promotions")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("classes/:classId/term-reports")
  @Roles(...PROMOTION_DECISION_ROLES)
  listTermReportsForDecision(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId") classId: string,
  ) {
    return this.promotionsService.listTermReportsForDecision(
      user,
      schoolId,
      classId,
    );
  }

  @Patch("term-reports/:reportId/decision")
  @Roles(...PROMOTION_DECISION_ROLES)
  setTermReportDecision(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("reportId") reportId: string,
    @Body() payload: SetTermReportDecisionDto,
  ) {
    return this.promotionsService.setTermReportDecision(
      user,
      schoolId,
      reportId,
      payload,
    );
  }

  @Get("waiting-enrollments")
  @Roles(...PROMOTION_ROLES)
  listWaitingEnrollments(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListWaitingEnrollmentsQueryDto,
  ) {
    return this.promotionsService.listWaitingEnrollments(schoolId, query);
  }

  @Patch("enrollments/:enrollmentId/assign-class")
  @Roles(...PROMOTION_ROLES)
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
  @Roles(...PROMOTION_ROLES)
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
