import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser, SchoolRole } from "../auth/auth.types.js";
import type { CreateGradeDto } from "./dto/create-grade.dto.js";
import type { ListGradesDto } from "./dto/list-grades.dto.js";
import type { UpdateGradeDto } from "./dto/update-grade.dto.js";

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateGradeDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const classEntity = await this.ensureClassInSchool(
      payload.classId,
      effectiveSchoolId,
    );
    await this.ensureStudentInSchool(payload.studentId, effectiveSchoolId);
    await this.ensureStudentEnrollment(
      payload.studentId,
      payload.classId,
      classEntity.schoolYearId,
      effectiveSchoolId,
    );
    await this.ensureSubjectInSchool(payload.subjectId, effectiveSchoolId);
    await this.ensureSubjectAllowedForClass(
      payload.classId,
      payload.subjectId,
      effectiveSchoolId,
    );

    if (this.hasSchoolRole(user, effectiveSchoolId, "TEACHER")) {
      await this.ensureTeacherAssignment(
        user.id,
        effectiveSchoolId,
        payload.classId,
        payload.subjectId,
        classEntity.schoolYearId,
      );
    }

    return this.prisma.grade.create({
      data: {
        schoolId: effectiveSchoolId,
        schoolYearId: classEntity.schoolYearId,
        studentId: payload.studentId,
        classId: payload.classId,
        subjectId: payload.subjectId,
        teacherUserId: user.id,
        value: payload.value,
        maxValue: payload.maxValue,
        assessmentWeight: payload.assessmentWeight ?? 1,
        term: payload.term,
      },
    });
  }

  async list(
    user: AuthenticatedUser,
    schoolId: string,
    filters: ListGradesDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const where: Prisma.GradeWhereInput = {
      schoolId: effectiveSchoolId,
    };

    if (filters.schoolYearId) {
      where.schoolYearId = filters.schoolYearId;
    }

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasSchoolRole(user, effectiveSchoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, effectiveSchoolId, "SCHOOL_MANAGER")
    ) {
      return this.prisma.grade.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    if (this.hasSchoolRole(user, effectiveSchoolId, "TEACHER")) {
      const assignments = await this.prisma.teacherClassSubject.findMany({
        where: {
          schoolId: effectiveSchoolId,
          teacherUserId: user.id,
          ...(filters.schoolYearId
            ? { schoolYearId: filters.schoolYearId }
            : {}),
        },
        select: { classId: true, subjectId: true },
      });

      if (!assignments.length) {
        return [];
      }

      const teacherScopedWhere: Prisma.GradeWhereInput = {
        ...where,
        OR: assignments.map((assignment) => ({
          classId: assignment.classId,
          subjectId: assignment.subjectId,
        })),
      };

      return this.prisma.grade.findMany({
        where: teacherScopedWhere,
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    if (this.hasSchoolRole(user, effectiveSchoolId, "PARENT")) {
      const links = await this.prisma.parentStudent.findMany({
        where: {
          schoolId: effectiveSchoolId,
          parentUserId: user.id,
        },
        select: { studentId: true },
      });

      if (!links.length) {
        return [];
      }

      return this.prisma.grade.findMany({
        where: {
          ...where,
          studentId: { in: links.map((link) => link.studentId) },
        },
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    if (this.hasSchoolRole(user, effectiveSchoolId, "STUDENT")) {
      const student = await this.prisma.student.findFirst({
        where: {
          schoolId: effectiveSchoolId,
          userId: user.id,
        },
        select: { id: true },
      });

      if (!student) {
        return [];
      }

      return this.prisma.grade.findMany({
        where: {
          ...where,
          studentId: student.id,
        },
        orderBy: { createdAt: "desc" },
        include: {
          subject: {
            select: { id: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    throw new ForbiddenException("Unsupported role");
  }

  async update(
    user: AuthenticatedUser,
    schoolId: string,
    gradeId: string,
    payload: UpdateGradeDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId: effectiveSchoolId },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    if (this.hasSchoolRole(user, effectiveSchoolId, "TEACHER")) {
      await this.ensureTeacherAssignment(
        user.id,
        effectiveSchoolId,
        grade.classId,
        grade.subjectId,
        grade.schoolYearId,
      );
    }

    return this.prisma.grade.update({
      where: { id: grade.id },
      data: {
        value: payload.value,
        maxValue: payload.maxValue,
        assessmentWeight: payload.assessmentWeight,
        term: payload.term,
      },
    });
  }

  async context(
    user: AuthenticatedUser,
    schoolId: string,
    schoolYearId?: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const school = await this.prisma.school.findUnique({
      where: { id: effectiveSchoolId },
      select: {
        activeSchoolYearId: true,
      },
    });

    const years = await this.prisma.schoolYear.findMany({
      where: { schoolId: effectiveSchoolId },
      orderBy: [{ label: "desc" }],
      select: {
        id: true,
        label: true,
      },
    });

    const selectedSchoolYearId =
      schoolYearId ?? school?.activeSchoolYearId ?? years[0]?.id ?? null;

    let assignments: Array<{
      classId: string;
      subjectId: string;
      className: string;
      subjectName: string;
      schoolYearId: string;
    }> = [];

    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasSchoolRole(user, effectiveSchoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, effectiveSchoolId, "SCHOOL_MANAGER")
    ) {
      const rows = await this.prisma.teacherClassSubject.findMany({
        where: {
          schoolId: effectiveSchoolId,
          ...(selectedSchoolYearId
            ? { schoolYearId: selectedSchoolYearId }
            : {}),
        },
        select: {
          classId: true,
          subjectId: true,
          schoolYearId: true,
          class: {
            select: {
              name: true,
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
        },
      });

      assignments = rows.map((row) => ({
        classId: row.classId,
        subjectId: row.subjectId,
        className: row.class.name,
        subjectName: row.subject.name,
        schoolYearId: row.schoolYearId,
      }));
    } else if (this.hasSchoolRole(user, effectiveSchoolId, "TEACHER")) {
      const rows = await this.prisma.teacherClassSubject.findMany({
        where: {
          schoolId: effectiveSchoolId,
          teacherUserId: user.id,
          ...(selectedSchoolYearId
            ? { schoolYearId: selectedSchoolYearId }
            : {}),
        },
        select: {
          classId: true,
          subjectId: true,
          schoolYearId: true,
          class: {
            select: {
              name: true,
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
        },
      });

      assignments = rows.map((row) => ({
        classId: row.classId,
        subjectId: row.subjectId,
        className: row.class.name,
        subjectName: row.subject.name,
        schoolYearId: row.schoolYearId,
      }));
    } else {
      return {
        schoolYears: years.map((year) => ({
          ...year,
          isActive: year.id === school?.activeSchoolYearId,
        })),
        selectedSchoolYearId,
        assignments: [],
        students: [],
      };
    }

    const uniqueClassIds = Array.from(
      new Set(assignments.map((a) => a.classId)),
    );
    const students = selectedSchoolYearId
      ? await this.prisma.enrollment.findMany({
          where: {
            schoolId: effectiveSchoolId,
            schoolYearId: selectedSchoolYearId,
            status: "ACTIVE",
            classId: {
              in: uniqueClassIds.length ? uniqueClassIds : ["__none__"],
            },
          },
          orderBy: [
            { class: { name: "asc" } },
            { student: { lastName: "asc" } },
            { student: { firstName: "asc" } },
          ],
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : [];

    return {
      schoolYears: years.map((year) => ({
        ...year,
        isActive: year.id === school?.activeSchoolYearId,
      })),
      selectedSchoolYearId,
      assignments,
      students: students.map((row) => ({
        classId: row.classId,
        className: row.class.name,
        studentId: row.student.id,
        studentFirstName: row.student.firstName,
        studentLastName: row.student.lastName,
      })),
    };
  }

  async remove(user: AuthenticatedUser, schoolId: string, gradeId: string) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const grade = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId: effectiveSchoolId,
      },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    return this.prisma.grade.delete({ where: { id: grade.id } });
  }

  private getEffectiveSchoolId(
    user: AuthenticatedUser,
    scopedSchoolId: string,
  ): string {
    if (this.hasPlatformRole(user, "SUPER_ADMIN")) {
      return scopedSchoolId;
    }

    const hasMembership = user.memberships.some(
      (membership) => membership.schoolId === scopedSchoolId,
    );
    if (!hasMembership) {
      throw new ForbiddenException("User is not bound to a school");
    }

    return scopedSchoolId;
  }

  private async ensureTeacherAssignment(
    teacherUserId: string,
    schoolId: string,
    classId: string,
    subjectId: string,
    schoolYearId: string,
  ) {
    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        schoolYearId,
        teacherUserId,
        classId,
        subjectId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        "Teacher is not assigned to this class/subject",
      );
    }
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

  private async ensureStudentEnrollment(
    studentId: string,
    classId: string,
    schoolYearId: string,
    schoolId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        schoolId,
        schoolYearId,
        studentId,
        classId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (enrollment) {
      return;
    }

    throw new ForbiddenException(
      "Student is not enrolled in this class for the school year",
    );
  }

  private async ensureClassInSchool(classId: string, schoolId: string) {
    const classFound = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, schoolYearId: true },
    });

    if (!classFound) {
      throw new NotFoundException("Class not found");
    }

    return classFound;
  }

  private async ensureSubjectAllowedForClass(
    classId: string,
    subjectId: string,
    schoolId: string,
  ) {
    const [classEntity, override] = await this.prisma.$transaction([
      this.prisma.class.findFirst({
        where: { id: classId, schoolId },
        select: {
          curriculumId: true,
          curriculum: {
            select: {
              subjects: {
                where: { subjectId },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.classSubjectOverride.findFirst({
        where: { schoolId, classId, subjectId },
        select: { action: true },
      }),
    ]);

    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }

    if (override?.action === "REMOVE") {
      throw new ForbiddenException("Subject is not allowed for this class");
    }

    if (override?.action === "ADD") {
      return;
    }

    if (!classEntity.curriculumId) {
      return;
    }

    const isInCurriculum = (classEntity.curriculum?.subjects?.length ?? 0) > 0;
    if (!isInCurriculum) {
      throw new ForbiddenException("Subject is not in the class curriculum");
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

  private hasPlatformRole(
    user: AuthenticatedUser,
    role: AuthenticatedUser["platformRoles"][number],
  ) {
    return user.platformRoles.includes(role);
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
}
