import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ACCESS_COOKIE_NAME } from "../auth-cookies.js";
import type { JwtPayload } from "../auth.types.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { cookies?: Record<string, string> } | undefined) =>
          req?.cookies?.[ACCESS_COOKIE_NAME] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ?? "dev-secret-change-me",
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        activeRole: true,
        activationStatus: true,
        profileCompleted: true,
        email: true,
        phone: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        platformRoles: {
          select: { role: true },
        },
        memberships: {
          select: {
            schoolId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      id: user.id,
      activeRole: user.activeRole,
      platformRoles: user.platformRoles.map((assignment) => assignment.role),
      activationStatus: user.activationStatus,
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        role: membership.role,
      })),
      profileCompleted: user.profileCompleted,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
