import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SchoolScopeGuard } from '../access/school-scope.guard.js';
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
  login(@Param('schoolSlug') schoolSlug: string, @Body() payload: LoginDto) {
    return this.authService.loginInSchool(schoolSlug, payload.email, payload.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, SchoolScopeGuard)
  me(@CurrentUser() user: AuthenticatedUser, @CurrentSchoolId() schoolId: string) {
    return this.authService.getMe(user.id, schoolId);
  }
}
