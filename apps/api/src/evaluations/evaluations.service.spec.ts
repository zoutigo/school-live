import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Term } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { GradePublishedNotificationsService } from "../notifications/grade-published-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { EvaluationsService } from "./evaluations.service.js";
import {
  translateEvaluationsError,
  type EvaluationsLocale,
} from "./evaluations.translations.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  class: { findFirst: jest.fn() },
  evaluation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  evaluationType: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  evaluationAuditLog: { create: jest.fn() },
  subject: { findFirst: jest.fn(), findMany: jest.fn() },
  subjectBranch: { findFirst: jest.fn(), findMany: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
  enrollment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  student: { findFirst: jest.fn() },
  parentStudent: { findFirst: jest.fn() },
  studentTermReport: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  curriculumSubject: { findMany: jest.fn() },
  classSubjectOverride: { findMany: jest.fn() },
  $transaction: jest.fn(),
});

const makeGradeNotificationsMock = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
});

function makeEvaluation(
  overrides: Partial<{
    id: string;
    subjectId: string;
    sequence: string;
    isFinalExam: boolean;
    maxScore: number;
    coefficient: number;
    status: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    scheduledAt: Date | null;
    scores: Array<{ studentId: string; score: number | null; status: string }>;
    subject: { id: string; name: string };
    subjectBranch: null;
    evaluationType: { id: string; code: string; label: string };
    attachments: never[];
    _count: { scores: number };
    class: { id: string; name: string; schoolYearId?: string };
    authorUser: { id: string; firstName: string; lastName: string };
  }> = {},
) {
  return {
    id: "eval-1",
    subjectId: "subject-1",
    sequence: "SEQ_1",
    isFinalExam: false,
    maxScore: 20,
    coefficient: 1,
    status: "PUBLISHED",
    title: "Devoir 1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    scheduledAt: null,
    scores: [],
    subject: { id: "subject-1", name: "Maths" },
    subjectBranch: null,
    evaluationType: { id: "type-1", code: "DEVOIR", label: "Devoir" },
    attachments: [],
    _count: { scores: 0 },
    class: { id: "class-1", name: "6ème A", schoolYearId: "year-1" },
    authorUser: { id: "teacher-1", firstName: "Awa", lastName: "Diallo" },
    ...overrides,
  };
}

