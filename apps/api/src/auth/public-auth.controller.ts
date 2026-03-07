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
import { ChangePinDto } from "./dto/change-pin.dto.js";
import { ActivationCompleteDto } from "./dto/activation-complete.dto.js";
import { ActivationStartDto } from "./dto/activation-start.dto.js";
import { ForgotPasswordCompleteDto } from "./dto/forgot-password-complete.dto.js";
import { ForgotPasswordOptionsDto } from "./dto/forgot-password-options.dto.js";
import { ForgotPasswordRequestDto } from "./dto/forgot-password-request.dto.js";
import { ForgotPasswordVerifyDto } from "./dto/forgot-password-verify.dto.js";
import { ForgotPinCompleteDto } from "./dto/forgot-pin-complete.dto.js";
import { ForgotPinOptionsDto } from "./dto/forgot-pin-options.dto.js";
import { ForgotPinVerifyDto } from "./dto/forgot-pin-verify.dto.js";
import { FirstPasswordChangeDto } from "./dto/first-password-change.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { LoginPhoneDto } from "./dto/login-phone.dto.js";
import { OnboardingCompleteDto } from "./dto/onboarding-complete.dto.js";
import { PlatformCredentialsCompleteDto } from "./dto/platform-credentials-complete.dto.js";
import { ProfileSetupDto } from "./dto/profile-setup.dto.js";
import { ProfileSetupOptionsDto } from "./dto/profile-setup-options.dto.js";
import { SsoLoginDto } from "./dto/sso-login.dto.js";
import { SsoProfileCompleteDto } from "./dto/sso-profile-complete.dto.js";
import { SsoProfileOptionsDto } from "./dto/sso-profile-options.dto.js";
import { UpdateRecoverySettingsDto } from "./dto/update-recovery-settings.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class PublicAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() payload: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(
      payload.email,
      payload.password,
      this.getRequestContext(req),
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

  @Post("login-phone")
  async loginPhone(
    @Body() payload: LoginPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.loginWithPhonePin(
      payload.phone,
      payload.pin,
      payload.schoolSlug,
      this.getRequestContext(req),
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

  @Post("sso/login")
  async loginWithSso(
    @Body() payload: SsoLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.loginWithSso({
      ...payload,
      context: this.getRequestContext(req),
    });
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

  @Post("sso/profile/options")
  ssoProfileOptions(@Body() payload: SsoProfileOptionsDto) {
    return this.authService.getSsoProfileOptions(payload);
  }

  @Post("sso/profile/complete")
  ssoProfileComplete(@Body() payload: SsoProfileCompleteDto) {
    return this.authService.completeSsoProfile(payload);
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
    @Req() req: Request,
    @Body() payload: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      payload.currentPassword,
      payload.newPassword,
      this.getRequestContext(req),
    );
  }

  @Post("change-pin")
  @UseGuards(JwtAuthGuard)
  changePin(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Body() payload: ChangePinDto,
  ) {
    return this.authService.changePin(
      user.id,
      payload.currentPin,
      payload.newPin,
      this.getRequestContext(req),
    );
  }

  @Get("recovery/options")
  @UseGuards(JwtAuthGuard)
  recoveryOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getRecoverySettingsOptions(user.id);
  }

  @Post("recovery/update")
  @UseGuards(JwtAuthGuard)
  recoveryUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdateRecoverySettingsDto,
  ) {
    return this.authService.updateRecoverySettings(user.id, payload);
  }

  @Post("forgot-password/request")
  forgotPasswordRequest(@Body() payload: ForgotPasswordRequestDto) {
    return this.authService.requestPasswordReset(payload.email);
  }

  @Post("forgot-password/options")
  forgotPasswordOptions(@Body() payload: ForgotPasswordOptionsDto) {
    return this.authService.getPasswordResetOptions(payload.token);
  }

  @Post("forgot-password/verify")
  forgotPasswordVerify(@Body() payload: ForgotPasswordVerifyDto) {
    return this.authService.verifyPasswordReset({
      token: payload.token,
      birthDate: payload.birthDate,
      answers: payload.answers,
    });
  }

  @Post("forgot-password/complete")
  forgotPasswordComplete(@Body() payload: ForgotPasswordCompleteDto) {
    return this.authService.completePasswordReset(
      payload.token,
      payload.newPassword,
    );
  }

  @Post("forgot-pin/options")
  forgotPinOptions(@Body() payload: ForgotPinOptionsDto) {
    return this.authService.getPinRecoveryOptions(payload);
  }

  @Post("forgot-pin/verify")
  forgotPinVerify(@Body() payload: ForgotPinVerifyDto, @Req() req: Request) {
    return this.authService.verifyPinRecovery({
      email: payload.email,
      phone: payload.phone,
      birthDate: payload.birthDate,
      answers: payload.answers,
      context: this.getRequestContext(req),
    });
  }

  @Post("forgot-pin/complete")
  forgotPinComplete(
    @Body() payload: ForgotPinCompleteDto,
    @Req() req: Request,
  ) {
    return this.authService.completePinRecovery(
      payload.recoveryToken,
      payload.newPin,
      this.getRequestContext(req),
    );
  }

  @Post("platform-credentials/complete")
  async platformCredentialsComplete(
    @Body() payload: PlatformCredentialsCompleteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse =
      await this.authService.completePlatformCredentialsSetup(payload);
    const csrfToken = setAuthCookies(
      res,
      authResponse,
      process.env.NODE_ENV === "production",
    );
    return {
      success: true,
      accessToken: authResponse.accessToken,
      tokenType: authResponse.tokenType,
      expiresIn: authResponse.expiresIn,
      schoolSlug: authResponse.schoolSlug,
      csrfToken,
    };
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

  @Post("activation/start")
  activationStart(@Body() payload: ActivationStartDto) {
    return this.authService.getActivationContext(payload);
  }

  @Post("activation/complete")
  activationComplete(
    @Body() payload: ActivationCompleteDto,
    @Req() req: Request,
  ) {
    return this.authService.completeAccountActivation({
      ...payload,
      context: this.getRequestContext(req),
    });
  }

  private getRequestContext(req: Request) {
    const userAgent = req.headers["user-agent"];
    return {
      ipAddress: req.ip ?? null,
      userAgent: Array.isArray(userAgent)
        ? (userAgent[0] ?? null)
        : (userAgent ?? null),
    };
  }
}
