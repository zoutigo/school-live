import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentSchoolId } from "../auth/decorators/current-school-id.decorator.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { BadgesService } from "./badges.service.js";
import { MarkReadDto } from "./dto/mark-read.dto.js";

@Controller("schools/:schoolSlug/me")
@UseGuards(JwtAuthGuard, SchoolScopeGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get("unread-summary")
  getUnreadSummary(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
  ) {
    return this.badgesService.getUnreadSummary(user, schoolId);
  }

  @Patch("read-markers")
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() dto: MarkReadDto,
  ) {
    // FEED is scoped to the whole school: the client only knows the slug,
    // so the school id resolved by SchoolScopeGuard is authoritative here.
    const scopeRefId = dto.scope === "FEED" ? schoolId : dto.scopeRefId;
    if (!scopeRefId) {
      throw new BadRequestException("scopeRefId is required");
    }

    return this.badgesService.markRead(user, dto.scope, scopeRefId);
  }
}
