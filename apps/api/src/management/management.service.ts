import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  PlatformRole,
  SchoolLanguageSystem,
  SchoolRole,
  StudentLifeEventType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import {
  AUTO_GENERATED_EMAIL_DOMAIN,
  publicEmailOrNull,
} from "../common/email.util.js";
import { MailService } from "../mail/mail.service.js";
import { PushService } from "../notifications/push.service.js";
import { RoomStatusChangeNotificationsService } from "../notifications/room-status-change-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateAdminDto } from "./dto/create-admin.dto.js";
import type { CreateAcademicLevelDto } from "./dto/create-academic-level.dto.js";
import type { BulkUpdateEnrollmentStatusDto } from "./dto/bulk-update-enrollment-status.dto.js";
import type { CreateClassroomDto } from "./dto/create-classroom.dto.js";
import type { CreateRoomDto } from "./dto/create-room.dto.js";
import type { UpdateRoomDto } from "./dto/update-room.dto.js";
import type { ListAvailableRoomsQueryDto } from "./dto/list-available-rooms-query.dto.js";
import type { CreateClassSubjectOverrideDto } from "./dto/create-class-subject-override.dto.js";
import type { CreateCurriculumDto } from "./dto/create-curriculum.dto.js";
import type { AddSchoolAdminDto } from "./dto/add-school-admin.dto.js";
import type { CreateNationalCurriculumDto } from "./dto/create-national-curriculum.dto.js";
import type { UpdateNationalCurriculumDto } from "./dto/update-national-curriculum.dto.js";
import type { CreateNationalSubjectDto } from "./dto/create-national-subject.dto.js";
import type { UpdateNationalSubjectDto } from "./dto/update-national-subject.dto.js";
import type { CreateNationalCycleDto } from "./dto/create-national-cycle.dto.js";
import type { UpdateNationalCycleDto } from "./dto/update-national-cycle.dto.js";
import type { CreateEvaluationTypeDto } from "./dto/create-evaluation-type.dto.js";
import type { CreateSubjectDto } from "./dto/create-subject.dto.js";
import type { CreateSubjectBranchDto } from "./dto/create-subject-branch.dto.js";
import type { CreateParentStudentLinkDto } from "./dto/create-parent-student-link.dto.js";
import type { CreateSchoolDto } from "./dto/create-school.dto.js";
import type { CreateSchoolYearDto } from "./dto/create-school-year.dto.js";
import type { CreateSchoolStaffAssignmentDto } from "./dto/create-school-staff-assignment.dto.js";
import type { CreateSchoolStaffFunctionDto } from "./dto/create-school-staff-function.dto.js";
import type { CreateStudentEnrollmentDto } from "./dto/create-student-enrollment.dto.js";
import type { CreateStudentLifeEventDto } from "./dto/create-student-life-event.dto.js";
import type { CreateStudentDto } from "./dto/create-student.dto.js";
import type { CreateTeacherAssignmentDto } from "./dto/create-teacher-assignment.dto.js";
import type { CreateTeacherDto } from "./dto/create-teacher.dto.js";
import type { CreateTrackDto } from "./dto/create-track.dto.js";
import type { CreateUserDto } from "./dto/create-user.dto.js";
import type { ListTeacherAssignmentsQueryDto } from "./dto/list-teacher-assignments-query.dto.js";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto.js";
import type { ListSchoolsQueryDto } from "./dto/list-schools-query.dto.js";
import type { ListStudentEnrollmentsQueryDto } from "./dto/list-student-enrollments-query.dto.js";
import type { ListStudentLifeEventsQueryDto } from "./dto/list-student-life-events-query.dto.js";
import type { RolloverSchoolYearDto } from "./dto/rollover-school-year.dto.js";
import type { SetActiveSchoolYearDto } from "./dto/set-active-school-year.dto.js";
import type { UpdateAcademicLevelDto } from "./dto/update-academic-level.dto.js";
import type { UpdateClassroomDto } from "./dto/update-classroom.dto.js";
import type { UpdateClassSubjectOverrideDto } from "./dto/update-class-subject-override.dto.js";
import type { UpdateCurriculumDto } from "./dto/update-curriculum.dto.js";
import type { UpdateSchoolDto } from "./dto/update-school.dto.js";
import type { UpdateSchoolStaffFunctionDto } from "./dto/update-school-staff-function.dto.js";
import type { UpdateStudentDto } from "./dto/update-student.dto.js";
import type { UpdateStudentEnrollmentDto } from "./dto/update-student-enrollment.dto.js";
import type { UpdateStudentLifeEventDto } from "./dto/update-student-life-event.dto.js";
import type { UpdateSubjectDto } from "./dto/update-subject.dto.js";
import type { UpdateSubjectBranchDto } from "./dto/update-subject-branch.dto.js";
import type { UpdateTeacherAssignmentDto } from "./dto/update-teacher-assignment.dto.js";
import type { UpdateTrackDto } from "./dto/update-track.dto.js";
import type { UpdateUserDto } from "./dto/update-user.dto.js";
import type { UpdateEvaluationTypeDto } from "./dto/update-evaluation-type.dto.js";
import type { UpsertCurriculumSubjectDto } from "./dto/upsert-curriculum-subject.dto.js";

const PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT"] as const;
const SCHOOL_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
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
  "SCHOOL_STAFF",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const SCHOOL_LOGO_URL_REGEX = /^https?:\/\/.+$/;
const USER_AVATAR_URL_REGEX = /^https?:\/\/.+$/;
const DEFAULT_EVALUATION_TYPES = [
  { code: "DEVOIR", label: "Devoir" },
  { code: "INTERROGATION", label: "Interrogation" },
  { code: "COMPOSITION", label: "Composition" },
  { code: "TP", label: "TP / Projet" },
  { code: "ORAL", label: "Oral" },
] as const;

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
  isTester: z.boolean().optional(),
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
      "SCHOOL_STAFF",
      "TEACHER",
      "PARENT",
      "STUDENT",
      "NONE",
    ])
    .optional(),
  schoolRoles: z.array(z.enum(SCHOOL_ROLES)).optional(),
  role: z.enum(CREATABLE_ROLES).optional(),
  isTester: z.boolean().optional(),
});

const createSchoolSchema = z
  .object({
    name: z.string().trim().min(1),
    country: z.string().trim().min(1).max(120).optional(),
    region: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    cycle: z.enum(["PRIMARY", "SECONDARY"]).optional(),
    languageSystem: z
      .enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"])
      .optional(),
    schoolAdminEmail: z.string().trim().email().optional(),
    schoolAdminPhone: z.string().trim().min(6).max(30).optional(),
    schoolAdminPin: z
      .string()
      .trim()
      .regex(/^\d{6}$/)
      .optional(),
    logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).optional(),
  })
  .refine(
    (value) => Boolean(value.schoolAdminEmail || value.schoolAdminPhone),
    { message: "Email ou telephone administrateur requis" },
  )
  .refine(
    (value) =>
      !(value.schoolAdminPhone && !value.schoolAdminEmail) ||
      Boolean(value.schoolAdminPin),
    { message: "PIN initial requis pour un administrateur cree par telephone" },
  );

const updateSchoolSchema = z.object({
  name: z.string().trim().min(1).optional(),
  country: z
    .union([z.string().trim().min(1).max(120), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }
      return value;
    }),
  region: z
    .union([z.string().trim().min(1).max(120), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }
      return value;
    }),
  city: z
    .union([z.string().trim().min(1).max(120), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }
      return value;
    }),
  cycle: z.enum(["PRIMARY", "SECONDARY"]).nullable().optional(),
  languageSystem: z
    .enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"])
    .nullable()
    .optional(),
  logoUrl: z.string().trim().regex(SCHOOL_LOGO_URL_REGEX).nullable().optional(),
});

const createClassroomSchema = z.object({
  name: z.string().trim().min(1),
  schoolYearId: z.string().trim().min(1).optional(),
  academicLevelId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
  referentTeacherUserId: z.string().trim().min(1).optional(),
  curriculumId: z.string().trim().min(1),
});

const updateClassroomSchema = z.object({
  name: z.string().trim().min(1).optional(),
  schoolYearId: z.string().trim().min(1).optional(),
  academicLevelId: z.string().trim().min(1).optional(),
  trackId: z.string().trim().min(1).optional(),
  referentTeacherUserId: z.string().trim().min(1).optional(),
  curriculumId: z.string().trim().min(1).optional(),
});

const roomStatusEnum = z.enum(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"]);

const createRoomSchema = z.object({
  name: z.string().trim().min(1),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  capacity: z.number().int().min(1).optional(),
  maxConcurrentSlots: z.number().int().min(1).optional(),
  status: roomStatusEnum.optional(),
});

const updateRoomSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  capacity: z.number().int().min(1).optional(),
  maxConcurrentSlots: z.number().int().min(1).optional(),
  status: roomStatusEnum.optional(),
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

const createSchoolStaffFunctionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z
    .union([z.string().trim().max(500), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }
      return value;
    }),
});

const updateSchoolStaffFunctionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z
    .union([z.string().trim().max(500), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null) {
        return null;
      }
      return value;
    }),
});

const createSchoolStaffAssignmentSchema = z.object({
  userId: z.string().trim().min(1),
  functionId: z.string().trim().min(1),
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
  cycleId: z.string().trim().min(1).optional(),
  languageSystem: z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]).optional(),
});

const updateAcademicLevelSchema = z.object({
  code: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
  cycleId: z.string().trim().min(1).optional(),
  languageSystem: z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]).optional(),
});

const createNationalCycleSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const updateNationalCycleSchema = z.object({
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

const createNationalSubjectSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const updateNationalSubjectSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
});

const createNationalCurriculumSchema = z.object({
  academicLevelId: z.string().trim().min(1),
});

const updateNationalCurriculumSchema = z.object({
  academicLevelId: z.string().trim().min(1).optional(),
});

const addSchoolAdminSchema = z
  .object({
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(6).max(30).optional(),
    pin: z
      .string()
      .trim()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Email ou telephone administrateur requis",
  })
  .refine((value) => !(value.phone && !value.email) || Boolean(value.pin), {
    message: "PIN initial requis pour un administrateur cree par telephone",
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

const NOOP_ROOM_STATUS_CHANGE_NOTIFICATIONS = {
  enqueue: async () => undefined,
} as unknown as RoomStatusChangeNotificationsService;

const NOOP_PUSH_SERVICE = {
  sendStudentLifeEventNotification: async () => undefined,
} as unknown as PushService;

const LIFE_EVENT_TYPE_LABELS: Record<string, string> = {
  ABSENCE: "Absence",
  RETARD: "Retard",
  SANCTION: "Sanction",
  PUNITION: "Punition",
};

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly roomStatusChangeNotificationsService: RoomStatusChangeNotificationsService = NOOP_ROOM_STATUS_CHANGE_NOTIFICATIONS,
    private readonly pushService: PushService = NOOP_PUSH_SERVICE,
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
    const isSchoolAccount = normalizedSchoolRoles.length > 0;

    const user = await this.prisma.user.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email.toLowerCase(),
        phone: parsed.phone ?? null,
        avatarUrl: parsed.avatarUrl,
        isTester: parsed.isTester ?? false,
        passwordHash,
        mustChangePassword: true,
        profileCompleted: false,
        activationStatus: isSchoolAccount ? "PENDING" : "ACTIVE",
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
        isTester: true,
        activationStatus: true,
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

    let activationCode: string | null = null;
    if (schoolId && isSchoolAccount) {
      activationCode = await this.issueActivationCode(
        user.id,
        schoolId,
        currentUser.id,
      );
    }

    await this.mailService.sendTemporaryPasswordEmail({
      to: user.email!,
      firstName: user.firstName,
      temporaryPassword: parsed.temporaryPassword,
      schoolSlug: schoolSlug ?? user.memberships[0]?.school?.slug ?? null,
    });

    return {
      ...this.mapUserRow(user),
      activationCode,
    };
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
      parsed.role === undefined &&
      parsed.isTester === undefined
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
          isTester: parsed.isTester,
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

  async listSchools(query: ListSchoolsQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const andFilters: Array<Record<string, unknown>> = [];

    if (query.search?.trim()) {
      const search = query.search.trim();
      andFilters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { region: { contains: search, mode: "insensitive" } },
          { country: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (query.cycle) {
      andFilters.push({ cycle: query.cycle });
    }

    if (query.languageSystem) {
      andFilters.push({ languageSystem: query.languageSystem });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {};

    const [schools, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          country: true,
          region: true,
          city: true,
          cycle: true,
          languageSystem: true,
          logoUrl: true,
          createdAt: true,
          updatedAt: true,
          activeSchoolYear: { select: { id: true, label: true } },
          _count: {
            select: {
              memberships: true,
              classes: true,
              students: true,
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return {
      items: schools.map((school) => ({
        id: school.id,
        slug: school.slug,
        name: school.name,
        country: school.country,
        region: school.region,
        city: school.city,
        cycle: school.cycle,
        languageSystem: school.languageSystem,
        logoUrl: school.logoUrl,
        createdAt: school.createdAt,
        updatedAt: school.updatedAt,
        academicYear: school.activeSchoolYear
          ? {
              id: school.activeSchoolYear.id,
              label: school.activeSchoolYear.label,
            }
          : null,
        usersCount: school._count.memberships,
        classesCount: school._count.classes,
        studentsCount: school._count.students,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listSchoolOptions() {
    return this.prisma.school.findMany({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    });
  }

  async getSchoolsOverview() {
    type CycleKey = "PRIMARY" | "SECONDARY" | "UNSET";

    const [schools, studentGroups, classGroups] = await Promise.all([
      this.prisma.school.findMany({ select: { id: true, cycle: true } }),
      this.prisma.student.groupBy({
        by: ["schoolId"],
        _count: { _all: true },
      }),
      this.prisma.class.groupBy({
        by: ["schoolId"],
        _count: { _all: true },
      }),
    ]);

    const cycleBySchoolId = new Map<string, CycleKey>(
      schools.map((school) => [school.id, school.cycle ?? "UNSET"]),
    );
    const studentsBySchoolId = new Map(
      studentGroups.map((group) => [group.schoolId, group._count._all]),
    );
    const classesBySchoolId = new Map(
      classGroups.map((group) => [group.schoolId, group._count._all]),
    );

    const byCycle: Record<
      CycleKey,
      { schools: number; students: number; classes: number }
    > = {
      PRIMARY: { schools: 0, students: 0, classes: 0 },
      SECONDARY: { schools: 0, students: 0, classes: 0 },
      UNSET: { schools: 0, students: 0, classes: 0 },
    };

    let totalStudents = 0;
    let totalClasses = 0;

    for (const school of schools) {
      const cycleKey = cycleBySchoolId.get(school.id) ?? "UNSET";
      const students = studentsBySchoolId.get(school.id) ?? 0;
      const classes = classesBySchoolId.get(school.id) ?? 0;
      byCycle[cycleKey].schools += 1;
      byCycle[cycleKey].students += students;
      byCycle[cycleKey].classes += classes;
      totalStudents += students;
      totalClasses += classes;
    }

    return {
      totals: {
        schools: schools.length,
        students: totalStudents,
        classes: totalClasses,
      },
      byCycle,
    };
  }

  async getSchoolDetails(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        slug: true,
        name: true,
        country: true,
        region: true,
        city: true,
        cycle: true,
        languageSystem: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        activeSchoolYearId: true,
        activeSchoolYear: {
          select: { id: true, label: true, startsAt: true, endsAt: true },
        },
        memberships: {
          where: { role: "SCHOOL_ADMIN" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                mustChangePassword: true,
                profileCompleted: true,
                activationStatus: true,
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
            studentGrades: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    const staffRoles: SchoolRole[] = [
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SUPERVISOR",
      "SCHOOL_ACCOUNTANT",
      "SCHOOL_STAFF",
    ];

    const [staffCount, teachersCount, parentsCount] =
      await this.prisma.$transaction([
        this.prisma.schoolMembership.count({
          where: { schoolId, role: { in: staffRoles } },
        }),
        this.prisma.schoolMembership.count({
          where: { schoolId, role: "TEACHER" },
        }),
        this.prisma.schoolMembership.count({
          where: { schoolId, role: "PARENT" },
        }),
      ]);

    const enrolledStudentsCount = school.activeSchoolYearId
      ? await this.prisma.enrollment.count({
          where: { schoolId, schoolYearId: school.activeSchoolYearId },
        })
      : 0;

    return {
      id: school.id,
      slug: school.slug,
      name: school.name,
      country: school.country,
      region: school.region,
      city: school.city,
      cycle: school.cycle,
      languageSystem: school.languageSystem,
      logoUrl: school.logoUrl,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      academicYear: school.activeSchoolYear
        ? {
            id: school.activeSchoolYear.id,
            label: school.activeSchoolYear.label,
            startsAt: school.activeSchoolYear.startsAt,
            endsAt: school.activeSchoolYear.endsAt,
          }
        : null,
      stats: {
        usersCount: school._count.memberships,
        classesCount: school._count.classes,
        studentsCount: school._count.students,
        teachersCount: school._count.teachers,
        gradesCount: school._count.studentGrades,
      },
      roleBreakdown: {
        staff: staffCount,
        teachers: teachersCount,
        parents: parentsCount,
        students: enrolledStudentsCount,
      },
      schoolAdmins: school.memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        email: membership.user.email,
        phone: membership.user.phone,
        mustChangePassword: membership.user.mustChangePassword,
        profileCompleted: membership.user.profileCompleted,
        activationRequired: membership.user.activationStatus === "PENDING",
        canResendInvite:
          membership.user.mustChangePassword &&
          !membership.user.profileCompleted,
      })),
    };
  }

  async resendSchoolAdminInvite(schoolId: string, adminUserId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    const membership = await this.prisma.schoolMembership.findFirst({
      where: {
        schoolId,
        userId: adminUserId,
        role: "SCHOOL_ADMIN",
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException("School admin not found for this school");
    }

    const schoolAdmin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        mustChangePassword: true,
        profileCompleted: true,
      },
    });

    if (!schoolAdmin) {
      throw new NotFoundException("User not found");
    }

    if (!schoolAdmin.mustChangePassword || schoolAdmin.profileCompleted) {
      throw new BadRequestException(
        "Invite resend is allowed only before first login/password change",
      );
    }

    const generatedTemporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(generatedTemporaryPassword, 10);

    await this.prisma.user.update({
      where: { id: schoolAdmin.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        profileCompleted: false,
        activationStatus: "PENDING",
      },
    });

    const activationCode = await this.issueActivationCode(
      schoolAdmin.id,
      schoolId,
    );

    await this.mailService.sendTemporaryPasswordEmail({
      to: schoolAdmin.email!,
      firstName: schoolAdmin.firstName,
      temporaryPassword: generatedTemporaryPassword,
      schoolSlug: school.slug,
    });

    return {
      success: true,
      schoolId: school.id,
      adminUserId: schoolAdmin.id,
      email: schoolAdmin.email,
      activationCode,
    };
  }

  async addSchoolAdmin(schoolId: string, payload: AddSchoolAdminDto) {
    const parsedResult = addSchoolAdminSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, slug: true },
    });
    if (!school) {
      throw new NotFoundException("School not found");
    }

    const adminEmail = parsedResult.data.email?.trim().toLowerCase() ?? null;
    const adminPhone = parsedResult.data.phone
      ? this.normalizePhone(parsedResult.data.phone)
      : null;

    const existingUser = adminEmail
      ? await this.prisma.user.findUnique({
          where: { email: adminEmail },
          select: { id: true, firstName: true, mustChangePassword: true },
        })
      : await this.prisma.user.findFirst({
          where: { phone: adminPhone! },
          select: { id: true, firstName: true, mustChangePassword: true },
        });

    if (existingUser) {
      const existingMembership = await this.prisma.schoolMembership.findFirst({
        where: { schoolId, userId: existingUser.id },
        select: { id: true },
      });
      if (existingMembership) {
        throw new BadRequestException(
          "This user is already a member of this school",
        );
      }

      await this.prisma.schoolMembership.create({
        data: {
          userId: existingUser.id,
          schoolId,
          role: "SCHOOL_ADMIN",
        },
      });

      return {
        schoolAdmin: {
          id: existingUser.id,
          email: adminEmail,
          firstName: existingUser.firstName,
        },
        userExisted: true,
        setupCompleted: !existingUser.mustChangePassword,
      };
    }

    if (adminEmail) {
      const derivedName = this.deriveNameFromEmail(adminEmail);
      const generatedTemporaryPassword = this.generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(generatedTemporaryPassword, 10);

      const createdAdmin = await this.prisma.user.create({
        data: {
          firstName: derivedName.firstName,
          lastName: derivedName.lastName,
          email: adminEmail,
          passwordHash,
          mustChangePassword: true,
          profileCompleted: false,
          memberships: {
            create: {
              schoolId,
              role: "SCHOOL_ADMIN",
            },
          },
        },
      });

      await this.mailService.sendTemporaryPasswordEmail({
        to: adminEmail,
        firstName: derivedName.firstName,
        temporaryPassword: generatedTemporaryPassword,
        schoolSlug: school.slug,
      });

      return {
        schoolAdmin: {
          id: createdAdmin.id,
          email: adminEmail,
          firstName: createdAdmin.firstName,
        },
        userExisted: false,
        setupCompleted: false,
      };
    }

    const initialPin = parsedResult.data.pin!.trim();
    const pinHash = await bcrypt.hash(initialPin, 10);
    const technicalEmail = this.buildTechnicalEmailFromPhone(
      adminPhone!,
      "school-admin",
    );

    const createdAdmin = await this.prisma.user.create({
      data: {
        firstName: "Administrateur",
        lastName: adminPhone!.slice(-4),
        email: technicalEmail,
        phone: adminPhone!,
        passwordHash: pinHash,
        mustChangePassword: false,
        profileCompleted: false,
        activationStatus: "PENDING",
        memberships: {
          create: {
            schoolId,
            role: "SCHOOL_ADMIN",
          },
        },
      },
    });

    const activationCode = await this.issueActivationCode(
      createdAdmin.id,
      schoolId,
      undefined,
    );

    return {
      schoolAdmin: {
        id: createdAdmin.id,
        email: adminEmail,
        firstName: createdAdmin.firstName,
      },
      userExisted: false,
      setupCompleted: false,
      activationRequired: true,
      activationCode,
    };
  }

  async removeSchoolAdmin(schoolId: string, adminUserId: string) {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: { schoolId, userId: adminUserId, role: "SCHOOL_ADMIN" },
      select: { id: true },
    });
    if (!membership) {
      throw new NotFoundException("School admin membership not found");
    }

    const activeAdminCount = await this.prisma.schoolMembership.count({
      where: { schoolId, role: "SCHOOL_ADMIN" },
    });
    if (activeAdminCount <= 1) {
      throw new BadRequestException(
        "Impossible de retirer le dernier administrateur de l'ecole",
      );
    }

    await this.prisma.schoolMembership.delete({
      where: { id: membership.id },
    });

    return { success: true };
  }

  async updateSchool(schoolId: string, payload: UpdateSchoolDto) {
    const parsedResult = updateSchoolSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (
      parsed.name === undefined &&
      parsed.country === undefined &&
      parsed.region === undefined &&
      parsed.city === undefined &&
      parsed.cycle === undefined &&
      parsed.languageSystem === undefined &&
      parsed.logoUrl === undefined
    ) {
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
        country: parsed.country,
        region: parsed.region,
        city: parsed.city,
        cycle: parsed.cycle,
        languageSystem: parsed.languageSystem,
        logoUrl: parsed.logoUrl,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        country: true,
        region: true,
        city: true,
        cycle: true,
        languageSystem: true,
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
      this.prisma.studentGrade.count(),
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
            studentGradesGiven: true,
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
      isTester: user.isTester,
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
        gradesGivenCount: user._count.studentGradesGiven,
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

    const adminEmail = parsed.schoolAdminEmail?.trim().toLowerCase() ?? null;
    const adminPhone = parsed.schoolAdminPhone
      ? this.normalizePhone(parsed.schoolAdminPhone)
      : null;

    const schoolSelect = {
      id: true,
      slug: true,
      name: true,
      country: true,
      region: true,
      city: true,
      cycle: true,
      languageSystem: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    const buildSchoolCreateInput = () => ({
      slug: generatedSlug,
      name: parsed.name,
      country: parsed.country,
      region: parsed.region,
      city: parsed.city,
      cycle: parsed.cycle,
      languageSystem: parsed.languageSystem,
      logoUrl: parsed.logoUrl,
    });

    const existingAdminUser = adminEmail
      ? await this.prisma.user.findUnique({
          where: { email: adminEmail },
          select: { id: true, firstName: true, mustChangePassword: true },
        })
      : await this.prisma.user.findFirst({
          where: { phone: adminPhone! },
          select: { id: true, firstName: true, mustChangePassword: true },
        });

    if (existingAdminUser) {
      const result = await this.prisma.$transaction(async (tx) => {
        const schoolYearLabel = this.getDefaultSchoolYearLabel();
        const schoolYear = await tx.schoolYear.create({
          data: {
            label: schoolYearLabel,
            school: { create: buildSchoolCreateInput() },
          },
          include: { school: { select: schoolSelect } },
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

    if (adminEmail) {
      const derivedName = this.deriveNameFromEmail(adminEmail);
      const generatedTemporaryPassword = this.generateTemporaryPassword();
      const adminHash = await bcrypt.hash(generatedTemporaryPassword, 10);

      const created = await this.prisma.$transaction(async (tx) => {
        const schoolYearLabel = this.getDefaultSchoolYearLabel();
        const schoolYear = await tx.schoolYear.create({
          data: {
            label: schoolYearLabel,
            school: { create: buildSchoolCreateInput() },
          },
          include: { school: { select: schoolSelect } },
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

    const initialPin = parsed.schoolAdminPin!.trim();
    const pinHash = await bcrypt.hash(initialPin, 10);
    const technicalEmail = this.buildTechnicalEmailFromPhone(
      adminPhone!,
      "school-admin",
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const schoolYearLabel = this.getDefaultSchoolYearLabel();
      const schoolYear = await tx.schoolYear.create({
        data: {
          label: schoolYearLabel,
          school: { create: buildSchoolCreateInput() },
        },
        include: { school: { select: schoolSelect } },
      });

      const school = schoolYear.school;

      await tx.school.update({
        where: { id: school.id },
        data: { activeSchoolYearId: schoolYear.id },
      });

      const schoolAdmin = await tx.user.create({
        data: {
          firstName: "Administrateur",
          lastName: adminPhone!.slice(-4),
          email: technicalEmail,
          phone: adminPhone!,
          passwordHash: pinHash,
          mustChangePassword: false,
          profileCompleted: false,
          activationStatus: "PENDING",
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

    const activationCode = await this.issueActivationCode(
      created.schoolAdmin.id,
      created.school.id,
      undefined,
    );

    return {
      school: created.school,
      schoolAdmin: created.schoolAdmin,
      userExisted: false,
      setupCompleted: false,
      activationRequired: true,
      activationCode,
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
        referentTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    if (parsed.referentTeacherUserId) {
      await this.ensureTeacherUserInSchool(
        parsed.referentTeacherUserId,
        schoolId,
      );
    }
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
        referentTeacherUserId: parsed.referentTeacherUserId,
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
        referentTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
      parsed.referentTeacherUserId === undefined &&
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
    if (parsed.referentTeacherUserId) {
      await this.ensureTeacherUserInSchool(
        parsed.referentTeacherUserId,
        schoolId,
      );
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
        referentTeacherUserId: parsed.referentTeacherUserId,
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
        referentTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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

  async listRooms(schoolId: string) {
    return this.prisma.room.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
    });
  }

  async createRoom(schoolId: string, payload: CreateRoomDto) {
    const parsedResult = createRoomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;

    const existing = await this.prisma.room.findUnique({
      where: { schoolId_name: { schoolId, name: parsed.name } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("A room with this name already exists");
    }

    return this.prisma.room.create({
      data: {
        schoolId,
        name: parsed.name,
        description: parsed.description,
        capacity: parsed.capacity,
        maxConcurrentSlots: parsed.maxConcurrentSlots ?? 1,
        status: parsed.status ?? "AVAILABLE",
      },
    });
  }

  async updateRoom(
    schoolId: string,
    roomId: string,
    payload: UpdateRoomDto,
    currentUser?: AuthenticatedUser,
  ) {
    const parsedResult = updateRoomSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }
    const parsed = parsedResult.data;
    if (
      parsed.name === undefined &&
      parsed.description === undefined &&
      parsed.capacity === undefined &&
      parsed.maxConcurrentSlots === undefined &&
      parsed.status === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.room.findFirst({
      where: { id: roomId, schoolId },
      select: { id: true, name: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException("Room not found");
    }

    if (parsed.name) {
      const duplicate = await this.prisma.room.findUnique({
        where: { schoolId_name: { schoolId, name: parsed.name } },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== roomId) {
        throw new BadRequestException("A room with this name already exists");
      }
    }

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        name: parsed.name,
        description: parsed.description,
        capacity: parsed.capacity,
        maxConcurrentSlots: parsed.maxConcurrentSlots,
        status: parsed.status,
      },
    });

    if (
      currentUser &&
      parsed.status !== undefined &&
      parsed.status !== existing.status
    ) {
      await this.roomStatusChangeNotificationsService.enqueue({
        schoolId,
        roomId,
        roomName: updated.name,
        previousStatus: existing.status,
        newStatus: updated.status,
        actorUserId: currentUser.id,
        actorFullName:
          `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      });
    }

    return updated;
  }

  async deleteRoom(schoolId: string, roomId: string) {
    const existing = await this.prisma.room.findFirst({
      where: { id: roomId, schoolId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Room not found");
    }

    await this.prisma.room.delete({
      where: { id: roomId },
    });

    return { success: true };
  }

  async listAvailableRooms(
    schoolId: string,
    query: ListAvailableRoomsQueryDto,
  ) {
    const weekday = query.weekday;
    const startMinute = query.startMinute;
    const endMinute = query.endMinute;
    const occurrenceDate = query.occurrenceDate
      ? new Date(query.occurrenceDate)
      : null;

    const rooms = await this.prisma.room.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
    });

    const overlapRecurringWhere = {
      schoolId,
      weekday,
      startMinute: { lt: endMinute },
      endMinute: { gt: startMinute },
      roomId: { not: null },
      ...(query.excludeSlotId ? { id: { not: query.excludeSlotId } } : {}),
    };

    const overlapOneOffWhere = occurrenceDate
      ? {
          schoolId,
          occurrenceDate,
          status: "PLANNED" as const,
          startMinute: { lt: endMinute },
          endMinute: { gt: startMinute },
          roomId: { not: null },
          ...(query.excludeOneOffSlotId
            ? { id: { not: query.excludeOneOffSlotId } }
            : {}),
        }
      : null;

    const overlapExceptionWhere = occurrenceDate
      ? {
          schoolId,
          occurrenceDate,
          type: "OVERRIDE" as const,
          startMinute: { lt: endMinute, not: null },
          endMinute: { gt: startMinute, not: null },
          roomId: { not: null },
          ...(query.excludeExceptionId
            ? { id: { not: query.excludeExceptionId } }
            : {}),
        }
      : null;

    const [recurringBookings, oneOffBookings, exceptionBookings] =
      await Promise.all([
        this.prisma.classTimetableSlot.findMany({
          where: overlapRecurringWhere,
          select: { roomId: true },
        }),
        overlapOneOffWhere
          ? this.prisma.classTimetableOneOffSlot.findMany({
              where: overlapOneOffWhere,
              select: { roomId: true },
            })
          : Promise.resolve([]),
        overlapExceptionWhere
          ? this.prisma.classTimetableSlotException.findMany({
              where: overlapExceptionWhere,
              select: { roomId: true },
            })
          : Promise.resolve([]),
      ]);

    const occupancyByRoomId = new Map<string, number>();
    for (const booking of [
      ...recurringBookings,
      ...oneOffBookings,
      ...exceptionBookings,
    ]) {
      if (!booking.roomId) continue;
      occupancyByRoomId.set(
        booking.roomId,
        (occupancyByRoomId.get(booking.roomId) ?? 0) + 1,
      );
    }

    return rooms.map((room) => {
      const occupied = occupancyByRoomId.get(room.id) ?? 0;
      const isAvailable =
        room.status === "AVAILABLE" && occupied < room.maxConcurrentSlots;
      return {
        ...room,
        occupiedSlots: occupied,
        isAvailable,
      };
    });
  }

  async getRoomCalendar(
    schoolId: string,
    roomId: string,
    fromDateIso: string,
    toDateIso: string,
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, schoolId },
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException("Room not found");
    }

    const fromDate = new Date(`${fromDateIso}T00:00:00.000Z`);
    const toDate = new Date(`${toDateIso}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    const [recurringSlots, oneOffSlots, exceptions, cancelExceptions] =
      await Promise.all([
        this.prisma.classTimetableSlot.findMany({
          where: { schoolId, roomId },
          select: {
            id: true,
            weekday: true,
            startMinute: true,
            endMinute: true,
            activeFromDate: true,
            activeToDate: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacherUser: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.classTimetableOneOffSlot.findMany({
          where: {
            schoolId,
            roomId,
            status: "PLANNED",
            occurrenceDate: { gte: fromDate, lte: toDate },
          },
          select: {
            id: true,
            occurrenceDate: true,
            startMinute: true,
            endMinute: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacherUser: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.classTimetableSlotException.findMany({
          where: {
            schoolId,
            roomId,
            type: "OVERRIDE",
            occurrenceDate: { gte: fromDate, lte: toDate },
          },
          select: {
            id: true,
            slotId: true,
            occurrenceDate: true,
            startMinute: true,
            endMinute: true,
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacherUser: { select: { firstName: true, lastName: true } },
            slot: {
              select: {
                startMinute: true,
                endMinute: true,
                subject: { select: { id: true, name: true } },
                teacherUser: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
        this.prisma.classTimetableSlotException.findMany({
          where: {
            schoolId,
            type: { in: ["CANCEL", "OVERRIDE"] },
            occurrenceDate: { gte: fromDate, lte: toDate },
          },
          select: { slotId: true, occurrenceDate: true },
        }),
      ]);

    const suppressedRecurring = new Set(
      cancelExceptions.map(
        (entry) =>
          `${entry.slotId}-${entry.occurrenceDate.toISOString().slice(0, 10)}`,
      ),
    );

    const occurrences: Array<{
      id: string;
      occurrenceDate: string;
      startMinute: number;
      endMinute: number;
      className: string;
      subjectName: string;
      teacherName: string;
    }> = [];

    for (
      let cursor = new Date(fromDate);
      cursor <= toDate;
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const weekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
      const dateKey = cursor.toISOString().slice(0, 10);

      for (const slot of recurringSlots) {
        if (slot.weekday !== weekday) continue;
        if (slot.activeFromDate && cursor < slot.activeFromDate) continue;
        if (slot.activeToDate && cursor > slot.activeToDate) continue;
        if (suppressedRecurring.has(`${slot.id}-${dateKey}`)) continue;

        occurrences.push({
          id: `rec-${slot.id}-${dateKey}`,
          occurrenceDate: dateKey,
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
          className: slot.class.name,
          subjectName: slot.subject.name,
          teacherName: `${slot.teacherUser.firstName} ${slot.teacherUser.lastName}`,
        });
      }
    }

    for (const slot of oneOffSlots) {
      occurrences.push({
        id: `oneoff-${slot.id}`,
        occurrenceDate: slot.occurrenceDate.toISOString().slice(0, 10),
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        className: slot.class.name,
        subjectName: slot.subject.name,
        teacherName: `${slot.teacherUser.firstName} ${slot.teacherUser.lastName}`,
      });
    }

    for (const exception of exceptions) {
      occurrences.push({
        id: `override-${exception.id}`,
        occurrenceDate: exception.occurrenceDate.toISOString().slice(0, 10),
        startMinute: exception.startMinute ?? exception.slot.startMinute,
        endMinute: exception.endMinute ?? exception.slot.endMinute,
        className: exception.class.name,
        subjectName: exception.subject?.name ?? exception.slot.subject.name,
        teacherName: exception.teacherUser
          ? `${exception.teacherUser.firstName} ${exception.teacherUser.lastName}`
          : `${exception.slot.teacherUser.firstName} ${exception.slot.teacherUser.lastName}`,
      });
    }

    return occurrences.sort((a, b) => {
      if (a.occurrenceDate !== b.occurrenceDate) {
        return a.occurrenceDate.localeCompare(b.occurrenceDate);
      }
      return a.startMinute - b.startMinute;
    });
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
    await this.ensureSubjectAccessible(parsed.subjectId, schoolId);

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
      await this.ensureSubjectAccessible(parsed.subjectId, schoolId);
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

  async getDashboardKpis(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        activeSchoolYearId: true,
        activeSchoolYear: { select: { id: true, label: true } },
        _count: { select: { rooms: true } },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    const schoolYearId = school.activeSchoolYearId;

    if (!schoolYearId) {
      return {
        academicYear: null,
        classesCount: 0,
        studentsCount: 0,
        teachersCount: 0,
        subjectsCount: 0,
        parentsCount: 0,
        roomsCount: school._count.rooms,
      };
    }

    const [
      classesCount,
      studentsCount,
      teachingAssignments,
      parentLinks,
      roomsCount,
    ] = await Promise.all([
      this.prisma.class.count({ where: { schoolId, schoolYearId } }),
      this.prisma.enrollment
        .findMany({
          where: { schoolId, schoolYearId, status: "ACTIVE" },
          distinct: ["studentId"],
          select: { studentId: true },
        })
        .then((rows) => rows.length),
      this.prisma.teacherClassSubject.findMany({
        where: { schoolId, schoolYearId },
        distinct: ["teacherUserId", "subjectId"],
        select: { teacherUserId: true, subjectId: true },
      }),
      this.prisma.parentStudent.findMany({
        where: {
          schoolId,
          student: {
            enrollments: { some: { schoolYearId, status: "ACTIVE" } },
          },
        },
        distinct: ["parentUserId"],
        select: { parentUserId: true },
      }),
      this.prisma.room.count({ where: { schoolId } }),
    ]);

    const teachersCount = new Set(
      teachingAssignments.map((a) => a.teacherUserId),
    ).size;
    const subjectsCount = new Set(teachingAssignments.map((a) => a.subjectId))
      .size;

    return {
      academicYear: school.activeSchoolYear,
      classesCount,
      studentsCount,
      teachersCount,
      subjectsCount,
      parentsCount: parentLinks.length,
      roomsCount,
    };
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
                studentGrades: true,
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

  private async getNationalCatalogClassificationFilter(
    schoolId: string,
  ): Promise<Prisma.AcademicLevelWhereInput["AND"]> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { cycle: true, languageSystem: true },
    });

    const languageSystems: SchoolLanguageSystem[] | undefined =
      school?.languageSystem === "BILINGUAL"
        ? ["FRANCOPHONE", "ANGLOPHONE"]
        : school?.languageSystem
          ? [school.languageSystem]
          : undefined;

    const conditions: Prisma.AcademicLevelWhereInput[] = [];
    if (school?.cycle) {
      conditions.push({
        OR: [{ cycleId: null }, { cycle: { is: { code: school.cycle } } }],
      });
    }
    if (languageSystems) {
      conditions.push({
        OR: [
          { languageSystem: null },
          { languageSystem: { in: languageSystems } },
        ],
      });
    }
    return conditions;
  }

  private async getNationalCatalogFilterForSchool(
    schoolId: string,
  ): Promise<Prisma.AcademicLevelWhereInput> {
    const classification =
      await this.getNationalCatalogClassificationFilter(schoolId);
    return {
      schoolId: null,
      AND: classification,
    };
  }

  async listAcademicLevels(schoolId: string) {
    const nationalFilter =
      await this.getNationalCatalogFilterForSchool(schoolId);
    const levels = await this.prisma.academicLevel.findMany({
      where: { OR: [{ schoolId }, nationalFilter] },
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

    return levels.map((level) => ({
      ...level,
      isNational: level.schoolId === null,
    }));
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

    await this.ensureAcademicLevelOwnedBySchool(academicLevelId, schoolId);
    return this.prisma.academicLevel.update({
      where: { id: academicLevelId },
      data: {
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async deleteAcademicLevel(schoolId: string, academicLevelId: string) {
    await this.ensureAcademicLevelOwnedBySchool(academicLevelId, schoolId);

    await this.prisma.academicLevel.delete({
      where: { id: academicLevelId },
    });

    return { success: true };
  }

  // --- Catalogue national (plateforme) : NationalCycle ---

  async listNationalCycles() {
    const cycles = await this.prisma.nationalCycle.findMany({
      orderBy: [{ code: "asc" }],
      include: {
        _count: {
          select: {
            academicLevels: true,
          },
        },
      },
    });

    return cycles;
  }

  async createNationalCycle(payload: CreateNationalCycleDto) {
    const parsedResult = createNationalCycleSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.nationalCycle.create({
      data: {
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async updateNationalCycle(cycleId: string, payload: UpdateNationalCycleDto) {
    const parsedResult = updateNationalCycleSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.code === undefined && parsed.label === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.nationalCycle.findUnique({
      where: { id: cycleId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("National cycle not found");
    }

    return this.prisma.nationalCycle.update({
      where: { id: cycleId },
      data: {
        code: parsed.code,
        label: parsed.label,
      },
    });
  }

  async deleteNationalCycle(cycleId: string) {
    const existing = await this.prisma.nationalCycle.findUnique({
      where: { id: cycleId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("National cycle not found");
    }

    await this.prisma.nationalCycle.delete({
      where: { id: cycleId },
    });

    return { success: true };
  }

  // --- Catalogue national (plateforme) : AcademicLevel ---

  async listNationalAcademicLevels() {
    const levels = await this.prisma.academicLevel.findMany({
      where: { schoolId: null },
      orderBy: [{ code: "asc" }],
      include: {
        cycle: true,
        _count: {
          select: {
            classes: true,
            curriculums: true,
          },
        },
      },
    });

    return levels.map((level) => ({ ...level, isNational: true as const }));
  }

  async createNationalAcademicLevel(payload: CreateAcademicLevelDto) {
    const parsedResult = createAcademicLevelSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.academicLevel.create({
      data: {
        schoolId: null,
        code: parsed.code,
        label: parsed.label,
        cycleId: parsed.cycleId,
        languageSystem: parsed.languageSystem,
      },
      include: { cycle: true },
    });
  }

  async updateNationalAcademicLevel(
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
    if (
      parsed.code === undefined &&
      parsed.label === undefined &&
      parsed.cycleId === undefined &&
      parsed.languageSystem === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Academic level not found");
    }

    return this.prisma.academicLevel.update({
      where: { id: academicLevelId },
      data: {
        code: parsed.code,
        label: parsed.label,
        cycleId: parsed.cycleId,
        languageSystem: parsed.languageSystem,
      },
      include: { cycle: true },
    });
  }

  async deleteNationalAcademicLevel(academicLevelId: string) {
    const existing = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Academic level not found");
    }

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
    const classification =
      await this.getNationalCatalogClassificationFilter(schoolId);
    const curriculums = await this.prisma.curriculum.findMany({
      where: {
        OR: [
          { schoolId },
          {
            schoolId: null,
            academicLevel: { is: { AND: classification } },
          },
        ],
      },
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

    return curriculums.map((curriculum) => ({
      ...curriculum,
      isNational: curriculum.schoolId === null,
    }));
  }

  async createCurriculum(schoolId: string, payload: CreateCurriculumDto) {
    const parsedResult = createCurriculumSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    await this.ensureAcademicLevelAccessible(parsed.academicLevelId, schoolId);
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

    await this.ensureAcademicLevelAccessible(nextAcademicLevelId, schoolId);
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
    await this.ensureCurriculumOwnedBySchool(curriculumId, schoolId);

    await this.prisma.curriculum.delete({
      where: { id: curriculumId },
    });

    return { success: true };
  }

  async listCurriculumSubjects(schoolId: string, curriculumId: string) {
    await this.ensureCurriculumAccessible(curriculumId, schoolId);

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
    await this.ensureCurriculumOwnedBySchool(curriculumId, schoolId);
    await this.ensureSubjectAccessible(parsed.subjectId, schoolId);

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
    await this.ensureCurriculumOwnedBySchool(curriculumId, schoolId);

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

  // --- Catalogue national (plateforme) : Curriculum ---

  async listNationalCurriculums() {
    const curriculums = await this.prisma.curriculum.findMany({
      where: { schoolId: null },
      orderBy: [{ name: "asc" }],
      include: {
        academicLevel: {
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

    return curriculums.map((curriculum) => ({
      ...curriculum,
      isNational: true as const,
    }));
  }

  private async ensureAcademicLevelIsNational(academicLevelId: string) {
    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId: null },
      select: { id: true, code: true },
    });

    if (!academicLevel) {
      throw new BadRequestException(
        "Academic level must belong to the national catalog",
      );
    }

    return academicLevel;
  }

  private async ensureSubjectIsNational(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId: null },
      select: { id: true },
    });

    if (!subject) {
      throw new BadRequestException(
        "Subject must belong to the national catalog",
      );
    }
  }

  async createNationalCurriculum(payload: CreateNationalCurriculumDto) {
    const parsedResult = createNationalCurriculumSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    const academicLevel = await this.ensureAcademicLevelIsNational(
      parsed.academicLevelId,
    );

    return this.prisma.curriculum.create({
      data: {
        schoolId: null,
        name: `${academicLevel.code} - TRONC_COMMUN`,
        academicLevelId: parsed.academicLevelId,
      },
    });
  }

  async updateNationalCurriculum(
    curriculumId: string,
    payload: UpdateNationalCurriculumDto,
  ) {
    const parsedResult = updateNationalCurriculumSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.academicLevelId === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Curriculum not found");
    }

    const academicLevel = await this.ensureAcademicLevelIsNational(
      parsed.academicLevelId,
    );

    return this.prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        academicLevelId: parsed.academicLevelId,
        name: `${academicLevel.code} - TRONC_COMMUN`,
      },
    });
  }

  async deleteNationalCurriculum(curriculumId: string) {
    const existing = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Curriculum not found");
    }

    await this.prisma.curriculum.delete({
      where: { id: curriculumId },
    });

    return { success: true };
  }

  async listNationalCurriculumSubjects(curriculumId: string) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId: null },
      select: { id: true },
    });
    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }

    return this.prisma.curriculumSubject.findMany({
      where: { schoolId: null, curriculumId },
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

  async upsertNationalCurriculumSubject(
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
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId: null },
      select: { id: true },
    });
    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }
    await this.ensureSubjectIsNational(parsed.subjectId);

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
        schoolId: null,
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

  async deleteNationalCurriculumSubject(
    curriculumId: string,
    subjectId: string,
  ) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, schoolId: null },
      select: { id: true },
    });
    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }

    const existing = await this.prisma.curriculumSubject.findFirst({
      where: { schoolId: null, curriculumId, subjectId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Curriculum subject not found");
    }

    await this.prisma.curriculumSubject.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  async listSubjects(schoolId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { OR: [{ schoolId }, { schoolId: null }] },
      orderBy: [{ name: "asc" }],
      include: {
        branches: {
          orderBy: [{ name: "asc" }],
        },
        curriculumSubjects: {
          include: {
            curriculum: {
              select: {
                id: true,
                name: true,
                academicLevel: {
                  select: { id: true, code: true, label: true },
                },
                track: { select: { id: true, code: true, label: true } },
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
            studentGrades: true,
            curriculumSubjects: true,
            classOverrides: true,
          },
        },
      },
    });

    return subjects.map((subject) => ({
      ...subject,
      isNational: subject.schoolId === null,
    }));
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

    await this.ensureSubjectAccessible(subjectId, schoolId);
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
            studentGrades: true,
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
      subject._count.studentGrades > 0 ||
      subject._count.curriculumSubjects > 0 ||
      subject._count.classOverrides > 0
    ) {
      throw new BadRequestException(
        "Cannot delete a subject used by curriculums, assignments, class overrides or student grades",
      );
    }

    await this.prisma.subject.delete({
      where: { id: subjectId },
    });

    return { success: true };
  }

  // --- Catalogue national (plateforme) : Subject ---

  async listNationalSubjects() {
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId: null },
      orderBy: [{ name: "asc" }],
      include: {
        branches: {
          orderBy: [{ name: "asc" }],
        },
        _count: {
          select: {
            assignments: true,
            studentGrades: true,
            curriculumSubjects: true,
            classOverrides: true,
          },
        },
      },
    });

    return subjects.map((subject) => ({
      ...subject,
      isNational: true as const,
    }));
  }

  async createNationalSubject(payload: CreateNationalSubjectDto) {
    const parsedResult = createNationalSubjectSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.subject.create({
      data: {
        schoolId: null,
        code: parsed.code,
        name: parsed.name,
      },
    });
  }

  async updateNationalSubject(
    subjectId: string,
    payload: UpdateNationalSubjectDto,
  ) {
    const parsedResult = updateNationalSubjectSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.code === undefined && parsed.name === undefined) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Subject not found");
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        code: parsed.code,
        name: parsed.name,
      },
    });
  }

  async deleteNationalSubject(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId: null },
      select: {
        id: true,
        _count: {
          select: {
            assignments: true,
            studentGrades: true,
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
      subject._count.studentGrades > 0 ||
      subject._count.curriculumSubjects > 0 ||
      subject._count.classOverrides > 0
    ) {
      throw new BadRequestException(
        "Cannot delete a subject used by curriculums, assignments, class overrides or student grades",
      );
    }

    await this.prisma.subject.delete({
      where: { id: subjectId },
    });

    return { success: true };
  }

  async createSubjectBranch(
    schoolId: string,
    subjectId: string,
    payload: CreateSubjectBranchDto,
  ) {
    await this.ensureSubjectAccessible(subjectId, schoolId);
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException("Branch name is required");
    }

    return this.prisma.subjectBranch.create({
      data: {
        schoolId,
        subjectId,
        name,
        code: payload.code?.trim() || null,
      },
    });
  }

  async updateSubjectBranch(
    schoolId: string,
    branchId: string,
    payload: UpdateSubjectBranchDto,
  ) {
    const branch = await this.prisma.subjectBranch.findFirst({
      where: { id: branchId, schoolId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException("Subject branch not found");
    }

    return this.prisma.subjectBranch.update({
      where: { id: branchId },
      data: {
        name: payload.name?.trim(),
        code:
          payload.code === undefined ? undefined : payload.code.trim() || null,
      },
    });
  }

  async deleteSubjectBranch(schoolId: string, branchId: string) {
    const branch = await this.prisma.subjectBranch.findFirst({
      where: { id: branchId, schoolId },
      select: {
        id: true,
        _count: {
          select: {
            evaluations: true,
          },
        },
      },
    });
    if (!branch) {
      throw new NotFoundException("Subject branch not found");
    }
    if (branch._count.evaluations > 0) {
      throw new BadRequestException(
        "Cannot delete a subject branch already used by evaluations",
      );
    }
    await this.prisma.subjectBranch.delete({ where: { id: branchId } });
    return { success: true };
  }

  async listEvaluationTypes(schoolId: string) {
    await this.ensureDefaultEvaluationTypes(schoolId);
    return this.prisma.evaluationType.findMany({
      where: { schoolId },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    });
  }

  async createEvaluationType(
    schoolId: string,
    payload: CreateEvaluationTypeDto,
  ) {
    const code = payload.code?.trim().toUpperCase();
    const label = payload.label?.trim();
    if (!code || !label) {
      throw new BadRequestException("Code and label are required");
    }

    return this.prisma.evaluationType.create({
      data: {
        schoolId,
        code,
        label,
      },
    });
  }

  async updateEvaluationType(
    schoolId: string,
    evaluationTypeId: string,
    payload: UpdateEvaluationTypeDto,
  ) {
    const evaluationType = await this.prisma.evaluationType.findFirst({
      where: { id: evaluationTypeId, schoolId },
      select: { id: true, isDefault: true },
    });
    if (!evaluationType) {
      throw new NotFoundException("Evaluation type not found");
    }

    return this.prisma.evaluationType.update({
      where: { id: evaluationTypeId },
      data: {
        code: payload.code?.trim().toUpperCase(),
        label: payload.label?.trim(),
      },
    });
  }

  async deleteEvaluationType(schoolId: string, evaluationTypeId: string) {
    const evaluationType = await this.prisma.evaluationType.findFirst({
      where: { id: evaluationTypeId, schoolId },
      select: {
        id: true,
        isDefault: true,
        _count: {
          select: {
            evaluations: true,
          },
        },
      },
    });
    if (!evaluationType) {
      throw new NotFoundException("Evaluation type not found");
    }
    if (evaluationType.isDefault) {
      throw new BadRequestException(
        "Default evaluation types cannot be deleted",
      );
    }
    if (evaluationType._count.evaluations > 0) {
      throw new BadRequestException(
        "Cannot delete an evaluation type already used by evaluations",
      );
    }
    await this.prisma.evaluationType.delete({
      where: { id: evaluationTypeId },
    });
    return { success: true };
  }

  private async ensureDefaultEvaluationTypes(schoolId: string) {
    await Promise.all(
      DEFAULT_EVALUATION_TYPES.map((type) =>
        this.prisma.evaluationType.upsert({
          where: { schoolId_code: { schoolId, code: type.code } },
          update: { label: type.label, isDefault: true },
          create: {
            schoolId,
            code: type.code,
            label: type.label,
            isDefault: true,
          },
        }),
      ),
    );
  }

  async listSchoolStaffFunctions(schoolId: string) {
    return this.prisma.schoolStaffFunction.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });
  }

  async createSchoolStaffFunction(
    schoolId: string,
    payload: CreateSchoolStaffFunctionDto,
  ) {
    const parsedResult = createSchoolStaffFunctionSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    return this.prisma.schoolStaffFunction.create({
      data: {
        schoolId,
        name: parsed.name,
        description: parsed.description ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSchoolStaffFunction(
    schoolId: string,
    functionId: string,
    payload: UpdateSchoolStaffFunctionDto,
  ) {
    const parsedResult = updateSchoolStaffFunctionSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    if (parsed.name === undefined && parsed.description === undefined) {
      throw new BadRequestException("No fields to update");
    }

    await this.ensureSchoolStaffFunctionInSchool(functionId, schoolId);
    return this.prisma.schoolStaffFunction.update({
      where: { id: functionId },
      data: {
        name: parsed.name,
        description: parsed.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteSchoolStaffFunction(schoolId: string, functionId: string) {
    const existing = await this.prisma.schoolStaffFunction.findFirst({
      where: {
        id: functionId,
        schoolId,
      },
      select: {
        id: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException("Staff function not found");
    }

    if (existing._count.assignments > 0) {
      throw new BadRequestException(
        "Impossible de supprimer une fonction avec des affectations actives",
      );
    }

    await this.prisma.schoolStaffFunction.delete({
      where: { id: functionId },
    });

    return { success: true };
  }

  async listSchoolStaffAssignments(schoolId: string) {
    return this.prisma.schoolStaffAssignment.findMany({
      where: { schoolId },
      orderBy: [{ function: { name: "asc" } }, { user: { lastName: "asc" } }],
      select: {
        id: true,
        createdAt: true,
        function: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async listSchoolStaffCandidates(schoolId: string) {
    const memberships = await this.prisma.schoolMembership.findMany({
      where: {
        schoolId,
        role: {
          in: [
            "SCHOOL_ADMIN",
            "SCHOOL_MANAGER",
            "SUPERVISOR",
            "SCHOOL_ACCOUNTANT",
            "SCHOOL_STAFF",
          ],
        },
      },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      distinct: ["userId"],
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return memberships.map((entry) => ({
      userId: entry.userId,
      role: entry.role,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      email: entry.user.email,
    }));
  }

  async createSchoolStaffAssignment(
    schoolId: string,
    payload: CreateSchoolStaffAssignmentDto,
  ) {
    const parsedResult = createSchoolStaffAssignmentSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new BadRequestException(
        parsedResult.error.issues.map((issue) => issue.message).join(", "),
      );
    }

    const parsed = parsedResult.data;
    await this.ensureSchoolStaffFunctionInSchool(parsed.functionId, schoolId);
    await this.ensureStaffUserInSchool(parsed.userId, schoolId);

    return this.prisma.schoolStaffAssignment.upsert({
      where: {
        schoolId_functionId_userId: {
          schoolId,
          functionId: parsed.functionId,
          userId: parsed.userId,
        },
      },
      update: {},
      create: {
        schoolId,
        functionId: parsed.functionId,
        userId: parsed.userId,
      },
      select: {
        id: true,
        createdAt: true,
        function: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteSchoolStaffAssignment(schoolId: string, assignmentId: string) {
    const existing = await this.prisma.schoolStaffAssignment.findFirst({
      where: {
        id: assignmentId,
        schoolId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Staff assignment not found");
    }

    await this.prisma.schoolStaffAssignment.delete({
      where: { id: assignmentId },
    });

    return { success: true };
  }

  async listMessagingRecipients(schoolId: string) {
    const platformAdminAssignments =
      await this.prisma.platformRoleAssignment.findMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
        orderBy: [
          { user: { lastName: "asc" } },
          { user: { firstName: "asc" } },
        ],
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        distinct: ["userId"],
      });
    const platformAdmins = platformAdminAssignments.map((entry) => ({
      value: entry.user.id,
      label: `${entry.user.lastName} ${entry.user.firstName}`.trim(),
      email: entry.user.email,
    }));

    const activeSchoolYearId = await this.getActiveSchoolYearId(schoolId);
    const teacherAssignments = await this.prisma.teacherClassSubject.findMany({
      where: {
        schoolId,
        ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
      },
      orderBy: [
        { teacherUser: { lastName: "asc" } },
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
      ],
      select: {
        teacherUserId: true,
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

    const teachersMap = new Map<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        email: string | null;
        classes: Set<string>;
        subjects: Set<string>;
      }
    >();

    for (const entry of teacherAssignments) {
      const existing = teachersMap.get(entry.teacherUserId) ?? {
        userId: entry.teacherUserId,
        firstName: entry.teacherUser.firstName,
        lastName: entry.teacherUser.lastName,
        email: entry.teacherUser.email,
        classes: new Set<string>(),
        subjects: new Set<string>(),
      };
      existing.classes.add(entry.class.name);
      existing.subjects.add(entry.subject.name);
      teachersMap.set(entry.teacherUserId, existing);
    }

    const teacherOptionsFromAssignments = Array.from(teachersMap.values()).map(
      (entry) => ({
        userId: entry.userId,
        firstName: entry.firstName,
        lastName: entry.lastName,
        email: entry.email,
        classes: Array.from(entry.classes).sort((a, b) => a.localeCompare(b)),
        subjects: Array.from(entry.subjects).sort((a, b) => a.localeCompare(b)),
      }),
    );

    const teacherOptions =
      teacherOptionsFromAssignments.length > 0
        ? teacherOptionsFromAssignments
        : (await this.listTeachers(schoolId)).map((teacher) => ({
            ...teacher,
            classes: [],
            subjects: [],
          }));

    const staffFunctions = await this.prisma.schoolStaffFunction.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        assignments: {
          orderBy: [
            { user: { lastName: "asc" } },
            { user: { firstName: "asc" } },
          ],
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      teachers: teacherOptions.map((teacher) => ({
        value: teacher.userId,
        label: `${teacher.lastName} ${teacher.firstName}`.trim(),
        email: teacher.email,
        classes: teacher.classes,
        subjects: teacher.subjects,
      })),
      staffFunctions: staffFunctions.map((entry) => ({
        value: entry.id,
        label: entry.name,
        description: entry.description,
        members: entry.assignments.map((assignment) => ({
          userId: assignment.user.id,
          fullName:
            `${assignment.user.lastName} ${assignment.user.firstName}`.trim(),
          email: assignment.user.email,
        })),
      })),
      staffPeople: staffFunctions.flatMap((entry) =>
        entry.assignments.map((assignment) => ({
          value: assignment.user.id,
          label:
            `${assignment.user.lastName} ${assignment.user.firstName}`.trim(),
          email: assignment.user.email,
          functionId: entry.id,
          functionLabel: entry.name,
        })),
      ),
      platformAdmins,
    };
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
            phone: true,
          },
        },
      },
    });

    return teachers
      .map((entry) => ({
        userId: entry.userId,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        email: publicEmailOrNull(entry.user.email),
        phone: entry.user.phone,
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
      await this.ensureSubjectAccessible(parsed.subjectId, schoolId);
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
    await this.ensureSubjectAccessible(parsed.subjectId, schoolId);
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
    await this.ensureSubjectAccessible(nextSubjectId, schoolId);
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
    const normalizedEmail = payload.email?.trim().toLowerCase() ?? null;
    const normalizedPhone = payload.phone
      ? this.normalizePhone(payload.phone)
      : null;
    const hasEmail = Boolean(normalizedEmail);
    const hasPhone = Boolean(normalizedPhone);

    if (!hasEmail && !hasPhone) {
      throw new BadRequestException(
        "Email ou numero de telephone enseignant requis",
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { slug: true },
    });

    const existingUser = await this.findUserByContact({
      email: normalizedEmail,
      phone: normalizedPhone,
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
          activationRequired: false,
        };
      });

      return result;
    }

    if (hasPhone && !hasEmail && !payload.pin?.trim()) {
      throw new BadRequestException(
        "PIN initial requis pour une creation par telephone",
      );
    }

    if (hasEmail && !payload.password?.trim()) {
      throw new BadRequestException(
        "Mot de passe initial requis pour une creation par email",
      );
    }

    if (hasPhone && !hasEmail) {
      const initialPin = payload.pin!.trim();
      const passwordHash = await bcrypt.hash(initialPin, 10);
      const technicalEmail = this.buildTechnicalEmailFromPhone(
        normalizedPhone!,
        "teacher",
      );

      const created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            firstName: "Enseignant",
            lastName: normalizedPhone!.slice(-4),
            email: technicalEmail,
            phone: normalizedPhone!,
            passwordHash,
            mustChangePassword: false,
            profileCompleted: false,
            activationStatus: "PENDING",
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

      const activationCode = await this.issueActivationCode(
        created.user.id,
        schoolId,
        undefined,
      );

      return {
        ...created,
        userExisted: false,
        onboardingEmailSent: false,
        activationRequired: true,
        activationCode,
      };
    }

    const teacherEmail = normalizedEmail!;
    const derivedName = this.deriveNameFromEmail(teacherEmail);
    const initialPassword = payload.password!.trim();
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: derivedName.firstName,
          lastName: derivedName.lastName,
          email: teacherEmail,
          phone: normalizedPhone,
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
      temporaryPassword: initialPassword,
      schoolSlug: school?.slug ?? null,
    });

    return {
      ...created,
      userExisted: false,
      onboardingEmailSent: true,
      activationRequired: false,
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
                phone: true,
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
        parentLinks: student.parentLinks.map((link) => ({
          ...link,
          parent: {
            ...link.parent,
            email: publicEmailOrNull(link.parent.email),
          },
        })),
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
        schoolYearId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        "Cet événement est introuvable ou a déjà été supprimé.",
      );
    }

    const isPowerRole =
      currentUser.platformRoles.includes("SUPER_ADMIN") ||
      currentUser.platformRoles.includes("ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(currentUser, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(currentUser, schoolId, "SUPERVISOR");

    const isTeacher = this.hasSchoolRole(currentUser, schoolId, "TEACHER");

    if (!isPowerRole && !isTeacher) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits pour supprimer cet événement.",
      );
    }

    if (!isPowerRole && isTeacher) {
      if (existing.authorUserId !== currentUser.id) {
        throw new ForbiddenException(
          "Vous ne pouvez supprimer que les événements que vous avez créés.",
        );
      }

      const activeSchoolYearId = await this.getActiveSchoolYearId(schoolId);
      if (!activeSchoolYearId || existing.schoolYearId !== activeSchoolYearId) {
        throw new ForbiddenException(
          "Les événements des années scolaires passées ne peuvent pas être supprimés.",
        );
      }
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
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      pin?: string;
    },
  ) {
    const parentEmail = payload.email?.trim().toLowerCase() ?? null;
    const normalizedPhone = payload.phone
      ? this.normalizePhone(payload.phone)
      : null;
    const hasEmail = Boolean(parentEmail);
    const hasPhone = Boolean(normalizedPhone);

    if (!hasEmail && !hasPhone) {
      throw new BadRequestException("Email ou telephone parent requis");
    }

    if (hasPhone && !hasEmail && !payload.pin?.trim()) {
      throw new BadRequestException(
        "PIN initial requis pour une creation parent par telephone",
      );
    }

    if (hasEmail && !payload.password?.trim()) {
      throw new BadRequestException(
        "Mot de passe initial requis pour une creation parent par email",
      );
    }

    const derivedName = hasEmail
      ? this.deriveNameFromEmail(parentEmail!)
      : { firstName: "Parent", lastName: normalizedPhone!.slice(-4) };
    const firstName = payload.firstName ?? derivedName.firstName;
    const lastName = payload.lastName ?? derivedName.lastName;
    const technicalEmail =
      parentEmail ??
      this.buildTechnicalEmailFromPhone(normalizedPhone!, "parent");
    const rawSecret =
      hasPhone && !hasEmail ? payload.pin!.trim() : payload.password!.trim();
    const passwordHash = await bcrypt.hash(rawSecret, 10);

    const parent = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email: technicalEmail,
        phone: normalizedPhone,
        passwordHash,
        mustChangePassword: hasEmail,
        profileCompleted: false,
        activationStatus: hasPhone && !hasEmail ? "PENDING" : "ACTIVE",
        memberships: {
          create: {
            schoolId,
            role: "PARENT",
          },
        },
      },
    });

    if (hasEmail) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { slug: true },
      });
      await this.mailService.sendTemporaryPasswordEmail({
        to: parentEmail!,
        firstName,
        temporaryPassword: rawSecret,
        schoolSlug: school?.slug ?? null,
      });
    }

    if (hasPhone && !hasEmail) {
      await this.issueActivationCode(parent.id, schoolId, undefined);
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

    if (!payload.email && !payload.phone) {
      throw new BadRequestException(
        "Parent email ou telephone ou parentUserId requis",
      );
    }

    const normalizedEmail = payload.email?.trim().toLowerCase() ?? null;
    const normalizedPhone = payload.phone
      ? this.normalizePhone(payload.phone)
      : null;
    const existingUser = await this.findUserByContact({
      email: normalizedEmail,
      phone: normalizedPhone,
    });

    if (existingUser) {
      return this.ensureExistingParentMembership(schoolId, existingUser.id);
    }

    return this.createParentUser(schoolId, {
      email: normalizedEmail ?? undefined,
      phone: normalizedPhone ?? undefined,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password: payload.password,
      pin: payload.pin,
    });
  }

  private async findUserByContact(input: {
    email?: string | null;
    phone?: string | null;
  }) {
    const normalizedEmail = input.email?.trim().toLowerCase() ?? null;
    const normalizedPhone = input.phone
      ? this.normalizePhone(input.phone)
      : null;

    if (!normalizedEmail && !normalizedPhone) {
      return null;
    }

    if (normalizedEmail && normalizedPhone) {
      const [byEmail, byPhoneCredential, byPhoneField] = await Promise.all([
        this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, firstName: true, lastName: true, email: true },
        }),
        this.prisma.userPhoneCredential.findUnique({
          where: { phoneE164: normalizedPhone },
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.user.findFirst({
          where: { phone: normalizedPhone },
          select: { id: true, firstName: true, lastName: true, email: true },
        }),
      ]);
      const byPhone = byPhoneCredential?.user ?? byPhoneField;
      if (byEmail && byPhone && byEmail.id !== byPhone.id) {
        throw new BadRequestException(
          "Email et telephone correspondent a deux comptes differents",
        );
      }
      return byEmail ?? byPhone ?? null;
    }

    if (normalizedEmail) {
      return this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
    }

    const byPhoneCredential = await this.prisma.userPhoneCredential.findUnique({
      where: { phoneE164: normalizedPhone! },
      select: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (byPhoneCredential?.user) {
      return byPhoneCredential.user;
    }

    return this.prisma.user.findFirst({
      where: { phone: normalizedPhone! },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  private buildTechnicalEmailFromPhone(
    normalizedPhone: string,
    scope: "teacher" | "parent" | "school-admin",
  ) {
    const compact = normalizedPhone.replace(/\D/g, "");
    return `${scope}-${compact}-${this.generateShortToken()}${AUTO_GENERATED_EMAIL_DOMAIN}`;
  }

  private generateShortToken() {
    return randomBytes(4).toString("hex");
  }

  private normalizePhone(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 6) {
      throw new BadRequestException("Numero de telephone invalide");
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

  private async ensureSubjectAccessible(subjectId: string, schoolId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, OR: [{ schoolId }, { schoolId: null }] },
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

  private async ensureSchoolStaffFunctionInSchool(
    functionId: string,
    schoolId: string,
  ) {
    const functionEntity = await this.prisma.schoolStaffFunction.findFirst({
      where: {
        id: functionId,
        schoolId,
      },
      select: { id: true },
    });

    if (!functionEntity) {
      throw new NotFoundException("Staff function not found");
    }
  }

  private async ensureStaffUserInSchool(userId: string, schoolId: string) {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: {
        userId,
        schoolId,
        role: {
          in: [
            "SCHOOL_ADMIN",
            "SCHOOL_MANAGER",
            "SUPERVISOR",
            "SCHOOL_ACCOUNTANT",
            "SCHOOL_STAFF",
          ],
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new BadRequestException(
        "Utilisateur non eligible: role scolaire staff requis",
      );
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

  private async ensureAcademicLevelAccessible(
    academicLevelId: string,
    schoolId: string,
  ) {
    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: {
        id: academicLevelId,
        OR: [{ schoolId }, { schoolId: null }],
      },
      select: { id: true },
    });

    if (!academicLevel) {
      throw new NotFoundException("Academic level not found");
    }
  }

  private async ensureAcademicLevelOwnedBySchool(
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

  private async ensureCurriculumAccessible(
    curriculumId: string,
    schoolId: string,
  ) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: {
        id: curriculumId,
        OR: [{ schoolId }, { schoolId: null }],
      },
      select: { id: true },
    });

    if (!curriculum) {
      throw new NotFoundException("Curriculum not found");
    }
  }

  private async ensureCurriculumOwnedBySchool(
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
      await this.ensureAcademicLevelAccessible(academicLevelId, schoolId);
    }

    if (trackId) {
      await this.ensureTrackInSchool(trackId, schoolId);
    }

    if (curriculumId) {
      await this.ensureCurriculumAccessible(curriculumId, schoolId);
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
        OR: [{ schoolId }, { schoolId: null }],
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
        OR: [{ schoolId }, { schoolId: null }],
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
                id: true,
                email: true,
                firstName: true,
                preferredLocale: true,
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

    const authorFullName = params.event.authorUser
      ? `${params.event.authorUser.firstName} ${params.event.authorUser.lastName}`.trim()
      : null;

    const parentUserIds: string[] = [];

    for (const link of student.parentLinks) {
      parentUserIds.push(link.parent.id);

      const publicEmail = publicEmailOrNull(link.parent.email);
      if (!publicEmail) {
        continue;
      }

      try {
        await this.mailService.sendStudentLifeEventNotification({
          to: publicEmail,
          parentFirstName: link.parent.firstName,
          schoolName: school.name,
          schoolSlug: school.slug,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          eventType: params.event.type,
          eventReason: params.event.reason,
          eventDate: params.event.occurredAt.toISOString(),
          eventAction: params.action,
          className: params.event.class?.name ?? null,
          authorFullName,
          locale: link.parent.preferredLocale === "EN" ? "en" : "fr",
        });
      } catch {
        // The life event is already persisted; mail failures must not block business flow.
      }
    }

    if (parentUserIds.length === 0) {
      return;
    }

    try {
      const pushTokens = await this.prisma.mobilePushToken.findMany({
        where: {
          userId: { in: parentUserIds },
          isActive: true,
          OR: [{ schoolId: params.schoolId }, { schoolId: null }],
        },
        select: { token: true },
        distinct: ["token"],
      });

      const eventTypeLabel =
        LIFE_EVENT_TYPE_LABELS[params.event.type] ?? params.event.type;
      const studentFullName = `${student.firstName} ${student.lastName}`.trim();

      await this.pushService.sendStudentLifeEventNotification({
        tokens: pushTokens.map((row) => row.token),
        title: `Vie scolaire · ${studentFullName}`,
        body: eventTypeLabel,
        data: {
          type: "STUDENT_LIFE_EVENT",
          schoolSlug: school.slug,
          studentId: params.studentId,
        },
      });
    } catch {
      // Push failures must not block business flow.
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
      email: string | null;
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
    email: string | null;
    phone: string | null;
    avatarUrl?: string | null;
    mustChangePassword?: boolean;
    createdAt?: Date;
    isTester?: boolean;
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
      isTester: user.isTester ?? false,
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

  private generateActivationCode() {
    return randomBytes(4).toString("hex").toUpperCase();
  }

  private hashActivationCode(code: string) {
    const pepper =
      process.env.ACTIVATION_CODE_PEPPER ??
      "dev-activation-code-pepper-change-me";
    return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
  }

  private async issueActivationCode(
    userId: string,
    schoolId: string,
    createdByUserId?: string,
  ) {
    const now = new Date();
    const activationCode = this.generateActivationCode();
    const expiresAt = new Date(
      now.getTime() + this.getActivationCodeTtlHours() * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.activationCode.updateMany({
        where: {
          userId,
          schoolId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      await tx.activationCode.create({
        data: {
          userId,
          schoolId,
          codeHash: this.hashActivationCode(activationCode),
          expiresAt,
          createdByUserId: createdByUserId ?? null,
        },
      });
    });

    return activationCode;
  }

  private getActivationCodeTtlHours() {
    const configured = Number(process.env.ACTIVATION_CODE_TTL_HOURS ?? 48);
    if (!Number.isFinite(configured) || configured <= 0) {
      return 48;
    }
    return Math.min(Math.floor(configured), 24 * 14);
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
