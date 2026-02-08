import { ForbiddenException } from '@nestjs/common';
import { GradesService } from '../src/grades/grades.service';

describe('GradesService access rules', () => {
  const prisma = {
    student: { findFirst: jest.fn() },
    class: { findFirst: jest.fn() },
    subject: { findFirst: jest.fn() },
    teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
    grade: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    parentStudent: { findMany: jest.fn() }
  };

  const service = new GradesService(prisma as never);

  beforeEach(() => {
    Object.values(prisma).forEach((value) => {
      Object.values(value).forEach((fn) => {
        if (typeof fn === 'function') {
          fn.mockReset?.();
        }
      });
    });

    prisma.student.findFirst.mockResolvedValue({ id: 'student-1' });
    prisma.class.findFirst.mockResolvedValue({ id: 'class-1' });
    prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
  });

  it('blocks teacher create when assignment missing', async () => {
    prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          id: 'teacher-1',
          schoolId: 'school-1',
          role: 'TEACHER',
          firstName: 'A',
          lastName: 'B',
          email: 't@test.com'
        },
        'school-1',
        {
          studentId: 'student-1',
          classId: 'class-1',
          subjectId: 'subject-1',
          value: 15,
          maxValue: 20,
          term: 'TERM_1'
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('limits parent list to linked children', async () => {
    prisma.parentStudent.findMany.mockResolvedValue([{ studentId: 'student-1' }]);
    prisma.grade.findMany.mockResolvedValue([{ id: 'grade-1' }]);

    await service.list(
      {
        id: 'parent-1',
        schoolId: 'school-1',
        role: 'PARENT',
        firstName: 'P',
        lastName: 'Q',
        email: 'p@test.com'
      },
      'school-1',
      {}
    );

    expect(prisma.grade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: { in: ['student-1'] }
        })
      })
    );
  });

  it('limits student list to own profile', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'student-own' });
    prisma.grade.findMany.mockResolvedValue([{ id: 'grade-own' }]);

    await service.list(
      {
        id: 'user-student',
        schoolId: 'school-1',
        role: 'STUDENT',
        firstName: 'S',
        lastName: 'T',
        email: 's@test.com'
      },
      'school-1',
      {}
    );

    expect(prisma.grade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'student-own' })
      })
    );
  });
});
