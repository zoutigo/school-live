import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { SchoolHealthService } from "./school-health.service.js";
import { ListSchoolHealthStudentsQueryDto } from "./dto/list-school-health-students-query.dto.js";
import { ListSchoolHealthReportsQueryDto } from "./dto/list-school-health-reports-query.dto.js";
import { GetSchoolHealthStatsQueryDto } from "./dto/get-school-health-stats-query.dto.js";

const SCHOOL_HEALTH_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SCHOOL_HEALTH_OFFICER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

@Controller("schools/:schoolSlug/health")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(...SCHOOL_HEALTH_ROLES)
export class SchoolHealthController {
  constructor(private readonly schoolHealthService: SchoolHealthService) {}

  @Get("students")
  listStudents(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListSchoolHealthStudentsQueryDto,
  ) {
    return this.schoolHealthService.listStudents(schoolId, query);
  }

  @Get("reports")
  listReports(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListSchoolHealthReportsQueryDto,
  ) {
    return this.schoolHealthService.listReports(schoolId, query);
  }

  @Get("stats")
  getStats(
    @CurrentSchoolId() schoolId: string,
    @Query() query: GetSchoolHealthStatsQueryDto,
  ) {
    return this.schoolHealthService.getStats(schoolId, query);
  }
}
