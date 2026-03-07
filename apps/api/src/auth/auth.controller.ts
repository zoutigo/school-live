import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { SchoolScopeGuard } from "../access/school-scope.guard.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "./auth-cookies.js";
import { CurrentSchoolId } from "./decorators/current-school-id.decorator.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { LoginDto } from "./dto/login.dto.js";
import { LoginPhoneDto } from "./dto/login-phone.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

@Controller("schools/:schoolSlug/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Param("schoolSlug") schoolSlug: string,
    @Body() payload: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.loginInSchool(
      schoolSlug,
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
    @Param("schoolSlug") schoolSlug: string,
    @Body() payload: LoginPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.loginWithPhonePin(
      payload.phone,
      payload.pin,
      schoolSlug,
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

  @Post("refresh")
  async refresh(
    @Param("schoolSlug") schoolSlug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
    const authResponse = await this.authService.refreshSession(
      refreshToken,
      schoolSlug,
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

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? null;
    await this.authService.logout(refreshToken);
    clearAuthCookies(res, process.env.NODE_ENV === "production");
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  me(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSchoolId() schoolId: string,
  ) {
    return this.authService.getMe(user.id, schoolId);
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
