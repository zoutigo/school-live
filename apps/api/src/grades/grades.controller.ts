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
import { CreateGradeDto } from "./dto/create-grade.dto.js";
import { ListGradesDto } from "./dto/list-grades.dto.js";
import { UpdateGradeDto } from "./dto/update-grade.dto.js";
import { GradesService } from "./grades.service.js";

@Controller("schools/:schoolSlug/grades")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles("SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: CreateGradeDto,
  ) {
    return this.gradesService.create(user, schoolId, payload);
  }

  @Get()
  @Roles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT", "SUPER_ADMIN")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query() filters: ListGradesDto,
  ) {
    return this.gradesService.list(user, schoolId, filters);
  }

  @Get("context")
  @Roles("SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN")
  context(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Query("schoolYearId") schoolYearId?: string,
  ) {
    return this.gradesService.context(user, schoolId, schoolYearId);
  }

  @Patch(":id")
  @Roles("SCHOOL_ADMIN", "TEACHER", "SUPER_ADMIN")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("id") gradeId: string,
    @Body() payload: UpdateGradeDto,
  ) {
    return this.gradesService.update(user, schoolId, gradeId, payload);
  }

  @Delete(":id")
  @Roles("SCHOOL_ADMIN", "SUPER_ADMIN")
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("id") gradeId: string,
  ) {
    return this.gradesService.remove(user, schoolId, gradeId);
  }
}
