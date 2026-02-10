import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type { PlatformRole, SchoolRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateAdminDto } from './dto/create-admin.dto.js';
import type { CreateClassGroupDto } from './dto/create-class-group.dto.js';
import type { CreateClassroomDto } from './dto/create-classroom.dto.js';
import type { CreateParentStudentLinkDto } from './dto/create-parent-student-link.dto.js';
import type { CreateSchoolDto } from './dto/create-school.dto.js';
import type { CreateStudentDto } from './dto/create-student.dto.js';
import type { CreateTeacherDto } from './dto/create-teacher.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { UpdateClassGroupDto } from './dto/update-class-group.dto.js';
import type { UpdateClassroomDto } from './dto/update-classroom.dto.js';
import type { UpdateSchoolDto } from './dto/update-school.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

const PLATFORM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'] as const;
const SCHOOL_ROLES = [
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'SCHOOL_ACCOUNTANT',
  'TEACHER',
  'PARENT',
  'STUDENT'
] as const;
const CREATABLE_ROLES = [
  'ADMIN',
  'SALES',
  'SUPPORT',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'SCHOOL_ACCOUNTANT',
  'TEACHER',
  'PARENT',
  'STUDENT'
] as const;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const SCHOOL_LOGO_URL_REGEX = /^\/files\/schools\/logos\/[a-zA-Z0-9-]+\.webp$/;
const USER_AVATAR_URL_REGEX = /^\/files\/users\/avatars\/[a-zA-Z0-9-]+\.webp$/;

const createUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(30).optional(),
  temporaryPassword: z
    .string()
    .regex(
      PASSWORD_COMPLEXITY_REGEX,
      'Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.'
    ),
  role: z.enum(CREATABLE_ROLES).optional(),
  platformRoles: z.array(z.enum(['ADMIN', 'SALES', 'SUPPORT'])).optional(),
  schoolRoles: z.array(z.enum(SCHOOL_ROLES)).optional(),
  schoolSlug: z.string().trim().min(1).optional(),
  avatarUrl: z.string().trim().regex(USER_AVATAR_URL_REGEX).optional()
});

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z
    .union([z.string().trim().min(6).max(30), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (value === '' || value === null) {
        return null;
      }

      return value;
    }),
  platformRole: z.enum(['ADMIN', 'SALES', 'SUPPORT', 'NONE']).optional(),
  platformRoles: z.array(z.enum(['ADMIN', 'SALES', 'SUPPORT'])).optional(),
  schoolRole: z
    .enum([
      'SCHOOL_ADMIN',
      'SCHOOL_MANAGER',
      'SCHOOL_ACCOUNTANT',
      'TEACHER',
      'PARENT',
      'STUDENT',
      'NONE'
    ])
    .optional(),
  schoolRoles: z.array(z.enum(SCHOOL_ROLES)).optional(),
  role: z.enum(CREATABLE_ROLES).optional()
});

const createSchoolSchema = z.object({
  name: z.string().trim().min(1),
  schoolAdminEmail: z.string().trim().email(),
  logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).optional()
});

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1).optional(),
  logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).nullable().optional()
});

const createClassGroupSchema = z.object({
  name: z.string().trim().min(1)
});

const updateClassGroupSchema = z.object({
  name: z.string().trim().min(1).optional()
});

const createClassroomSchema = z.object({
  classGroupId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  year: z.string().trim().min(1)
});

