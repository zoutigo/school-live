import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import {
  studentGradesLocaleFromUser,
  translateStudentGradesError,
  type StudentGradesLocale,
} from "./student-grades.translations.js";
import type { CreateStudentGradeDto } from "./dto/create-student-grade.dto.js";
import type { ListStudentGradesDto } from "./dto/list-student-grades.dto.js";
import type { UpdateStudentGradeDto } from "./dto/update-student-grade.dto.js";

@Injectable()
export class StudentGradesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateStudentGradeDto,
  ) {
    const locale = studentGradesLocaleFromUser(user);
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId, locale);

    const classEntity = await this.ensureClassInSchool(
      payload.classId,
      effectiveSchoolId,
      locale,
    );
    await this.ensureStudentInSchool(
      payload.studentId,
      effectiveSchoolId,
      locale,
    );
    await this.ensureStudentEnrollment(
      payload.studentId,
      payload.classId,
      classEntity.schoolYearId,
      effectiveSchoolId,
      locale,
    );
    await this.ensureSubjectInSchool(
      payload.subjectId,
      effectiveSchoolId,
      locale,
    );
    await this.ensureSubjectAllowedForClass(
      payload.classId,
      payload.subjectId,
      effectiveSchoolId,
      locale,
    );

    if (user.activeRole === "TEACHER") {
      await this.ensureTeacherAssignment(
        user.id,
        effectiveSchoolId,
        payload.classId,
        payload.subjectId,
        classEntity.schoolYearId,
        locale,
      );
    }

    return this.prisma.studentGrade.create({
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
    filters: ListStudentGradesDto,
  ) {
    const locale = studentGradesLocaleFromUser(user);
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId, locale);
    const where: Prisma.StudentGradeWhereInput = {
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

    const activeRole = user.activeRole;

    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      activeRole === "SCHOOL_ADMIN" ||
      activeRole === "SCHOOL_MANAGER" ||
      activeRole === "SUPERVISOR"
    ) {
      return this.prisma.studentGrade.findMany({
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

    if (activeRole === "TEACHER") {
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

      const teacherScopedWhere: Prisma.StudentGradeWhereInput = {
        ...where,
        OR: assignments.map((assignment) => ({
          classId: assignment.classId,
          subjectId: assignment.subjectId,
        })),
      };

      return this.prisma.studentGrade.findMany({
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

    if (activeRole === "STUDENT") {
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

      return this.prisma.studentGrade.findMany({
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

    throw new ForbiddenException(
      translateStudentGradesError(locale, "studentGrades.errors.notAccessible"),
    );
  }

  async update(
    user: AuthenticatedUser,
    schoolId: string,
    studentGradeId: string,
    payload: UpdateStudentGradeDto,
  ) {
    const locale = studentGradesLocaleFromUser(user);
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId, locale);

    const studentGrade = await this.prisma.studentGrade.findFirst({
      where: { id: studentGradeId, schoolId: effectiveSchoolId },
    });

    if (!studentGrade) {
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.gradeNotFound",
        ),
      );
    }

    if (user.activeRole === "TEACHER") {
      await this.ensureTeacherAssignment(
        user.id,
        effectiveSchoolId,
        studentGrade.classId,
        studentGrade.subjectId,
        studentGrade.schoolYearId,
        locale,
      );
    }

    return this.prisma.studentGrade.update({
      where: { id: studentGrade.id },
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
    const locale = studentGradesLocaleFromUser(user);
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId, locale);
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

    const activeRole = user.activeRole;

    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      activeRole === "SCHOOL_ADMIN" ||
      activeRole === "SCHOOL_MANAGER" ||
      activeRole === "SUPERVISOR"
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
    } else if (activeRole === "TEACHER") {
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

  async remove(
    user: AuthenticatedUser,
    schoolId: string,
    studentGradeId: string,
  ) {
    const locale = studentGradesLocaleFromUser(user);
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId, locale);

    const studentGrade = await this.prisma.studentGrade.findFirst({
      where: {
        id: studentGradeId,
        schoolId: effectiveSchoolId,
      },
    });

    if (!studentGrade) {
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.gradeNotFound",
        ),
      );
    }

    return this.prisma.studentGrade.delete({ where: { id: studentGrade.id } });
  }

  private getEffectiveSchoolId(
    user: AuthenticatedUser,
    scopedSchoolId: string,
    locale: StudentGradesLocale = "fr",
  ): string {
    if (this.hasPlatformRole(user, "SUPER_ADMIN")) {
      return scopedSchoolId;
    }

    const hasMembership = user.memberships.some(
      (membership) => membership.schoolId === scopedSchoolId,
    );
    if (!hasMembership) {
      throw new ForbiddenException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.userNotBoundToSchool",
        ),
      );
    }

    return scopedSchoolId;
  }

  private async ensureTeacherAssignment(
    teacherUserId: string,
    schoolId: string,
    classId: string,
    subjectId: string,
    schoolYearId: string,
    locale: StudentGradesLocale = "fr",
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
        translateStudentGradesError(
          locale,
          "studentGrades.errors.teacherNotAssigned",
        ),
      );
    }
  }

  private async ensureStudentInSchool(
    studentId: string,
    schoolId: string,
    locale: StudentGradesLocale = "fr",
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.studentNotFound",
        ),
      );
    }
  }

  private async ensureStudentEnrollment(
    studentId: string,
    classId: string,
    schoolYearId: string,
    schoolId: string,
    locale: StudentGradesLocale = "fr",
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
      translateStudentGradesError(
        locale,
        "studentGrades.errors.studentNotEnrolled",
      ),
    );
  }

  private async ensureClassInSchool(
    classId: string,
    schoolId: string,
    locale: StudentGradesLocale = "fr",
  ) {
    const classFound = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, schoolYearId: true },
    });

    if (!classFound) {
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.classNotFound",
        ),
      );
    }

    return classFound;
  }

  private async ensureSubjectAllowedForClass(
    classId: string,
    subjectId: string,
    schoolId: string,
    locale: StudentGradesLocale = "fr",
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
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.classNotFound",
        ),
      );
    }

    if (override?.action === "REMOVE") {
      throw new ForbiddenException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.subjectNotAllowedForClass",
        ),
      );
    }

    if (override?.action === "ADD") {
      return;
    }

    if (!classEntity.curriculumId) {
      return;
    }

    const isInCurriculum = (classEntity.curriculum?.subjects?.length ?? 0) > 0;
    if (!isInCurriculum) {
      throw new ForbiddenException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.subjectNotInCurriculum",
        ),
      );
    }
  }

  private async ensureSubjectInSchool(
    subjectId: string,
    schoolId: string,
    locale: StudentGradesLocale = "fr",
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException(
        translateStudentGradesError(
          locale,
          "studentGrades.errors.subjectNotFound",
        ),
      );
    }
  }

  private hasPlatformRole(
    user: AuthenticatedUser,
    role: AuthenticatedUser["platformRoles"][number],
  ) {
    return user.platformRoles.includes(role);
  }
}
