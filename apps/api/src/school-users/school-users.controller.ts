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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { SchoolUsersService } from "./school-users.service.js";
import { ListSchoolUsersQueryDto } from "./dto/list-school-users-query.dto.js";
import { ExcludeMemberDto } from "./dto/exclude-member.dto.js";
import { UpdateUserRolesDto } from "./dto/update-user-roles.dto.js";

@Controller("schools/:schoolSlug/users")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles("SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPER_ADMIN", "ADMIN")
export class SchoolUsersController {
  constructor(private readonly schoolUsersService: SchoolUsersService) {}

  @Get()
  list(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListSchoolUsersQueryDto,
  ) {
    return this.schoolUsersService.listMembers(schoolId, query);
  }

  @Get(":userId")
  getDetail(
    @CurrentSchoolId() schoolId: string,
    @Param("userId") userId: string,
    @CurrentUser() currentUser?: AuthenticatedUser,
  ) {
    return this.schoolUsersService.getMemberDetail(
      schoolId,
      userId,
      currentUser?.id,
    );
  }

  @Patch(":userId/roles")
  updateRoles(
    @CurrentSchoolId() schoolId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.schoolUsersService.updateMemberRoles(schoolId, userId, dto);
  }

  @Post(":userId/reset-pin")
  resetPin(
    @CurrentSchoolId() schoolId: string,
    @Param("userId") userId: string,
  ) {
    return this.schoolUsersService.resetMemberPin(schoolId, userId);
  }

  @Delete(":userId")
  removeMember(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") userId: string,
  ) {
    return this.schoolUsersService.removeMember(
      schoolId,
      currentUser.id,
      userId,
    );
  }

  @Post(":userId/exclude")
  excludeMember(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") userId: string,
    @Body() dto: ExcludeMemberDto,
  ) {
    return this.schoolUsersService.excludeMember(
      schoolId,
      currentUser.id,
      userId,
      dto?.reason,
    );
  }

  @Post(":userId/reinvite")
  reinviteMember(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") userId: string,
  ) {
    return this.schoolUsersService.reinviteMember(schoolId, currentUser.id, {
      userId,
    });
  }

  @Post("students/:studentId/exclude")
  excludeStudent(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Body() dto: ExcludeMemberDto,
  ) {
    return this.schoolUsersService.excludeStudent(
      schoolId,
      currentUser.id,
      studentId,
      dto?.reason,
    );
  }

  @Post("students/:studentId/reinvite")
  reinviteStudent(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.schoolUsersService.reinviteMember(schoolId, currentUser.id, {
      studentId,
    });
  }
}
