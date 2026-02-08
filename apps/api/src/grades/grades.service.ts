import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { CreateGradeDto } from './dto/create-grade.dto.js';
import type { ListGradesDto } from './dto/list-grades.dto.js';
import type { UpdateGradeDto } from './dto/update-grade.dto.js';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, schoolId: string, payload: CreateGradeDto) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    await this.ensureStudentInSchool(payload.studentId, effectiveSchoolId);
    await this.ensureClassInSchool(payload.classId, effectiveSchoolId);
    await this.ensureSubjectInSchool(payload.subjectId, effectiveSchoolId);

    if (user.role === 'TEACHER') {
      await this.ensureTeacherAssignment(user.id, effectiveSchoolId, payload.classId, payload.subjectId);
    }

    return this.prisma.grade.create({
      data: {
        schoolId: effectiveSchoolId,
        studentId: payload.studentId,
        classId: payload.classId,
        subjectId: payload.subjectId,
        teacherUserId: user.id,
        value: payload.value,
        maxValue: payload.maxValue,
        term: payload.term
      }
    });
  }

  async list(user: AuthenticatedUser, schoolId: string, filters: ListGradesDto) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const where: Prisma.GradeWhereInput = {
      schoolId: effectiveSchoolId
    };

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
      return this.prisma.grade.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    if (user.role === 'TEACHER') {
      const assignments = await this.prisma.teacherClassSubject.findMany({
        where: {
          schoolId: effectiveSchoolId,
          teacherUserId: user.id
        },
        select: { classId: true, subjectId: true }
      });

      if (!assignments.length) {
        return [];
      }

      const teacherScopedWhere: Prisma.GradeWhereInput = {
        ...where,
        OR: assignments.map((assignment) => ({
          classId: assignment.classId,
          subjectId: assignment.subjectId
        }))
      };

      return this.prisma.grade.findMany({
        where: teacherScopedWhere,
        orderBy: { createdAt: 'desc' }
      });
    }

    if (user.role === 'PARENT') {
      const links = await this.prisma.parentStudent.findMany({
        where: {
          schoolId: effectiveSchoolId,
          parentUserId: user.id
        },
        select: { studentId: true }
      });

      if (!links.length) {
        return [];
      }

      return this.prisma.grade.findMany({
        where: {
          ...where,
          studentId: { in: links.map((link) => link.studentId) }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (user.role === 'STUDENT') {
      const student = await this.prisma.student.findFirst({
        where: {
          schoolId: effectiveSchoolId,
          userId: user.id
        },
        select: { id: true }
      });

      if (!student) {
        return [];
      }

      return this.prisma.grade.findMany({
        where: {
          ...where,
          studentId: student.id
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    throw new ForbiddenException('Unsupported role');
  }

  async update(user: AuthenticatedUser, schoolId: string, gradeId: string, payload: UpdateGradeDto) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId: effectiveSchoolId }
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (user.role === 'TEACHER') {
      await this.ensureTeacherAssignment(user.id, effectiveSchoolId, grade.classId, grade.subjectId);
    }

    return this.prisma.grade.update({
      where: { id: grade.id },
      data: {
        value: payload.value,
        maxValue: payload.maxValue,
        term: payload.term
      }
    });
  }

  async remove(user: AuthenticatedUser, schoolId: string, gradeId: string) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const grade = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        schoolId: effectiveSchoolId
      }
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return this.prisma.grade.delete({ where: { id: grade.id } });
  }

  private getEffectiveSchoolId(user: AuthenticatedUser, scopedSchoolId: string): string {
    if (user.role === 'SUPER_ADMIN') {
      return scopedSchoolId;
    }

    return user.schoolId;
  }

  private async ensureTeacherAssignment(
    teacherUserId: string,
    schoolId: string,
    classId: string,
    subjectId: string
  ) {
    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        teacherUserId,
        classId,
        subjectId
      },
      select: { id: true }
    });

    if (!assignment) {
      throw new ForbiddenException('Teacher is not assigned to this class/subject');
    }
  }

  private async ensureStudentInSchool(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureClassInSchool(classId: string, schoolId: string) {
    const classFound = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true }
    });

    if (!classFound) {
      throw new NotFoundException('Class not found');
    }
  }

  private async ensureSubjectInSchool(subjectId: string, schoolId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true }
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
  }
}
