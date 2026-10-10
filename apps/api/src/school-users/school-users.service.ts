import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, SchoolRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { ensureClassHasCapacity } from "../common/class-capacity.util.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ListSchoolUsersQueryDto } from "./dto/list-school-users-query.dto.js";
import type { UpdateUserRolesDto } from "./dto/update-user-roles.dto.js";

@Injectable()
export class SchoolUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(schoolId: string, query: ListSchoolUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    if (query.membershipStatus === "excluded") {
      return this.listExcludedMembers(schoolId, query, page, limit, skip);
    }

    const isStudentQuery = !query.role || query.role === "STUDENT";

    if (isStudentQuery) {
      return this.listMembersHybrid(schoolId, query, page, limit, skip);
    }

    // Non-student role: only accounts exist for these roles, so an explicit
    // "no account" filter can never match anything here.
    if (query.hasAccount === false) {
      return { data: [], total: 0, page, limit, hasMore: false };
    }

    // Non-student role: existing behaviour
    const membershipFilter = {
      schoolId,
      ...(query.role ? { role: query.role } : {}),
    };

    const andFilters: object[] = [
      { memberships: { some: membershipFilter } },
      { schoolExclusions: { none: { schoolId, reinvitedAt: null } } },
    ];

    if (query.role === "TEACHER" && query.schoolYearId) {
      andFilters.push({
        teachingAssignments: {
          some: { schoolId, schoolYearId: query.schoolYearId },
        },
      });
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      andFilters.push({
        OR: [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
          { phone: { contains: s, mode: "insensitive" } },
        ],
      });
    }

    const where = andFilters.length === 1 ? andFilters[0] : { AND: andFilters };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          avatarUrl: true,
          activationStatus: true,
          profileCompleted: true,
          createdAt: true,
          memberships: {
            where: { schoolId },
            select: { role: true },
          },
          studentProfiles: {
            where: { schoolId },
            select: { id: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        type: "user" as const,
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        avatarUrl: u.avatarUrl,
        roles: u.memberships.map((m) => m.role),
        activationStatus: u.activationStatus,
        profileCompleted: u.profileCompleted,
        createdAt: u.createdAt,
        hasAccount: true,
        studentId: u.studentProfiles[0]?.id ?? null,
      })),
      total,
      page,
      limit,
      hasMore: skip + users.length < total,
    };
  }

  /**
   * Membres sortis de l'établissement (trace d'exclusion courante, non
   * réinvitée). Une seule ligne par personne, la plus récente d'abord.
   */
  private async listExcludedMembers(
    schoolId: string,
    query: ListSchoolUsersQueryDto,
    page: number,
    limit: number,
    skip: number,
  ) {
    const searchTrim = query.search?.trim();
    const personSearch = searchTrim
      ? ([
          { firstName: { contains: searchTrim, mode: "insensitive" } },
          { lastName: { contains: searchTrim, mode: "insensitive" } },
        ] as const)
      : null;

    const where: Prisma.SchoolMemberExclusionWhereInput = {
      schoolId,
      reinvitedAt: null,
      ...(query.role ? { rolesSnapshot: { has: query.role } } : {}),
      ...(query.hasAccount === true ? { userId: { not: null } } : {}),
      ...(query.hasAccount === false ? { userId: null } : {}),
      ...(personSearch
        ? {
            OR: [
              {
                user: {
                  OR: [
                    ...personSearch,
                    { email: { contains: searchTrim, mode: "insensitive" } },
                    { phone: { contains: searchTrim, mode: "insensitive" } },
                  ],
                },
              },
              { student: { OR: [...personSearch] } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.schoolMemberExclusion.findMany({
        where,
        orderBy: [{ excludedAt: "desc" }, { id: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          studentId: true,
          rolesSnapshot: true,
          reason: true,
          excludedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              gender: true,
              avatarUrl: true,
              activationStatus: true,
              profileCompleted: true,
              createdAt: true,
            },
          },
          student: {
            select: { firstName: true, lastName: true, createdAt: true },
          },
        },
      }),
      this.prisma.schoolMemberExclusion.count({ where }),
    ]);

    const data = rows.map((row) => {
      const person = row.user ?? row.student;
      return {
        type: row.userId ? ("user" as const) : ("student-only" as const),
        id: row.userId ?? (row.studentId as string),
        studentId: row.studentId,
        firstName: person?.firstName ?? "",
        lastName: person?.lastName ?? "",
        email: row.user?.email ?? null,
        phone: row.user?.phone ?? null,
        gender: row.user?.gender ?? null,
        avatarUrl: row.user?.avatarUrl ?? null,
        roles: row.rolesSnapshot,
        activationStatus: row.user?.activationStatus ?? null,
        profileCompleted: row.user?.profileCompleted ?? false,
        createdAt: person?.createdAt ?? row.excludedAt,
        hasAccount: Boolean(row.userId),
        excluded: true as const,
        excludedAt: row.excludedAt,
        exclusionReason: row.reason,
      };
    });

    return { data, total, page, limit, hasMore: skip + data.length < total };
  }

  private async listMembersHybrid(
    schoolId: string,
    query: ListSchoolUsersQueryDto,
    page: number,
    limit: number,
    skip: number,
  ) {
    const searchTrim = query.search?.trim() ?? null;

    // hasAccount gates which of the two sources is queried at all: an
    // explicit true/false means only one side of the union can ever match.
    const includeUsers = query.hasAccount !== false;
    const includeStudentsOnly = query.hasAccount !== true;

    // Query 1: all users in school when no role filter, or only STUDENT users
    // when the explicit STUDENT filter is selected.
    const userMembershipFilter = query.role
      ? { schoolId, role: "STUDENT" as const }
      : { schoolId };
    const userAndFilters: object[] = [
      { memberships: { some: userMembershipFilter } },
      { schoolExclusions: { none: { schoolId, reinvitedAt: null } } },
    ];

    if (searchTrim) {
      userAndFilters.push({
        OR: [
          { firstName: { contains: searchTrim, mode: "insensitive" } },
          { lastName: { contains: searchTrim, mode: "insensitive" } },
          { email: { contains: searchTrim, mode: "insensitive" } },
          { phone: { contains: searchTrim, mode: "insensitive" } },
        ],
      });
    }

    // Year filter only makes sense once the role is narrowed down to
    // STUDENT — for ALL it would silently exclude every non-student member.
    if (query.role === "STUDENT" && query.schoolYearId) {
      userAndFilters.push({
        studentProfiles: {
          some: {
            schoolId,
            enrollments: { some: { schoolYearId: query.schoolYearId } },
          },
        },
      });
    }

    const userWhere =
      userAndFilters.length === 1 ? userAndFilters[0] : { AND: userAndFilters };

    // Query 2: Students with no userId
    const studentAndFilters: object[] = [
      { schoolId, userId: null },
      { exclusions: { none: { schoolId, reinvitedAt: null } } },
    ];

    if (searchTrim) {
      studentAndFilters.push({
        OR: [
          { firstName: { contains: searchTrim, mode: "insensitive" } },
          { lastName: { contains: searchTrim, mode: "insensitive" } },
        ],
      });
    }

    if (query.role === "STUDENT" && query.schoolYearId) {
      studentAndFilters.push({
        enrollments: { some: { schoolYearId: query.schoolYearId } },
      });
    }

    const studentWhere =
      studentAndFilters.length === 1
        ? studentAndFilters[0]
        : { AND: studentAndFilters };

    // Bound each source to (skip + limit) rows instead of loading the full
    // table: for a merge of two already-sorted streams, the rows ranked
    // [skip, skip + limit) globally can only come from the first
    // (skip + limit) rows of each individual stream.
    const perSourceTake = skip + limit;

    // Not a single $transaction: batching requires every element to be a
    // Prisma-native promise, which conditional skips (Promise.resolve(...))
    // are not. This is a read-only listing endpoint, so per-query
    // consistency is an acceptable trade-off.
    const [users, usersCount, studentsOnly, studentsOnlyCount] =
      await Promise.all([
        includeUsers
          ? this.prisma.user.findMany({
              where: userWhere,
              orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
              take: perSourceTake,
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                gender: true,
                avatarUrl: true,
                activationStatus: true,
                profileCompleted: true,
                createdAt: true,
                memberships: {
                  where: { schoolId },
                  select: { role: true },
                },
                studentProfiles: {
                  where: { schoolId },
                  select: { id: true },
                },
              },
            })
          : Promise.resolve([]),
        includeUsers
          ? this.prisma.user.count({ where: userWhere })
          : Promise.resolve(0),
        includeStudentsOnly
          ? this.prisma.student.findMany({
              where: studentWhere,
              orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
              take: perSourceTake,
              select: {
                id: true,
                firstName: true,
                lastName: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),
        includeStudentsOnly
          ? this.prisma.student.count({ where: studentWhere })
          : Promise.resolve(0),
      ]);

    // Merge and sort combined list
    type UserItem = {
      type: "user";
      id: string;
      studentId: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      gender: string | null;
      avatarUrl: string | null;
      roles: string[];
      activationStatus: string | null;
      profileCompleted: boolean;
      createdAt: Date;
      hasAccount: boolean;
    };

    type StudentOnlyItem = {
      type: "student-only";
      id: string;
      studentId: string;
      firstName: string;
      lastName: string;
      email: null;
      phone: null;
      gender: null;
      avatarUrl: null;
      roles: ["STUDENT"];
      activationStatus: null;
      profileCompleted: false;
      createdAt: Date;
      hasAccount: false;
    };

    type HybridItem = UserItem | StudentOnlyItem;

    const userItems: UserItem[] = users.map((u) => ({
      type: "user" as const,
      id: u.id,
      studentId: u.studentProfiles[0]?.id ?? null,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      gender: u.gender,
      avatarUrl: u.avatarUrl,
      roles: u.memberships.map((m) => m.role),
      activationStatus: u.activationStatus,
      profileCompleted: u.profileCompleted,
      createdAt: u.createdAt,
      hasAccount: true,
    }));

    const studentItems: StudentOnlyItem[] = studentsOnly.map((s) => ({
      type: "student-only" as const,
      id: s.id,
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: null,
      phone: null,
      gender: null,
      avatarUrl: null,
      roles: ["STUDENT"] as ["STUDENT"],
      activationStatus: null,
      profileCompleted: false as const,
      createdAt: s.createdAt,
      hasAccount: false as const,
    }));

    const combined: HybridItem[] = [...userItems, ...studentItems];
    combined.sort((a, b) => {
      const lastNameCmp = a.lastName.localeCompare(b.lastName);
      if (lastNameCmp !== 0) return lastNameCmp;
      return a.firstName.localeCompare(b.firstName);
    });

    const total = usersCount + studentsOnlyCount;
    const paginated = combined.slice(skip, skip + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      hasMore: skip + paginated.length < total,
    };
  }

  async getStudentProfile(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
        createdAt: true,
        enrollments: {
          where: { schoolId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            schoolYear: { select: { id: true, label: true } },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        parentLinks: {
          where: { schoolId },
          select: {
            parentUserId: true,
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      hasAccount: student.userId !== null,
      userId: student.userId,
      createdAt: student.createdAt,
      enrollments: student.enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        classId: e.class?.id ?? null,
        className: e.class?.name ?? null,
        schoolYearId: e.schoolYear.id,
        schoolYear: e.schoolYear.label,
      })),
      parents: student.parentLinks.map((link) => ({
        id: link.parent.id,
        firstName: link.parent.firstName,
        lastName: link.parent.lastName,
        phone: link.parent.phone,
        email: link.parent.email,
      })),
    };
  }

  async getMemberDetail(
    schoolId: string,
    userId: string,
    viewerUserId?: string,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true, primaryAdminUserId: true },
    });
    const activeSchoolYearId = school?.activeSchoolYearId ?? undefined;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        avatarUrl: true,
        activationStatus: true,
        profileCompleted: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          where: { schoolId },
          select: { role: true },
        },
        // Student enrollments
        studentProfiles: {
          where: { schoolId },
          select: {
            parentLinks: {
              select: {
                parent: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            enrollments: {
              where: { status: "ACTIVE", schoolId },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                schoolYearId: true,
                schoolYear: { select: { label: true } },
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // Parent → children
        parentLinks: {
          where: { schoolId },
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                enrollments: {
                  where: { status: "ACTIVE", schoolId },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                    class: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        // Teacher assignments
        teachingAssignments: {
          where: {
            schoolId,
            ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
          },
          select: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        // Staff function assignments
        staffAssignments: {
          where: { schoolId },
          select: {
            function: { select: { id: true, name: true } },
          },
        },
        phoneCredential: { select: { id: true } },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas membre de cet établissement.",
      );
    }

    // Group teaching assignments by class
    const teachingByClass = new Map<
      string,
      {
        classId: string;
        className: string;
        subjects: { id: string; name: string }[];
      }
    >();
    for (const assignment of user.teachingAssignments) {
      const { id: classId, name: className } = assignment.class;
      if (!teachingByClass.has(classId)) {
        teachingByClass.set(classId, { classId, className, subjects: [] });
      }
      teachingByClass.get(classId)!.subjects.push(assignment.subject);
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      roles: user.memberships.map((m) => m.role),
      isPrimaryAdmin: school?.primaryAdminUserId === user.id,
      isSelf: viewerUserId !== undefined && viewerUserId === user.id,
      hasActiveClass: user.studentProfiles.some((profile) =>
        profile.enrollments.some(
          (enrollment) =>
            enrollment.schoolYearId === activeSchoolYearId &&
            enrollment.class !== null,
        ),
      ),
      activationStatus: user.activationStatus,
      profileCompleted: user.profileCompleted,
      hasPhoneCredential: Boolean(user.phoneCredential),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: null,
      enrollments: user.studentProfiles.flatMap((profile) =>
        profile.enrollments.map((enrollment) => ({
          id: enrollment.id,
          classId: enrollment.class?.id ?? null,
          className: enrollment.class?.name ?? null,
          schoolYear: enrollment.schoolYear.label,
        })),
      ),
      children: user.parentLinks.map((link) => ({
        id: link.student.id,
        firstName: link.student.firstName,
        lastName: link.student.lastName,
        className: link.student.enrollments[0]?.class?.name ?? null,
      })),
      teachingClasses: Array.from(teachingByClass.values()),
      studentParents: user.studentProfiles.flatMap((profile) =>
        profile.parentLinks.map((link) => ({
          id: link.parent.id,
          firstName: link.parent.firstName,
          lastName: link.parent.lastName,
          phone: link.parent.phone,
        })),
      ),
      staffFunctions: user.staffAssignments.map((a) => ({
        id: a.function.id,
        name: a.function.name,
      })),
    };
  }

  async updateMemberRoles(
    schoolId: string,
    userId: string,
    dto: UpdateUserRolesDto,
  ) {
    if (!dto.roles.length) {
      throw new BadRequestException("Au moins un rôle est requis.");
    }

    const membership = await this.prisma.schoolMembership.findFirst({
      where: { schoolId, userId },
    });
    if (!membership) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas membre de cet établissement.",
      );
    }

    if (!dto.roles.includes("SCHOOL_ADMIN")) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { primaryAdminUserId: true },
      });
      if (school?.primaryAdminUserId === userId) {
        throw new ConflictException(
          "L'administrateur principal doit conserver le rôle d'administrateur, il peut seulement être remplacé par la plateforme.",
        );
      }
    }

    const becomesTeacher = dto.roles.includes("TEACHER");

    await this.prisma.$transaction(async (tx) => {
      await tx.schoolMembership.deleteMany({ where: { schoolId, userId } });
      await tx.schoolMembership.createMany({
        data: dto.roles.map((role) => ({ schoolId, userId, role })),
      });
      if (becomesTeacher) {
        await tx.teacher.upsert({
          where: { schoolId_userId: { schoolId, userId } },
          create: { schoolId, userId },
          update: {},
        });
      } else {
        await tx.teacher.deleteMany({ where: { schoolId, userId } });
      }
    });

    const updated = await this.prisma.schoolMembership.findMany({
      where: { schoolId, userId },
      select: { role: true },
    });

    return { roles: updated.map((m) => m.role) };
  }

  /**
   * Retire un membre de l'établissement sans jamais effacer son passé :
   * - un élève reste élève mais perd sa classe de l'année active (inscription
   *   ACTIVE conservée, `classId` à null) ; les années passées sont intactes ;
   * - les autres rôles sont retirés, les affectations enseignant de l'année
   *   active sont arrêtées (emploi du temps clos à la date du jour), les
   *   liens parent-élève et les données historiques sont conservés.
   * Le compte `User` n'est jamais supprimé.
   */
  async removeMember(
    schoolId: string,
    actorUserId: string,
    userId: string,
  ): Promise<{
    action: "EXCLUDED" | "UNASSIGNED_FROM_CLASS";
    remainingRoles: string[];
  }> {
    if (actorUserId === userId) {
      throw new ForbiddenException(
        "Vous ne pouvez pas vous exclure vous-même de l'établissement.",
      );
    }

    const memberships = await this.prisma.schoolMembership.findMany({
      where: { schoolId, userId },
      select: { role: true },
    });
    if (memberships.length === 0) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas membre de cet établissement.",
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { primaryAdminUserId: true, activeSchoolYearId: true },
    });
    if (school?.primaryAdminUserId === userId) {
      throw new ConflictException(
        "L'administrateur principal ne peut pas être exclu, il peut seulement être remplacé par la plateforme.",
      );
    }

    const roles = memberships.map((membership) => membership.role);
    if (roles.includes("SCHOOL_ADMIN")) {
      const adminCount = await this.prisma.schoolMembership.count({
        where: { schoolId, role: "SCHOOL_ADMIN" },
      });
      if (adminCount <= 1) {
        throw new ConflictException(
          "Impossible d'exclure le dernier administrateur de l'établissement.",
        );
      }
    }

    const isStudent = roles.includes("STUDENT");
    const otherRoles = roles.filter((role) => role !== "STUDENT");
    const activeSchoolYearId = school?.activeSchoolYearId ?? null;
    const now = new Date();

    let classedEnrollmentIds: string[] = [];
    if (isStudent && otherRoles.length === 0) {
      const enrollments = activeSchoolYearId
        ? await this.prisma.enrollment.findMany({
            where: {
              schoolId,
              schoolYearId: activeSchoolYearId,
              status: "ACTIVE",
              classId: { not: null },
              student: { userId },
            },
            select: { id: true },
          })
        : [];
      if (enrollments.length === 0) {
        throw new ConflictException(
          "Cet élève n'est affecté à aucune classe pour l'année scolaire en cours.",
        );
      }
      classedEnrollmentIds = enrollments.map((enrollment) => enrollment.id);
    } else if (isStudent && activeSchoolYearId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          schoolId,
          schoolYearId: activeSchoolYearId,
          status: "ACTIVE",
          classId: { not: null },
          student: { userId },
        },
        select: { id: true },
      });
      classedEnrollmentIds = enrollments.map((enrollment) => enrollment.id);
    }

    await this.prisma.$transaction(async (tx) => {
      if (classedEnrollmentIds.length > 0) {
        await tx.enrollment.updateMany({
          where: { id: { in: classedEnrollmentIds } },
          data: { classId: null },
        });
      }

      if (otherRoles.length === 0) {
        return;
      }

      await this.removeNonStudentRoles(tx, {
        schoolId,
        userId,
        roles,
        activeSchoolYearId,
        now,
      });
      // Sans rôle élève, ce retrait est une sortie complète de l'école : on en
      // garde la trace pour pouvoir réinviter la personne. (Un compte qui reste
      // élève reste visible : l'exclusion complète passe par `excludeMember`.)
      if (!isStudent) {
        await this.openExclusionTrace(tx, {
          schoolId,
          userId,
          studentId: null,
          roles,
          excludedByUserId: actorUserId,
          excludedAt: now,
        });
      }
    });

    return {
      action: otherRoles.length === 0 ? "UNASSIGNED_FROM_CLASS" : "EXCLUDED",
      remainingRoles: isStudent ? ["STUDENT"] : [],
    };
  }

  /**
   * Retire tous les rôles non-élève d'un membre et défait ce qui s'y rattache
   * (affectations, fiche enseignant, créneaux futurs/en cours). Les données
   * historiques ne sont jamais effacées.
   */
  private async removeNonStudentRoles(
    tx: Prisma.TransactionClient,
    input: {
      schoolId: string;
      userId: string;
      roles: string[];
      activeSchoolYearId: string | null;
      now: Date;
    },
  ) {
    const { schoolId, userId, roles, activeSchoolYearId, now } = input;
    await tx.schoolMembership.deleteMany({
      where: { schoolId, userId, role: { not: "STUDENT" } },
    });
    await tx.schoolStaffAssignment.deleteMany({
      where: { schoolId, userId },
    });

    if (roles.includes("TEACHER")) {
      await tx.teacher.deleteMany({ where: { schoolId, userId } });
      if (activeSchoolYearId) {
        await tx.teacherClassSubject.deleteMany({
          where: {
            schoolId,
            schoolYearId: activeSchoolYearId,
            teacherUserId: userId,
          },
        });
        await tx.classTimetableSlot.deleteMany({
          where: {
            schoolId,
            schoolYearId: activeSchoolYearId,
            teacherUserId: userId,
            activeFromDate: { gt: now },
          },
        });
        await tx.classTimetableSlot.updateMany({
          where: {
            schoolId,
            schoolYearId: activeSchoolYearId,
            teacherUserId: userId,
            OR: [{ activeToDate: null }, { activeToDate: { gt: now } }],
          },
          data: { activeToDate: now },
        });
        await tx.classTimetableOneOffSlot.deleteMany({
          where: {
            schoolId,
            schoolYearId: activeSchoolYearId,
            teacherUserId: userId,
            occurrenceDate: { gt: now },
          },
        });
      }
    }

    await tx.user.updateMany({
      where: { id: userId, activeSchoolId: schoolId },
      data: { activeSchoolId: null },
    });
  }

  /**
   * Exclusion complète d'un membre de l'établissement (tous rôles confondus).
   * - Rôles de gestion (enseignant, parent, staff…) : memberships retirés, donc
   *   plus aucun accès.
   * - Élève : l'inscription de l'année active passe à WITHDRAWN. Le compte reste
   *   connectable en lecture seule (historique) mais sort de tous les effectifs
   *   et ne reçoit plus de notification ; il en va de même pour ses parents.
   * Une trace (`SchoolMemberExclusion`) permet d'afficher les exclus et de les
   * réinviter. Aucune donnée historique n'est supprimée.
   */
  async excludeMember(
    schoolId: string,
    actorUserId: string,
    userId: string,
    reason?: string,
  ): Promise<{ action: "EXCLUDED"; roles: string[]; excludedAt: Date }> {
    if (actorUserId === userId) {
      throw new ForbiddenException(
        "Vous ne pouvez pas vous exclure vous-même de l'établissement.",
      );
    }

    const memberships = await this.prisma.schoolMembership.findMany({
      where: { schoolId, userId },
      select: { role: true },
    });
    if (memberships.length === 0) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas membre de cet établissement.",
      );
    }
    const roles = memberships.map((membership) => membership.role);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { primaryAdminUserId: true, activeSchoolYearId: true },
    });
    if (school?.primaryAdminUserId === userId) {
      throw new ConflictException(
        "L'administrateur principal ne peut pas être exclu, il peut seulement être remplacé par la plateforme.",
      );
    }
    if (roles.includes("SCHOOL_ADMIN")) {
      const adminCount = await this.prisma.schoolMembership.count({
        where: { schoolId, role: "SCHOOL_ADMIN" },
      });
      if (adminCount <= 1) {
        throw new ConflictException(
          "Impossible d'exclure le dernier administrateur de l'établissement.",
        );
      }
    }

    const otherRoles = roles.filter((role) => role !== "STUDENT");
    const isStudent = roles.includes("STUDENT");
    const activeSchoolYearId = school?.activeSchoolYearId ?? null;
    const student = isStudent
      ? await this.prisma.student.findFirst({
          where: { schoolId, userId },
          select: { id: true },
        })
      : null;

    if (isStudent && otherRoles.length === 0) {
      if (!activeSchoolYearId) {
        throw new ConflictException(
          "Aucune année scolaire active : impossible d'exclure cet élève.",
        );
      }
      if (
        student &&
        (await this.isStudentWithdrawn(
          schoolId,
          student.id,
          activeSchoolYearId,
        ))
      ) {
        throw new ConflictException("Cet élève est déjà exclu.");
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (otherRoles.length > 0) {
        await this.removeNonStudentRoles(tx, {
          schoolId,
          userId,
          roles,
          activeSchoolYearId,
          now,
        });
      }
      if (student && activeSchoolYearId) {
        await this.withdrawStudentEnrollment(
          tx,
          schoolId,
          student.id,
          activeSchoolYearId,
        );
      }
      await this.openExclusionTrace(tx, {
        schoolId,
        userId,
        studentId: student?.id ?? null,
        roles,
        reason,
        excludedByUserId: actorUserId,
        excludedAt: now,
      });
    });

    return { action: "EXCLUDED", roles, excludedAt: now };
  }

  /** Exclusion d'un élève sans compte (aucun membership à retirer). */
  async excludeStudent(
    schoolId: string,
    actorUserId: string,
    studentId: string,
    reason?: string,
  ): Promise<{ action: "EXCLUDED"; roles: string[]; excludedAt: Date }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, userId: true },
    });
    if (!student) {
      throw new NotFoundException("Élève introuvable.");
    }
    if (student.userId) {
      // Les élèves avec compte passent par la route utilisateur.
      return this.excludeMember(schoolId, actorUserId, student.userId, reason);
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });
    const activeSchoolYearId = school?.activeSchoolYearId ?? null;
    if (!activeSchoolYearId) {
      throw new ConflictException(
        "Aucune année scolaire active : impossible d'exclure cet élève.",
      );
    }
    if (
      await this.isStudentWithdrawn(schoolId, student.id, activeSchoolYearId)
    ) {
      throw new ConflictException("Cet élève est déjà exclu.");
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.withdrawStudentEnrollment(
        tx,
        schoolId,
        student.id,
        activeSchoolYearId,
      );
      await this.openExclusionTrace(tx, {
        schoolId,
        userId: null,
        studentId: student.id,
        roles: ["STUDENT"],
        reason,
        excludedByUserId: actorUserId,
        excludedAt: now,
      });
    });

    return { action: "EXCLUDED", roles: ["STUDENT"], excludedAt: now };
  }

  /**
   * Réintègre un membre exclu : les rôles de la trace sont recréés (ou
   * l'inscription élève redevient ACTIVE). Les affectations d'enseignant, elles,
   * ne reviennent pas : c'est à l'administration de les refaire.
   */
  async reinviteMember(
    schoolId: string,
    actorUserId: string,
    target: { userId?: string; studentId?: string },
  ): Promise<{ action: "REINVITED"; roles: string[] }> {
    if (!target.userId && !target.studentId) {
      throw new BadRequestException("Utilisateur ou élève requis.");
    }

    const trace = await this.prisma.schoolMemberExclusion.findFirst({
      where: {
        schoolId,
        reinvitedAt: null,
        OR: [
          ...(target.userId ? [{ userId: target.userId }] : []),
          ...(target.studentId ? [{ studentId: target.studentId }] : []),
        ],
      },
      orderBy: { excludedAt: "desc" },
    });
    if (!trace) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas exclu de cet établissement.",
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });
    const activeSchoolYearId = school?.activeSchoolYearId ?? null;
    const restoresStudent = trace.rolesSnapshot.includes("STUDENT");
    const restoredRoles = trace.rolesSnapshot.filter(
      (role) => role !== "STUDENT",
    );

    let withdrawnEnrollment: {
      id: string;
      classId: string | null;
      schoolYearId: string;
    } | null = null;
    if (restoresStudent && trace.studentId && activeSchoolYearId) {
      withdrawnEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId: trace.studentId,
          schoolYearId: activeSchoolYearId,
          status: "WITHDRAWN",
        },
        select: { id: true, classId: true, schoolYearId: true },
      });
      if (withdrawnEnrollment?.classId) {
        await ensureClassHasCapacity(
          this.prisma,
          withdrawnEnrollment.classId,
          withdrawnEnrollment.schoolYearId,
        );
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (trace.userId && restoredRoles.length > 0) {
        await tx.schoolMembership.createMany({
          data: restoredRoles.map((role) => ({
            userId: trace.userId as string,
            schoolId,
            role,
          })),
          skipDuplicates: true,
        });
      }
      if (trace.userId && restoresStudent) {
        await tx.schoolMembership.createMany({
          data: [{ userId: trace.userId, schoolId, role: "STUDENT" as const }],
          skipDuplicates: true,
        });
      }
      if (withdrawnEnrollment) {
        await tx.enrollment.update({
          where: { id: withdrawnEnrollment.id },
          data: { status: "ACTIVE" },
        });
      }
      await tx.schoolMemberExclusion.updateMany({
        where: {
          schoolId,
          reinvitedAt: null,
          OR: [
            ...(trace.userId ? [{ userId: trace.userId }] : []),
            ...(trace.studentId ? [{ studentId: trace.studentId }] : []),
          ],
        },
        data: { reinvitedAt: now, reinvitedByUserId: actorUserId },
      });
    });

    if (trace.userId) {
      await this.sendReinviteNotification(schoolId, actorUserId, trace.userId);
    }

    return { action: "REINVITED", roles: trace.rolesSnapshot };
  }

  private async isStudentWithdrawn(
    schoolId: string,
    studentId: string,
    schoolYearId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { schoolId, studentId, schoolYearId, status: "WITHDRAWN" },
      select: { id: true },
    });
    return Boolean(enrollment);
  }

  private async withdrawStudentEnrollment(
    tx: Prisma.TransactionClient,
    schoolId: string,
    studentId: string,
    schoolYearId: string,
  ) {
    // La classe est conservée : elle permet à l'élève (et à ses parents) de
    // consulter l'historique de l'année en cours, alors que le statut
    // WITHDRAWN le retire de tous les effectifs.
    await tx.enrollment.upsert({
      where: { schoolYearId_studentId: { schoolYearId, studentId } },
      update: { status: "WITHDRAWN" },
      create: { schoolId, schoolYearId, studentId, status: "WITHDRAWN" },
    });
  }

  private async openExclusionTrace(
    tx: Prisma.TransactionClient,
    input: {
      schoolId: string;
      userId: string | null;
      studentId: string | null;
      roles: SchoolRole[];
      reason?: string;
      excludedByUserId: string;
      excludedAt: Date;
    },
  ) {
    const identity = [
      ...(input.userId ? [{ userId: input.userId }] : []),
      ...(input.studentId ? [{ studentId: input.studentId }] : []),
    ];
    await tx.schoolMemberExclusion.updateMany({
      where: { schoolId: input.schoolId, reinvitedAt: null, OR: identity },
      // Une exclusion encore ouverte est remplacée par la plus récente.
      data: { reinvitedAt: input.excludedAt },
    });
    await tx.schoolMemberExclusion.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        studentId: input.studentId,
        rolesSnapshot: input.roles,
        reason: input.reason?.trim() || null,
        excludedByUserId: input.excludedByUserId,
        excludedAt: input.excludedAt,
      },
    });
  }

  private async sendReinviteNotification(
    schoolId: string,
    senderUserId: string,
    userId: string,
  ): Promise<void> {
    try {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      });
      const message = await this.prisma.internalMessage.create({
        data: {
          schoolId,
          senderUserId,
          subject: "Vous avez été réintégré dans l'établissement",
          body: `<p>Bonjour,</p><p>L'administration de ${school?.name ?? "votre établissement"} vous a réintégré. Vous pouvez de nouveau accéder à votre espace.</p>`,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await this.prisma.internalMessageRecipient.create({
        data: { messageId: message.id, schoolId, recipientUserId: userId },
      });
    } catch {
      // Notification best-effort — ne doit jamais faire échouer la réintégration.
    }
  }

  async resetMemberPin(
    schoolId: string,
    userId: string,
  ): Promise<{ temporaryPin: string }> {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: { schoolId, userId },
    });
    if (!membership) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas membre de cet établissement.",
      );
    }

    const phoneCredential = await this.prisma.userPhoneCredential.findUnique({
      where: { userId },
      select: { id: true, phoneE164: true },
    });
    if (!phoneCredential) {
      throw new NotFoundException(
        "Cet utilisateur ne dispose pas d'une connexion par téléphone/PIN.",
      );
    }

    const temporaryPin = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const pinHash = await bcrypt.hash(temporaryPin, 10);

    await this.prisma.userPhoneCredential.update({
      where: { id: phoneCredential.id },
      data: { pinHash },
    });

    await this.prisma.authAuditLog.create({
      data: {
        userId,
        schoolId,
        event: "CHANGE_PIN",
        status: "SUCCESS",
        principal: phoneCredential.phoneE164,
        reasonCode: "ADMIN_MANUAL_RESET",
      },
    });

    await this.sendPinResetNotification(schoolId, userId);

    return { temporaryPin };
  }

  private async sendPinResetNotification(
    schoolId: string,
    userId: string,
  ): Promise<void> {
    try {
      const senderMembership = await this.prisma.schoolMembership.findFirst({
        where: { schoolId, role: "SCHOOL_ADMIN" },
        select: { userId: true },
      });
      if (!senderMembership || senderMembership.userId === userId) {
        return;
      }

      const message = await this.prisma.internalMessage.create({
        data: {
          schoolId,
          senderUserId: senderMembership.userId,
          subject: "Réinitialisation de votre code PIN",
          body: "<p>Bonjour,</p><p>Votre code PIN de connexion vient d'être réinitialisé par l'administration de votre établissement, à votre demande. Le nouveau code vous a été communiqué séparément.</p><p>Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement l'administration.</p>",
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await this.prisma.internalMessageRecipient.create({
        data: { messageId: message.id, schoolId, recipientUserId: userId },
      });
    } catch {
      // Notification best-effort — ne doit jamais faire échouer la réinitialisation.
    }
  }
}
