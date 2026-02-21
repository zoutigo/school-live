import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  AppRole,
  PlatformRole,
  RecoveryQuestionKey,
  SchoolRole,
  User,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  AuthenticatedUser,
  AuthResponse,
  JwtPayload,
} from "./auth.types.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private static readonly PASSWORD_COMPLEXITY_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        email: user.email,
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    if (!user.profileCompleted) {
      throw new ForbiddenException({
        code: "PROFILE_SETUP_REQUIRED",
        email: user.email,
        schoolSlug: user.memberships[0]?.school?.slug ?? null,
      });
    }

    return this.issueAuthSession(
      user,
      user.memberships[0]?.school?.slug ?? null,
    );
  }

  async loginInSchool(
    schoolSlug: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        memberships: {
          some: {
            schoolId: school.id,
          },
        },
      },
      include: {
        memberships: {
          where: { schoolId: school.id },
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    if (!user.profileCompleted) {
      throw new ForbiddenException({
        code: "PROFILE_SETUP_REQUIRED",
        email: user.email,
        schoolSlug,
      });
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException("Invalid credentials");
    }

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
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
      throw new UnauthorizedException("Mot de passe actuel invalide");
    }

    if (!AuthService.PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      throw new ForbiddenException(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      );
    }

    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) {
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

    return { success: true };
  }

  async getProfileSetupOptions(email: string) {
    const normalizedEmail = email.toLowerCase();
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
        email: true,
        phone: true,
        avatarUrl: true,
        firstName: true,
        lastName: true,
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
    }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        activeRole: true,
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

  private async resolveSchoolSlug(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { slug: true },
    });

    return school?.slug ?? null;
  }
}
