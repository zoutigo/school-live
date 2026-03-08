import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  AppRole,
  AccountActivationStatus,
  AuthAuditEvent,
  AuthAuditStatus,
  AuthProvider,
  AuthRateLimitPurpose,
  PlatformRole,
  Prisma,
  RecoveryQuestionKey,
  SchoolRole,
  User,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  AuthenticatedUser,
  AuthResponse,
  JwtPayload,
} from "./auth.types.js";

type AuthRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type PlatformCredentialMissingField = "PASSWORD" | "PHONE_PIN";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private static readonly PASSWORD_COMPLEXITY_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  private static readonly PHONE_PIN_REGEX = /^\d{6}$/;
  private static readonly DEFAULT_MAX_FAILED_ATTEMPTS = 5;
  private static readonly DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
  private static readonly DEFAULT_RATE_LIMIT_BLOCK_SECONDS = 15 * 60;

  async login(
    email: string,
    password: string,
    context?: AuthRequestContext,
  ): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitKeyHash = this.hashRateLimitKey(normalizedEmail);
    await this.assertNotRateLimited("PASSWORD_LOGIN", rateLimitKeyHash);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        platformRoles: { select: { role: true } },
        phoneCredential: {
          select: {
            verifiedAt: true,
          },
        },
        memberships: {
          include: {
            school: {
              select: { id: true, slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        reasonCode: "INVALID_CREDENTIALS",
        context,
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "INVALID_CREDENTIALS",
        context,
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    this.assertPlatformCredentialsReady(user, {
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
      reasonCode: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    });

    if (user.mustChangePassword) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "PASSWORD_CHANGE_REQUIRED",
        context,
      });
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        email: user.email,
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    if (!user.profileCompleted) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "PROFILE_SETUP_REQUIRED",
        context,
      });
      throw new ForbiddenException({
        code: "PROFILE_SETUP_REQUIRED",
        email: user.email,
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    if (
      user.memberships.length > 0 &&
      user.activationStatus !== "ACTIVE" &&
      !user.platformRoles.some(
        (assignment) => assignment.role === "SUPER_ADMIN",
      )
    ) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "ACCOUNT_VALIDATION_REQUIRED",
        context,
      });
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        email: user.email,
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    await this.clearAuthFailures("PASSWORD_LOGIN", rateLimitKeyHash);
    await this.auditAuth({
      event: "LOGIN_PASSWORD",
      status: "SUCCESS",
      principal: normalizedEmail,
      userId: user.id,
      schoolId: user.memberships[0]?.schoolId ?? null,
      context,
    });

    return this.issueAuthSession(
      user,
      user.memberships[0]?.school?.slug ?? null,
    );
  }

  async loginInSchool(
    schoolSlug: string,
    email: string,
    password: string,
    context?: AuthRequestContext,
  ): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitKeyHash = this.hashRateLimitKey(
      `${schoolSlug}|${normalizedEmail}`,
    );
    await this.assertNotRateLimited("PASSWORD_LOGIN", rateLimitKeyHash);

    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        reasonCode: "INVALID_CREDENTIALS",
        context,
        details: { schoolSlug },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        memberships: {
          some: {
            schoolId: school.id,
          },
        },
      },
      include: {
        platformRoles: { select: { role: true } },
        phoneCredential: {
          select: {
            verifiedAt: true,
          },
        },
        memberships: {
          where: { schoolId: school.id },
          select: { role: true },
        },
      },
    });

    if (!user) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        schoolId: school.id,
        reasonCode: "INVALID_CREDENTIALS",
        context,
        details: { schoolSlug },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: school.id,
        reasonCode: "INVALID_CREDENTIALS",
        context,
        details: { schoolSlug },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    this.assertPlatformCredentialsReady(user, {
      schoolSlug,
      reasonCode: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    });

    if (user.mustChangePassword) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: school.id,
        reasonCode: "PASSWORD_CHANGE_REQUIRED",
        context,
        details: { schoolSlug },
      });
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    if (!user.profileCompleted) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: school.id,
        reasonCode: "PROFILE_SETUP_REQUIRED",
        context,
        details: { schoolSlug },
      });
      throw new ForbiddenException({
        code: "PROFILE_SETUP_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    if (user.memberships.length === 0) {
      await this.recordAuthFailure("PASSWORD_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: school.id,
        reasonCode: "INVALID_CREDENTIALS",
        context,
        details: { schoolSlug },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    if (
      user.activationStatus !== "ACTIVE" &&
      !user.platformRoles.some(
        (assignment) => assignment.role === "SUPER_ADMIN",
      )
    ) {
      await this.auditAuth({
        event: "LOGIN_PASSWORD",
        status: "FAILURE",
        principal: normalizedEmail,
        userId: user.id,
        schoolId: school.id,
        reasonCode: "ACCOUNT_VALIDATION_REQUIRED",
        context,
        details: { schoolSlug },
      });
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    await this.clearAuthFailures("PASSWORD_LOGIN", rateLimitKeyHash);
    await this.auditAuth({
      event: "LOGIN_PASSWORD",
      status: "SUCCESS",
      principal: normalizedEmail,
      userId: user.id,
      schoolId: school.id,
      context,
      details: { schoolSlug },
    });

    return this.issueAuthSession(user, schoolSlug);
  }

  async loginWithPhonePin(
    phone: string,
    pin: string,
    schoolSlug?: string,
    context?: AuthRequestContext,
  ): Promise<AuthResponse> {
    const rateLimitKeyHash = this.hashRateLimitKey(
      `${schoolSlug ?? "global"}|${phone.trim()}`,
    );
    await this.assertNotRateLimited("PHONE_LOGIN", rateLimitKeyHash);

    if (!AuthService.PHONE_PIN_REGEX.test(pin)) {
      await this.recordAuthFailure("PHONE_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_PHONE",
        status: "FAILURE",
        principal: phone.trim(),
        reasonCode: "INVALID_CREDENTIALS",
        context,
        details: { schoolSlug: schoolSlug ?? null },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const normalizedPhone = this.normalizePhone(phone);
    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: normalizedPhone },
      include: {
        user: {
          include: {
            platformRoles: { select: { role: true } },
            phoneCredential: {
              select: {
                verifiedAt: true,
              },
            },
            memberships: {
              include: {
                school: {
                  select: { slug: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    let user:
      | (typeof credential extends null
          ? never
          : NonNullable<typeof credential>["user"])
      | null = null;

    if (credential?.verifiedAt) {
      const validPin = await bcrypt.compare(pin, credential.pinHash);
      if (!validPin) {
        await this.recordAuthFailure("PHONE_LOGIN", rateLimitKeyHash);
        await this.auditAuth({
          event: "LOGIN_PHONE",
          status: "FAILURE",
          principal: normalizedPhone,
          userId: credential.user.id,
          schoolId: credential.user.memberships[0]?.schoolId ?? null,
          reasonCode: "INVALID_CREDENTIALS",
          context,
          details: { schoolSlug: schoolSlug ?? null },
        });
        throw new UnauthorizedException("Invalid credentials");
      }
      user = credential.user;
    } else {
      user = await this.activatePendingPhoneUserOnFirstLogin({
        normalizedPhone,
        pin,
        schoolSlug,
      });
      if (!user) {
        await this.recordAuthFailure("PHONE_LOGIN", rateLimitKeyHash);
        await this.auditAuth({
          event: "LOGIN_PHONE",
          status: "FAILURE",
          principal: normalizedPhone,
          reasonCode: "INVALID_CREDENTIALS",
          context,
          details: { schoolSlug: schoolSlug ?? null },
        });
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    const isPlatformAdmin = user.platformRoles.some(
      (assignment) =>
        assignment.role === "SUPER_ADMIN" || assignment.role === "ADMIN",
    );
    if (
      user.memberships.length > 0 &&
      user.activationStatus !== "ACTIVE" &&
      !isPlatformAdmin
    ) {
      await this.auditAuth({
        event: "LOGIN_PHONE",
        status: "FAILURE",
        principal: normalizedPhone,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "ACCOUNT_VALIDATION_REQUIRED",
        context,
        details: { schoolSlug: schoolSlug ?? null },
      });
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    this.assertPlatformCredentialsReady(user, {
      schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
      reasonCode: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    });

    if (schoolSlug) {
      const hasMembership = user.memberships.some(
        (membership) => membership.school.slug === schoolSlug,
      );
      if (!hasMembership && !isPlatformAdmin) {
        await this.recordAuthFailure("PHONE_LOGIN", rateLimitKeyHash);
        await this.auditAuth({
          event: "LOGIN_PHONE",
          status: "FAILURE",
          principal: normalizedPhone,
          userId: user.id,
          schoolId: user.memberships[0]?.schoolId ?? null,
          reasonCode: "INVALID_CREDENTIALS",
          context,
          details: { schoolSlug },
        });
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    if (!user.profileCompleted) {
      await this.auditAuth({
        event: "LOGIN_PHONE",
        status: "FAILURE",
        principal: normalizedPhone,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "PROFILE_SETUP_REQUIRED",
        context,
        details: { schoolSlug: schoolSlug ?? null },
      });
      throw new ForbiddenException({
        code: "PROFILE_SETUP_REQUIRED",
        email: user.email.endsWith("@noemail.scolive.local")
          ? null
          : user.email,
        schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
        setupToken: this.issueOnboardingSetupToken({
          userId: user.id,
          schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
        }),
      });
    }

    await this.clearAuthFailures("PHONE_LOGIN", rateLimitKeyHash);
    await this.auditAuth({
      event: "LOGIN_PHONE",
      status: "SUCCESS",
      principal: normalizedPhone,
      userId: user.id,
      schoolId: user.memberships[0]?.schoolId ?? null,
      context,
      details: { schoolSlug: schoolSlug ?? null },
    });

    return this.issueAuthSession(
      user,
      schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
    );
  }

  private async activatePendingPhoneUserOnFirstLogin(input: {
    normalizedPhone: string;
    pin: string;
    schoolSlug?: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        phone: input.normalizedPhone,
        activationStatus: "PENDING",
        ...(input.schoolSlug
          ? {
              memberships: {
                some: {
                  school: {
                    slug: input.schoolSlug,
                  },
                },
              },
            }
          : {}),
      },
      include: {
        platformRoles: { select: { role: true } },
        phoneCredential: {
          select: {
            verifiedAt: true,
          },
        },
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return null;
    }

    if (user.phoneCredential?.verifiedAt) {
      return null;
    }

    const validPin = await bcrypt.compare(input.pin, user.passwordHash);
    if (!validPin) {
      return null;
    }

    const now = new Date();
    const pinHash = await bcrypt.hash(input.pin, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          phone: input.normalizedPhone,
          phoneConfirmedAt: now,
          activationStatus: "ACTIVE",
        },
      });
      await tx.userPhoneCredential.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          phoneE164: input.normalizedPhone,
          pinHash,
          verifiedAt: now,
        },
        update: {
          phoneE164: input.normalizedPhone,
          pinHash,
          verifiedAt: now,
        },
      });
      await tx.activationCode.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: { usedAt: now },
      });
    });

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        platformRoles: { select: { role: true } },
        phoneCredential: {
          select: {
            verifiedAt: true,
          },
        },
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async loginWithSso(input: {
    provider: "GOOGLE" | "APPLE";
    providerAccountId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    schoolSlug?: string;
    context?: AuthRequestContext;
  }): Promise<AuthResponse> {
    const provider = input.provider as AuthProvider;
    const normalizedEmail = input.email.toLowerCase().trim();
    const providerAccountId = input.providerAccountId.trim();
    const rateLimitKeyHash = this.hashRateLimitKey(
      `${provider}:${providerAccountId || normalizedEmail}`,
    );
    await this.assertNotRateLimited("SSO_LOGIN", rateLimitKeyHash);

    if (!providerAccountId) {
      await this.recordAuthFailure("SSO_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_SSO",
        status: "FAILURE",
        provider,
        principal: normalizedEmail,
        reasonCode: "INVALID_SSO_ACCOUNT",
        context: input.context,
      });
      throw new UnauthorizedException("Invalid SSO account");
    }

    const identity = await this.prisma.userAuthIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          include: {
            platformRoles: { select: { role: true } },
            phoneCredential: {
              select: {
                verifiedAt: true,
              },
            },
            memberships: {
              include: { school: { select: { id: true, slug: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    let user = identity?.user ?? null;
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          platformRoles: { select: { role: true } },
          phoneCredential: {
            select: {
              verifiedAt: true,
            },
          },
          memberships: {
            include: { school: { select: { id: true, slug: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    if (!user) {
      await this.recordAuthFailure("SSO_LOGIN", rateLimitKeyHash);
      await this.auditAuth({
        event: "LOGIN_SSO",
        status: "FAILURE",
        provider,
        principal: normalizedEmail,
        reasonCode: "ACCOUNT_NOT_PROVISIONED",
        context: input.context,
        details: { schoolSlug: input.schoolSlug ?? null },
      });
      throw new UnauthorizedException("Account not provisioned by school");
    }

    if (!identity) {
      await this.prisma.userAuthIdentity.create({
        data: {
          userId: user.id,
          provider,
          providerAccountId,
          email: normalizedEmail,
        },
      });
    }

    if (input.avatarUrl && !user.avatarUrl) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: input.avatarUrl },
      });
    }

    const isPlatformOnly = user.memberships.length === 0;
    const schoolSlug = isPlatformOnly
      ? null
      : (input.schoolSlug ?? user.memberships[0]?.school?.slug ?? null);
    if (!isPlatformOnly && input.schoolSlug) {
      const hasMembership = user.memberships.some(
        (membership) => membership.school.slug === input.schoolSlug,
      );
      if (!hasMembership) {
        await this.recordAuthFailure("SSO_LOGIN", rateLimitKeyHash);
        await this.auditAuth({
          event: "LOGIN_SSO",
          status: "FAILURE",
          provider,
          principal: normalizedEmail,
          userId: user.id,
          schoolId: user.memberships[0]?.schoolId ?? null,
          reasonCode: "INVALID_SCHOOL_ACCOUNT",
          context: input.context,
          details: { schoolSlug: input.schoolSlug },
        });
        throw new UnauthorizedException("Invalid school account");
      }
    }

    const isPlatformAdmin = user.platformRoles.some(
      (assignment) =>
        assignment.role === "SUPER_ADMIN" || assignment.role === "ADMIN",
    );
    if (
      !isPlatformOnly &&
      user.activationStatus !== "ACTIVE" &&
      !isPlatformAdmin
    ) {
      await this.auditAuth({
        event: "LOGIN_SSO",
        status: "FAILURE",
        provider,
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "ACCOUNT_VALIDATION_REQUIRED",
        context: input.context,
        details: { schoolSlug },
      });
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    const missingProfileFields = this.getMissingProfileFields(user);
    if (missingProfileFields.length > 0) {
      await this.auditAuth({
        event: "LOGIN_SSO",
        status: "FAILURE",
        provider,
        principal: normalizedEmail,
        userId: user.id,
        schoolId: user.memberships[0]?.schoolId ?? null,
        reasonCode: "SSO_PROFILE_COMPLETION_REQUIRED",
        context: input.context,
        details: { schoolSlug, missingProfileFields },
      });
      throw new ForbiddenException({
        code: "SSO_PROFILE_COMPLETION_REQUIRED",
        email: user.email,
        schoolSlug,
        missingFields: missingProfileFields,
      });
    }

    this.assertPlatformCredentialsReady(user, {
      schoolSlug,
      reasonCode: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    });

    await this.clearAuthFailures("SSO_LOGIN", rateLimitKeyHash);
    await this.auditAuth({
      event: "LOGIN_SSO",
      status: "SUCCESS",
      provider,
      principal: normalizedEmail,
      userId: user.id,
      schoolId: user.memberships[0]?.schoolId ?? null,
      context: input.context,
      details: { schoolSlug },
    });

    return this.issueAuthSession(user, schoolSlug);
  }

  async refreshSession(
    refreshToken: string,
    schoolSlug?: string,
  ): Promise<AuthResponse> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          include: {
            platformRoles: { select: { role: true } },
            memberships: {
              include: {
                school: {
                  select: { slug: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (schoolSlug) {
      const hasMembership = existing.user.memberships.some(
        (membership) => membership.school.slug === schoolSlug,
      );
      if (!hasMembership) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const isPlatformAdmin = existing.user.platformRoles.some(
        (assignment) =>
          assignment.role === "SUPER_ADMIN" || assignment.role === "ADMIN",
      );
      if (existing.user.activationStatus !== "ACTIVE" && !isPlatformAdmin) {
        throw new ForbiddenException({
          code: "ACCOUNT_VALIDATION_REQUIRED",
          schoolSlug,
        });
      }
    }

    const nextRefreshToken = this.generateRefreshToken();
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const refreshExpiresIn = this.getRefreshTtlSeconds();
    const refreshExpiresAt = new Date(now.getTime() + refreshExpiresIn * 1000);

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: nextRefreshTokenHash,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.refreshToken.update({
        where: { id: existing.id },
        data: {
          revokedAt: now,
          replacedById: created.id,
        },
      });
    });

    return this.issueAccessToken(
      existing.user,
      schoolSlug ?? existing.user.memberships[0]?.school?.slug ?? null,
      {
        refreshToken: nextRefreshToken,
        refreshExpiresIn,
      },
    );
  }

  async logout(refreshToken: string | null | undefined) {
    if (!refreshToken) {
      return { success: true };
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  async firstPasswordChange(
    email: string,
    temporaryPassword: string,
    newPassword: string,
  ) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.mustChangePassword) {
      throw new ForbiddenException(
        "Password change is not required for this account",
      );
    }

    const validPassword = await bcrypt.compare(
      temporaryPassword,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      throw new ForbiddenException(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return {
      success: true,
      email: user.email,
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
      profileSetupRequired: true,
    };
  }

  async completeOnboarding(input: {
    email?: string;
    setupToken?: string;
    temporaryPassword?: string;
    newPassword?: string;
    firstName: string;
    lastName: string;
    gender: "M" | "F" | "OTHER";
    birthDate: string;
    answers: Array<{ questionKey: RecoveryQuestionKey; answer: string }>;
    parentClassId?: string;
    parentStudentId?: string;
  }) {
    const user = await this.resolveUserForOnboarding(input);
    const isTokenFlow = Boolean(input.setupToken?.trim());
    const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
    const shouldUpdateEmail =
      isTokenFlow &&
      Boolean(normalizedEmail) &&
      !normalizedEmail!.endsWith("@noemail.scolive.local") &&
      normalizedEmail !== user.email;

    let passwordHash: string | null = null;
    if (!isTokenFlow) {
      if (!input.temporaryPassword || !input.newPassword) {
        throw new ForbiddenException("Informations d activation manquantes");
      }

      if (!user.mustChangePassword) {
        throw new ForbiddenException(
          "Password change is not required for this account",
        );
      }

      const validTemporaryPassword = await bcrypt.compare(
        input.temporaryPassword,
        user.passwordHash,
      );

      if (!validTemporaryPassword) {
        throw new UnauthorizedException("Invalid credentials");
      }

      if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(input.newPassword)) {
        throw new ForbiddenException(
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        );
      }
      passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    if (shouldUpdateEmail) {
      const existing = await this.prisma.user.findUnique({
        where: { email: normalizedEmail! },
        select: { id: true },
      });
      if (existing && existing.id !== user.id) {
        throw new ForbiddenException("Cette adresse email est deja utilisee.");
      }
    }

    const uniqueQuestions = new Set(
      input.answers.map((answer) => answer.questionKey),
    );
    if (input.answers.length !== 3 || uniqueQuestions.size !== 3) {
      throw new ForbiddenException(
        "You must provide exactly 3 distinct recovery questions",
      );
    }

    const schoolMembership = user.memberships[0];
    const schoolSlug = schoolMembership?.school.slug ?? null;
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const isParent = schoolRoles.includes("PARENT");

    if (isParent) {
      if (!input.parentClassId || !input.parentStudentId || !schoolMembership) {
        throw new ForbiddenException("Parent must select class and student");
      }

      const [classEntity, studentEntity, enrollment] =
        await this.prisma.$transaction([
          this.prisma.class.findFirst({
            where: {
              id: input.parentClassId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true, schoolYearId: true },
          }),
          this.prisma.student.findFirst({
            where: {
              id: input.parentStudentId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true },
          }),
          this.prisma.enrollment.findFirst({
            where: {
              schoolId: schoolMembership.schoolId,
              classId: input.parentClassId,
              studentId: input.parentStudentId,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ]);

      if (!classEntity || !studentEntity || !enrollment) {
        throw new ForbiddenException("Invalid class/student selection");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(passwordHash
            ? {
                passwordHash,
                mustChangePassword: false,
              }
            : {}),
          ...(shouldUpdateEmail
            ? {
                email: normalizedEmail!,
              }
            : {}),
          profileCompleted: true,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          gender: input.gender,
          recoveryBirthDate: new Date(input.birthDate),
          recoveryClassId: input.parentClassId ?? null,
          recoveryStudentId: input.parentStudentId ?? null,
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.userRecoveryAnswer.deleteMany({
        where: { userId: user.id },
      });

      const answerRows = await Promise.all(
        input.answers.map(async (answer) => ({
          userId: user.id,
          questionKey: answer.questionKey,
          answerHash: await bcrypt.hash(answer.answer.trim().toLowerCase(), 10),
        })),
      );

      await tx.userRecoveryAnswer.createMany({
        data: answerRows,
      });
    });

    return {
      success: true,
      schoolSlug,
    };
  }

  private async resolveUserForOnboarding(input: {
    email?: string;
    setupToken?: string;
  }) {
    if (input.setupToken?.trim()) {
      const payload = this.verifyOnboardingSetupToken(input.setupToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          memberships: {
            include: {
              school: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  activeSchoolYearId: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException("Invalid account");
      }

      if (
        payload.schoolSlug &&
        user.memberships.length > 0 &&
        !user.memberships.some(
          (membership) => membership.school.slug === payload.schoolSlug,
        )
      ) {
        throw new UnauthorizedException("Invalid account");
      }

      return user;
    }

    if (!input.email?.trim()) {
      throw new UnauthorizedException("Invalid account");
    }

    const normalizedEmail = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true,
                activeSchoolYearId: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid account");
    }

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    context?: AuthRequestContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const validCurrentPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!validCurrentPassword) {
      await this.auditAuth({
        event: "CHANGE_PASSWORD",
        status: "FAILURE",
        userId,
        reasonCode: "INVALID_CURRENT_PASSWORD",
        context,
      });
      throw new UnauthorizedException("Mot de passe actuel invalide");
    }

    if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      await this.auditAuth({
        event: "CHANGE_PASSWORD",
        status: "FAILURE",
        userId,
        reasonCode: "INVALID_PASSWORD_POLICY",
        context,
      });
      throw new ForbiddenException(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      );
    }

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) {
      await this.auditAuth({
        event: "CHANGE_PASSWORD",
        status: "FAILURE",
        userId,
        reasonCode: "PASSWORD_REUSE",
        context,
      });
      throw new ForbiddenException(
        "Le nouveau mot de passe doit etre different du mot de passe actuel",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await this.auditAuth({
      event: "CHANGE_PASSWORD",
      status: "SUCCESS",
      userId,
      context,
    });
    return { success: true };
  }

  async changePin(
    userId: string,
    currentPin: string,
    newPin: string,
    context?: AuthRequestContext,
  ) {
    if (!AuthService.PHONE_PIN_REGEX.test(newPin)) {
      await this.auditAuth({
        event: "CHANGE_PIN",
        status: "FAILURE",
        userId,
        reasonCode: "INVALID_PIN_POLICY",
        context,
      });
      throw new ForbiddenException(
        "Le PIN doit contenir exactement 6 chiffres.",
      );
    }

    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { userId },
      select: {
        id: true,
        pinHash: true,
      },
    });

    if (!credential) {
      await this.auditAuth({
        event: "CHANGE_PIN",
        status: "FAILURE",
        userId,
        reasonCode: "PIN_NOT_CONFIGURED",
        context,
      });
      throw new ForbiddenException("Aucun PIN n'est configure pour ce compte.");
    }

    const validCurrentPin = await bcrypt.compare(
      currentPin,
      credential.pinHash,
    );
    if (!validCurrentPin) {
      await this.auditAuth({
        event: "CHANGE_PIN",
        status: "FAILURE",
        userId,
        reasonCode: "INVALID_CURRENT_PIN",
        context,
      });
      throw new UnauthorizedException("PIN actuel invalide");
    }

    const samePin = await bcrypt.compare(newPin, credential.pinHash);
    if (samePin) {
      await this.auditAuth({
        event: "CHANGE_PIN",
        status: "FAILURE",
        userId,
        reasonCode: "PIN_REUSE",
        context,
      });
      throw new ForbiddenException(
        "Le nouveau PIN doit etre different de l'actuel.",
      );
    }

    await this.prisma.userPhoneCredential.update({
      where: { id: credential.id },
      data: {
        pinHash: await bcrypt.hash(newPin, 10),
        verifiedAt: new Date(),
      },
    });

    await this.auditAuth({
      event: "CHANGE_PIN",
      status: "SUCCESS",
      userId,
      context,
    });
    return { success: true };
  }

  async completePlatformCredentialsSetup(input: {
    token: string;
    newPassword?: string;
    phone?: string;
    newPin?: string;
  }): Promise<AuthResponse> {
    const payload = this.verifyPlatformCredentialSetupToken(input.token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        platformRoles: { select: { role: true } },
        phoneCredential: {
          select: {
            id: true,
            pinHash: true,
            verifiedAt: true,
          },
        },
        memberships: {
          include: {
            school: { select: { slug: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid account");
    }

    if (user.platformRoles.length === 0) {
      throw new ForbiddenException("Compte non autorise");
    }

    const missing = this.getMissingPlatformCredentialFields(user);
    const schoolSlug =
      payload.schoolSlug ?? user.memberships[0]?.school?.slug ?? null;
    if (!missing.includes("PASSWORD") && !missing.includes("PHONE_PIN")) {
      return this.issueAuthSession(user, schoolSlug);
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (missing.includes("PASSWORD")) {
      if (!input.newPassword) {
        throw new ForbiddenException("Le mot de passe est requis.");
      }
      if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(input.newPassword)) {
        throw new ForbiddenException(
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        );
      }
      const isSamePassword = await bcrypt.compare(
        input.newPassword,
        user.passwordHash,
      );
      if (isSamePassword) {
        throw new ForbiddenException(
          "Le nouveau mot de passe doit etre different du mot de passe actuel",
        );
      }
      updateData.passwordHash = await bcrypt.hash(input.newPassword, 10);
      updateData.mustChangePassword = false;
    }

    if (missing.includes("PHONE_PIN")) {
      if (!input.phone || !input.newPin) {
        throw new ForbiddenException("Telephone et PIN obligatoires.");
      }
      if (!AuthService.PHONE_PIN_REGEX.test(input.newPin)) {
        throw new ForbiddenException(
          "Le PIN doit contenir exactement 6 chiffres.",
        );
      }

      const normalizedPhone = this.normalizePhone(input.phone);
      updateData.phone = normalizedPhone;
      updateData.phoneConfirmedAt = new Date();

      await this.prisma.userPhoneCredential.upsert({
        where: { userId: user.id },
        update: {
          phoneE164: normalizedPhone,
          pinHash: await bcrypt.hash(input.newPin, 10),
          verifiedAt: new Date(),
        },
        create: {
          userId: user.id,
          phoneE164: normalizedPhone,
          pinHash: await bcrypt.hash(input.newPin, 10),
          verifiedAt: new Date(),
        },
      });
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    return this.issueAuthSession(user, schoolSlug);
  }

  async getRecoverySettingsOptions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                activeSchoolYearId: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        recoveryAnswers: {
          select: { questionKey: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid account");
    }

    const schoolMembership = user.memberships[0];
    const schoolId = schoolMembership?.schoolId ?? null;
    const activeSchoolYearId =
      schoolMembership?.school.activeSchoolYearId ?? null;
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const isParent = schoolRoles.includes("PARENT");

    if (!isParent || !schoolId) {
      return {
        schoolSlug: schoolMembership?.school.slug ?? null,
        schoolRoles,
        questions: this.getRecoveryQuestions(),
        classes: [],
        students: [],
        selectedQuestions: user.recoveryAnswers.map(
          (answer) => answer.questionKey,
        ),
        birthDate: user.recoveryBirthDate?.toISOString().slice(0, 10) ?? "",
        parentClassId: user.recoveryClassId ?? null,
        parentStudentId: user.recoveryStudentId ?? null,
      };
    }

    const [classes, students] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where: {
          schoolId,
          ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
        },
        select: {
          id: true,
          name: true,
          schoolYear: {
            select: {
              label: true,
            },
          },
        },
        orderBy: [{ schoolYear: { label: "asc" } }, { name: "asc" }],
      }),
      this.prisma.student.findMany({
        where: { schoolId },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
    ]);

    return {
      schoolSlug: schoolMembership?.school.slug ?? null,
      schoolRoles,
      questions: this.getRecoveryQuestions(),
      classes: classes.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        year: classroom.schoolYear.label,
        schoolYearLabel: classroom.schoolYear.label,
      })),
      students,
      selectedQuestions: user.recoveryAnswers.map(
        (answer) => answer.questionKey,
      ),
      birthDate: user.recoveryBirthDate?.toISOString().slice(0, 10) ?? "",
      parentClassId: user.recoveryClassId ?? null,
      parentStudentId: user.recoveryStudentId ?? null,
    };
  }

  async updateRecoverySettings(
    userId: string,
    input: {
      birthDate: string;
      answers: Array<{ questionKey: RecoveryQuestionKey; answer: string }>;
      parentClassId?: string;
      parentStudentId?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid account");
    }

    const uniqueQuestions = new Set(
      input.answers.map((answer) => answer.questionKey),
    );
    if (input.answers.length !== 3 || uniqueQuestions.size !== 3) {
      throw new ForbiddenException(
        "You must provide exactly 3 distinct recovery questions",
      );
    }

    const schoolMembership = user.memberships[0];
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const isParent = schoolRoles.includes("PARENT");

    if (isParent) {
      if (!input.parentClassId || !input.parentStudentId || !schoolMembership) {
        throw new ForbiddenException("Parent must select class and student");
      }

      const [classEntity, studentEntity, enrollment] =
        await this.prisma.$transaction([
          this.prisma.class.findFirst({
            where: {
              id: input.parentClassId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true },
          }),
          this.prisma.student.findFirst({
            where: {
              id: input.parentStudentId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true },
          }),
          this.prisma.enrollment.findFirst({
            where: {
              schoolId: schoolMembership.schoolId,
              classId: input.parentClassId,
              studentId: input.parentStudentId,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ]);

      if (!classEntity || !studentEntity || !enrollment) {
        throw new ForbiddenException("Invalid class/student selection");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          recoveryBirthDate: new Date(input.birthDate),
          recoveryClassId: input.parentClassId ?? null,
          recoveryStudentId: input.parentStudentId ?? null,
        },
      });

      await tx.userRecoveryAnswer.deleteMany({
        where: { userId: user.id },
      });

      const answerRows = await Promise.all(
        input.answers.map(async (answer) => ({
          userId: user.id,
          questionKey: answer.questionKey,
          answerHash: await bcrypt.hash(answer.answer.trim().toLowerCase(), 10),
        })),
      );

      await tx.userRecoveryAnswer.createMany({
        data: answerRows,
      });
    });

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const genericResponse: {
      success: boolean;
      message: string;
      resetToken?: string;
    } = {
      success: true,
      message: "Si ce compte existe, un lien de reinitialisation a ete envoye.",
    };
    const normalizedEmail = email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        recoveryAnswers: {
          select: { questionKey: true },
        },
      },
    });

    if (
      !user ||
      !user.recoveryBirthDate ||
      user.recoveryAnswers.length < 3 ||
      !user.profileCompleted
    ) {
      return genericResponse;
    }

    const resetToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashPasswordResetToken(resetToken);
    const now = new Date();
    const expiresInMinutes = this.getPasswordResetTtlMinutes();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
    const schoolSlug = user.memberships[0]?.school?.slug ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const params = new URLSearchParams({ token: resetToken });
    if (schoolSlug) {
      params.set("schoolSlug", schoolSlug);
    }
    const resetUrl = `${webUrl}/mot-de-passe-oublie?${params.toString()}`;

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresInMinutes,
        schoolSlug,
      });
    } catch (error) {
      this.logger.error(
        `Unable to send password reset email for ${normalizedEmail}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    if (process.env.NODE_ENV === "test") {
      genericResponse.resetToken = resetToken;
    }

    return genericResponse;
  }

  async getPasswordResetOptions(token: string) {
    const resetToken = await this.getValidPasswordResetToken(token);
    const questions = this.getRecoveryQuestions();
    const availableQuestions = resetToken.user.recoveryAnswers.map(
      (answer) => ({
        key: answer.questionKey,
        label:
          questions.find((entry) => entry.key === answer.questionKey)?.label ??
          answer.questionKey,
      }),
    );

    return {
      success: true,
      emailHint: this.maskEmail(resetToken.user.email),
      schoolSlug: resetToken.user.memberships[0]?.school?.slug ?? null,
      questions: availableQuestions,
    };
  }

  async verifyPasswordReset(input: {
    token: string;
    birthDate: string;
    answers: Array<{ questionKey: RecoveryQuestionKey; answer: string }>;
  }) {
    const resetToken = await this.getValidPasswordResetToken(input.token);

    if (!resetToken.user.recoveryBirthDate) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const providedBirthDate = new Date(input.birthDate);
    if (Number.isNaN(providedBirthDate.getTime())) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    if (
      !this.sameUtcDay(resetToken.user.recoveryBirthDate, providedBirthDate)
    ) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const uniqueQuestions = new Set(
      input.answers.map((answer) => answer.questionKey),
    );
    if (input.answers.length !== 3 || uniqueQuestions.size !== 3) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const expectedMap = new Map(
      resetToken.user.recoveryAnswers.map((answer) => [
        answer.questionKey,
        answer.answerHash,
      ]),
    );

    for (const answer of input.answers) {
      const expectedHash = expectedMap.get(answer.questionKey);
      if (!expectedHash) {
        throw new ForbiddenException("Informations de recuperation invalides");
      }

      const validAnswer = await bcrypt.compare(
        answer.answer.trim().toLowerCase(),
        expectedHash,
      );
      if (!validAnswer) {
        throw new ForbiddenException("Informations de recuperation invalides");
      }
    }

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { verifiedAt: new Date() },
    });

    return { success: true, verified: true };
  }

  async completePasswordReset(token: string, newPassword: string) {
    if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      throw new ForbiddenException(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      );
    }

    const resetToken = await this.getValidPasswordResetToken(token);
    if (!resetToken.verifiedAt) {
      throw new ForbiddenException(
        "La verification de recuperation est obligatoire",
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      resetToken.user.passwordHash,
    );
    if (samePassword) {
      throw new ForbiddenException(
        "Le nouveau mot de passe doit etre different du mot de passe actuel",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });
    });

    return { success: true };
  }

  async getPinRecoveryOptions(input: { email?: string; phone?: string }) {
    const user = await this.resolveUserForPinRecovery(input);
    const questions = this.getRecoveryQuestions();
    const availableQuestions = user.recoveryAnswers.map((answer) => ({
      key: answer.questionKey,
      label:
        questions.find((entry) => entry.key === answer.questionKey)?.label ??
        answer.questionKey,
    }));

    return {
      success: true,
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
      principalHint: input.email
        ? this.maskEmail(user.email)
        : this.maskPhone(user.phoneCredential?.phoneE164 ?? user.phone ?? ""),
      questions: availableQuestions,
    };
  }

  async verifyPinRecovery(input: {
    email?: string;
    phone?: string;
    birthDate: string;
    answers: Array<{ questionKey: RecoveryQuestionKey; answer: string }>;
    context?: AuthRequestContext;
  }) {
    const user = await this.resolveUserForPinRecovery(input);

    if (!user.recoveryBirthDate) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const providedBirthDate = new Date(input.birthDate);
    if (Number.isNaN(providedBirthDate.getTime())) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    if (!this.sameUtcDay(user.recoveryBirthDate, providedBirthDate)) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const uniqueQuestions = new Set(
      input.answers.map((answer) => answer.questionKey),
    );
    if (input.answers.length !== 3 || uniqueQuestions.size !== 3) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    const expectedMap = new Map(
      user.recoveryAnswers.map((answer) => [
        answer.questionKey,
        answer.answerHash,
      ]),
    );

    for (const answer of input.answers) {
      const expectedHash = expectedMap.get(answer.questionKey);
      if (!expectedHash) {
        throw new ForbiddenException("Informations de recuperation invalides");
      }

      const validAnswer = await bcrypt.compare(
        answer.answer.trim().toLowerCase(),
        expectedHash,
      );
      if (!validAnswer) {
        throw new ForbiddenException("Informations de recuperation invalides");
      }
    }

    const recoveryToken = this.issuePinRecoveryToken(user.id);
    await this.auditAuth({
      event: "CHANGE_PIN",
      status: "SUCCESS",
      userId: user.id,
      schoolId: user.memberships[0]?.schoolId ?? null,
      reasonCode: "FORGOT_PIN_VERIFIED",
      context: input.context,
    });

    return {
      success: true,
      recoveryToken,
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
    };
  }

  async completePinRecovery(
    recoveryToken: string,
    newPin: string,
    context?: AuthRequestContext,
  ) {
    if (!AuthService.PHONE_PIN_REGEX.test(newPin)) {
      throw new ForbiddenException(
        "Le PIN doit contenir exactement 6 chiffres.",
      );
    }

    const userId = this.verifyPinRecoveryToken(recoveryToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        phoneCredential: {
          select: {
            id: true,
            phoneE164: true,
            pinHash: true,
          },
        },
        memberships: {
          include: { school: { select: { id: true, slug: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Compte introuvable");
    }

    const resolvedPhone = user.phoneCredential?.phoneE164 ?? user.phone ?? null;
    if (!resolvedPhone) {
      throw new ForbiddenException(
        "Aucun numero de telephone n est associe a ce compte.",
      );
    }

    if (user.phoneCredential?.pinHash) {
      const samePin = await bcrypt.compare(
        newPin,
        user.phoneCredential.pinHash,
      );
      if (samePin) {
        throw new ForbiddenException(
          "Le nouveau PIN doit etre different de l'actuel.",
        );
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          phone: resolvedPhone,
          phoneConfirmedAt: now,
        },
      });

      await tx.userPhoneCredential.upsert({
        where: { userId: user.id },
        update: {
          phoneE164: resolvedPhone,
          pinHash: await bcrypt.hash(newPin, 10),
          verifiedAt: now,
        },
        create: {
          userId: user.id,
          phoneE164: resolvedPhone,
          pinHash: await bcrypt.hash(newPin, 10),
          verifiedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.auditAuth({
      event: "CHANGE_PIN",
      status: "SUCCESS",
      userId: user.id,
      schoolId: user.memberships[0]?.schoolId ?? null,
      reasonCode: "FORGOT_PIN_COMPLETED",
      context,
    });

    return {
      success: true,
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
    };
  }

  async getProfileSetupOptions(input: { email?: string; setupToken?: string }) {
    const user = await this.resolveUserForOnboarding(input);

    const schoolMembership = user.memberships[0];
    const schoolId = schoolMembership?.schoolId ?? null;
    const activeSchoolYearId =
      schoolMembership?.school.activeSchoolYearId ?? null;
    const schoolSlug = schoolMembership?.school.slug ?? null;
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const isParent = schoolRoles.includes("PARENT");

    if (!isParent || !schoolId) {
      return {
        schoolSlug,
        schoolRoles,
        questions: this.getRecoveryQuestions(),
        classes: [],
        students: [],
      };
    }

    const [classes, students] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where: {
          schoolId,
          ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
        },
        select: {
          id: true,
          name: true,
          schoolYear: {
            select: {
              label: true,
            },
          },
        },
        orderBy: [{ schoolYear: { label: "asc" } }, { name: "asc" }],
      }),
      this.prisma.student.findMany({
        where: { schoolId },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
    ]);

    return {
      schoolSlug,
      schoolRoles,
      questions: this.getRecoveryQuestions(),
      classes: classes.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        year: classroom.schoolYear.label,
        schoolYearLabel: classroom.schoolYear.label,
      })),
      students,
    };
  }

  async getActivationContext(input: {
    email?: string;
    phone?: string;
    schoolSlug?: string;
  }) {
    const user = await this.resolveUserForActivationLookup(input);
    if (!user) {
      return {
        success: true,
        activationRequired: false,
      };
    }

    const schoolMembership = input.schoolSlug
      ? user.memberships.find(
          (membership) => membership.school.slug === input.schoolSlug,
        )
      : user.memberships[0];
    const schoolSlug = schoolMembership?.school.slug ?? null;
    const isPlatformOnly = user.memberships.length === 0;

    if (isPlatformOnly) {
      return {
        success: true,
        activationRequired: false,
        schoolSlug,
      };
    }

    const pendingCodeCount = await this.prisma.activationCode.count({
      where: {
        userId: user.id,
        schoolId: schoolMembership?.schoolId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return {
      success: true,
      activationRequired: user.activationStatus !== "ACTIVE",
      schoolSlug,
      maskedEmail: this.maskEmail(user.email),
      hasPhoneCredential: Boolean(user.phoneCredential?.verifiedAt),
      methods: ["ACTIVATION_CODE", "INITIAL_PIN"],
      hasPendingActivationCode: pendingCodeCount > 0,
    };
  }

  async completeAccountActivation(input: {
    email?: string;
    phone?: string;
    schoolSlug?: string;
    confirmedPhone: string;
    newPin: string;
    initialPin?: string;
    activationCode?: string;
    context?: AuthRequestContext;
  }) {
    if (!AuthService.PHONE_PIN_REGEX.test(input.newPin)) {
      throw new ForbiddenException("PIN invalide. Format attendu: 6 chiffres.");
    }

    if (!input.initialPin && !input.activationCode) {
      throw new ForbiddenException(
        "Le PIN initial ou un code d activation est obligatoire",
      );
    }

    const user = await this.resolveUserForActivationOrThrow(input);
    const schoolMembership = this.resolveSchoolMembershipForActivation(
      user.memberships,
      input.schoolSlug,
    );
    const rateLimitKeyHash = this.hashRateLimitKey(
      `${user.id}|${schoolMembership.schoolId}`,
    );
    await this.assertNotRateLimited("ACTIVATION", rateLimitKeyHash);

    const normalizedPhone = this.normalizePhone(input.confirmedPhone);
    const now = new Date();

    let matchedActivationCodeId: string | null = null;
    if (input.activationCode) {
      const codeHash = this.hashActivationCode(input.activationCode);
      const code = await this.prisma.activationCode.findFirst({
        where: {
          userId: user.id,
          schoolId: schoolMembership.schoolId,
          codeHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true },
      });
      if (!code) {
        await this.recordAuthFailure("ACTIVATION", rateLimitKeyHash);
        await this.auditAuth({
          event: "ACTIVATION_COMPLETE",
          status: "FAILURE",
          userId: user.id,
          schoolId: schoolMembership.schoolId,
          reasonCode: "INVALID_ACTIVATION_CODE",
          context: input.context,
        });
        throw new ForbiddenException("Code d activation invalide ou expire");
      }
      matchedActivationCodeId = code.id;
    } else if (input.initialPin) {
      const validInitialPin = await bcrypt.compare(
        input.initialPin,
        user.passwordHash,
      );
      if (!validInitialPin) {
        await this.recordAuthFailure("ACTIVATION", rateLimitKeyHash);
        await this.auditAuth({
          event: "ACTIVATION_COMPLETE",
          status: "FAILURE",
          userId: user.id,
          schoolId: schoolMembership.schoolId,
          reasonCode: "INVALID_INITIAL_PIN",
          context: input.context,
        });
        throw new ForbiddenException("PIN initial invalide");
      }
    }

    const pinHash = await bcrypt.hash(input.newPin, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          phone: normalizedPhone,
          phoneConfirmedAt: now,
          activationStatus: "ACTIVE",
        },
      });

      await tx.userPhoneCredential.upsert({
        where: { userId: user.id },
        update: {
          phoneE164: normalizedPhone,
          pinHash,
          verifiedAt: now,
        },
        create: {
          userId: user.id,
          phoneE164: normalizedPhone,
          pinHash,
          verifiedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.activationCode.updateMany({
        where: {
          userId: user.id,
          schoolId: schoolMembership.schoolId,
          usedAt: null,
          ...(matchedActivationCodeId
            ? { id: { not: matchedActivationCodeId } }
            : {}),
        },
        data: { usedAt: now },
      });

      if (matchedActivationCodeId) {
        await tx.activationCode.update({
          where: { id: matchedActivationCodeId },
          data: { usedAt: now },
        });
      }
    });

    await this.clearAuthFailures("ACTIVATION", rateLimitKeyHash);
    await this.auditAuth({
      event: "ACTIVATION_COMPLETE",
      status: "SUCCESS",
      userId: user.id,
      schoolId: schoolMembership.schoolId,
      context: input.context,
    });

    return {
      success: true,
      schoolSlug: schoolMembership.school.slug,
      activationStatus: "ACTIVE" as AccountActivationStatus,
    };
  }

  async getSsoProfileOptions(input: {
    provider: "GOOGLE" | "APPLE";
    providerAccountId: string;
    email: string;
  }) {
    const user = await this.resolveUserForSsoProfile(input);
    const missingFields = this.getMissingProfileFields(user);

    return {
      success: true,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      phone: user.phone,
      schoolSlug: user.memberships[0]?.school.slug ?? null,
      missingFields,
      needsProfileCompletion: missingFields.length > 0,
    };
  }

  async completeSsoProfile(input: {
    provider: "GOOGLE" | "APPLE";
    providerAccountId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    gender?: "M" | "F" | "OTHER";
    phone?: string;
    avatarUrl?: string;
    schoolSlug?: string;
    newPin?: string;
  }) {
    const user = await this.resolveUserForSsoProfile(input);
    const updateData: {
      firstName?: string;
      lastName?: string;
      gender?: "M" | "F" | "OTHER";
      phone?: string;
      avatarUrl?: string;
    } = {};

    if (input.firstName?.trim()) {
      updateData.firstName = input.firstName.trim();
    }
    if (input.lastName?.trim()) {
      updateData.lastName = input.lastName.trim();
    }
    if (input.gender) {
      updateData.gender = input.gender;
    }
    if (input.phone?.trim()) {
      updateData.phone = this.normalizePhone(input.phone);
    }
    if (input.avatarUrl?.trim()) {
      updateData.avatarUrl = input.avatarUrl.trim();
    }

    const mergedProfile = {
      firstName: updateData.firstName ?? user.firstName,
      lastName: updateData.lastName ?? user.lastName,
      gender: updateData.gender ?? user.gender,
      phone: updateData.phone ?? user.phone,
    };

    const missingAfterUpdate = this.getMissingProfileFields(mergedProfile);
    if (missingAfterUpdate.length > 0) {
      throw new ForbiddenException({
        code: "SSO_PROFILE_COMPLETION_REQUIRED",
        message: `Informations manquantes: ${missingAfterUpdate.join(", ")}`,
        missingFields: missingAfterUpdate,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (input.newPin) {
        if (!AuthService.PHONE_PIN_REGEX.test(input.newPin)) {
          throw new ForbiddenException(
            "Le PIN doit contenir exactement 6 chiffres.",
          );
        }
        const resolvedPhone = updateData.phone ?? user.phone;
        if (!resolvedPhone) {
          throw new ForbiddenException(
            "Un numero de telephone est requis pour definir un PIN.",
          );
        }
        await tx.userPhoneCredential.upsert({
          where: { userId: user.id },
          update: {
            phoneE164: resolvedPhone,
            pinHash: await bcrypt.hash(input.newPin, 10),
            verifiedAt: new Date(),
          },
          create: {
            userId: user.id,
            phoneE164: resolvedPhone,
            pinHash: await bcrypt.hash(input.newPin, 10),
            verifiedAt: new Date(),
          },
        });
      }
    });

    return {
      success: true,
      schoolSlug: user.memberships[0]?.school.slug ?? null,
    };
  }

  async completeProfileSetup(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    answers: Array<{ questionKey: RecoveryQuestionKey; answer: string }>;
    parentClassId?: string;
    parentStudentId?: string;
  }) {
    const normalizedEmail = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid account");
    }

    const validPassword = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const uniqueQuestions = new Set(
      input.answers.map((answer) => answer.questionKey),
    );
    if (input.answers.length !== 3 || uniqueQuestions.size !== 3) {
      throw new ForbiddenException(
        "You must provide exactly 3 distinct recovery questions",
      );
    }

    const schoolMembership = user.memberships[0];
    const schoolSlug = schoolMembership
      ? await this.resolveSchoolSlug(schoolMembership.schoolId)
      : null;
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const isParent = schoolRoles.includes("PARENT");

    if (isParent) {
      if (!input.parentClassId || !input.parentStudentId || !schoolMembership) {
        throw new ForbiddenException("Parent must select class and student");
      }

      const [classEntity, studentEntity, enrollment] =
        await this.prisma.$transaction([
          this.prisma.class.findFirst({
            where: {
              id: input.parentClassId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true, schoolYearId: true },
          }),
          this.prisma.student.findFirst({
            where: {
              id: input.parentStudentId,
              schoolId: schoolMembership.schoolId,
            },
            select: { id: true },
          }),
          this.prisma.enrollment.findFirst({
            where: {
              schoolId: schoolMembership.schoolId,
              classId: input.parentClassId,
              studentId: input.parentStudentId,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ]);

      if (!classEntity || !studentEntity || !enrollment) {
        throw new ForbiddenException("Invalid class/student selection");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          recoveryBirthDate: new Date(input.birthDate),
          recoveryClassId: input.parentClassId ?? null,
          recoveryStudentId: input.parentStudentId ?? null,
          profileCompleted: true,
        },
      });

      await tx.userRecoveryAnswer.deleteMany({
        where: { userId: user.id },
      });

      const answerRows = await Promise.all(
        input.answers.map(async (answer) => ({
          userId: user.id,
          questionKey: answer.questionKey,
          answerHash: await bcrypt.hash(answer.answer.trim().toLowerCase(), 10),
        })),
      );

      await tx.userRecoveryAnswer.createMany({
        data: answerRows,
      });
    });

    return {
      success: true,
      schoolSlug,
    };
  }

  async getMe(
    userId: string,
    schoolId: string,
  ): Promise<
    AuthenticatedUser & {
      role: PlatformRole | SchoolRole | null;
      activeRole: PlatformRole | SchoolRole | null;
      gender?: "M" | "F" | "OTHER" | null;
      linkedStudents?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
      }>;
    }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        activeRole: true,
        profileCompleted: true,
        activationStatus: true,
        email: true,
        phone: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        gender: true,
        platformRoles: { select: { role: true } },
        memberships: {
          where: { schoolId },
          select: {
            schoolId: true,
            role: true,
          },
        },
        parentLinks: {
          where: { schoolId },
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      (user.memberships.length === 0 &&
        !user.platformRoles.some((r) => r.role === "SUPER_ADMIN"))
    ) {
      throw new UnauthorizedException("User not found");
    }

    const platformRoles = user.platformRoles.map(
      (assignment) => assignment.role,
    );
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const activeRole = this.resolveActiveRole(
      user.activeRole,
      platformRoles,
      schoolRoles,
    );

    return {
      id: user.id,
      platformRoles,
      activationStatus: user.activationStatus,
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        role: membership.role,
      })),
      profileCompleted: user.profileCompleted,
      role: activeRole,
      activeRole,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      linkedStudents: user.parentLinks.map((link) => ({
        id: link.student.id,
        firstName: link.student.firstName,
        lastName: link.student.lastName,
        avatarUrl: link.student.user?.avatarUrl ?? null,
      })),
    };
  }

  async getGlobalMe(userId: string): Promise<
    AuthenticatedUser & {
      schoolSlug: string | null;
      role: PlatformRole | SchoolRole | null;
      activeRole: PlatformRole | SchoolRole | null;
      gender?: "M" | "F" | "OTHER" | null;
    }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        activeRole: true,
        profileCompleted: true,
        activationStatus: true,
        email: true,
        phone: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
        gender: true,
        platformRoles: {
          select: { role: true },
        },
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const platformRoles = user.platformRoles.map(
      (assignment) => assignment.role,
    );
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const activeRole = this.resolveActiveRole(
      user.activeRole,
      platformRoles,
      schoolRoles,
    );

    return {
      id: user.id,
      platformRoles,
      activationStatus: user.activationStatus,
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        role: membership.role,
      })),
      profileCompleted: user.profileCompleted,
      role: activeRole,
      activeRole,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      schoolSlug: user.memberships[0]?.school?.slug ?? null,
    };
  }

  async setActiveRole(userId: string, role: AppRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: {
          select: { role: true },
        },
        memberships: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const platformRoles = user.platformRoles.map(
      (assignment) => assignment.role,
    );
    const schoolRoles = user.memberships.map((membership) => membership.role);
    const activeRole = this.resolveActiveRole(role, platformRoles, schoolRoles);

    if (!activeRole) {
      throw new ForbiddenException("Role is not assigned to this user");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { activeRole },
    });

    return { activeRole };
  }

  async updatePersonalProfile(
    userId: string,
    input: {
      firstName: string;
      lastName: string;
      gender: "M" | "F" | "OTHER";
      phone: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneCredential: {
          select: {
            id: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const normalizedPhone = this.normalizePhone(input.phone);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          gender: input.gender,
          phone: normalizedPhone,
          phoneConfirmedAt: now,
        },
      });

      if (user.phoneCredential) {
        await tx.userPhoneCredential.update({
          where: { id: user.phoneCredential.id },
          data: {
            phoneE164: normalizedPhone,
            verifiedAt: user.phoneCredential.verifiedAt ?? now,
          },
        });
      }
    });

    return this.getGlobalMe(userId);
  }

  private async issueAuthSession(
    user: User,
    schoolSlug: string | null,
  ): Promise<AuthResponse> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const refreshExpiresIn = this.getRefreshTtlSeconds();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshExpiresAt,
      },
    });

    return this.issueAccessToken(user, schoolSlug, {
      refreshToken,
      refreshExpiresIn,
    });
  }

  private async issueAccessToken(
    user: User,
    schoolSlug: string | null,
    refreshPayload?: { refreshToken: string; refreshExpiresIn: number },
  ): Promise<AuthResponse> {
    const expiresIn = this.getAccessTtlSeconds();

    const payload: JwtPayload = {
      sub: user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>("JWT_SECRET") ?? "dev-secret-change-me",
      expiresIn,
    });

    const nextRefreshToken =
      refreshPayload?.refreshToken ?? this.generateRefreshToken();
    const nextRefreshExpiresIn =
      refreshPayload?.refreshExpiresIn ?? this.getRefreshTtlSeconds();

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      tokenType: "Bearer",
      expiresIn,
      refreshExpiresIn: nextRefreshExpiresIn,
      schoolSlug,
    };
  }

  private getAccessTtlSeconds() {
    return Number(this.configService.get<string>("JWT_EXPIRES_IN") ?? 86400);
  }

  private getRefreshTtlSeconds() {
    return Number(
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ??
        60 * 60 * 24 * 30,
    );
  }

  private generateRefreshToken() {
    return randomBytes(48).toString("hex");
  }

  private hashRefreshToken(token: string) {
    const pepper =
      this.configService.get<string>("JWT_REFRESH_TOKEN_PEPPER") ??
      "dev-refresh-pepper-change-me";
    return createHash("sha256").update(`${token}:${pepper}`).digest("hex");
  }

  private hashPasswordResetToken(token: string) {
    const pepper =
      this.configService.get<string>("PASSWORD_RESET_TOKEN_PEPPER") ??
      "dev-password-reset-pepper-change-me";
    return createHash("sha256").update(`${token}:${pepper}`).digest("hex");
  }

  private hashActivationCode(code: string) {
    const pepper =
      this.configService.get<string>("ACTIVATION_CODE_PEPPER") ??
      "dev-activation-code-pepper-change-me";
    return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
  }

  private getPasswordResetTtlMinutes() {
    const configured = Number(
      this.configService.get<string>("PASSWORD_RESET_TOKEN_TTL_MINUTES") ?? 15,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return 15;
    }

    return Math.trunc(configured);
  }

  private getPinRecoveryTtlMinutes() {
    const configured = Number(
      this.configService.get<string>("PIN_RECOVERY_TOKEN_TTL_MINUTES") ?? 15,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return 15;
    }

    return Math.trunc(configured);
  }

  private async getValidPasswordResetToken(rawToken: string) {
    const tokenHash = this.hashPasswordResetToken(rawToken);
    const now = new Date();
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                school: {
                  select: { slug: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            recoveryAnswers: {
              select: {
                questionKey: true,
                answerHash: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException(
        "Lien de reinitialisation invalide ou expire",
      );
    }

    return resetToken;
  }

  private sameUtcDay(left: Date, right: Date) {
    return (
      left.getUTCFullYear() === right.getUTCFullYear() &&
      left.getUTCMonth() === right.getUTCMonth() &&
      left.getUTCDate() === right.getUTCDate()
    );
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) {
      return email;
    }

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}***@${domain}`;
    }

    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  }

  private maskPhone(phone: string) {
    const compact = phone.replace(/\s+/g, "");
    if (compact.length <= 6) {
      return `${compact.slice(0, 2)}***${compact.slice(-2)}`;
    }
    return `${compact.slice(0, 4)}***${compact.slice(-3)}`;
  }

  private getPrimaryRole(
    platformRoles: PlatformRole[],
    schoolRoles: SchoolRole[],
  ): PlatformRole | SchoolRole | null {
    const platformPriority: PlatformRole[] = [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES",
      "SUPPORT",
    ];
    for (const role of platformPriority) {
      if (platformRoles.includes(role)) {
        return role;
      }
    }

    const schoolPriority: SchoolRole[] = [
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "SCHOOL_STAFF",
      "TEACHER",
      "PARENT",
      "STUDENT",
    ];
    for (const role of schoolPriority) {
      if (schoolRoles.includes(role)) {
        return role;
      }
    }

    return null;
  }

  private resolveActiveRole(
    preferredRole: AppRole | null,
    platformRoles: PlatformRole[],
    schoolRoles: SchoolRole[],
  ): AppRole | null {
    const allowedRoles = new Set<AppRole>([
      ...platformRoles,
      ...schoolRoles,
    ] as AppRole[]);

    if (preferredRole && allowedRoles.has(preferredRole)) {
      return preferredRole;
    }

    return this.getPrimaryRole(platformRoles, schoolRoles);
  }

  private getRecoveryQuestions() {
    return [
      { key: "MOTHER_MAIDEN_NAME", label: "Nom de jeune fille de votre mere" },
      { key: "FATHER_FIRST_NAME", label: "Prenom de votre pere" },
      { key: "FAVORITE_SPORT", label: "Votre sport prefere" },
      { key: "FAVORITE_TEACHER", label: "Nom de votre enseignant prefere" },
      { key: "BIRTH_CITY", label: "Votre ville de naissance" },
      { key: "CHILDHOOD_NICKNAME", label: "Votre surnom d enfance" },
      { key: "FAVORITE_BOOK", label: "Votre livre prefere" },
    ] as const;
  }

  private assertPlatformCredentialsReady(
    user: {
      id: string;
      email: string;
      phone: string | null;
      mustChangePassword: boolean;
      platformRoles: Array<{ role: PlatformRole }>;
      phoneCredential?: { verifiedAt: Date | null } | null;
    },
    input: { schoolSlug: string | null; reasonCode: string },
  ) {
    if (user.platformRoles.length === 0) {
      return;
    }

    const missingFields = this.getMissingPlatformCredentialFields(user);
    if (missingFields.length === 0) {
      return;
    }

    throw new ForbiddenException({
      code: "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
      email: user.email,
      schoolSlug: input.schoolSlug,
      missingFields,
      setupToken: this.issuePlatformCredentialSetupToken({
        userId: user.id,
        missingFields,
        schoolSlug: input.schoolSlug,
      }),
      reasonCode: input.reasonCode,
    });
  }

  private getMissingPlatformCredentialFields(user: {
    phone: string | null;
    mustChangePassword: boolean;
    platformRoles: Array<{ role: PlatformRole }>;
    phoneCredential?: { verifiedAt: Date | null } | null;
  }): PlatformCredentialMissingField[] {
    if (user.platformRoles.length === 0) {
      return [];
    }

    const missing: PlatformCredentialMissingField[] = [];
    if (user.mustChangePassword) {
      missing.push("PASSWORD");
    }

    if (!user.phone?.trim() || !user.phoneCredential?.verifiedAt) {
      missing.push("PHONE_PIN");
    }

    return missing;
  }

  private issuePlatformCredentialSetupToken(input: {
    userId: string;
    missingFields: PlatformCredentialMissingField[];
    schoolSlug: string | null;
  }) {
    return this.jwtService.sign(
      {
        sub: input.userId,
        purpose: "PLATFORM_CREDENTIAL_SETUP",
        missingFields: input.missingFields,
        schoolSlug: input.schoolSlug,
      },
      {
        expiresIn: "15m",
      },
    );
  }

  private issueOnboardingSetupToken(input: {
    userId: string;
    schoolSlug: string | null;
  }) {
    return this.jwtService.sign(
      {
        sub: input.userId,
        purpose: "ONBOARDING_SETUP",
        schoolSlug: input.schoolSlug,
      },
      {
        expiresIn: "30m",
      },
    );
  }

  private verifyPlatformCredentialSetupToken(token: string) {
    try {
      const payload = this.jwtService.verify(token) as {
        sub?: string;
        purpose?: string;
        missingFields?: PlatformCredentialMissingField[];
        schoolSlug?: string | null;
      };

      if (
        payload.purpose !== "PLATFORM_CREDENTIAL_SETUP" ||
        !payload.sub ||
        !Array.isArray(payload.missingFields)
      ) {
        throw new UnauthorizedException("Jeton de configuration invalide");
      }

      return {
        userId: payload.sub,
        missingFields: payload.missingFields,
        schoolSlug: payload.schoolSlug ?? null,
      };
    } catch {
      throw new UnauthorizedException("Jeton de configuration invalide");
    }
  }

  private verifyOnboardingSetupToken(token: string) {
    try {
      const payload = this.jwtService.verify(token) as {
        sub?: string;
        purpose?: string;
        schoolSlug?: string | null;
      };

      if (payload.purpose !== "ONBOARDING_SETUP" || !payload.sub) {
        throw new UnauthorizedException("Jeton onboarding invalide");
      }

      return {
        userId: payload.sub,
        schoolSlug: payload.schoolSlug ?? null,
      };
    } catch {
      throw new UnauthorizedException("Jeton onboarding invalide");
    }
  }

  private async resolveSchoolSlug(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { slug: true },
    });

    return school?.slug ?? null;
  }

  private getMissingProfileFields(input: {
    firstName: string | null;
    lastName: string | null;
    gender: "M" | "F" | "OTHER" | null;
    phone: string | null;
  }) {
    const fields: Array<"firstName" | "lastName" | "gender" | "phone"> = [];
    if (!input.firstName?.trim()) {
      fields.push("firstName");
    }
    if (!input.lastName?.trim()) {
      fields.push("lastName");
    }
    if (!input.gender) {
      fields.push("gender");
    }
    if (!input.phone?.trim()) {
      fields.push("phone");
    }

    return fields;
  }

  private normalizePhone(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 6) {
      throw new ForbiddenException("Numero de telephone invalide");
    }

    const compact = trimmed.replace(/[\s\-().]/g, "");

    if (/^\d{9}$/.test(compact)) {
      return `+237${compact}`;
    }

    if (/^237\d{9}$/.test(compact)) {
      return `+${compact}`;
    }

    if (compact.startsWith("+")) {
      return compact;
    }

    if (compact.startsWith("00")) {
      return `+${compact.slice(2)}`;
    }

    return `+${compact}`;
  }

  private issuePinRecoveryToken(userId: string) {
    return this.jwtService.sign(
      {
        purpose: "PIN_RECOVERY",
      },
      {
        subject: userId,
        expiresIn: `${this.getPinRecoveryTtlMinutes()}m`,
      },
    );
  }

  private verifyPinRecoveryToken(token: string) {
    try {
      const payload = this.jwtService.verify(token) as {
        sub?: string;
        purpose?: string;
      };
      if (!payload?.sub || payload.purpose !== "PIN_RECOVERY") {
        throw new Error("invalid payload");
      }
      return payload.sub;
    } catch {
      throw new ForbiddenException(
        "Session de recuperation PIN invalide ou expiree",
      );
    }
  }

  private async resolveUserForPinRecovery(input: {
    email?: string;
    phone?: string;
  }) {
    const normalizedEmail = input.email?.toLowerCase().trim();
    const normalizedPhone = input.phone
      ? this.normalizePhone(input.phone)
      : null;

    if (!normalizedEmail && !normalizedPhone) {
      throw new ForbiddenException("Email ou telephone requis");
    }

    const user = normalizedEmail
      ? await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            memberships: {
              include: { school: { select: { id: true, slug: true } } },
              orderBy: { createdAt: "asc" },
            },
            recoveryAnswers: {
              select: { questionKey: true, answerHash: true },
              orderBy: { createdAt: "asc" },
            },
            phoneCredential: {
              select: { phoneE164: true },
            },
          },
        })
      : ((
          await this.prisma.userPhoneCredential.findUnique({
            where: { phoneE164: normalizedPhone! },
            include: {
              user: {
                include: {
                  memberships: {
                    include: { school: { select: { id: true, slug: true } } },
                    orderBy: { createdAt: "asc" },
                  },
                  recoveryAnswers: {
                    select: { questionKey: true, answerHash: true },
                    orderBy: { createdAt: "asc" },
                  },
                  phoneCredential: {
                    select: { phoneE164: true },
                  },
                },
              },
            },
          })
        )?.user ?? null);

    if (!user || !user.recoveryBirthDate || user.recoveryAnswers.length < 3) {
      throw new ForbiddenException("Informations de recuperation invalides");
    }

    return user;
  }

  private async resolveUserForActivationLookup(input: {
    email?: string;
    phone?: string;
    schoolSlug?: string;
  }) {
    const email = input.email?.toLowerCase().trim();
    const normalizedPhone = input.phone
      ? this.normalizePhone(input.phone)
      : null;

    if (!email && !normalizedPhone) {
      throw new ForbiddenException("Email ou telephone requis");
    }

    if (email) {
      return this.prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { school: { select: { id: true, slug: true } } },
            orderBy: { createdAt: "asc" },
          },
          phoneCredential: {
            select: { verifiedAt: true },
          },
        },
      });
    }

    const credential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: normalizedPhone! },
      include: {
        user: {
          include: {
            memberships: {
              include: { school: { select: { id: true, slug: true } } },
              orderBy: { createdAt: "asc" },
            },
            phoneCredential: { select: { verifiedAt: true } },
          },
        },
      },
    });
    return credential?.user ?? null;
  }

  private async resolveUserForSsoProfile(input: {
    provider: "GOOGLE" | "APPLE";
    providerAccountId: string;
    email: string;
  }) {
    const provider = input.provider as AuthProvider;
    const providerAccountId = input.providerAccountId.trim();
    const normalizedEmail = input.email.toLowerCase().trim();
    if (!providerAccountId) {
      throw new UnauthorizedException("Compte SSO invalide");
    }

    const identity = await this.prisma.userAuthIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                school: {
                  select: { slug: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (identity) {
      if (identity.email.toLowerCase() !== normalizedEmail) {
        throw new UnauthorizedException("Compte SSO invalide");
      }
      return identity.user;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            school: {
              select: { slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Compte introuvable");
    }

    await this.prisma.userAuthIdentity.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
        email: normalizedEmail,
      },
    });

    return user;
  }

  private async resolveUserForActivationOrThrow(input: {
    email?: string;
    phone?: string;
    schoolSlug?: string;
  }) {
    const user = await this.resolveUserForActivationLookup(input);
    if (!user) {
      throw new UnauthorizedException("Compte introuvable");
    }
    if (user.memberships.length === 0) {
      throw new ForbiddenException(
        "Ce compte ne requiert pas d activation ecole",
      );
    }
    if (user.activationStatus === "SUSPENDED") {
      throw new ForbiddenException("Compte suspendu");
    }

    return user;
  }

  private resolveSchoolMembershipForActivation(
    memberships: Array<{ schoolId: string; school: { slug: string } }>,
    schoolSlug?: string,
  ) {
    const membership = schoolSlug
      ? memberships.find((item) => item.school.slug === schoolSlug)
      : memberships[0];
    if (!membership) {
      throw new ForbiddenException("Ecole introuvable pour ce compte");
    }
    return membership;
  }

  private hashRateLimitKey(value: string) {
    const pepper =
      this.configService.get<string>("AUTH_RATE_LIMIT_PEPPER") ??
      "dev-auth-rate-limit-pepper-change-me";
    return createHash("sha256")
      .update(`${value.trim().toLowerCase()}:${pepper}`)
      .digest("hex");
  }

  private getMaxFailedAttempts() {
    const configured = Number(
      this.configService.get<string>("AUTH_RATE_LIMIT_MAX_ATTEMPTS") ??
        process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ??
        AuthService.DEFAULT_MAX_FAILED_ATTEMPTS,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return AuthService.DEFAULT_MAX_FAILED_ATTEMPTS;
    }
    return Math.min(Math.floor(configured), 20);
  }

  private getRateLimitWindowSeconds() {
    const configured = Number(
      this.configService.get<string>("AUTH_RATE_LIMIT_WINDOW_SECONDS") ??
        process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS ??
        AuthService.DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return AuthService.DEFAULT_RATE_LIMIT_WINDOW_SECONDS;
    }
    return Math.min(Math.floor(configured), 24 * 60 * 60);
  }

  private getRateLimitBlockSeconds() {
    const configured = Number(
      this.configService.get<string>("AUTH_RATE_LIMIT_BLOCK_SECONDS") ??
        process.env.AUTH_RATE_LIMIT_BLOCK_SECONDS ??
        AuthService.DEFAULT_RATE_LIMIT_BLOCK_SECONDS,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return AuthService.DEFAULT_RATE_LIMIT_BLOCK_SECONDS;
    }
    return Math.min(Math.floor(configured), 24 * 60 * 60);
  }

  private async assertNotRateLimited(
    purpose: AuthRateLimitPurpose,
    keyHash: string,
  ) {
    const existing = await this.prisma.authRateLimit.findUnique({
      where: {
        purpose_keyHash: {
          purpose,
          keyHash,
        },
      },
      select: { blockedUntil: true },
    });

    const now = new Date();
    if (existing?.blockedUntil && existing.blockedUntil > now) {
      throw new HttpException(
        {
          code: "AUTH_RATE_LIMITED",
          retryAt: existing.blockedUntil.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordAuthFailure(
    purpose: AuthRateLimitPurpose,
    keyHash: string,
  ) {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.getRateLimitWindowSeconds() * 1000,
    );
    const existing = await this.prisma.authRateLimit.findUnique({
      where: {
        purpose_keyHash: {
          purpose,
          keyHash,
        },
      },
      select: {
        id: true,
        failedCount: true,
        lastFailedAt: true,
      },
    });

    if (!existing) {
      await this.prisma.authRateLimit.create({
        data: {
          purpose,
          keyHash,
          failedCount: 1,
          lastFailedAt: now,
        },
      });
      return;
    }

    const withinWindow =
      existing.lastFailedAt !== null && existing.lastFailedAt >= windowStart;
    const nextFailedCount = withinWindow ? existing.failedCount + 1 : 1;
    const blockedUntil =
      nextFailedCount >= this.getMaxFailedAttempts()
        ? new Date(now.getTime() + this.getRateLimitBlockSeconds() * 1000)
        : null;

    await this.prisma.authRateLimit.update({
      where: { id: existing.id },
      data: {
        failedCount: nextFailedCount,
        lastFailedAt: now,
        blockedUntil,
      },
    });
  }

  private async clearAuthFailures(
    purpose: AuthRateLimitPurpose,
    keyHash: string,
  ) {
    await this.prisma.authRateLimit.upsert({
      where: {
        purpose_keyHash: {
          purpose,
          keyHash,
        },
      },
      create: {
        purpose,
        keyHash,
        failedCount: 0,
        blockedUntil: null,
        lastSuccessAt: new Date(),
      },
      update: {
        failedCount: 0,
        blockedUntil: null,
        lastSuccessAt: new Date(),
      },
    });
  }

  private async auditAuth(input: {
    event: AuthAuditEvent;
    status: AuthAuditStatus;
    userId?: string | null;
    schoolId?: string | null;
    provider?: AuthProvider;
    principal?: string | null;
    reasonCode?: string | null;
    context?: AuthRequestContext;
    details?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          userId: input.userId ?? null,
          schoolId: input.schoolId ?? null,
          event: input.event,
          status: input.status,
          provider: input.provider,
          principal: input.principal ?? null,
          ipAddress: input.context?.ipAddress ?? null,
          userAgent: input.context?.userAgent ?? null,
          reasonCode: input.reasonCode ?? null,
          details: (input.details ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist auth audit log for event=${input.event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
