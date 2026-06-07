import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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

    const isStudentQuery = !query.role || query.role === "STUDENT";

    if (isStudentQuery) {
      return this.listMembersHybrid(schoolId, query, page, limit, skip);
    }

    // Non-student role: existing behaviour
    const membershipFilter = {
      schoolId,
      ...(query.role ? { role: query.role } : {}),
    };

    const andFilters: object[] = [{ memberships: { some: membershipFilter } }];

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

  private async listMembersHybrid(
    schoolId: string,
    query: ListSchoolUsersQueryDto,
    page: number,
    limit: number,
    skip: number,
  ) {
    const searchTrim = query.search?.trim() ?? null;

    // Query 1: all users in school when no role filter, or only STUDENT users
    // when the explicit STUDENT filter is selected.
    const userMembershipFilter = query.role
      ? { schoolId, role: "STUDENT" as const }
      : { schoolId };
    const userAndFilters: object[] = [
      { memberships: { some: userMembershipFilter } },
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

    const userWhere =
      userAndFilters.length === 1 ? userAndFilters[0] : { AND: userAndFilters };

    // Query 2: Students with no userId
    const studentAndFilters: object[] = [{ schoolId, userId: null }];

    if (searchTrim) {
      studentAndFilters.push({
        OR: [
          { firstName: { contains: searchTrim, mode: "insensitive" } },
          { lastName: { contains: searchTrim, mode: "insensitive" } },
        ],
      });
    }

    const studentWhere =
      studentAndFilters.length === 1
        ? studentAndFilters[0]
        : { AND: studentAndFilters };

    const [users, usersCount, studentsOnly, studentsOnlyCount] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where: userWhere,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
        this.prisma.user.count({ where: userWhere }),
        this.prisma.student.findMany({
          where: studentWhere,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        }),
        this.prisma.student.count({ where: studentWhere }),
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
            class: {
              select: {
                id: true,
                name: true,
                schoolYear: { select: { id: true, label: true } },
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
        classId: e.class.id,
        className: e.class.name,
        schoolYearId: e.class.schoolYear.id,
        schoolYear: e.class.schoolYear.label,
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

  async getMemberDetail(schoolId: string, userId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
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
                class: {
                  select: {
                    id: true,
                    name: true,
                    schoolYear: { select: { label: true } },
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
      activationStatus: user.activationStatus,
      profileCompleted: user.profileCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: null,
      enrollments: user.studentProfiles.flatMap((profile) =>
        profile.enrollments.map((enrollment) => ({
          id: enrollment.id,
          classId: enrollment.class.id,
          className: enrollment.class.name,
          schoolYear: enrollment.class.schoolYear.label,
        })),
      ),
      children: user.parentLinks.map((link) => ({
        id: link.student.id,
        firstName: link.student.firstName,
        lastName: link.student.lastName,
        className: link.student.enrollments[0]?.class.name ?? null,
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

    // Delete all existing memberships for this user in this school and recreate
    await this.prisma.$transaction([
      this.prisma.schoolMembership.deleteMany({ where: { schoolId, userId } }),
      this.prisma.schoolMembership.createMany({
        data: dto.roles.map((role) => ({ schoolId, userId, role })),
      }),
    ]);

    const updated = await this.prisma.schoolMembership.findMany({
      where: { schoolId, userId },
      select: { role: true },
    });

    return { roles: updated.map((m) => m.role) };
  }
}
