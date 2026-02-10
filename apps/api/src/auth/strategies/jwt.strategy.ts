import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ACCESS_COOKIE_NAME } from '../auth-cookies.js';
import type { JwtPayload } from '../auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { cookies?: Record<string, string> } | undefined) =>
          req?.cookies?.[ACCESS_COOKIE_NAME] ?? null
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret-change-me'
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        platformRoles: {
          select: { role: true }
        },
        memberships: {
          select: {
            schoolId: true,
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: user.id,
      platformRoles: user.platformRoles.map((assignment) => assignment.role),
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        role: membership.role
      })),
      profileCompleted: user.profileCompleted,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName
    };
  }
}
