import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PlatformRole,
  SchoolRole,
  StudentLifeEventType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateAdminDto } from "./dto/create-admin.dto.js";
import type { CreateAcademicLevelDto } from "./dto/create-academic-level.dto.js";
import type { BulkUpdateEnrollmentStatusDto } from "./dto/bulk-update-enrollment-status.dto.js";
import type { CreateClassroomDto } from "./dto/create-classroom.dto.js";
import type { CreateClassSubjectOverrideDto } from "./dto/create-class-subject-override.dto.js";
import type { CreateCurriculumDto } from "./dto/create-curriculum.dto.js";
import type { CreateSubjectDto } from "./dto/create-subject.dto.js";
import type { CreateParentStudentLinkDto } from "./dto/create-parent-student-link.dto.js";
import type { CreateSchoolDto } from "./dto/create-school.dto.js";
import type { CreateSchoolYearDto } from "./dto/create-school-year.dto.js";
import type { CreateStudentEnrollmentDto } from "./dto/create-student-enrollment.dto.js";
import type { CreateStudentLifeEventDto } from "./dto/create-student-life-event.dto.js";
import type { CreateStudentDto } from "./dto/create-student.dto.js";
import type { CreateTeacherAssignmentDto } from "./dto/create-teacher-assignment.dto.js";
import type { CreateTeacherDto } from "./dto/create-teacher.dto.js";
import type { CreateTrackDto } from "./dto/create-track.dto.js";
import type { CreateUserDto } from "./dto/create-user.dto.js";
import type { ListTeacherAssignmentsQueryDto } from "./dto/list-teacher-assignments-query.dto.js";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto.js";
import type { ListStudentEnrollmentsQueryDto } from "./dto/list-student-enrollments-query.dto.js";
import type { ListStudentLifeEventsQueryDto } from "./dto/list-student-life-events-query.dto.js";
import type { RolloverSchoolYearDto } from "./dto/rollover-school-year.dto.js";
import type { SetActiveSchoolYearDto } from "./dto/set-active-school-year.dto.js";
import type { UpdateAcademicLevelDto } from "./dto/update-academic-level.dto.js";
import type { UpdateClassroomDto } from "./dto/update-classroom.dto.js";
import type { UpdateClassSubjectOverrideDto } from "./dto/update-class-subject-override.dto.js";
import type { UpdateCurriculumDto } from "./dto/update-curriculum.dto.js";
import type { UpdateSchoolDto } from "./dto/update-school.dto.js";
import type { UpdateStudentDto } from "./dto/update-student.dto.js";
import type { UpdateStudentEnrollmentDto } from "./dto/update-student-enrollment.dto.js";
import type { UpdateStudentLifeEventDto } from "./dto/update-student-life-event.dto.js";
import type { UpdateSubjectDto } from "./dto/update-subject.dto.js";
import type { UpdateTeacherAssignmentDto } from "./dto/update-teacher-assignment.dto.js";
import type { UpdateTrackDto } from "./dto/update-track.dto.js";
import type { UpdateUserDto } from "./dto/update-user.dto.js";
import type { UpsertCurriculumSubjectDto } from "./dto/upsert-curriculum-subject.dto.js";

const PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT"] as const;
const SCHOOL_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;
const CREATABLE_ROLES = [
  "ADMIN",
  "SALES",
  "SUPPORT",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "TEACHER",
  "PARENT",
  "STUDENT",
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
      "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
    ),
  role: z.enum(CREATABLE_ROLES).optional(),
  platformRoles: z.array(z.enum(["ADMIN", "SALES", "SUPPORT"])).optional(),
  schoolRoles: z.array(z.enum(SCHOOL_ROLES)).optional(),
  schoolSlug: z.string().trim().min(1).optional(),
  avatarUrl: z.string().trim().regex(USER_AVATAR_URL_REGEX).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z
    .union([z.string().trim().min(6).max(30), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }

      return value;
    }),
  platformRole: z.enum(["ADMIN", "SALES", "SUPPORT", "NONE"]).optional(),
  platformRoles: z.array(z.enum(["ADMIN", "SALES", "SUPPORT"])).optional(),
  schoolRole: z
    .enum([
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "TEACHER",
      "PARENT",
      "STUDENT",
      "NONE",
    ])
    .optional(),
  schoolRoles: z.array(z.enum(SCHOOL_ROLES)).optional(),
  role: z.enum(CREATABLE_ROLES).optional(),
});

const createSchoolSchema = z.object({
  name: z.string().trim().min(1),
  schoolAdminEmail: z.string().trim().email(),
  logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).optional(),
});

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1).optional(),
  logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).nullable().optional(),
});

const createClassroomSchema = z.object({
  name: z.string().trim().min(1),
  schoolYearId: z.string().trim().min(1).optional(),
  academicLevelId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
  curriculumId: z.string().trim().min(1),
});

const updateClassroomSchema = z.object({
  name: z.string().trim().min(1).optional(),
  schoolYearId: z.string().trim().min(1).optional(),
  academicLevelId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
  curriculumId: z.string().trim().min(1).optional(),
});

const createStudentEnrollmentSchema = z.object({
  classId: z.string().trim().min(1),
  status: z
    .enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"])
    .optional(),
});

const updateStudentEnrollmentSchema = z.object({
  status: z
    .enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"])
    .optional(),
});

const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
});

const listStudentEnrollmentsQuerySchema = z.object({
  schoolYearId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  status: z
    .enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"])
    .optional(),
  search: z.string().trim().optional(),
});

const listStudentLifeEventsQuerySchema = z.object({
  scope: z.enum(["current", "all"]).optional(),
  type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]).optional(),
  schoolYearId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const createStudentLifeEventSchema = z.object({
  type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]),
  classId: z.string().trim().min(1).optional(),
  occurredAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  justified: z.boolean().optional(),
  reason: z.string().trim().min(1),
  comment: z.string().trim().optional(),
});

const updateStudentLifeEventSchema = z.object({
  type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]).optional(),
  classId: z.string().trim().min(1).optional(),
  occurredAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  justified: z.boolean().optional(),
  reason: z.string().trim().min(1).optional(),
  comment: z.string().trim().optional(),
});

const bulkUpdateEnrollmentStatusSchema = z.object({
  enrollmentIds: z.array(z.string().trim().min(1)).min(1),
  status: z.enum(["ACTIVE", "TRANSFERRED", "WITHDRAWN", "GRADUATED"]),
});

const createClassSubjectOverrideSchema = z.object({
  subjectId: z.string().trim().min(1),
  action: z.enum(["ADD", "REMOVE"]),
  coefficientOverride: z.number().min(0).optional(),
  weeklyHoursOverride: z.number().min(0).optional(),
});

const updateClassSubjectOverrideSchema = z.object({
  subjectId: z.string().trim().min(1).optional(),
  action: z.enum(["ADD", "REMOVE"]).optional(),
  coefficientOverride: z.number().min(0).optional(),
  weeklyHoursOverride: z.number().min(0).optional(),
});

