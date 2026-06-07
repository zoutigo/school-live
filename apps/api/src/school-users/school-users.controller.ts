import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { Roles } from "../access/roles.decorator.js";
import { SchoolUsersService } from "./school-users.service.js";
import { ListSchoolUsersQueryDto } from "./dto/list-school-users-query.dto.js";
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
  ) {
    return this.schoolUsersService.getMemberDetail(schoolId, userId);
  }

  @Patch(":userId/roles")
  updateRoles(
    @CurrentSchoolId() schoolId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.schoolUsersService.updateMemberRoles(schoolId, userId, dto);
  }
}
