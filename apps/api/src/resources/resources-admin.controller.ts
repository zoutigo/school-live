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
// school admin n'intervient dans ce circuit de validation. Chaque fiche peut avoir
// plusieurs soumissions concurrentes (énoncé/corrigé) déposées par des contributeurs
// différents ; la modération porte sur les soumissions individuelles, pas la fiche.
@Controller("admin/resources")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
export class ResourcesAdminController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get("submissions")
  listAdminSubmissions(@Query() query: ListAdminResourcesQueryDto) {
    return this.resourcesService.listAdminSubmissions(query);
  }

  @Patch("submissions/:submissionId/approve")
  approveSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
  ) {
    return this.resourcesService.approveSubmission(user, submissionId);
  }

  @Patch("submissions/:submissionId/reject")
  rejectSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
    @Body() payload: ReviewResourceDto,
  ) {
    return this.resourcesService.rejectSubmission(user, submissionId, payload);
  }

  @Patch("submissions/:submissionId/revoke")
  revokeSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param("submissionId") submissionId: string,
  ) {
    return this.resourcesService.revokeSubmission(user, submissionId);
  }
}
