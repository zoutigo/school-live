import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "./auth-cookies.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { ChangePasswordDto } from "./dto/change-password.dto.js";
import { FirstPasswordChangeDto } from "./dto/first-password-change.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { OnboardingCompleteDto } from "./dto/onboarding-complete.dto.js";
import { ProfileSetupDto } from "./dto/profile-setup.dto.js";
import { ProfileSetupOptionsDto } from "./dto/profile-setup-options.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class PublicAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(
      payload.email,
      payload.password,
    );
    const csrfToken = setAuthCookies(
      res,
      authResponse,
      process.env.NODE_ENV === "production",
    );
    return {
      accessToken: authResponse.accessToken,
      tokenType: authResponse.tokenType,
      expiresIn: authResponse.expiresIn,
      schoolSlug: authResponse.schoolSlug,
      csrfToken,
    };
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
    const authResponse = await this.authService.refreshSession(refreshToken);
    const csrfToken = setAuthCookies(
      res,
      authResponse,
      process.env.NODE_ENV === "production",
    );
    return {
      accessToken: authResponse.accessToken,
      tokenType: authResponse.tokenType,
      expiresIn: authResponse.expiresIn,
      schoolSlug: authResponse.schoolSlug,
      csrfToken,
    };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
    await this.authService.logout(refreshToken);
    clearAuthCookies(res, process.env.NODE_ENV === "production");
    return { success: true };
  }

  @Post("first-password-change")
  firstPasswordChange(@Body() payload: FirstPasswordChangeDto) {
    return this.authService.firstPasswordChange(
      payload.email,
      payload.temporaryPassword,
      payload.newPassword,
    );
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      payload.currentPassword,
      payload.newPassword,
    );
  }

  @Get("profile-setup/options")
  profileSetupOptions(@Query() query: ProfileSetupOptionsDto) {
    return this.authService.getProfileSetupOptions(query.email);
  }

  @Get("onboarding/options")
  onboardingOptions(@Query() query: ProfileSetupOptionsDto) {
    return this.authService.getProfileSetupOptions(query.email);
  }

  @Post("onboarding/complete")
  onboardingComplete(@Body() payload: OnboardingCompleteDto) {
    return this.authService.completeOnboarding({
      email: payload.email,
      temporaryPassword: payload.temporaryPassword,
      newPassword: payload.newPassword,
      firstName: payload.firstName,
      lastName: payload.lastName,
      gender: payload.gender,
      birthDate: payload.birthDate,
      answers: payload.answers,
      parentClassId: payload.parentClassId,
      parentStudentId: payload.parentStudentId,
    });
  }

  @Post("profile-setup")
  profileSetup(@Body() payload: ProfileSetupDto) {
    return this.authService.completeProfileSetup({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
      birthDate: payload.birthDate,
      answers: payload.answers,
      parentClassId: payload.parentClassId,
      parentStudentId: payload.parentStudentId,
    });
  }
}
