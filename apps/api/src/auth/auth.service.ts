import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser, AuthResponse, JwtPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async loginInSchool(schoolSlug: string, email: string, password: string): Promise<AuthResponse> {
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true }
    });

    if (!school) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        schoolId: school.id,
        email: email.toLowerCase()
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueAccessToken(user);
  }

  async getMe(userId: string, schoolId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, schoolId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
  }

  private async issueAccessToken(user: User): Promise<AuthResponse> {
    const expiresIn = Number(this.configService.get<string>('JWT_EXPIRES_IN') ?? 3600);

    const payload: JwtPayload = {
      sub: user.id,
      schoolId: user.schoolId,
      role: user.role
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      expiresIn
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn
    };
  }
}
