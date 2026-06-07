import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { StudentManagementService } from "./student-management.service.js";
import { SchoolUsersService } from "../school-users/school-users.service.js";
import { PromoteStudentDto } from "./dto/promote-student.dto.js";

@Controller("schools/:schoolSlug/students")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPER_ADMIN", "ADMIN")
export class StudentManagementController {
  constructor(
    private readonly studentManagementService: StudentManagementService,
    private readonly schoolUsersService: SchoolUsersService,
  ) {}

  @Get(":studentId/suggest-username")
  suggestUsername(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.studentManagementService.suggestUsername(studentId, schoolId);
  }

  @Post(":studentId/promote")
  promoteStudent(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PromoteStudentDto,
  ) {
    return this.studentManagementService.promoteStudent(
      studentId,
      schoolId,
      user.id,
      dto.username,
    );
  }

  @Post(":studentId/reset-password")
  resetStudentPassword(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.studentManagementService.resetStudentPassword(
      studentId,
      schoolId,
    );
  }

  @Get(":studentId/profile")
  getStudentProfile(
    @CurrentSchoolId() schoolId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.schoolUsersService.getStudentProfile(schoolId, studentId);
  }
}
