import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import { MobilePushTokensService } from "../notifications/mobile-push-tokens.service.js";
import { RegisterMobilePushTokenDto } from "../notifications/dto/register-mobile-push-token.dto.js";
import { UnregisterMobilePushTokenDto } from "../notifications/dto/unregister-mobile-push-token.dto.js";
import { CurrentSchoolId } from "./decorators/current-school-id.decorator.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

@Controller("schools/:schoolSlug")
export class MeController {
  constructor(
    private readonly authService: AuthService,
    private readonly mobilePushTokensService: MobilePushTokensService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  me(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
  ) {
    return this.authService.getMe(user.id, schoolId);
  }

  @Post("me/push-tokens")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: RegisterMobilePushTokenDto,
  ) {
    return this.mobilePushTokensService.registerToken(
      user.id,
      schoolId,
      payload,
    );
  }

  @Delete("me/push-tokens")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  unregisterPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
    @Body() payload: UnregisterMobilePushTokenDto,
  ) {
    return this.mobilePushTokensService.unregisterToken(
      user.id,
      schoolId,
      payload.token,
    );
  }
}
