import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../access/roles.decorator.js";
import { RolesGuard } from "../access/roles.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { ListAdminResourcesQueryDto } from "./dto/list-admin-resources-query.dto.js";
import { ReviewResourceDto } from "./dto/review-resource.dto.js";
import { ResourcesService } from "./resources.service.js";

// Modération réservée aux platform roles : les ressources sont nationales, aucun
// school admin n'intervient dans ce circuit de validation.
@Controller("admin/resources")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
export class ResourcesAdminController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  listAdminResources(@Query() query: ListAdminResourcesQueryDto) {
    return this.resourcesService.listAdminResources(query);
  }

  @Patch(":resourceId/statement/approve")
  approveStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.approveStatement(user, resourceId);
  }

  @Patch(":resourceId/statement/reject")
  rejectStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
    @Body() payload: ReviewResourceDto,
  ) {
    return this.resourcesService.rejectStatement(user, resourceId, payload);
  }

  @Patch(":resourceId/statement/revoke")
  revokeStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.revokeStatement(user, resourceId);
  }

  @Patch(":resourceId/correction/approve")
  approveCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.approveCorrection(user, resourceId);
  }

  @Patch(":resourceId/correction/reject")
  rejectCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
    @Body() payload: ReviewResourceDto,
  ) {
    return this.resourcesService.rejectCorrection(user, resourceId, payload);
  }

  @Patch(":resourceId/correction/revoke")
  revokeCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resourceId") resourceId: string,
  ) {
    return this.resourcesService.revokeCorrection(user, resourceId);
  }
}