const updateClassroomSchema = z.object({
  classGroupId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional()
});

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async createUser(currentUser: AuthenticatedUser, payload: CreateUserDto) {
    const parsedResult = createUserSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;

    const isSuperAdmin = currentUser.platformRoles.includes('SUPER_ADMIN');
    const isAdmin = isSuperAdmin || currentUser.platformRoles.includes('ADMIN');

    if (!isAdmin) {
      throw new ForbiddenException('Insufficient role');
    }

    const normalizedPlatformRoles = Array.from(
      new Set<PlatformRole>(
        parsed.platformRoles
          ? parsed.platformRoles
          : parsed.role && this.isPlatformRole(parsed.role)
            ? [parsed.role]
            : []
      )
    );
    const normalizedSchoolRoles = Array.from(
      new Set<SchoolRole>(
        parsed.schoolRoles
          ? parsed.schoolRoles
          : parsed.role && this.isSchoolRole(parsed.role)
            ? [parsed.role]
            : []
      )
    );

    if (normalizedPlatformRoles.length === 0 && normalizedSchoolRoles.length === 0) {
      throw new BadRequestException('At least one platformRole or schoolRole is required');
    }

    if (normalizedPlatformRoles.includes('ADMIN') && !isSuperAdmin) {
      throw new ForbiddenException('Only SUPER_ADMIN can create ADMIN');
    }

    const requiresSchool = normalizedSchoolRoles.length > 0;
    let schoolId: string | null = null;
    let schoolSlug: string | null = null;

    if (requiresSchool) {
      if (!parsed.schoolSlug) {
        throw new BadRequestException('schoolSlug is required for school roles');
      }

      const school = await this.prisma.school.findUnique({
        where: { slug: parsed.schoolSlug },
        select: { id: true, slug: true }
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      schoolId = school.id;
      schoolSlug = school.slug;
    } else if (parsed.schoolSlug) {
      throw new BadRequestException('schoolSlug must not be provided for platform roles');
    }

    const passwordHash = await bcrypt.hash(parsed.temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email.toLowerCase(),
        phone: parsed.phone ?? null,
        avatarUrl: parsed.avatarUrl,
        passwordHash,
        mustChangePassword: true,
        profileCompleted: false,
        platformRoles:
          normalizedPlatformRoles.length > 0
            ? {
                createMany: {
                  data: normalizedPlatformRoles.map((role) => ({ role }))
                }
              }
            : undefined,
        memberships:
          schoolId && normalizedSchoolRoles.length > 0
            ? {
                createMany: {
                  data: normalizedSchoolRoles.map((role) => ({
                    schoolId,
                    role
                  }))
                }
              }
            : undefined
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        platformRoles: {
          select: { role: true }
        },
        memberships: {
          include: {
            school: {
              select: {
                slug: true,
                name: true
              }
            }
          }
        }
      }
    });

    await this.mailService.sendTemporaryPasswordEmail({
      to: user.email,
      firstName: user.firstName,
      temporaryPassword: parsed.temporaryPassword,
      schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null
    });

    return this.mapUserRow(user);
  }

  async updateUser(currentUser: AuthenticatedUser, userId: string, payload: UpdateUserDto) {
    const parsedResult = updateUserSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;

    if (
      parsed.firstName === undefined &&
      parsed.lastName === undefined &&
      parsed.phone === undefined &&
      parsed.platformRole === undefined &&
      parsed.platformRoles === undefined &&
      parsed.schoolRole === undefined &&
      parsed.schoolRoles === undefined &&
      parsed.role === undefined
    ) {
      throw new BadRequestException('No fields to update');
    }

    const isSuperAdmin = currentUser.platformRoles.includes('SUPER_ADMIN');

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: { select: { role: true } },
        memberships: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.platformRoles.some((assignment) => assignment.role === 'SUPER_ADMIN')) {
      throw new ForbiddenException('SUPER_ADMIN account cannot be modified');
    }

    if (target.platformRoles.some((assignment) => assignment.role === 'ADMIN') && !isSuperAdmin) {
      throw new ForbiddenException('Only SUPER_ADMIN can modify an ADMIN account');
    }

    const requestedPlatformRoles = parsed.platformRoles
      ? parsed.platformRoles
      : parsed.platformRole !== undefined
        ? parsed.platformRole === 'NONE'
          ? []
          : [parsed.platformRole]
        : parsed.role && this.isPlatformRole(parsed.role)
          ? [parsed.role]
          : undefined;
    const requestedSchoolRoles = parsed.schoolRoles
      ? parsed.schoolRoles
      : parsed.schoolRole !== undefined
        ? parsed.schoolRole === 'NONE'
          ? []
          : [parsed.schoolRole]
        : parsed.role && this.isSchoolRole(parsed.role)
          ? [parsed.role]
          : undefined;

    if (requestedPlatformRoles?.includes('ADMIN') && !isSuperAdmin) {
      throw new ForbiddenException('Only SUPER_ADMIN can assign ADMIN role');
    }

    if (requestedSchoolRoles && requestedSchoolRoles.length > 0 && target.memberships.length === 0) {
        throw new BadRequestException('Cannot assign a school role to a platform user without school');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone: parsed.phone
        }
      });

      if (
        parsed.role ||
        parsed.platformRole !== undefined ||
        parsed.platformRoles !== undefined ||
        parsed.schoolRole !== undefined ||
        parsed.schoolRoles !== undefined
      ) {
        const effectivePlatformRoles = Array.from(new Set(requestedPlatformRoles ?? []));
        const effectiveSchoolRoles = Array.from(new Set(requestedSchoolRoles ?? []));
        await tx.platformRoleAssignment.deleteMany({ where: { userId } });
        await tx.schoolMembership.deleteMany({ where: { userId } });

        if (effectivePlatformRoles.length > 0) {
          await tx.platformRoleAssignment.createMany({
            data: effectivePlatformRoles.map((role) => ({
              userId,
              role
            }))
          });
        }

        if (effectiveSchoolRoles.length > 0) {
          const schoolId = target.memberships[0]?.schoolId;
          if (!schoolId) {
            throw new BadRequestException('Missing school context for school role assignment');
          }

          await tx.schoolMembership.createMany({
            data: effectiveSchoolRoles.map((role) => ({
              userId,
              schoolId,
              role
            }))
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          platformRoles: { select: { role: true } },
          memberships: {
            include: {
              school: {
                select: {
                  slug: true,
                  name: true
                }
              }
            }
          }
        }
      });
    });

    return this.mapUserRow(updated);
  }

  async deleteUser(currentUser: AuthenticatedUser, userId: string) {
    if (currentUser.id === userId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: {
          select: { role: true }
        }
      }
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = currentUser.platformRoles.includes('SUPER_ADMIN');

    if (target.platformRoles.some((assignment) => assignment.role === 'SUPER_ADMIN')) {
      throw new ForbiddenException('SUPER_ADMIN account cannot be deleted');
    }

    if (target.platformRoles.some((assignment) => assignment.role === 'ADMIN') && !isSuperAdmin) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete an ADMIN account');
    }

    await this.prisma.user.delete({
      where: { id: userId }
    });

    return { success: true };
  }

  async listSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            memberships: true,
            classes: true,
            students: true
          }
        }
      }
    });

    return schools.map((school) => ({
      id: school.id,
      slug: school.slug,
      name: school.name,
      logoUrl: school.logoUrl,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      usersCount: school._count.memberships,
      classesCount: school._count.classes,
      studentsCount: school._count.students
    }));
  }

  async getSchoolDetails(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          where: { role: 'SCHOOL_ADMIN' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            memberships: true,
            classes: true,
            students: true,
            teachers: true,
            grades: true
          }
        }
      }
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return {
      id: school.id,
      slug: school.slug,
      name: school.name,
      logoUrl: school.logoUrl,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      stats: {
        usersCount: school._count.memberships,
        classesCount: school._count.classes,
        studentsCount: school._count.students,
        teachersCount: school._count.teachers,
        gradesCount: school._count.grades
      },
      schoolAdmins: school.memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email
      }))
    };
  }

  async updateSchool(schoolId: string, payload: UpdateSchoolDto) {
    const parsedResult = updateSchoolSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }

    const parsed = parsedResult.data;
    if (parsed.name === undefined && parsed.logoUrl === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException('School not found');
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        name: parsed.name,
        logoUrl: parsed.logoUrl
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async deleteSchool(schoolId: string) {
    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true }
    });

    if (!existing) {
      throw new NotFoundException('School not found');
    }

    await this.prisma.school.delete({
      where: { id: schoolId }
    });

    return { success: true };
  }

  async getIndicators() {
    const [
      schoolsCount,
      usersCount,
      studentsCount,
      teachersCount,
      gradesCount,
      adminsCount,
      schoolAdminsCount
    ] = await this.prisma.$transaction([
      this.prisma.school.count(),
      this.prisma.user.count(),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.grade.count(),
      this.prisma.platformRoleAssignment.count({ where: { role: 'ADMIN' } }),
      this.prisma.schoolMembership.count({ where: { role: 'SCHOOL_ADMIN' } })
    ]);

    return {
      schoolsCount,
      usersCount,
      studentsCount,
      teachersCount,
      gradesCount,
      adminsCount,
      schoolAdminsCount
    };
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const andFilters: Array<Record<string, unknown>> = [];

    if (query.search?.trim()) {
      const search = query.search.trim();
      andFilters.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (query.role) {
      if (this.isPlatformRole(query.role)) {
        andFilters.push({
          platformRoles: {
            some: {
              role: query.role
            }
          }
        });
      } else {
        andFilters.push({
          memberships: {
            some: {
              role: query.role
            }
          }
        });
      }
    }

    if (query.schoolSlug) {
      andFilters.push({
        memberships: {
          some: {
            school: {
              slug: query.schoolSlug
            }
          }
        }
      });
    }

    if (query.state === 'ACTIVE') {
      andFilters.push({ mustChangePassword: false });
    } else if (query.state === 'PASSWORD_CHANGE_REQUIRED') {
      andFilters.push({ mustChangePassword: true });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          platformRoles: {
            select: {
              role: true
            }
          },
          memberships: {
            include: {
              school: {
                select: {
                  slug: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: users.map((user) => this.mapUserRow(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: {
          select: { role: true }
        },
        memberships: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        teacherProfiles: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          }
        },
        studentProfiles: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            },
            class: {
              select: {
                id: true,
                name: true,
                year: true
              }
            }
          }
        },
        parentLinks: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                school: {
                  select: {
                    id: true,
                    slug: true,
                    name: true
                  }
                },
                class: {
                  select: {
                    id: true,
                    name: true,
                    year: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            gradesGiven: true,
            recoveryAnswers: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      platformRoles: user.platformRoles.map((assignment) => assignment.role),
      schoolMemberships: user.memberships.map((membership) => ({
        role: membership.role,
        school: membership.school
      })),
      teacherProfiles: user.teacherProfiles.map((profile) => ({
        id: profile.id,
        school: profile.school
      })),
      studentProfiles: user.studentProfiles.map((profile) => ({
        id: profile.id,
        school: profile.school,
        class: profile.class
      })),
      parentStudents: user.parentLinks.map((link) => ({
        id: link.id,
        student: link.student
      })),
      stats: {
        gradesGivenCount: user._count.gradesGiven,
        recoveryAnswersCount: user._count.recoveryAnswers
      }
    };
  }

  async checkUserEmail(email: string) {
    const normalized = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mustChangePassword: true
      }
    });

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mustChangePassword: user.mustChangePassword
      }
    };
  }

  async checkSchoolSlug(name: string) {
    const baseSlug = this.toSchoolSlug(name);
    const baseExists =
      (await this.prisma.school.count({
        where: { slug: baseSlug }
      })) > 0;
    const suggestedSlug = await this.generateAvailableSchoolSlug(name);

    return {
      baseSlug,
      baseExists,
      suggestedSlug
    };
  }

  async createAdmin(payload: CreateAdminDto) {
    const passwordHash = await bcrypt.hash(payload.password, 10);

    return this.prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email.toLowerCase(),
        passwordHash,
        platformRoles: {
          create: {
            role: 'ADMIN'
          }
        }
      }
    });
  }

  async createSchoolWithSchoolAdmin(payload: CreateSchoolDto) {
    const parsedResult = createSchoolSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;

    const generatedSlug = await this.generateAvailableSchoolSlug(parsed.name);

    const adminEmail = parsed.schoolAdminEmail.toLowerCase();
    const derivedName = this.deriveNameFromEmail(adminEmail);
    const existingAdminUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        firstName: true,
        mustChangePassword: true
      }
    });

    if (existingAdminUser) {
      const result = await this.prisma.$transaction(async (tx) => {
        const school = await tx.school.create({
          data: {
            slug: generatedSlug,
            name: parsed.name,
            logoUrl: parsed.logoUrl
          }
        });

        await tx.schoolMembership.create({
          data: {
            userId: existingAdminUser.id,
            schoolId: school.id,
            role: 'SCHOOL_ADMIN'
          }
        });

        return { school };
      });

      return {
        school: result.school,
        schoolAdmin: {
          id: existingAdminUser.id,
          email: adminEmail,
          firstName: existingAdminUser.firstName
        },
        userExisted: true,
        setupCompleted: !existingAdminUser.mustChangePassword
      };
    }

    const generatedTemporaryPassword = this.generateTemporaryPassword();
    const adminHash = await bcrypt.hash(generatedTemporaryPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          slug: generatedSlug,
          name: parsed.name,
          logoUrl: parsed.logoUrl
        }
      });

      const schoolAdmin = await tx.user.create({
        data: {
          firstName: derivedName.firstName,
          lastName: derivedName.lastName,
          email: adminEmail,
          passwordHash: adminHash,
          mustChangePassword: true,
          profileCompleted: false,
          memberships: {
            create: {
              schoolId: school.id,
              role: 'SCHOOL_ADMIN'
            }
          }
        }
      });

      return { school, schoolAdmin };
    });

    await this.mailService.sendTemporaryPasswordEmail({
      to: adminEmail,
      firstName: derivedName.firstName,
      temporaryPassword: generatedTemporaryPassword,
      schoolSlug: created.school.slug
    });

    return {
      school: created.school,
      schoolAdmin: created.schoolAdmin,
      userExisted: false,
      setupCompleted: false
    };
  }

  async listClassGroups(schoolId: string) {
    return this.prisma.classGroup.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        schoolId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            classes: true
          }
        }
      }
    });
  }

  async createClassGroup(schoolId: string, payload: CreateClassGroupDto) {
    const parsedResult = createClassGroupSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }

    const parsed = parsedResult.data;

    return this.prisma.classGroup.create({
      data: {
        schoolId,
        name: parsed.name
      }
    });
  }

  async updateClassGroup(schoolId: string, classGroupId: string, payload: UpdateClassGroupDto) {
    const parsedResult = updateClassGroupSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;
    if (parsed.name === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const existing = await this.prisma.classGroup.findFirst({
      where: { id: classGroupId, schoolId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException('Class group not found');
    }

    return this.prisma.classGroup.update({
      where: { id: classGroupId },
      data: {
        name: parsed.name
      }
    });
  }

  async deleteClassGroup(schoolId: string, classGroupId: string) {
    const existing = await this.prisma.classGroup.findFirst({
      where: { id: classGroupId, schoolId },
      include: {
        _count: {
          select: {
            classes: true
          }
        }
      }
    });
    if (!existing) {
      throw new NotFoundException('Class group not found');
    }
    if (existing._count.classes > 0) {
      throw new BadRequestException('Cannot delete a class group that still contains classes');
    }

    await this.prisma.classGroup.delete({
      where: { id: classGroupId }
    });

    return { success: true };
  }

  async listClassrooms(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ year: 'asc' }, { name: 'asc' }],
      include: {
        classGroup: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      }
    });
  }

  async createClassroom(schoolId: string, payload: CreateClassroomDto) {
    const parsedResult = createClassroomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;

    const classGroup = await this.prisma.classGroup.findFirst({
      where: { id: parsed.classGroupId, schoolId },
      select: { id: true }
    });

    if (!classGroup) {
      throw new NotFoundException('Class group not found');
    }

    return this.prisma.class.create({
      data: {
        schoolId,
        classGroupId: parsed.classGroupId,
        name: parsed.name,
        year: parsed.year
      },
      include: {
        classGroup: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async updateClassroom(schoolId: string, classId: string, payload: UpdateClassroomDto) {
    const parsedResult = updateClassroomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(parsedResult.error.issues.map((issue) => issue.message).join(', '));
    }
    const parsed = parsedResult.data;
    if (parsed.classGroupId === undefined && parsed.name === undefined && parsed.year === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const existing = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException('Classroom not found');
    }

    if (parsed.classGroupId) {
      const classGroup = await this.prisma.classGroup.findFirst({
        where: { id: parsed.classGroupId, schoolId },
        select: { id: true }
      });

      if (!classGroup) {
        throw new NotFoundException('Class group not found');
      }
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        classGroupId: parsed.classGroupId,
        name: parsed.name,
        year: parsed.year
      },
      include: {
        classGroup: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async deleteClassroom(schoolId: string, classId: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException('Classroom not found');
    }

    await this.prisma.class.delete({
      where: { id: classId }
    });

    return { success: true };
  }

  async createTeacher(schoolId: string, payload: CreateTeacherDto) {
    const passwordHash = await bcrypt.hash(payload.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email.toLowerCase(),
          passwordHash,
          memberships: {
            create: {
              schoolId,
              role: 'TEACHER'
            }
          }
        }
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id
        }
      });

      return { user, teacher };
    });
  }

  async createStudent(schoolId: string, payload: CreateStudentDto) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: payload.classId, schoolId },
      select: { id: true }
    });

    if (!classEntity) {
      throw new NotFoundException('Classroom not found');
    }

    if (payload.email && payload.password) {
      const studentEmail = payload.email.toLowerCase();
      const passwordHash = await bcrypt.hash(payload.password, 10);

      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: studentEmail,
            passwordHash,
            memberships: {
              create: {
                schoolId,
                role: 'STUDENT'
              }
            }
          }
        });

        const student = await tx.student.create({
          data: {
            schoolId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            classId: payload.classId,
            userId: user.id
          }
        });

        return { user, student };
      });
    }

    return this.prisma.student.create({
      data: {
        schoolId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        classId: payload.classId
      }
    });
  }

  async createParentStudentLink(schoolId: string, payload: CreateParentStudentLinkDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: payload.studentId, schoolId },
      select: { id: true }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const parentUserId = payload.parentUserId
      ? await this.ensureExistingParentMembership(schoolId, payload.parentUserId)
      : await this.createParentUser(schoolId, payload);

    return this.prisma.parentStudent.create({
      data: {
        schoolId,
        parentUserId,
        studentId: payload.studentId
      }
    });
  }

  private async createParentUser(schoolId: string, payload: CreateParentStudentLinkDto) {
    if (!payload.email || !payload.password || !payload.firstName || !payload.lastName) {
      throw new BadRequestException('Missing parent credentials or parentUserId');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const parentEmail = payload.email.toLowerCase();

    const parent = await this.prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: parentEmail,
        passwordHash,
        memberships: {
          create: {
            schoolId,
            role: 'PARENT'
          }
        }
      }
    });

    return parent.id;
  }

  private async ensureExistingParentMembership(schoolId: string, parentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: parentUserId },
      include: {
        memberships: {
          where: {
            schoolId,
            role: 'PARENT'
          },
          select: { id: true }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Parent user not found');
    }

    if (user.memberships.length === 0) {
      await this.prisma.schoolMembership.create({
        data: {
          userId: parentUserId,
          schoolId,
          role: 'PARENT'
        }
      });
    }

    return parentUserId;
  }

  private mapUserRow(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatarUrl?: string | null;
    mustChangePassword?: boolean;
    createdAt?: Date;
    platformRoles: Array<{ role: PlatformRole }>;
    memberships: Array<{ role: SchoolRole; school?: { slug: string; name: string } | null }>;
  }) {
    const role = this.getPrimaryRole(
      user.platformRoles.map((assignment) => assignment.role),
      user.memberships.map((membership) => membership.role)
    );

    const schoolMembership = user.memberships.find((membership) => membership.school) ?? null;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl ?? null,
      role,
      platformRoles: user.platformRoles.map((assignment) => assignment.role),
      schoolRoles: user.memberships.map((membership) => membership.role),
      mustChangePassword: user.mustChangePassword ?? false,
      createdAt: user.createdAt ?? new Date(),
      school: schoolMembership?.school
        ? {
            slug: schoolMembership.school.slug,
            name: schoolMembership.school.name
          }
        : null
    };
  }

  private getPrimaryRole(
    platformRoles: PlatformRole[],
    schoolRoles: SchoolRole[]
  ): PlatformRole | SchoolRole | null {
    const platformPriority: PlatformRole[] = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'];
    for (const role of platformPriority) {
      if (platformRoles.includes(role)) {
        return role;
      }
    }

    const schoolPriority: SchoolRole[] = [
      'SCHOOL_ADMIN',
      'SCHOOL_MANAGER',
      'SCHOOL_ACCOUNTANT',
      'TEACHER',
      'PARENT',
      'STUDENT'
    ];
    for (const role of schoolPriority) {
      if (schoolRoles.includes(role)) {
        return role;
      }
    }

    return null;
  }

  private isPlatformRole(role: string): role is PlatformRole {
    return (PLATFORM_ROLES as readonly string[]).includes(role);
  }

  private isSchoolRole(role: string): role is SchoolRole {
    return (SCHOOL_ROLES as readonly string[]).includes(role);
  }

  private async generateAvailableSchoolSlug(name: string) {
    const base = this.toSchoolSlug(name);
    let index = 1;
    let candidate = base;

    while (true) {
      const exists = await this.prisma.school.count({
        where: { slug: candidate }
      });

      if (!exists) {
        return candidate;
      }

      index += 1;
      const suffix = `-${index}`;
      const maxBaseLength = Math.max(3, 30 - suffix.length);
      candidate = `${base.slice(0, maxBaseLength)}${suffix}`;
    }
  }

  private toSchoolSlug(rawName: string) {
    const cleaned = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    const bounded = cleaned.slice(0, 30).replace(/-+$/g, '');

    if (bounded.length >= 3) {
      return bounded;
    }

    return 'school';
  }

  private deriveNameFromEmail(email: string) {
    const localPart = email.split('@')[0] ?? 'school.admin';
    const safe = localPart.replace(/[^a-zA-Z0-9._-]/g, '.');
    const parts = safe.split(/[._-]+/).filter(Boolean);
    const firstRaw = parts[0] ?? 'School';
    const lastRaw = parts[1] ?? 'Admin';

    return {
      firstName: this.capitalizeName(firstRaw),
      lastName: this.capitalizeName(lastRaw)
    };
  }

  private capitalizeName(value: string) {
    if (!value) {
      return 'User';
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  private generateTemporaryPassword() {
    const dictionary = [
      'atlas',
      'ubuntu',
      'vision',
      'campus',
      'avenir',
      'soleil',
      'riviera',
      'horizon',
      'safran',
      'kora'
    ];

    const word = dictionary[Math.floor(Math.random() * dictionary.length)] ?? 'campus';
    const suffix = String(Math.floor(100 + Math.random() * 900));
    const candidate = `${this.capitalizeName(word)}${suffix}`;

    if (PASSWORD_COMPLEXITY_REGEX.test(candidate)) {
      return candidate;
    }

    return `School${suffix}Live`;
  }
}
