import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { AttendanceService } from "./attendance.service.js";
import { GetClassAttendanceQueryDto } from "./dto/get-class-attendance-query.dto.js";
import { SaveClassAttendanceDto } from "./dto/save-class-attendance.dto.js";

@Controller()
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("schools/:schoolSlug/classes/:classId/attendance")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  getRoster(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Query() query: GetClassAttendanceQueryDto,
  ) {
    return this.attendanceService.getRoster(user, schoolId, classId, query);
  }

  @Post("schools/:schoolSlug/classes/:classId/attendance")
  @Roles(
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SUPERVISOR",
    "SUPER_ADMIN",
  )
  saveRollCall(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Param("classId") classId: string,
    @Body() payload: SaveClassAttendanceDto,
  ) {
    return this.attendanceService.saveRollCall(
      user,
      schoolId,
      classId,
      payload,
    );
  }
}
