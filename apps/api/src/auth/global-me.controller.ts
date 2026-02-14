import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { SetActiveRoleDto } from "./dto/set-active-role.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

@Controller()
export class GlobalMeController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getGlobalMe(user.id);
  }

  @Put("me/active-role")
  @UseGuards(JwtAuthGuard)
  setActiveRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: SetActiveRoleDto,
  ) {
    return this.authService.setActiveRole(user.id, payload.role);
  }
}
