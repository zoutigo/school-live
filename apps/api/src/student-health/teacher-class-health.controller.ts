import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { StudentHealthService } from "./student-health.service.js";

@Controller("schools/:schoolSlug/classes/:classId/health")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles("TEACHER")
export class TeacherClassHealthController {
  constructor(private readonly studentHealthService: StudentHealthService) {}

  @Get("students")
  listRoster(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("classId") classId: string,
  ) {
    return this.studentHealthService.listClassRosterForReferent(
      schoolId,
      user,
      classId,
    );
  }
}
