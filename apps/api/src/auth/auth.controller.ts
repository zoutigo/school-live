import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SchoolScopeGuard } from '../access/school-scope.guard.js';
import { clearAuthCookies, setAuthCookies } from './auth-cookies.js';
import { CurrentSchoolId } from './decorators/current-school-id.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('schools/:schoolSlug/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Param('schoolSlug') schoolSlug: string,
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const authResponse = await this.authService.loginInSchool(schoolSlug, payload.email, payload.password);
    const csrfToken = setAuthCookies(res, authResponse, process.env.NODE_ENV === 'production');
    return { ...authResponse, csrfToken };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res, process.env.NODE_ENV === 'production');
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  me(@CurrentUser() user: AuthenticatedUser, @CurrentSchoolId() schoolId: string) {
    return this.authService.getMe(user.id, schoolId);
  }
}