describe("EvaluationsService", () => {
  let service: EvaluationsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const gradeNotifications = makeGradeNotificationsMock();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GradePublishedNotificationsService,
          useValue: gradeNotifications,
        },
      ],
    }).compile();

    service = module.get(EvaluationsService);
  });

  describe("ensureClassAccessible (via listClassEvaluations)", () => {
    it("throws a translated NotFoundException when the class does not exist (fr default)", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(
          makeUser({ preferredLocale: "FR" }),
          "school-1",
          "class-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("fr", "evaluations.errors.classNotFound"),
        ),
      );
    });

    it("throws a translated NotFoundException when the class does not exist (en)", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(
          makeUser({ preferredLocale: "EN" }),
          "school-1",
          "class-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("en", "evaluations.errors.classNotFound"),
        ),
      );
    });

    it("defaults to fr when preferredLocale is undefined", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(makeUser(), "school-1", "class-1"),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("fr", "evaluations.errors.classNotFound"),
        ),
      );
    });
  });

  it("each translated locale produces a distinct, non-empty message", () => {
    const locales: EvaluationsLocale[] = ["fr", "en"];
    const messages = locales.map((locale) =>
      translateEvaluationsError(locale, "evaluations.errors.classNotFound"),
    );
    expect(new Set(messages).size).toBe(locales.length);
    for (const message of messages) {
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });

  describe("listClassEvaluations — sequence fields", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    });

    it("derives term from sequence (SEQ_1 → TERM_1)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_1" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_1");
    });

    it("derives term from sequence (SEQ_3 → TERM_2)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_3" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_2");
    });

    it("derives term from sequence (SEQ_5 → TERM_3)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_5" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_3");
    });

    it("countsForAverage=true for odd sequence + formative (SEQ_1, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_1", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=true for odd sequence + final exam (SEQ_3, isFinalExam=true)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_3", isFinalExam: true }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=false for even sequence + formative (SEQ_2, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_2", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(false);
    });

    it("countsForAverage=true for even sequence + final exam (SEQ_4, isFinalExam=true)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_4", isFinalExam: true }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=false for even sequence + formative (SEQ_6, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_6", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(false);
    });

    it("returns correct term and countsForAverage for all 6 sequences", async () => {
      const expectations = [
        { sequence: "SEQ_1", isFinalExam: false, term: "TERM_1", counts: true },
        {
          sequence: "SEQ_2",
          isFinalExam: false,
          term: "TERM_1",
          counts: false,
        },
        { sequence: "SEQ_2", isFinalExam: true, term: "TERM_1", counts: true },
        { sequence: "SEQ_3", isFinalExam: false, term: "TERM_2", counts: true },
        {
          sequence: "SEQ_4",
          isFinalExam: false,
          term: "TERM_2",
          counts: false,
        },
        { sequence: "SEQ_4", isFinalExam: true, term: "TERM_2", counts: true },
        { sequence: "SEQ_5", isFinalExam: false, term: "TERM_3", counts: true },
        {
          sequence: "SEQ_6",
          isFinalExam: false,
          term: "TERM_3",
          counts: false,
        },
        { sequence: "SEQ_6", isFinalExam: true, term: "TERM_3", counts: true },
      ];

      for (const { sequence, isFinalExam, term, counts } of expectations) {
        prisma.evaluation.findMany.mockResolvedValue([
          makeEvaluation({ sequence: sequence as never, isFinalExam }),
        ]);

        const result = await service.listClassEvaluations(
          makeUser(),
          "school-1",
          "class-1",
        );

        expect(result[0].term).toBe(term);
        expect(result[0].countsForAverage).toBe(counts);
      }
    });

    it("exposes class and author (teacher) instead of the raw authorUser relation", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          class: { id: "class-9", name: "5ème B", schoolYearId: "year-9" },
          authorUser: {
            id: "teacher-9",
            firstName: "Jean",
            lastName: "Kamga",
          },
        }),
      ]);
      prisma.enrollment.count.mockResolvedValue(27);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].class).toEqual({
        id: "class-9",
        name: "5ème B",
        studentsCount: 27,
      });
      expect(prisma.enrollment.count).toHaveBeenCalledWith({
        where: {
          schoolId: "school-1",
          classId: "class-9",
          schoolYearId: "year-9",
          status: "ACTIVE",
        },
      });
      expect(result[0].author).toEqual({
        id: "teacher-9",
        firstName: "Jean",
        lastName: "Kamga",
      });
      expect(
        (result[0] as { authorUser?: unknown }).authorUser,
      ).toBeUndefined();
    });
  });

  describe("listSchoolEvaluations", () => {
    it("autorise un SCHOOL_ADMIN et liste sans filtre par défaut", async () => {
      prisma.evaluation.findMany.mockResolvedValue([makeEvaluation()]);

      const result = await service.listSchoolEvaluations(
        makeUser(),
        "school-1",
        {},
      );

      expect(result).toHaveLength(1);
      expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: "school-1" },
        }),
      );
    });

    it("filtre par classId quand fourni", async () => {
      prisma.evaluation.findMany.mockResolvedValue([makeEvaluation()]);

      await service.listSchoolEvaluations(makeUser(), "school-1", {
        classId: "class-9",
      });

      expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: "school-1", classId: "class-9" },
        }),
      );
    });

    it("filtre par academicLevelId quand fourni", async () => {
      prisma.evaluation.findMany.mockResolvedValue([makeEvaluation()]);

      await service.listSchoolEvaluations(makeUser(), "school-1", {
        academicLevelId: "level-9",
      });

      expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId: "school-1",
            class: { academicLevelId: "level-9" },
          },
        }),
      );
    });

    it("combine classId et academicLevelId quand les deux sont fournis", async () => {
      prisma.evaluation.findMany.mockResolvedValue([makeEvaluation()]);

      await service.listSchoolEvaluations(makeUser(), "school-1", {
        classId: "class-9",
        academicLevelId: "level-9",
      });

      expect(prisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId: "school-1",
            classId: "class-9",
            class: { academicLevelId: "level-9" },
          },
        }),
      );
    });

    it("expose class et author sur chaque évaluation", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          class: { id: "class-9", name: "5ème B", schoolYearId: "year-9" },
          authorUser: {
            id: "teacher-9",
            firstName: "Jean",
            lastName: "Kamga",
          },
        }),
      ]);
      prisma.enrollment.count.mockResolvedValue(18);

      const result = await service.listSchoolEvaluations(
        makeUser(),
        "school-1",
        {},
      );

      expect(result[0].class).toEqual({
        id: "class-9",
        name: "5ème B",
        studentsCount: 18,
      });
      expect(result[0].author).toEqual({
        id: "teacher-9",
        firstName: "Jean",
        lastName: "Kamga",
      });
    });

    it("calcule l'effectif par classe (une seule requête par classe/année distincte), utile en navigation toute l'école", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-a",
          class: { id: "class-9", name: "5ème B", schoolYearId: "year-1" },
        }),
        makeEvaluation({
          id: "eval-b",
          class: { id: "class-9", name: "5ème B", schoolYearId: "year-1" },
        }),
        makeEvaluation({
          id: "eval-c",
          class: { id: "class-10", name: "5ème C", schoolYearId: "year-1" },
        }),
      ]);
      prisma.enrollment.count.mockImplementation(
        ({ where }: { where: { classId: string } }) =>
          Promise.resolve(where.classId === "class-9" ? 24 : 30),
      );

      const result = await service.listSchoolEvaluations(
        makeUser(),
        "school-1",
        {},
      );

      expect(result[0].class.studentsCount).toBe(24);
      expect(result[1].class.studentsCount).toBe(24);
      expect(result[2].class.studentsCount).toBe(30);
      // Une classe partagée par plusieurs évaluations n'est comptée qu'une fois.
      expect(prisma.enrollment.count).toHaveBeenCalledTimes(2);
    });

    it("refuse l'accès à un utilisateur sans rôle admin/manager/supervisor sur l'école", async () => {
      await expect(
        service.listSchoolEvaluations(
          makeUser({
            memberships: [{ schoolId: "school-1", role: "TEACHER" }],
          }),
          "school-1",
          {},
        ),
      ).rejects.toThrow(
        translateEvaluationsError(
          "fr" as EvaluationsLocale,
          "evaluations.errors.forbidden",
        ),
      );
      expect(prisma.evaluation.findMany).not.toHaveBeenCalled();
    });

    it("autorise un SUPER_ADMIN plateforme sans membership école", async () => {
      prisma.evaluation.findMany.mockResolvedValue([]);

      await expect(
        service.listSchoolEvaluations(
          makeUser({ memberships: [], platformRoles: ["SUPER_ADMIN"] }),
          "school-1",
          {},
        ),
      ).resolves.toEqual([]);
    });
  });

  describe("listStudentNotes — fusion des matières SEQ1/SEQ2", () => {
    beforeEach(() => {
      prisma.student.findFirst.mockResolvedValue({
        id: "student-1",
        firstName: "Ada",
        lastName: "Lovelace",
      });
      prisma.enrollment.findMany.mockResolvedValue([
        {
          classId: "class-1",
          schoolYearId: "year-1",
          class: { id: "class-1", name: "6ème A", curriculumId: null },
        },
      ]);
      prisma.studentTermReport.findMany.mockResolvedValue([]);
      prisma.classSubjectOverride.findMany.mockResolvedValue([]);
      prisma.curriculumSubject.findMany.mockResolvedValue([]);
    });

    it("ne renvoie qu'une seule entrée par matière évaluée dans SEQ1 et SEQ2, avec des ids uniques", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-seq1",
          sequence: "SEQ_1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [{ studentId: "student-1", score: 15, status: "ENTERED" }],
        }),
        makeEvaluation({
          id: "eval-seq2",
          sequence: "SEQ_2",
          isFinalExam: true,
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [{ studentId: "student-1", score: 17, status: "ENTERED" }],
        }),
      ]);

      const result = await service.listStudentNotes(
        makeUser(),
        "school-1",
        "student-1",
        Term.TERM_1,
      );

      const term1 = result.find((snapshot) => snapshot.term === "TERM_1");
      expect(term1).toBeDefined();

      const subjectIds = term1!.subjects.map((subject) => subject.id);
      expect(subjectIds).toEqual(["subject-1"]);
      expect(new Set(subjectIds).size).toBe(subjectIds.length);

      const mathsSubject = term1!.subjects[0];
      expect(mathsSubject.evaluations.map((e) => e.id).sort()).toEqual([
        "eval-seq1",
        "eval-seq2",
      ]);
      expect(mathsSubject.studentAverage).toBe(16);
    });

    it("garde des matières distinctes si elles ne sont évaluées que dans une seule séquence", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-maths",
          sequence: "SEQ_1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [{ studentId: "student-1", score: 15, status: "ENTERED" }],
        }),
        makeEvaluation({
          id: "eval-fr",
          sequence: "SEQ_2",
          subjectId: "subject-2",
          subject: { id: "subject-2", name: "Français" },
          scores: [{ studentId: "student-1", score: 12, status: "ENTERED" }],
        }),
      ]);

      const result = await service.listStudentNotes(
        makeUser(),
        "school-1",
        "student-1",
        Term.TERM_1,
      );

      const term1 = result.find((snapshot) => snapshot.term === "TERM_1");
      const subjectIds = term1!.subjects.map((subject) => subject.id).sort();
      expect(subjectIds).toEqual(["subject-1", "subject-2"]);
    });
  });

  describe("listStudentNotes — rang et effectif par matière", () => {
    beforeEach(() => {
      prisma.student.findFirst.mockResolvedValue({
        id: "student-1",
        firstName: "Ada",
        lastName: "Lovelace",
      });
      prisma.enrollment.findMany.mockResolvedValue([
        {
          classId: "class-1",
          schoolYearId: "year-1",
          class: { id: "class-1", name: "6ème A", curriculumId: null },
        },
      ]);
      prisma.studentTermReport.findMany.mockResolvedValue([]);
      prisma.classSubjectOverride.findMany.mockResolvedValue([]);
      prisma.curriculumSubject.findMany.mockResolvedValue([]);
    });

    it("classe l'élève parmi ses camarades pour chaque matière (1 = meilleure moyenne)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-1",
          sequence: "SEQ_1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [
            { studentId: "student-1", score: 15, status: "ENTERED" },
            { studentId: "student-2", score: 18, status: "ENTERED" },
            { studentId: "student-3", score: 10, status: "ENTERED" },
          ],
        }),
      ]);

      const result = await service.listStudentNotes(
        makeUser(),
        "school-1",
        "student-1",
        Term.TERM_1,
      );
      const term1 = result.find((snapshot) => snapshot.term === "TERM_1");
      const maths = term1!.subjects.find(
        (subject) => subject.id === "subject-1",
      );

      expect(maths?.rank).toBe(2);
      expect(maths?.classSize).toBe(3);
    });

    it("attribue le même rang aux élèves ex æquo", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-1",
          sequence: "SEQ_1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [
            { studentId: "student-1", score: 15, status: "ENTERED" },
            { studentId: "student-2", score: 15, status: "ENTERED" },
            { studentId: "student-3", score: 10, status: "ENTERED" },
          ],
        }),
      ]);

      const result = await service.listStudentNotes(
        makeUser(),
        "school-1",
        "student-1",
        Term.TERM_1,
      );
      const term1 = result.find((snapshot) => snapshot.term === "TERM_1");
      const maths = term1!.subjects.find(
        (subject) => subject.id === "subject-1",
      );

      expect(maths?.rank).toBe(1);
      expect(maths?.classSize).toBe(3);
    });

    it("renvoie rank=null quand l'élève n'a pas de moyenne dans la matière", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({
          id: "eval-1",
          sequence: "SEQ_1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
          scores: [
            { studentId: "student-1", score: null, status: "ABSENT" },
            { studentId: "student-2", score: 18, status: "ENTERED" },
          ],
        }),
      ]);

      const result = await service.listStudentNotes(
        makeUser(),
        "school-1",
        "student-1",
        Term.TERM_1,
      );
      const term1 = result.find((snapshot) => snapshot.term === "TERM_1");
      const maths = term1!.subjects.find(
        (subject) => subject.id === "subject-1",
      );

      expect(maths?.rank).toBeNull();
      expect(maths?.classSize).toBeNull();
    });
  });

  describe("getTeacherContext — isReferentTeacher", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
      referentTeacherUserId: "teacher-referent",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.teacherClassSubject.findMany.mockResolvedValue([]);
      prisma.subjectBranch.findMany.mockResolvedValue([]);
      prisma.evaluationType.findMany.mockResolvedValue([]);
      prisma.enrollment.findMany.mockResolvedValue([]);
    });

    it("isReferentTeacher=true quand l'utilisateur est l'enseignant référent de la classe", async () => {
      const result = await service.getTeacherContext(
        makeUser({ id: "teacher-referent" }),
        "school-1",
        "class-1",
      );

      expect(result.class.isReferentTeacher).toBe(true);
    });

    it("isReferentTeacher=false pour un autre enseignant", async () => {
      const result = await service.getTeacherContext(
        makeUser({ id: "teacher-other" }),
        "school-1",
        "class-1",
      );

      expect(result.class.isReferentTeacher).toBe(false);
    });
  });

  describe("upsertClassTermReports — appréciation générale réservée au référent", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
      referentTeacherUserId: "teacher-referent",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.teacherClassSubject.findMany.mockResolvedValue([
        {
          id: "assign-1",
          subjectId: "subject-1",
          subject: { id: "subject-1", name: "Maths" },
        },
      ]);
      prisma.enrollment.findMany.mockResolvedValue([
        {
          studentId: "student-1",
          student: { id: "student-1", firstName: "Ada", lastName: "Lovelace" },
        },
      ]);
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.studentTermReport.findUnique.mockResolvedValue(null);
      prisma.studentTermReport.upsert.mockResolvedValue({});
      prisma.studentTermReport.findMany.mockResolvedValue([]);
      prisma.subjectBranch.findMany.mockResolvedValue([]);
      prisma.evaluationType.findMany.mockResolvedValue([]);
      prisma.teacherClassSubject.findFirst.mockResolvedValue({
        id: "assign-1",
      });
    });

    function makeTeacher(id: string) {
      return makeUser({
        id,
        memberships: [{ schoolId: "school-1", role: "TEACHER" }],
      });
    }

    it("ignore l'appréciation générale envoyée par un enseignant non référent", async () => {
      await service.upsertClassTermReports(
        makeTeacher("teacher-other"),
        "school-1",
        "class-1",
        Term.TERM_1,
        {
          status: "DRAFT",
          reports: [
            {
              studentId: "student-1",
              generalAppreciation: "Tentative non autorisée",
              subjects: [],
            },
          ],
        } as never,
      );

      const upsertArgs = prisma.studentTermReport.upsert.mock.calls[0][0] as {
        create: { generalAppreciation: string | null };
      };
      expect(upsertArgs.create.generalAppreciation).toBeNull();
    });

    it("applique l'appréciation générale envoyée par l'enseignant référent", async () => {
      await service.upsertClassTermReports(
        makeTeacher("teacher-referent"),
        "school-1",
        "class-1",
        Term.TERM_1,
        {
          status: "DRAFT",
          reports: [
            {
              studentId: "student-1",
              generalAppreciation: "Bon trimestre",
              subjects: [],
            },
          ],
        } as never,
      );

      const upsertArgs = prisma.studentTermReport.upsert.mock.calls[0][0] as {
        create: { generalAppreciation: string | null };
      };
      expect(upsertArgs.create.generalAppreciation).toBe("Bon trimestre");
    });

    it("autorise l'appréciation d'une matière liée au curriculum national (Subject.schoolId null) pour un admin école", async () => {
      // Les matières issues du catalogue curriculum national ont schoolId
      // null (voir management.service.ts#listSubjects) ; le fallback "tous
      // les sujets de l'école" doit donc matcher schoolId OU schoolId null,
      // pas schoolId seul.
      prisma.subject.findMany.mockResolvedValue([{ id: "subject-1" }]);

      const admin = makeUser({
        id: "admin-1",
        memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
      });

      await service.upsertClassTermReports(
        admin,
        "school-1",
        "class-1",
        Term.TERM_1,
        {
          status: "DRAFT",
          reports: [
            {
              studentId: "student-1",
              subjects: [{ subjectId: "subject-1", appreciation: "Bon élève" }],
            },
          ],
        } as never,
      );

      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        where: { OR: [{ schoolId: "school-1" }, { schoolId: null }] },
        select: { id: true },
      });
      expect(prisma.studentTermReport.upsert).toHaveBeenCalled();
    });
  });

  describe("createEvaluation / updateEvaluation — description avec image", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.evaluationType.upsert.mockResolvedValue({});
      prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
      prisma.evaluationType.findFirst.mockResolvedValue({ id: "type-1" });
      prisma.evaluationAuditLog.create.mockResolvedValue({});
    });

    it.each(["png", "jpg", "jpeg", "webp", "gif", "heic"])(
      "conserve une description composée uniquement d'une image .%s (sans texte) à la création",
      async (ext) => {
        prisma.evaluation.create.mockResolvedValue(
          makeEvaluation({ id: "eval-1" }),
        );

        await service.createEvaluation(makeUser(), "school-1", "class-1", {
          subjectId: "subject-1",
          evaluationTypeId: "type-1",
          title: "Interro 1",
          description: `<div><img src="https://cdn.example.com/x.${ext}" /></div>`,
          coefficient: 1,
          maxScore: 20,
          sequence: "SEQ_1" as never,
        });

        const createArgs = prisma.evaluation.create.mock.calls[0][0] as {
          data: { description: string | null };
        };
        expect(createArgs.data.description).not.toBeNull();
        expect(createArgs.data.description).toContain("<img");
      },
    );

    it.each(["png", "jpg", "jpeg", "webp", "gif", "heic"])(
      "conserve une description composée uniquement d'une image .%s lors d'une modification",
      async (ext) => {
        const html = `<div><img src="https://cdn.example.com/y.${ext}" /></div>`;
        prisma.evaluation.findFirst.mockResolvedValue(
          makeEvaluation({ id: "eval-1", subjectId: "subject-1" }),
        );
        prisma.evaluation.update.mockResolvedValue(
          makeEvaluation({ id: "eval-1" }),
        );

        await service.updateEvaluation(
          makeUser(),
          "school-1",
          "class-1",
          "eval-1",
          { description: html },
        );

        const updateArgs = prisma.evaluation.update.mock.calls[0][0] as {
          data: { description: string | null };
        };
        expect(updateArgs.data.description).not.toBeNull();
        expect(updateArgs.data.description).toContain("<img");
      },
    );
  });

  describe("getEvaluation — champs class et author", () => {
    it("expose class et author (enseignant) au lieu de la relation brute authorUser", async () => {
      prisma.evaluation.findFirst.mockResolvedValue(
        makeEvaluation({
          id: "eval-1",
          class: { id: "class-9", name: "5ème B" },
          authorUser: {
            id: "teacher-9",
            firstName: "Jean",
            lastName: "Kamga",
          },
        }),
      );
      prisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.getEvaluation(
        makeUser(),
        "school-1",
        "class-1",
        "eval-1",
      );

      expect(result.class).toEqual({ id: "class-9", name: "5ème B" });
      expect(result.author).toEqual({
        id: "teacher-9",
        firstName: "Jean",
        lastName: "Kamga",
      });
      expect((result as { authorUser?: unknown }).authorUser).toBeUndefined();
    });
  });

  describe("updateEvaluation — champs class et author sur la réponse", () => {
    it("expose class et author (enseignant) après mise à jour", async () => {
      prisma.evaluation.findFirst.mockResolvedValue(
        makeEvaluation({ id: "eval-1", subjectId: "subject-1" }),
      );
      prisma.evaluation.update.mockResolvedValue(
        makeEvaluation({
          id: "eval-1",
          class: { id: "class-9", name: "5ème B" },
          authorUser: {
            id: "teacher-9",
            firstName: "Jean",
            lastName: "Kamga",
          },
        }),
      );

      const result = await service.updateEvaluation(
        makeUser(),
        "school-1",
        "class-1",
        "eval-1",
        { title: "Titre modifié" },
      );

      expect(result.class).toEqual({ id: "class-9", name: "5ème B" });
      expect(result.author).toEqual({
        id: "teacher-9",
        firstName: "Jean",
        lastName: "Kamga",
      });
      expect((result as { authorUser?: unknown }).authorUser).toBeUndefined();
    });
  });
});