const createSchoolYearSchema = z.object({
  label: z.string().trim().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const setActiveSchoolYearSchema = z.object({
  schoolYearId: z.string().trim().min(1),
});

const rolloverSchoolYearSchema = z
  .object({
    sourceSchoolYearId: z.string().trim().min(1).optional(),
    targetSchoolYearId: z.string().trim().min(1).optional(),
    targetLabel: z.string().trim().min(1).optional(),
    setTargetAsActive: z.boolean().optional().default(false),
    copyAssignments: z.boolean().optional().default(true),
    copyEnrollments: z.boolean().optional().default(false),
  })
  .refine((value) => value.targetSchoolYearId || value.targetLabel, {
    message: "targetSchoolYearId or targetLabel is required",
    path: ["targetSchoolYearId"],
  });

const createAcademicLevelSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const updateAcademicLevelSchema = z.object({
  code: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
});

const createTrackSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const updateTrackSchema = z.object({
  code: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
});

const createCurriculumSchema = z.object({
  academicLevelId: z.string().trim().min(1),
  trackId: z.string().trim().min(1).optional(),
});

const updateCurriculumSchema = z.object({
  academicLevelId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
});

const upsertCurriculumSubjectSchema = z.object({
  subjectId: z.string().trim().min(1),
  isMandatory: z.boolean().optional(),
  coefficient: z.number().min(0).optional(),
  weeklyHours: z.number().min(0).optional(),
});

const createSubjectSchema = z.object({
  name: z.string().trim().min(1),
});

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

const listTeacherAssignmentsQuerySchema = z.object({
  schoolYearId: z.string().trim().min(1).optional(),
  teacherUserId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
});

const createTeacherAssignmentSchema = z.object({
  schoolYearId: z.string().trim().min(1),
  teacherUserId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
});

const updateTeacherAssignmentSchema = z.object({
  schoolYearId: z.string().trim().min(1).optional(),
  teacherUserId: z.string().trim().min(1).optional(),
  classId: z.string().trim().min(1).optional(),
  subjectId: z.string().trim().min(1).optional(),
});

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createUser(currentUser: AuthenticatedUser, payload: CreateUserDto) {
    const parsedResult = createUserSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const isSuperAdmin = currentUser.platformRoles.includes("SUPER_ADMIN");
    const isAdmin = isSuperAdmin || currentUser.platformRoles.includes("ADMIN");

    if (!isAdmin) {
      throw new ForbiddenException("Insufficient role");
    }

    const normalizedPlatformRoles = Array.from(
      new Set<PlatformRole>(
        parsed.platformRoles
          ? parsed.platformRoles
          : parsed.role && this.isPlatformRole(parsed.role)
            ? [parsed.role]
            : [],
      ),
    );
    const normalizedSchoolRoles = Array.from(
      new Set<SchoolRole>(
        parsed.schoolRoles
          ? parsed.schoolRoles
          : parsed.role && this.isSchoolRole(parsed.role)
            ? [parsed.role]
            : [],
      ),
    );

    if (
      normalizedPlatformRoles.length === 0 &&
      normalizedSchoolRoles.length === 0
    ) {
      throw new BadRequestException(
        "At least one platformRole or schoolRole is required",
      );
    }

    if (normalizedPlatformRoles.includes("ADMIN") && !isSuperAdmin) {
      throw new ForbiddenException("Only SUPER_ADMIN can create ADMIN");
    }

    const requiresSchool = normalizedSchoolRoles.length > 0;
    let schoolId: string | null = null;
    let schoolSlug: string | null = null;

    if (requiresSchool) {
      if (!parsed.schoolSlug) {
        throw new BadRequestException(
          "schoolSlug is required for school roles",
        );
      }

      const school = await this.prisma.school.findUnique({
        where: { slug: parsed.schoolSlug },
        select: { id: true, slug: true },
      });

      if (!school) {
        throw new NotFoundException("School not found");
      }

      schoolId = school.id;
      schoolSlug = school.slug;
    } else if (parsed.schoolSlug) {
      throw new BadRequestException(
        "schoolSlug must not be provided for platform roles",
      );
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
                  data: normalizedPlatformRoles.map((role) => ({ role })),
                },
              }
            : undefined,
        memberships:
          schoolId && normalizedSchoolRoles.length > 0
            ? {
                createMany: {
                  data: normalizedSchoolRoles.map((role) => ({
                    schoolId,
                    role,
                  })),
                },
              }
            : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        platformRoles: {
          select: { role: true },
        },
        memberships: {
          include: {
            school: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await this.mailService.sendTemporaryPasswordEmail({
      to: user.email,
      firstName: user.firstName,
      temporaryPassword: parsed.temporaryPassword,
      schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
    });

    return this.mapUserRow(user);
  }

  async updateUser(
    currentUser: AuthenticatedUser,
    userId: string,
    payload: UpdateUserDto,
  ) {
    const parsedResult = updateUserSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
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
      throw new BadRequestException("No fields to update");
    }

    const isSuperAdmin = currentUser.platformRoles.includes("SUPER_ADMIN");

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
                name: true,
              },
            },
          },
        },
      },
    });

    if (!target) {
      throw new NotFoundException("User not found");
    }

    if (
      target.platformRoles.some(
        (assignment) => assignment.role === "SUPER_ADMIN",
      )
    ) {
      throw new ForbiddenException("SUPER_ADMIN account cannot be modified");
    }

    if (
      target.platformRoles.some((assignment) => assignment.role === "ADMIN") &&
      !isSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only SUPER_ADMIN can modify an ADMIN account",
      );
    }

    const requestedPlatformRoles = parsed.platformRoles
      ? parsed.platformRoles
      : parsed.platformRole !== undefined
        ? parsed.platformRole === "NONE"
          ? []
          : [parsed.platformRole]
        : parsed.role && this.isPlatformRole(parsed.role)
          ? [parsed.role]
          : undefined;
    const requestedSchoolRoles = parsed.schoolRoles
      ? parsed.schoolRoles
      : parsed.schoolRole !== undefined
        ? parsed.schoolRole === "NONE"
          ? []
          : [parsed.schoolRole]
        : parsed.role && this.isSchoolRole(parsed.role)
          ? [parsed.role]
          : undefined;

    if (requestedPlatformRoles?.includes("ADMIN") && !isSuperAdmin) {
      throw new ForbiddenException("Only SUPER_ADMIN can assign ADMIN role");
    }

    if (
      requestedSchoolRoles &&
      requestedSchoolRoles.length > 0 &&
      target.memberships.length === 0
    ) {
      throw new BadRequestException(
        "Cannot assign a school role to a platform user without school",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone: parsed.phone,
        },
      });

      if (
        parsed.role ||
        parsed.platformRole !== undefined ||
        parsed.platformRoles !== undefined ||
        parsed.schoolRole !== undefined ||
        parsed.schoolRoles !== undefined
      ) {
        const effectivePlatformRoles = Array.from(
          new Set(requestedPlatformRoles ?? []),
        );
        const effectiveSchoolRoles = Array.from(
          new Set(requestedSchoolRoles ?? []),
        );
        await tx.platformRoleAssignment.deleteMany({ where: { userId } });
        await tx.schoolMembership.deleteMany({ where: { userId } });

        if (effectivePlatformRoles.length > 0) {
          await tx.platformRoleAssignment.createMany({
            data: effectivePlatformRoles.map((role) => ({
              userId,
              role,
            })),
          });
        }

        if (effectiveSchoolRoles.length > 0) {
          const schoolId = target.memberships[0]?.schoolId;
          if (!schoolId) {
            throw new BadRequestException(
              "Missing school context for school role assignment",
            );
          }

          await tx.schoolMembership.createMany({
            data: effectiveSchoolRoles.map((role) => ({
              userId,
              schoolId,
              role,
            })),
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
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return this.mapUserRow(updated);
  }

  async deleteUser(currentUser: AuthenticatedUser, userId: string) {
    if (currentUser.id === userId) {
      throw new BadRequestException("Cannot delete your own account");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: {
          select: { role: true },
        },
      },
    });

    if (!target) {
      throw new NotFoundException("User not found");
    }

    const isSuperAdmin = currentUser.platformRoles.includes("SUPER_ADMIN");

    if (
      target.platformRoles.some(
        (assignment) => assignment.role === "SUPER_ADMIN",
      )
    ) {
      throw new ForbiddenException("SUPER_ADMIN account cannot be deleted");
    }

    if (
      target.platformRoles.some((assignment) => assignment.role === "ADMIN") &&
      !isSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only SUPER_ADMIN can delete an ADMIN account",
      );
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  async listSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { createdAt: "desc" },
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
            students: true,
          },
        },
      },
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
      studentsCount: school._count.students,
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
          where: { role: "SCHOOL_ADMIN" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            memberships: true,
            classes: true,
            students: true,
            teachers: true,
            grades: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
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
        gradesCount: school._count.grades,
      },
      schoolAdmins: school.memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email,
      })),
    };
  }

  async updateSchool(schoolId: string, payload: UpdateSchoolDto) {
    const parsedResult = updateSchoolSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.name === undefined && parsed.logoUrl === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("School not found");
    }

    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        name: parsed.name,
        logoUrl: parsed.logoUrl,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteSchool(schoolId: string) {
    const existing = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException("School not found");
    }

    await this.prisma.school.delete({
      where: { id: schoolId },
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
      schoolAdminsCount,
    ] = await this.prisma.$transaction([
      this.prisma.school.count(),
      this.prisma.user.count(),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.grade.count(),
      this.prisma.platformRoleAssignment.count({ where: { role: "ADMIN" } }),
      this.prisma.schoolMembership.count({ where: { role: "SCHOOL_ADMIN" } }),
    ]);

    return {
      schoolsCount,
      usersCount,
      studentsCount,
      teachersCount,
      gradesCount,
      adminsCount,
      schoolAdminsCount,
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
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (query.role) {
      if (this.isPlatformRole(query.role)) {
        andFilters.push({
          platformRoles: {
            some: {
              role: query.role,
            },
          },
        });
      } else {
        andFilters.push({
          memberships: {
            some: {
              role: query.role,
            },
          },
        });
      }
    }

    if (query.schoolSlug) {
      andFilters.push({
        memberships: {
          some: {
            school: {
              slug: query.schoolSlug,
            },
          },
        },
      });
    }

    if (query.state === "ACTIVE") {
      andFilters.push({ mustChangePassword: false });
    } else if (query.state === "PASSWORD_CHANGE_REQUIRED") {
      andFilters.push({ mustChangePassword: true });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          platformRoles: {
            select: {
              role: true,
            },
          },
          memberships: {
            include: {
              school: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => this.mapUserRow(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformRoles: {
          select: { role: true },
        },
        memberships: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        teacherProfiles: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        },
        studentProfiles: {
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true,
                activeSchoolYearId: true,
              },
            },
            enrollments: {
              where: {
                status: "ACTIVE",
              },
              orderBy: [{ createdAt: "desc" }],
              select: {
                schoolYearId: true,
                classId: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    schoolYear: {
                      select: {
                        label: true,
                      },
                    },
                  },
                },
              },
            },
          },
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
                    name: true,
                    activeSchoolYearId: true,
                  },
                },
                enrollments: {
                  where: {
                    status: "ACTIVE",
                  },
                  orderBy: [{ createdAt: "desc" }],
                  select: {
                    schoolYearId: true,
                    classId: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                        schoolYear: {
                          select: {
                            label: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            gradesGiven: true,
            recoveryAnswers: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
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
        school: membership.school,
      })),
      teacherProfiles: user.teacherProfiles.map((profile) => ({
        id: profile.id,
        school: profile.school,
      })),
      studentProfiles: user.studentProfiles.map((profile) => {
        const currentEnrollment =
          profile.enrollments.find(
            (enrollment) =>
              enrollment.schoolYearId === profile.school.activeSchoolYearId,
          ) ??
          profile.enrollments[0] ??
          null;

        return {
          id: profile.id,
          school: {
            id: profile.school.id,
            slug: profile.school.slug,
            name: profile.school.name,
          },
          class: currentEnrollment?.class ?? null,
        };
      }),
      parentStudents: user.parentLinks.map((link) => ({
        id: link.id,
        student: {
          id: link.student.id,
          firstName: link.student.firstName,
          lastName: link.student.lastName,
          school: {
            id: link.student.school.id,
            slug: link.student.school.slug,
            name: link.student.school.name,
          },
          class:
            link.student.enrollments.find(
              (enrollment) =>
                enrollment.schoolYearId ===
                link.student.school.activeSchoolYearId,
            )?.class ??
            link.student.enrollments[0]?.class ??
            null,
        },
      })),
      stats: {
        gradesGivenCount: user._count.gradesGiven,
        recoveryAnswersCount: user._count.recoveryAnswers,
      },
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
        mustChangePassword: true,
      },
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
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async checkSchoolSlug(name: string) {
    const baseSlug = this.toSchoolSlug(name);
    const baseExists =
      (await this.prisma.school.count({
        where: { slug: baseSlug },
      })) > 0;
    const suggestedSlug = await this.generateAvailableSchoolSlug(name);

    return {
      baseSlug,
      baseExists,
      suggestedSlug,
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
            role: "ADMIN",
          },
        },
      },
    });
  }

  async createSchoolWithSchoolAdmin(payload: CreateSchoolDto) {
    const parsedResult = createSchoolSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
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
        mustChangePassword: true,
      },
    });

    if (existingAdminUser) {
      const result = await this.prisma.$transaction(async (tx) => {
        const schoolYearLabel = this.getDefaultSchoolYearLabel();
        const schoolYear = await tx.schoolYear.create({
          data: {
            label: schoolYearLabel,
            school: {
              create: {
                slug: generatedSlug,
                name: parsed.name,
                logoUrl: parsed.logoUrl,
              },
            },
          },
          include: {
            school: {
              select: {
                id: true,
                slug: true,
                name: true,
                logoUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        const school = schoolYear.school;

        await tx.school.update({
          where: { id: school.id },
          data: { activeSchoolYearId: schoolYear.id },
        });

        await tx.schoolMembership.create({
          data: {
            userId: existingAdminUser.id,
            schoolId: school.id,
            role: "SCHOOL_ADMIN",
          },
        });

        return { school };
      });

      return {
        school: result.school,
        schoolAdmin: {
          id: existingAdminUser.id,
          email: adminEmail,
          firstName: existingAdminUser.firstName,
        },
        userExisted: true,
        setupCompleted: !existingAdminUser.mustChangePassword,
      };
    }

    const generatedTemporaryPassword = this.generateTemporaryPassword();
    const adminHash = await bcrypt.hash(generatedTemporaryPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const schoolYearLabel = this.getDefaultSchoolYearLabel();
      const schoolYear = await tx.schoolYear.create({
        data: {
          label: schoolYearLabel,
          school: {
            create: {
              slug: generatedSlug,
              name: parsed.name,
              logoUrl: parsed.logoUrl,
            },
          },
        },
        include: {
          school: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      const school = schoolYear.school;

      await tx.school.update({
        where: { id: school.id },
        data: { activeSchoolYearId: schoolYear.id },
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
              role: "SCHOOL_ADMIN",
            },
          },
        },
      });

      return { school, schoolAdmin };
    });

    await this.mailService.sendTemporaryPasswordEmail({
      to: adminEmail,
      firstName: derivedName.firstName,
      temporaryPassword: generatedTemporaryPassword,
      schoolSlug: created.school.slug,
    });

    return {
      school: created.school,
      schoolAdmin: created.schoolAdmin,
      userExisted: false,
      setupCompleted: false,
    };
  }

  async listClassrooms(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ schoolYear: { label: "asc" } }, { name: "asc" }],
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        academicLevel: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        track: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        curriculum: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });
  }

  async createClassroom(schoolId: string, payload: CreateClassroomDto) {
    const parsedResult = createClassroomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const schoolYearId =
      parsed.schoolYearId ??
      (await this.getActiveSchoolYearIdOrThrow(schoolId));
    await this.ensureSchoolYearInSchool(schoolYearId, schoolId);
    const academicReferences = await this.resolveClassAcademicReferences(
      schoolId,
      parsed.academicLevelId,
      parsed.trackId,
      parsed.curriculumId,
    );

    return this.prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        name: parsed.name,
        academicLevelId: academicReferences.academicLevelId,
        trackId: academicReferences.trackId,
        curriculumId: academicReferences.curriculumId,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        academicLevel: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        track: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        curriculum: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateClassroom(
    schoolId: string,
    classId: string,
    payload: UpdateClassroomDto,
  ) {
    const parsedResult = updateClassroomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;
    if (
      parsed.name === undefined &&
      parsed.schoolYearId === undefined &&
      parsed.academicLevelId === undefined &&
      parsed.trackId === undefined &&
      parsed.curriculumId === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        academicLevelId: true,
        trackId: true,
        curriculumId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("Classroom not found");
    }

    if (parsed.schoolYearId) {
      await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);
    }

    const academicReferences = await this.resolveClassAcademicReferences(
      schoolId,
      parsed.academicLevelId,
      parsed.trackId,
      parsed.curriculumId,
      {
        academicLevelId: existing.academicLevelId ?? undefined,
        trackId: existing.trackId ?? undefined,
        curriculumId: existing.curriculumId ?? undefined,
      },
    );

    return this.prisma.class.update({
      where: { id: classId },
      data: {
        name: parsed.name,
        schoolYearId: parsed.schoolYearId,
        academicLevelId: academicReferences.academicLevelId,
        trackId: academicReferences.trackId,
        curriculumId: academicReferences.curriculumId,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        academicLevel: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        track: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        curriculum: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteClassroom(schoolId: string, classId: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Classroom not found");
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    return { success: true };
  }

  async listClassSubjectOverrides(schoolId: string, classId: string) {
    await this.ensureClassInSchool(classId, schoolId);

    return this.prisma.classSubjectOverride.findMany({
      where: {
        schoolId,
        classId,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async createClassSubjectOverride(
    schoolId: string,
    classId: string,
    payload: CreateClassSubjectOverrideDto,
  ) {
    const parsedResult = createClassSubjectOverrideSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    await this.ensureClassInSchool(classId, schoolId);
    await this.ensureSubjectInSchool(parsed.subjectId, schoolId);

    return this.prisma.classSubjectOverride.upsert({
      where: {
        classId_subjectId: {
          classId,
          subjectId: parsed.subjectId,
        },
      },
      update: {
        action: parsed.action,
        coefficientOverride: parsed.coefficientOverride,
        weeklyHoursOverride: parsed.weeklyHoursOverride,
      },
      create: {
        schoolId,
        classId,
        subjectId: parsed.subjectId,
        action: parsed.action,
        coefficientOverride: parsed.coefficientOverride,
        weeklyHoursOverride: parsed.weeklyHoursOverride,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateClassSubjectOverride(
    schoolId: string,
    classId: string,
    overrideId: string,
    payload: UpdateClassSubjectOverrideDto,
  ) {
    const parsedResult = updateClassSubjectOverrideSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (
      parsed.subjectId === undefined &&
      parsed.action === undefined &&
      parsed.coefficientOverride === undefined &&
      parsed.weeklyHoursOverride === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureClassInSchool(classId, schoolId);

    const existing = await this.prisma.classSubjectOverride.findFirst({
      where: {
        id: overrideId,
        schoolId,
        classId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Class subject override not found");
    }

    if (parsed.subjectId) {
      await this.ensureSubjectInSchool(parsed.subjectId, schoolId);
    }

    return this.prisma.classSubjectOverride.update({
      where: {
        id: overrideId,
      },
      data: {
        subjectId: parsed.subjectId,
        action: parsed.action,
        coefficientOverride: parsed.coefficientOverride,
        weeklyHoursOverride: parsed.weeklyHoursOverride,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteClassSubjectOverride(
    schoolId: string,
    classId: string,
    overrideId: string,
  ) {
    await this.ensureClassInSchool(classId, schoolId);

    const existing = await this.prisma.classSubjectOverride.findFirst({
      where: {
        id: overrideId,
        schoolId,
        classId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Class subject override not found");
    }

    await this.prisma.classSubjectOverride.delete({
      where: {
        id: overrideId,
      },
    });

    return { success: true };
  }

  async listSchoolYears(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        activeSchoolYearId: true,
        schoolYears: {
          orderBy: [{ label: "desc" }],
          select: {
            id: true,
            label: true,
            startsAt: true,
            endsAt: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                classes: true,
                enrollments: true,
                teachingAssignments: true,
                grades: true,
              },
            },
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    return school.schoolYears.map((schoolYear) => ({
      ...schoolYear,
      isActive: schoolYear.id === school.activeSchoolYearId,
    }));
  }

  async createSchoolYear(schoolId: string, payload: CreateSchoolYearDto) {
    const parsedResult = createSchoolYearSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const created = await this.prisma.schoolYear.create({
      data: {
        schoolId,
        label: parsed.label,
        startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      },
    });

    return {
      ...created,
      isActive: false,
    };
  }

  async setActiveSchoolYear(schoolId: string, payload: SetActiveSchoolYearDto) {
    const parsedResult = setActiveSchoolYearSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: parsed.schoolYearId },
    });

    return {
      success: true,
      activeSchoolYearId: parsed.schoolYearId,
    };
  }

  async rolloverSchoolYear(schoolId: string, payload: RolloverSchoolYearDto) {
    const parsedResult = rolloverSchoolYearSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const activeSchoolYearId =
      await this.getActiveSchoolYearIdOrThrow(schoolId);
    const sourceSchoolYearId = parsed.sourceSchoolYearId ?? activeSchoolYearId;
    await this.ensureSchoolYearInSchool(sourceSchoolYearId, schoolId);

    const result = await this.prisma.$transaction(async (tx) => {
      const targetSchoolYear = parsed.targetSchoolYearId
        ? await tx.schoolYear.findFirst({
            where: {
              id: parsed.targetSchoolYearId,
              schoolId,
            },
          })
        : await tx.schoolYear.upsert({
            where: {
              schoolId_label: {
                schoolId,
                label: parsed.targetLabel as string,
              },
            },
            create: {
              schoolId,
              label: parsed.targetLabel as string,
            },
            update: {},
          });

      if (!targetSchoolYear) {
        throw new NotFoundException("Target school year not found");
      }

      if (targetSchoolYear.id === sourceSchoolYearId) {
        throw new BadRequestException(
          "Source and target school year must be different",
        );
      }

      const sourceClasses = await tx.class.findMany({
        where: {
          schoolId,
          schoolYearId: sourceSchoolYearId,
        },
        select: {
          id: true,
          name: true,
          academicLevelId: true,
          trackId: true,
          curriculumId: true,
        },
      });

      const classIdMap = new Map<string, string>();
      let createdClassesCount = 0;

      for (const sourceClass of sourceClasses) {
        const existingTargetClass = await tx.class.findFirst({
          where: {
            schoolId,
            schoolYearId: targetSchoolYear.id,
            name: sourceClass.name,
          },
          select: { id: true },
        });

        if (existingTargetClass) {
          classIdMap.set(sourceClass.id, existingTargetClass.id);
          continue;
        }

        const createdTargetClass = await tx.class.create({
          data: {
            schoolId,
            schoolYearId: targetSchoolYear.id,
            name: sourceClass.name,
            academicLevelId: sourceClass.academicLevelId,
            trackId: sourceClass.trackId,
            curriculumId: sourceClass.curriculumId,
          },
          select: { id: true },
        });

        classIdMap.set(sourceClass.id, createdTargetClass.id);
        createdClassesCount += 1;
      }

      let createdAssignmentsCount = 0;
      if (parsed.copyAssignments) {
        const sourceAssignments = await tx.teacherClassSubject.findMany({
          where: {
            schoolId,
            schoolYearId: sourceSchoolYearId,
          },
          select: {
            teacherUserId: true,
            classId: true,
            subjectId: true,
          },
        });

        const assignmentRows = sourceAssignments
          .map((assignment) => {
            const mappedClassId = classIdMap.get(assignment.classId);
            if (!mappedClassId) {
              return null;
            }

            return {
              schoolId,
              schoolYearId: targetSchoolYear.id,
              teacherUserId: assignment.teacherUserId,
              classId: mappedClassId,
              subjectId: assignment.subjectId,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (assignmentRows.length > 0) {
          const assignmentsResult = await tx.teacherClassSubject.createMany({
            data: assignmentRows,
            skipDuplicates: true,
          });
          createdAssignmentsCount = assignmentsResult.count;
        }
      }

      let createdEnrollmentsCount = 0;
      if (parsed.copyEnrollments) {
        const sourceEnrollments = await tx.enrollment.findMany({
          where: {
            schoolId,
            schoolYearId: sourceSchoolYearId,
            status: "ACTIVE",
          },
          select: {
            studentId: true,
            classId: true,
          },
        });

        const enrollmentRows = sourceEnrollments
          .map((enrollment) => {
            const mappedClassId = classIdMap.get(enrollment.classId);
            if (!mappedClassId) {
              return null;
            }

            return {
              schoolId,
              schoolYearId: targetSchoolYear.id,
              studentId: enrollment.studentId,
              classId: mappedClassId,
              status: "ACTIVE" as const,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (enrollmentRows.length > 0) {
          const enrollmentsResult = await tx.enrollment.createMany({
            data: enrollmentRows,
            skipDuplicates: true,
          });
          createdEnrollmentsCount = enrollmentsResult.count;
        }
      }

      if (parsed.setTargetAsActive) {
        await tx.school.update({
          where: { id: schoolId },
          data: {
            activeSchoolYearId: targetSchoolYear.id,
          },
        });
      }

      return {
        sourceSchoolYearId,
        targetSchoolYear: {
          id: targetSchoolYear.id,
          label: targetSchoolYear.label,
        },
        createdClassesCount,
        createdAssignmentsCount,
        createdEnrollmentsCount,
        setAsActive: parsed.setTargetAsActive,
      };
    });

    return {
      success: true,
      ...result,
    };
  }

  async listAcademicLevels(schoolId: string) {
    return this.prisma.academicLevel.findMany({
      where: { schoolId },
      orderBy: [{ code: "asc" }],
      include: {
        _count: {
          select: {
            classes: true,
            curriculums: true,
          },
        },
      },
    });
  }

  async createAcademicLevel(schoolId: string, payload: CreateAcademicLevelDto) {
    const parsedResult = createAcademicLevelSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.academicLevel.create({
      data: {
        schoolId,
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async updateAcademicLevel(
    schoolId: string,
    academicLevelId: string,
    payload: UpdateAcademicLevelDto,
  ) {
    const parsedResult = updateAcademicLevelSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.code === undefined && parsed.label === undefined) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureAcademicLevelInSchool(academicLevelId, schoolId);
    return this.prisma.academicLevel.update({
      where: { id: academicLevelId },
      data: {
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async deleteAcademicLevel(schoolId: string, academicLevelId: string) {
    await this.ensureAcademicLevelInSchool(academicLevelId, schoolId);

    await this.prisma.academicLevel.delete({
      where: { id: academicLevelId },
    });

    return { success: true };
  }

  async listTracks(schoolId: string) {
    return this.prisma.track.findMany({
      where: { schoolId },
      orderBy: [{ code: "asc" }],
      include: {
        _count: {
          select: {
            classes: true,
            curriculums: true,
          },
        },
      },
    });
  }

  async createTrack(schoolId: string, payload: CreateTrackDto) {
    const parsedResult = createTrackSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.track.create({
      data: {
        schoolId,
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async updateTrack(
    schoolId: string,
    trackId: string,
    payload: UpdateTrackDto,
  ) {
    const parsedResult = updateTrackSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.code === undefined && parsed.label === undefined) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureTrackInSchool(trackId, schoolId);
    return this.prisma.track.update({
      where: { id: trackId },
      data: {
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async deleteTrack(schoolId: string, trackId: string) {
    await this.ensureTrackInSchool(trackId, schoolId);

    await this.prisma.track.delete({
      where: { id: trackId },
    });

    return { success: true };
  }

  async listCurriculums(schoolId: string) {
    return this.prisma.curriculum.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
      include: {
        academicLevel: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        track: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        _count: {
          select: {
            classes: true,
            subjects: true,
          },
        },
      },
    });
  }

  async createCurriculum(schoolId: string, payload: CreateCurriculumDto) {
    const parsedResult = createCurriculumSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    await this.ensureAcademicLevelInSchool(parsed.academicLevelId, schoolId);
    if (parsed.trackId) {
      await this.ensureTrackInSchool(parsed.trackId, schoolId);
    }
    const curriculumName = await this.buildCurriculumName(
      schoolId,
      parsed.academicLevelId,
      parsed.trackId,
    );

    return this.prisma.curriculum.create({
      data: {
        schoolId,
        name: curriculumName,
        academicLevelId: parsed.academicLevelId,
        trackId: parsed.trackId,
      },
    });
  }

  async updateCurriculum(
    schoolId: string,
    curriculumId: string,
    payload: UpdateCurriculumDto,
  ) {
    const parsedResult = updateCurriculumSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.academicLevelId === undefined && parsed.trackId === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.curriculum.findFirst({
      where: {
        id: curriculumId,
        schoolId,
      },
      select: {
        id: true,
        academicLevelId: true,
        trackId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Curriculum not found");
    }

    const nextAcademicLevelId =
      parsed.academicLevelId ?? existing.academicLevelId;
    const nextTrackId =
      parsed.trackId === undefined
        ? (existing.trackId ?? undefined)
        : parsed.trackId;

    await this.ensureAcademicLevelInSchool(nextAcademicLevelId, schoolId);
    if (nextTrackId) {
      await this.ensureTrackInSchool(nextTrackId, schoolId);
    }
    const curriculumName = await this.buildCurriculumName(
      schoolId,
      nextAcademicLevelId,
      nextTrackId,
    );

    return this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        name: curriculumName,
        academicLevelId: nextAcademicLevelId,
        trackId: nextTrackId,
      },
    });
  }

  async deleteCurriculum(schoolId: string, curriculumId: string) {
    await this.ensureCurriculumInSchool(curriculumId, schoolId);

    await this.prisma.curriculum.delete({
      where: { id: curriculumId },
    });

    return { success: true };
  }

  async listCurriculumSubjects(schoolId: string, curriculumId: string) {
    await this.ensureCurriculumInSchool(curriculumId, schoolId);

    return this.prisma.curriculumSubject.findMany({
      where: {
        schoolId,
        curriculumId,
      },
      orderBy: [{ subject: { name: "asc" } }],
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async upsertCurriculumSubject(
    schoolId: string,
    curriculumId: string,
    payload: UpsertCurriculumSubjectDto,
  ) {
    const parsedResult = upsertCurriculumSubjectSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    await this.ensureCurriculumInSchool(curriculumId, schoolId);
    await this.ensureSubjectInSchool(parsed.subjectId, schoolId);

    return this.prisma.curriculumSubject.upsert({
      where: {
        curriculumId_subjectId: {
          curriculumId,
          subjectId: parsed.subjectId,
        },
      },
      update: {
        isMandatory: parsed.isMandatory,
        coefficient: parsed.coefficient,
        weeklyHours: parsed.weeklyHours,
      },
      create: {
        schoolId,
        curriculumId,
        subjectId: parsed.subjectId,
        isMandatory: parsed.isMandatory ?? true,
        coefficient: parsed.coefficient,
        weeklyHours: parsed.weeklyHours,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteCurriculumSubject(
    schoolId: string,
    curriculumId: string,
    subjectId: string,
  ) {
    await this.ensureCurriculumInSchool(curriculumId, schoolId);

    const existing = await this.prisma.curriculumSubject.findFirst({
      where: {
        schoolId,
        curriculumId,
        subjectId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Curriculum subject not found");
    }

    await this.prisma.curriculumSubject.delete({
      where: {
        id: existing.id,
      },
    });

    return { success: true };
  }

  async listSubjects(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
      include: {
        _count: {
          select: {
            assignments: true,
            grades: true,
            curriculumSubjects: true,
            classOverrides: true,
          },
        },
      },
    });
  }

  async createSubject(schoolId: string, payload: CreateSubjectDto) {
    const parsedResult = createSubjectSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.subject.create({
      data: {
        schoolId,
        name: parsed.name,
      },
    });
  }

  async updateSubject(
    schoolId: string,
    subjectId: string,
    payload: UpdateSubjectDto,
  ) {
    const parsedResult = updateSubjectSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.name === undefined) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureSubjectInSchool(subjectId, schoolId);
    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: parsed.name,
      },
    });
  }

  async deleteSubject(schoolId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: {
        id: true,
        _count: {
          select: {
            assignments: true,
            grades: true,
            curriculumSubjects: true,
            classOverrides: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException("Subject not found");
    }

    if (
      subject._count.assignments > 0 ||
      subject._count.grades > 0 ||
      subject._count.curriculumSubjects > 0 ||
      subject._count.classOverrides > 0
    ) {
      throw new BadRequestException(
        "Cannot delete a subject used by curriculums, assignments, class overrides or grades",
      );
    }

    await this.prisma.subject.delete({
      where: { id: subjectId },
    });

    return { success: true };
  }

  async listTeachers(schoolId: string) {
    const teachers = await this.prisma.schoolMembership.findMany({
      where: {
        schoolId,
        role: "TEACHER",
      },
      select: {
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return teachers
      .map((entry) => ({
        userId: entry.userId,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        email: entry.user.email,
      }))
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      );
  }

  async listTeacherAssignments(
    schoolId: string,
    query: ListTeacherAssignmentsQueryDto,
  ) {
    const parsedResult = listTeacherAssignmentsQuerySchema.safeParse(query);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (parsed.schoolYearId) {
      await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);
    }
    if (parsed.classId) {
      await this.ensureClassInSchool(parsed.classId, schoolId);
    }
    if (parsed.subjectId) {
      await this.ensureSubjectInSchool(parsed.subjectId, schoolId);
    }
    if (parsed.teacherUserId) {
      await this.ensureTeacherUserInSchool(parsed.teacherUserId, schoolId);
    }

    return this.prisma.teacherClassSubject.findMany({
      where: {
        schoolId,
        ...(parsed.schoolYearId ? { schoolYearId: parsed.schoolYearId } : {}),
        ...(parsed.teacherUserId
          ? { teacherUserId: parsed.teacherUserId }
          : {}),
        ...(parsed.classId ? { classId: parsed.classId } : {}),
        ...(parsed.subjectId ? { subjectId: parsed.subjectId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        teacherUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async createTeacherAssignment(
    schoolId: string,
    payload: CreateTeacherAssignmentDto,
  ) {
    const parsedResult = createTeacherAssignmentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);
    const classEntity = await this.ensureClassInSchoolAndGet(
      parsed.classId,
      schoolId,
    );
    await this.ensureTeacherUserInSchool(parsed.teacherUserId, schoolId);
    await this.ensureSubjectInSchool(parsed.subjectId, schoolId);
    this.ensureClassAndSchoolYearConsistency(
      classEntity.schoolYearId,
      parsed.schoolYearId,
    );
    await this.ensureSubjectAssignableToClass(
      schoolId,
      parsed.classId,
      parsed.subjectId,
    );

    return this.prisma.teacherClassSubject.upsert({
      where: {
        schoolYearId_teacherUserId_classId_subjectId: {
          schoolYearId: parsed.schoolYearId,
          teacherUserId: parsed.teacherUserId,
          classId: parsed.classId,
          subjectId: parsed.subjectId,
        },
      },
      update: {},
      create: {
        schoolId,
        schoolYearId: parsed.schoolYearId,
        teacherUserId: parsed.teacherUserId,
        classId: parsed.classId,
        subjectId: parsed.subjectId,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        teacherUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateTeacherAssignment(
    schoolId: string,
    assignmentId: string,
    payload: UpdateTeacherAssignmentDto,
  ) {
    const parsedResult = updateTeacherAssignmentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (
      parsed.schoolYearId === undefined &&
      parsed.teacherUserId === undefined &&
      parsed.classId === undefined &&
      parsed.subjectId === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.teacherClassSubject.findFirst({
      where: {
        id: assignmentId,
        schoolId,
      },
      select: {
        id: true,
        schoolYearId: true,
        teacherUserId: true,
        classId: true,
        subjectId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Teacher assignment not found");
    }

    const nextSchoolYearId = parsed.schoolYearId ?? existing.schoolYearId;
    const nextTeacherUserId = parsed.teacherUserId ?? existing.teacherUserId;
    const nextClassId = parsed.classId ?? existing.classId;
    const nextSubjectId = parsed.subjectId ?? existing.subjectId;

    await this.ensureSchoolYearInSchool(nextSchoolYearId, schoolId);
    const classEntity = await this.ensureClassInSchoolAndGet(
      nextClassId,
      schoolId,
    );
    await this.ensureTeacherUserInSchool(nextTeacherUserId, schoolId);
    await this.ensureSubjectInSchool(nextSubjectId, schoolId);
    this.ensureClassAndSchoolYearConsistency(
      classEntity.schoolYearId,
      nextSchoolYearId,
    );
    await this.ensureSubjectAssignableToClass(
      schoolId,
      nextClassId,
      nextSubjectId,
    );

    return this.prisma.teacherClassSubject.update({
      where: { id: assignmentId },
      data: {
        schoolYearId: nextSchoolYearId,
        teacherUserId: nextTeacherUserId,
        classId: nextClassId,
        subjectId: nextSubjectId,
      },
      include: {
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        teacherUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteTeacherAssignment(schoolId: string, assignmentId: string) {
    const existing = await this.prisma.teacherClassSubject.findFirst({
      where: {
        id: assignmentId,
        schoolId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Teacher assignment not found");
    }

    await this.prisma.teacherClassSubject.delete({
      where: { id: assignmentId },
    });

    return { success: true };
  }

  async createTeacher(schoolId: string, payload: CreateTeacherDto) {
    const teacherEmail = payload.email.toLowerCase();
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { slug: true },
    });
    const existingUser = await this.prisma.user.findUnique({
      where: { email: teacherEmail },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (existingUser) {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.schoolMembership.upsert({
          where: {
            userId_schoolId_role: {
              userId: existingUser.id,
              schoolId,
              role: "TEACHER",
            },
          },
          create: {
            userId: existingUser.id,
            schoolId,
            role: "TEACHER",
          },
          update: {},
        });

        const teacher = await tx.teacher.upsert({
          where: {
            schoolId_userId: {
              schoolId,
              userId: existingUser.id,
            },
          },
          create: {
            schoolId,
            userId: existingUser.id,
          },
          update: {},
        });

        return {
          user: existingUser,
          teacher,
          userExisted: true,
          onboardingEmailSent: false,
        };
      });

      return result;
    }

    const derivedName = this.deriveNameFromEmail(teacherEmail);
    const generatedTemporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(generatedTemporaryPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: derivedName.firstName,
          lastName: derivedName.lastName,
          email: teacherEmail,
          passwordHash,
          mustChangePassword: true,
          profileCompleted: false,
          memberships: {
            create: {
              schoolId,
              role: "TEACHER",
            },
          },
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          schoolId,
          userId: user.id,
        },
      });

      return { user, teacher };
    });

    await this.mailService.sendTemporaryPasswordEmail({
      to: teacherEmail,
      firstName: created.user.firstName,
      temporaryPassword: generatedTemporaryPassword,
      schoolSlug: school?.slug ?? null,
    });

    return {
      ...created,
      userExisted: false,
      onboardingEmailSent: true,
    };
  }

  async createStudent(schoolId: string, payload: CreateStudentDto) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: payload.classId, schoolId },
      select: { id: true, schoolYearId: true },
    });

    if (!classEntity) {
      throw new NotFoundException("Classroom not found");
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
                role: "STUDENT",
              },
            },
          },
        });

        const student = await tx.student.create({
          data: {
            schoolId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            userId: user.id,
          },
        });

        await tx.enrollment.create({
          data: {
            schoolId,
            schoolYearId: classEntity.schoolYearId,
            studentId: student.id,
            classId: payload.classId,
            status: "ACTIVE",
          },
        });

        return { user, student };
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId,
          firstName: payload.firstName,
          lastName: payload.lastName,
        },
      });

      await tx.enrollment.create({
        data: {
          schoolId,
          schoolYearId: classEntity.schoolYearId,
          studentId: student.id,
          classId: payload.classId,
          status: "ACTIVE",
        },
      });

      return student;
    });
  }

  async updateStudent(
    schoolId: string,
    studentId: string,
    payload: UpdateStudentDto,
  ) {
    const parsedResult = updateStudentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (parsed.firstName === undefined && parsed.lastName === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    return this.prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });
  }

  async deleteStudent(schoolId: string, studentId: string) {
    const existing = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Student not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: { id: studentId },
      });

      if (existing.userId) {
        await tx.schoolMembership.deleteMany({
          where: {
            userId: existing.userId,
            schoolId,
            role: "STUDENT",
          },
        });
      }
    });

    return { success: true };
  }

  async listStudentsWithEnrollments(
    schoolId: string,
    query: ListStudentEnrollmentsQueryDto,
  ) {
    const parsedResult = listStudentEnrollmentsQuerySchema.safeParse(query);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (parsed.schoolYearId) {
      await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);
    }

    if (parsed.classId) {
      await this.ensureClassInSchool(parsed.classId, schoolId);
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        ...(parsed.search
          ? {
              OR: [
                { firstName: { contains: parsed.search, mode: "insensitive" } },
                { lastName: { contains: parsed.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        parentLinks: {
          select: {
            id: true,
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          where: {
            schoolId,
            ...(parsed.schoolYearId
              ? { schoolYearId: parsed.schoolYearId }
              : {}),
            ...(parsed.classId ? { classId: parsed.classId } : {}),
            ...(parsed.status ? { status: parsed.status } : {}),
          },
          orderBy: [{ schoolYear: { label: "desc" } }, { createdAt: "desc" }],
          select: {
            id: true,
            schoolYearId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            schoolYear: {
              select: {
                id: true,
                label: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const hasEnrollmentFilter = Boolean(
      parsed.schoolYearId || parsed.classId || parsed.status,
    );

    return students
      .map((student) => ({
        ...student,
        currentEnrollment:
          student.enrollments.find(
            (enrollment) =>
              enrollment.schoolYearId === school?.activeSchoolYearId,
          ) ?? null,
        enrollments: student.enrollments.map((enrollment) => ({
          ...enrollment,
          isCurrent: enrollment.schoolYearId === school?.activeSchoolYearId,
        })),
      }))
      .filter(
        (student) => student.enrollments.length > 0 || !hasEnrollmentFilter,
      );
  }

  async listStudentEnrollments(schoolId: string, studentId: string) {
    await this.ensureStudentInSchool(studentId, schoolId);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId,
        studentId,
      },
      orderBy: [{ schoolYear: { label: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        schoolYearId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      isCurrent: enrollment.schoolYearId === school?.activeSchoolYearId,
    }));
  }

  async listStudentLifeEvents(
    schoolId: string,
    currentUser: AuthenticatedUser,
    studentId: string,
    query: ListStudentLifeEventsQueryDto,
  ) {
    const parsedResult = listStudentLifeEventsQuerySchema.safeParse(query);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    await this.ensureStudentInSchool(studentId, schoolId);

    const canWrite = await this.canWriteStudentLifeEvents(
      schoolId,
      currentUser,
      studentId,
    );
    const isParentViewer = await this.canReadStudentLifeEventsAsParent(
      schoolId,
      currentUser,
      studentId,
    );

    if (!canWrite && !isParentViewer) {
      throw new ForbiddenException("Insufficient role");
    }

    if (parsed.classId) {
      await this.ensureClassInSchool(parsed.classId, schoolId);
    }
    if (parsed.schoolYearId) {
      await this.ensureSchoolYearInSchool(parsed.schoolYearId, schoolId);
    }

    let scopedSchoolYearId: string | null | undefined;
    if (parsed.scope === "current") {
      scopedSchoolYearId = await this.getActiveSchoolYearId(schoolId);
      if (!scopedSchoolYearId) {
        return [];
      }
    }

    const rows = await this.prisma.studentLifeEvent.findMany({
      where: {
        schoolId,
        studentId,
        ...(parsed.type ? { type: parsed.type } : {}),
        ...(parsed.schoolYearId ? { schoolYearId: parsed.schoolYearId } : {}),
        ...(scopedSchoolYearId ? { schoolYearId: scopedSchoolYearId } : {}),
        ...(parsed.classId ? { classId: parsed.classId } : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: parsed.limit ?? 200,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rows.map((row) => this.mapStudentLifeEventRow(row));
  }

  async createStudentLifeEvent(
    schoolId: string,
    currentUser: AuthenticatedUser,
    studentId: string,
    payload: CreateStudentLifeEventDto,
  ) {
    const parsedResult = createStudentLifeEventSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const canWrite = await this.canWriteStudentLifeEvents(
      schoolId,
      currentUser,
      studentId,
    );
    if (!canWrite) {
      throw new ForbiddenException("Insufficient role");
    }

    await this.ensureStudentInSchool(studentId, schoolId);

    const classContext = parsed.classId
      ? await this.ensureClassInSchoolAndGet(parsed.classId, schoolId)
      : await this.getCurrentClassContextForStudent(schoolId, studentId);

    const event = await this.prisma.studentLifeEvent.create({
      data: {
        schoolId,
        studentId,
        classId: classContext?.id,
        schoolYearId: classContext?.schoolYearId,
        authorUserId: currentUser.id,
        type: parsed.type,
        occurredAt: parsed.occurredAt
          ? new Date(parsed.occurredAt)
          : new Date(),
        durationMinutes: parsed.durationMinutes,
        justified: parsed.justified,
        reason: parsed.reason,
        comment: parsed.comment,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.notifyParentsAboutStudentLifeEvent({
      schoolId,
      studentId,
      event,
      action: "CREATED",
    });

    return this.mapStudentLifeEventRow(event);
  }

  async updateStudentLifeEvent(
    schoolId: string,
    currentUser: AuthenticatedUser,
    studentId: string,
    eventId: string,
    payload: UpdateStudentLifeEventDto,
  ) {
    const parsedResult = updateStudentLifeEventSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (
      parsed.type === undefined &&
      parsed.classId === undefined &&
      parsed.occurredAt === undefined &&
      parsed.durationMinutes === undefined &&
      parsed.justified === undefined &&
      parsed.reason === undefined &&
      parsed.comment === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.studentLifeEvent.findFirst({
      where: {
        id: eventId,
        schoolId,
        studentId,
      },
      select: {
        id: true,
        studentId: true,
        authorUserId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Life event not found");
    }

    const canWrite = await this.canWriteStudentLifeEvents(
      schoolId,
      currentUser,
      studentId,
    );
    if (!canWrite) {
      throw new ForbiddenException("Insufficient role");
    }

    const isPowerRole =
      currentUser.platformRoles.includes("SUPER_ADMIN") ||
      currentUser.platformRoles.includes("ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(currentUser, schoolId, "SUPERVISOR");
    const isTeacher = this.hasSchoolRole(currentUser, schoolId, "TEACHER");
    if (!isPowerRole && isTeacher && existing.authorUserId !== currentUser.id) {
      throw new ForbiddenException(
        "Teachers can only edit events they have created",
      );
    }

    const classContext = parsed.classId
      ? await this.ensureClassInSchoolAndGet(parsed.classId, schoolId)
      : null;

    const updated = await this.prisma.studentLifeEvent.update({
      where: { id: eventId },
      data: {
        type: parsed.type,
        classId: classContext?.id,
        schoolYearId: classContext?.schoolYearId,
        occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : undefined,
        durationMinutes: parsed.durationMinutes,
        justified: parsed.justified,
        reason: parsed.reason,
        comment: parsed.comment,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.notifyParentsAboutStudentLifeEvent({
      schoolId,
      studentId,
      event: updated,
      action: "UPDATED",
    });

    return this.mapStudentLifeEventRow(updated);
  }

  async deleteStudentLifeEvent(
    schoolId: string,
    currentUser: AuthenticatedUser,
    studentId: string,
    eventId: string,
  ) {
    const existing = await this.prisma.studentLifeEvent.findFirst({
      where: {
        id: eventId,
        schoolId,
        studentId,
      },
      select: {
        id: true,
        authorUserId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Life event not found");
    }

    const canWrite = await this.canWriteStudentLifeEvents(
      schoolId,
      currentUser,
      studentId,
    );
    if (!canWrite) {
      throw new ForbiddenException("Insufficient role");
    }

    const isPowerRole =
      currentUser.platformRoles.includes("SUPER_ADMIN") ||
      currentUser.platformRoles.includes("ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(currentUser, schoolId, "SUPERVISOR");
    const isTeacher = this.hasSchoolRole(currentUser, schoolId, "TEACHER");
    if (!isPowerRole && isTeacher && existing.authorUserId !== currentUser.id) {
      throw new ForbiddenException(
        "Teachers can only delete events they have created",
      );
    }

    await this.prisma.studentLifeEvent.delete({
      where: { id: existing.id },
    });

    return { id: existing.id, deleted: true };
  }

  async createStudentEnrollment(
    schoolId: string,
    studentId: string,
    payload: CreateStudentEnrollmentDto,
  ) {
    const parsedResult = createStudentEnrollmentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    await this.ensureStudentInSchool(studentId, schoolId);

    const classEntity = await this.prisma.class.findFirst({
      where: { id: parsed.classId, schoolId },
      select: { id: true, schoolYearId: true },
    });

    if (!classEntity) {
      throw new NotFoundException("Classroom not found");
    }

    const status = parsed.status ?? "ACTIVE";

    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        schoolYearId_studentId: {
          schoolYearId: classEntity.schoolYearId,
          studentId,
        },
      },
      create: {
        schoolId,
        schoolYearId: classEntity.schoolYearId,
        studentId,
        classId: classEntity.id,
        status,
      },
      update: {
        classId: classEntity.id,
        status,
      },
      select: {
        id: true,
        schoolYearId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    return {
      ...enrollment,
      isCurrent: enrollment.schoolYearId === school?.activeSchoolYearId,
    };
  }

  async bulkUpdateEnrollmentStatus(
    schoolId: string,
    payload: BulkUpdateEnrollmentStatusDto,
  ) {
    const parsedResult = bulkUpdateEnrollmentStatusSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const existingRows = await this.prisma.enrollment.findMany({
      where: {
        schoolId,
        id: {
          in: parsed.enrollmentIds,
        },
      },
      select: { id: true },
    });

    if (existingRows.length !== parsed.enrollmentIds.length) {
      throw new NotFoundException("One or more enrollments were not found");
    }

    const result = await this.prisma.enrollment.updateMany({
      where: {
        schoolId,
        id: {
          in: parsed.enrollmentIds,
        },
      },
      data: {
        status: parsed.status,
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async updateStudentEnrollment(
    schoolId: string,
    studentId: string,
    enrollmentId: string,
    payload: UpdateStudentEnrollmentDto,
  ) {
    const parsedResult = updateStudentEnrollmentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    if (parsed.status === undefined) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureStudentInSchool(studentId, schoolId);

    const existing = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
        studentId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Enrollment not found");
    }

    const enrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: parsed.status,
      },
      select: {
        id: true,
        schoolYearId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        schoolYear: {
          select: {
            id: true,
            label: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    return {
      ...enrollment,
      isCurrent: enrollment.schoolYearId === school?.activeSchoolYearId,
    };
  }

  async createParentStudentLink(
    schoolId: string,
    payload: CreateParentStudentLinkDto,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: payload.studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const parentUserId = await this.resolveParentUserForStudentLink(
      schoolId,
      payload,
    );

    return this.prisma.parentStudent.upsert({
      where: {
        parentUserId_studentId: {
          parentUserId,
          studentId: payload.studentId,
        },
      },
      update: {},
      create: {
        schoolId,
        parentUserId,
        studentId: payload.studentId,
      },
    });
  }

  private async createParentUser(
    schoolId: string,
    payload: {
      email: string;
      firstName?: string;
      lastName?: string;
      password?: string;
    },
  ) {
    const parentEmail = payload.email.toLowerCase();
    const derivedName = this.deriveNameFromEmail(parentEmail);
    const firstName = payload.firstName ?? derivedName.firstName;
    const lastName = payload.lastName ?? derivedName.lastName;
    const temporaryPassword =
      payload.password ?? this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const parent = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email: parentEmail,
        passwordHash,
        mustChangePassword: payload.password ? false : true,
        profileCompleted: false,
        memberships: {
          create: {
            schoolId,
            role: "PARENT",
          },
        },
      },
    });

    if (!payload.password) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { slug: true },
      });
      await this.mailService.sendTemporaryPasswordEmail({
        to: parentEmail,
        firstName,
        temporaryPassword,
        schoolSlug: school?.slug ?? null,
      });
    }

    return parent.id;
  }

  private async resolveParentUserForStudentLink(
    schoolId: string,
    payload: CreateParentStudentLinkDto,
  ) {
    if (payload.parentUserId) {
      return this.ensureExistingParentMembership(
        schoolId,
        payload.parentUserId,
      );
    }

    if (!payload.email) {
      throw new BadRequestException("Parent email or parentUserId is required");
    }

    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return this.ensureExistingParentMembership(schoolId, existingUser.id);
    }

    return this.createParentUser(schoolId, {
      email: normalizedEmail,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password: payload.password,
    });
  }

  private async ensureExistingParentMembership(
    schoolId: string,
    parentUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: parentUserId },
      include: {
        memberships: {
          where: {
            schoolId,
            role: "PARENT",
          },
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Parent user not found");
    }

    if (user.memberships.length === 0) {
      await this.prisma.schoolMembership.create({
        data: {
          userId: parentUserId,
          schoolId,
          role: "PARENT",
        },
      });
    }

    return parentUserId;
  }

  private async getActiveSchoolYearIdOrThrow(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    if (!school?.activeSchoolYearId) {
      throw new BadRequestException(
        "No active school year configured for this school",
      );
    }

    return school.activeSchoolYearId;
  }

  private async getActiveSchoolYearId(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    return school?.activeSchoolYearId ?? null;
  }

  private async ensureSchoolYearInSchool(
    schoolYearId: string,
    schoolId: string,
  ) {
    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: schoolYearId, schoolId },
      select: { id: true },
    });

    if (!schoolYear) {
      throw new NotFoundException("School year not found");
    }
  }

  private async ensureClassInSchool(classId: string, schoolId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });

    if (!classEntity) {
      throw new NotFoundException("Classroom not found");
    }
  }

  private async ensureClassInSchoolAndGet(classId: string, schoolId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        schoolYearId: true,
      },
    });

    if (!classEntity) {
      throw new NotFoundException("Classroom not found");
    }

    return classEntity;
  }

  private async ensureStudentInSchool(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }
  }

  private async ensureSubjectInSchool(subjectId: string, schoolId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException("Subject not found");
    }
  }

  private async ensureTeacherUserInSchool(
    teacherUserId: string,
    schoolId: string,
  ) {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: {
        userId: teacherUserId,
        schoolId,
        role: "TEACHER",
      },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException("Teacher not found in this school");
    }
  }

  private ensureClassAndSchoolYearConsistency(
    classSchoolYearId: string,
    selectedSchoolYearId: string,
  ) {
    if (classSchoolYearId !== selectedSchoolYearId) {
      throw new BadRequestException(
        "Assignment school year must match the classroom school year",
      );
    }
  }

  private async ensureSubjectAssignableToClass(
    schoolId: string,
    classId: string,
    subjectId: string,
  ) {
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
      select: {
        id: true,
        curriculumId: true,
      },
    });

    if (!classEntity) {
      throw new NotFoundException("Classroom not found");
    }

    const override = await this.prisma.classSubjectOverride.findFirst({
      where: {
        schoolId,
        classId,
        subjectId,
      },
      select: {
        action: true,
      },
    });

    if (override?.action === "REMOVE") {
      throw new BadRequestException(
        "Subject is explicitly removed for this classroom",
      );
    }

    if (override?.action === "ADD") {
      return;
    }

    if (!classEntity.curriculumId) {
      return;
    }

    const curriculumSubject = await this.prisma.curriculumSubject.findFirst({
      where: {
        schoolId,
        curriculumId: classEntity.curriculumId,
        subjectId,
      },
      select: {
        id: true,
      },
    });

    if (!curriculumSubject) {
      throw new BadRequestException(
        "Subject is not allowed by the classroom curriculum",
      );
    }
  }

  private async ensureAcademicLevelInSchool(
    academicLevelId: string,
    schoolId: string,
  ) {
    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId },
      select: { id: true },
    });

    if (!academicLevel) {
      throw new NotFoundException("Academic level not found");
    }
  }

  private async ensureTrackInSchool(trackId: string, schoolId: string) {
    const track = await this.prisma.track.findFirst({
      where: { id: trackId, schoolId },
      select: { id: true },
    });

    if (!track) {
      throw new NotFoundException("Track not found");
    }
  }

  private async ensureCurriculumInSchool(
    curriculumId: string,
    schoolId: string,
  ) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId },
      select: { id: true },
    });

    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }
  }

  private async ensureOptionalAcademicReferencesInSchool(
    schoolId: string,
    academicLevelId?: string,
    trackId?: string,
    curriculumId?: string,
  ) {
    if (academicLevelId) {
      await this.ensureAcademicLevelInSchool(academicLevelId, schoolId);
    }

    if (trackId) {
      await this.ensureTrackInSchool(trackId, schoolId);
    }

    if (curriculumId) {
      await this.ensureCurriculumInSchool(curriculumId, schoolId);
    }
  }

  private async resolveClassAcademicReferences(
    schoolId: string,
    academicLevelId?: string,
    trackId?: string,
    curriculumId?: string,
    defaults?: {
      academicLevelId?: string;
      trackId?: string;
      curriculumId?: string;
    },
  ) {
    const curriculumExplicitlyProvided = curriculumId !== undefined;
    const nextCurriculumId = curriculumExplicitlyProvided
      ? curriculumId
      : defaults?.curriculumId;
    const nextAcademicLevelId =
      academicLevelId ??
      (curriculumExplicitlyProvided ? undefined : defaults?.academicLevelId);
    const nextTrackId =
      trackId ?? (curriculumExplicitlyProvided ? undefined : defaults?.trackId);

    if (!nextCurriculumId) {
      await this.ensureOptionalAcademicReferencesInSchool(
        schoolId,
        nextAcademicLevelId,
        nextTrackId,
      );

      return {
        curriculumId: undefined,
        academicLevelId: nextAcademicLevelId,
        trackId: nextTrackId,
      };
    }

    const curriculum = await this.prisma.curriculum.findFirst({
      where: {
        id: nextCurriculumId,
        schoolId,
      },
      select: {
        id: true,
        academicLevelId: true,
        trackId: true,
      },
    });

    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }

    const curriculumTrackId = curriculum.trackId ?? undefined;
    if (
      nextAcademicLevelId &&
      nextAcademicLevelId !== curriculum.academicLevelId
    ) {
      throw new BadRequestException(
        "Academic level must match curriculum academic level",
      );
    }
    if (nextTrackId !== undefined && nextTrackId !== curriculumTrackId) {
      throw new BadRequestException("Track must match curriculum track");
    }

    return {
      curriculumId: curriculum.id,
      academicLevelId: curriculum.academicLevelId,
      trackId: curriculumTrackId,
    };
  }

  private async buildCurriculumName(
    schoolId: string,
    academicLevelId: string,
    trackId?: string,
  ) {
    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: {
        id: academicLevelId,
        schoolId,
      },
      select: {
        code: true,
      },
    });

    if (!academicLevel) {
      throw new NotFoundException("Academic level not found");
    }

    if (!trackId) {
      return `${academicLevel.code} - TRONC_COMMUN`;
    }

    const track = await this.prisma.track.findFirst({
      where: {
        id: trackId,
        schoolId,
      },
      select: {
        code: true,
      },
    });

    if (!track) {
      throw new NotFoundException("Track not found");
    }

    return `${academicLevel.code} - ${track.code}`;
  }

  private hasSchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    role: SchoolRole,
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId && membership.role === role,
    );
  }

  private async canReadStudentLifeEventsAsParent(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    if (!this.hasSchoolRole(user, schoolId, "PARENT")) {
      return false;
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: {
        schoolId,
        studentId,
        parentUserId: user.id,
      },
      select: { id: true },
    });

    return Boolean(link);
  }

  private async canWriteStudentLifeEvents(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    if (
      user.platformRoles.includes("SUPER_ADMIN") ||
      user.platformRoles.includes("ADMIN")
    ) {
      return true;
    }

    if (
      this.hasSchoolRole(user, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(user, schoolId, "SUPERVISOR")
    ) {
      return true;
    }

    if (!this.hasSchoolRole(user, schoolId, "TEACHER")) {
      return false;
    }

    const currentEnrollment = await this.getCurrentEnrollmentContextForStudent(
      schoolId,
      studentId,
    );
    if (!currentEnrollment) {
      return false;
    }

    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        teacherUserId: user.id,
        classId: currentEnrollment.classId,
        schoolYearId: currentEnrollment.schoolYearId,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  private async getCurrentEnrollmentContextForStudent(
    schoolId: string,
    studentId: string,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    if (school?.activeSchoolYearId) {
      const activeEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId,
          schoolYearId: school.activeSchoolYearId,
        },
        select: {
          classId: true,
          schoolYearId: true,
        },
      });
      if (activeEnrollment) {
        return activeEnrollment;
      }
    }

    return this.prisma.enrollment.findFirst({
      where: {
        schoolId,
        studentId,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        classId: true,
        schoolYearId: true,
      },
    });
  }

  private async getCurrentClassContextForStudent(
    schoolId: string,
    studentId: string,
  ) {
    const enrollment = await this.getCurrentEnrollmentContextForStudent(
      schoolId,
      studentId,
    );

    if (!enrollment) {
      return null;
    }

    return this.ensureClassInSchoolAndGet(enrollment.classId, schoolId);
  }

  private async notifyParentsAboutStudentLifeEvent(params: {
    schoolId: string;
    studentId: string;
    event: {
      type: StudentLifeEventType;
      reason: string;
      occurredAt: Date;
      class: { name: string } | null;
      authorUser: { firstName: string; lastName: string } | null;
    };
    action: "CREATED" | "UPDATED";
  }) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: params.studentId,
        schoolId: params.schoolId,
      },
      select: {
        firstName: true,
        lastName: true,
        parentLinks: {
          select: {
            parent: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });
    if (!student) {
      return;
    }

    const school = await this.prisma.school.findUnique({
      where: { id: params.schoolId },
      select: {
        name: true,
        slug: true,
      },
    });
    if (!school) {
      return;
    }

    const eventTypeLabel = this.mapStudentLifeEventTypeLabel(params.event.type);
    const authorFullName = params.event.authorUser
      ? `${params.event.authorUser.firstName} ${params.event.authorUser.lastName}`.trim()
      : null;

    for (const link of student.parentLinks) {
      if (!link.parent.email) {
        continue;
      }

      try {
        await this.mailService.sendStudentLifeEventNotification({
          to: link.parent.email,
          parentFirstName: link.parent.firstName,
          schoolName: school.name,
          schoolSlug: school.slug,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          eventTypeLabel,
          eventReason: params.event.reason,
          eventDate: params.event.occurredAt.toISOString(),
          eventAction: params.action,
          className: params.event.class?.name ?? null,
          authorFullName,
        });
      } catch {
        // The life event is already persisted; mail failures must not block business flow.
      }
    }
  }

  private mapStudentLifeEventTypeLabel(type: StudentLifeEventType) {
    switch (type) {
      case "ABSENCE":
        return "Absence";
      case "RETARD":
        return "Retard";
      case "SANCTION":
        return "Sanction";
      case "PUNITION":
        return "Punition";
      default:
        return type;
    }
  }

  private mapStudentLifeEventRow(row: {
    id: string;
    schoolId: string;
    studentId: string;
    classId: string | null;
    schoolYearId: string | null;
    authorUserId: string;
    type: StudentLifeEventType;
    occurredAt: Date;
    durationMinutes: number | null;
    justified: boolean | null;
    reason: string;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
    class: { id: string; name: string } | null;
    schoolYear: { id: string; label: string } | null;
    authorUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }) {
    return {
      id: row.id,
      schoolId: row.schoolId,
      studentId: row.studentId,
      classId: row.classId,
      schoolYearId: row.schoolYearId,
      authorUserId: row.authorUserId,
      type: row.type,
      occurredAt: row.occurredAt,
      durationMinutes: row.durationMinutes,
      justified: row.justified,
      reason: row.reason,
      comment: row.comment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      class: row.class,
      schoolYear: row.schoolYear,
      authorUser: row.authorUser,
    };
  }

  private getDefaultSchoolYearLabel(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const startYear = month >= 8 ? year : year - 1;
    const endYear = startYear + 1;

    return `${startYear}-${endYear}`;
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
    memberships: Array<{
      role: SchoolRole;
      school?: { slug: string; name: string } | null;
    }>;
  }) {
    const role = this.getPrimaryRole(
      user.platformRoles.map((assignment) => assignment.role),
      user.memberships.map((membership) => membership.role),
    );

    const schoolMembership =
      user.memberships.find((membership) => membership.school) ?? null;

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
            name: schoolMembership.school.name,
          }
        : null,
    };
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
        where: { slug: candidate },
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");

    const bounded = cleaned.slice(0, 30).replace(/-+$/g, "");

    if (bounded.length >= 3) {
      return bounded;
    }

    return "school";
  }

  private deriveNameFromEmail(email: string) {
    const localPart = email.split("@")[0] ?? "school.admin";
    const safe = localPart.replace(/[^a-zA-Z0-9._-]/g, ".");
    const parts = safe.split(/[._-]+/).filter(Boolean);
    const firstRaw = parts[0] ?? "School";
    const lastRaw = parts[1] ?? "Admin";

    return {
      firstName: this.capitalizeName(firstRaw),
      lastName: this.capitalizeName(lastRaw),
    };
  }

  private capitalizeName(value: string) {
    if (!value) {
      return "User";
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  private generateTemporaryPassword() {
    const dictionary = [
      "atlas",
      "ubuntu",
      "vision",
      "campus",
      "avenir",
      "soleil",
      "riviera",
      "horizon",
      "safran",
      "kora",
    ];

    const word =
      dictionary[Math.floor(Math.random() * dictionary.length)] ?? "campus";
    const suffix = String(Math.floor(100 + Math.random() * 900));
    const candidate = `${this.capitalizeName(word)}${suffix}`;

    if (PASSWORD_COMPLEXITY_REGEX.test(candidate)) {
      return candidate;
    }

    return `School${suffix}Live`;
  }
}
