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
import { StudentHealthService } from "./student-health.service.js";
import { CreateStudentHealthConditionDto } from "./dto/create-student-health-condition.dto.js";
import { UpdateStudentHealthConditionDto } from "./dto/update-student-health-condition.dto.js";
import { CreateStudentHealthCareEventDto } from "./dto/create-student-health-care-event.dto.js";
import { UpdateStudentHealthCareEventDto } from "./dto/update-student-health-care-event.dto.js";
import { CreateStudentHealthReportDto } from "./dto/create-student-health-report.dto.js";
import { ListStudentHealthConditionsQueryDto } from "./dto/list-student-health-conditions-query.dto.js";
import { GetStudentHealthHistoryQueryDto } from "./dto/get-student-health-history-query.dto.js";

const HEALTH_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SCHOOL_HEALTH_OFFICER",
  "TEACHER",
  "PARENT",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

@Controller("schools/:schoolSlug/students/:studentId/health")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(...HEALTH_ROLES)
export class StudentHealthController {
  constructor(private readonly studentHealthService: StudentHealthService) {}

  @Get("conditions")
  listConditions(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Query() query: ListStudentHealthConditionsQueryDto,
  ) {
    return this.studentHealthService.listConditions(
      schoolId,
      user,
      studentId,
      query,
    );
  }

  @Get("alerts")
  listPublicAlerts(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.studentHealthService.listPublicAlerts(
      schoolId,
      user,
      studentId,
    );
  }

  @Post("conditions")
  createCondition(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Body() payload: CreateStudentHealthConditionDto,
  ) {
    return this.studentHealthService.createCondition(
      schoolId,
      user,
      studentId,
      payload,
    );
  }

  @Patch("conditions/:conditionId")
  updateCondition(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Param("conditionId") conditionId: string,
    @Body() payload: UpdateStudentHealthConditionDto,
  ) {
    return this.studentHealthService.updateCondition(
      schoolId,
      user,
      studentId,
      conditionId,
      payload,
    );
  }

  @Get("care-events")
  listCareEvents(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.studentHealthService.listCareEvents(schoolId, user, studentId);
  }

  @Post("care-events")
  createCareEvent(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Body() payload: CreateStudentHealthCareEventDto,
  ) {
    return this.studentHealthService.createCareEvent(
      schoolId,
      user,
      studentId,
      payload,
    );
  }

  @Patch("care-events/:careEventId")
  updateCareEvent(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Param("careEventId") careEventId: string,
    @Body() payload: UpdateStudentHealthCareEventDto,
  ) {
    return this.studentHealthService.updateCareEvent(
      schoolId,
      user,
      studentId,
      careEventId,
      payload,
    );
  }

  @Get("reports")
  listReports(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.studentHealthService.listReports(schoolId, user, studentId);
  }

  @Post("reports")
  createReport(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Body() payload: CreateStudentHealthReportDto,
  ) {
    return this.studentHealthService.createReport(
      schoolId,
      user,
      studentId,
      payload,
    );
  }

  @Post("reports/:reportId/acknowledge")
  acknowledgeReport(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Param("reportId") reportId: string,
  ) {
    return this.studentHealthService.acknowledgeReport(
      schoolId,
      user,
      studentId,
      reportId,
    );
  }

  @Get("urgence")
  getUrgencySummary(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.studentHealthService.getUrgencySummary(
      schoolId,
      user,
      studentId,
    );
  }

  @Get("history")
  getHistory(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Query() query: GetStudentHealthHistoryQueryDto,
  ) {
    return this.studentHealthService.getHistory(
      schoolId,
      user,
      studentId,
      query,
    );
  }
}
