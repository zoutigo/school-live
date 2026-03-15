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
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CreateStudentGradeDto } from "./dto/create-student-grade.dto.js";
import { ListStudentGradesDto } from "./dto/list-student-grades.dto.js";
import { UpdateStudentGradeDto } from "./dto/update-student-grade.dto.js";
import { StudentGradesService } from "./student-grades.service.js";

@Controller("schools/:schoolSlug/student-grades")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class StudentGradesController {
  constructor(private readonly studentGradesService: StudentGradesService) {}

  @Post()
  @Roles("SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateStudentGradeDto,
  ) {
    return this.studentGradesService.create(user, schoolId, payload);
  }

  @Get()
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "STUDENT",
    "SUPER_ADMIN",
  )
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() filters: ListStudentGradesDto,
  ) {
    return this.studentGradesService.list(user, schoolId, filters);
  }

  @Get("context")
  @Roles(
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "TEACHER",
    "SUPER_ADMIN",
  )
  context(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query("schoolYearId") schoolYearId?: string,
  ) {
    return this.studentGradesService.context(user, schoolId, schoolYearId);
  }

  @Patch(":id")
  @Roles("SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("id") gradeId: string,
    @Body() payload: UpdateStudentGradeDto,
  ) {
    return this.studentGradesService.update(user, schoolId, gradeId, payload);
  }

  @Delete(":id")
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("id") gradeId: string,
  ) {
    return this.studentGradesService.remove(user, schoolId, gradeId);
  }
}
