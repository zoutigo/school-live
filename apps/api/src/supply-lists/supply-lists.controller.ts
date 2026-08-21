import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { SupplyListsService } from "./supply-lists.service.js";
import { UpsertSupplyListDto } from "./dto/upsert-supply-list.dto.js";
import { ListSupplyListsQueryDto } from "./dto/list-supply-lists-query.dto.js";

const SUPPLY_LIST_ADMIN_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

@Controller("schools/:schoolSlug/admin/supply-lists")
@UseGuards(JwtAuthGuard, SchoolScopeGuard, RolesGuard)
@Roles(...SUPPLY_LIST_ADMIN_ROLES)
export class SupplyListsController {
  constructor(private readonly supplyListsService: SupplyListsService) {}

  @Get()
  listSupplyLists(
    @CurrentSchoolId() schoolId: string,
    @Query() query: ListSupplyListsQueryDto,
  ) {
    return this.supplyListsService.listSupplyLists(schoolId, query);
  }

  @Post()
  upsertSupplyList(
    @CurrentSchoolId() schoolId: string,
    @Body() payload: UpsertSupplyListDto,
  ) {
    return this.supplyListsService.upsertSupplyList(schoolId, payload);
  }

  @Delete(":supplyListId")
  deleteSupplyList(
    @CurrentSchoolId() schoolId: string,
    @Param("supplyListId") supplyListId: string,
  ) {
    return this.supplyListsService.deleteSupplyList(schoolId, supplyListId);
  }
}

@Controller("schools/:schoolSlug/me/supply-lists")
@UseGuards(JwtAuthGuard, SchoolScopeGuard)
export class ParentSupplyListsController {
  constructor(private readonly supplyListsService: SupplyListsService) {}

  @Get("students/:studentId")
  getMyChildSupplyList(
    @CurrentSchoolId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.supplyListsService.getMyChildSupplyList(
      schoolId,
      user.id,
      studentId,
    );
  }
}
