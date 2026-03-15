import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EvaluationStatus,
  Term,
  TermReportStatus,
  type Prisma,
} from "@prisma/client";
import {
  hasMeaningfulRichTextContent,
  sanitizeRichTextHtml,
} from "../common/rich-text-sanitizer.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { CreateEvaluationDto } from "./dto/create-evaluation.dto.js";
import type { UpdateEvaluationDto } from "./dto/update-evaluation.dto.js";
import type { UpsertEvaluationScoresDto } from "./dto/upsert-evaluation-scores.dto.js";
import type { UpsertTermReportsDto } from "./dto/upsert-term-reports.dto.js";

const DEFAULT_EVALUATION_TYPES = [
  { code: "DEVOIR", label: "Devoir" },
  { code: "INTERROGATION", label: "Interrogation" },
  { code: "COMPOSITION", label: "Composition" },
  { code: "TP", label: "TP / Projet" },
  { code: "ORAL", label: "Oral" },
] as const;

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultEvaluationTypes(schoolId: string) {
    await Promise.all(
      DEFAULT_EVALUATION_TYPES.map((type) =>
        this.prisma.evaluationType.upsert({
          where: { schoolId_code: { schoolId, code: type.code } },
          update: { label: type.label },
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

  async getTeacherContext(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    await this.ensureDefaultEvaluationTypes(schoolId);
    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    const assignments = await this.listAccessibleAssignments(
      user,
      schoolId,
      classId,
    );
    const subjectIds = assignments.map((item) => item.subjectId);

    const [branches, evaluationTypes, students] = await Promise.all([
      this.prisma.subjectBranch.findMany({
        where: {
          schoolId,
          subjectId: { in: subjectIds.length ? subjectIds : ["__none__"] },
        },
        orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
      }),
      this.prisma.evaluationType.findMany({
        where: { schoolId },
        orderBy: [{ isDefault: "desc" }, { label: "asc" }],
      }),
      this.prisma.enrollment.findMany({
        where: {
          schoolId,
          classId,
          schoolYearId: classEntity.schoolYearId,
          status: "ACTIVE",
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      class: {
        id: classEntity.id,
        name: classEntity.name,
        schoolYearId: classEntity.schoolYearId,
      },
      subjects: assignments.map((assignment) => ({
        id: assignment.subjectId,
        name: assignment.subject.name,
        branches: branches
          .filter((branch) => branch.subjectId === assignment.subjectId)
          .map((branch) => ({
            id: branch.id,
            name: branch.name,
            code: branch.code,
          })),
      })),
      evaluationTypes: evaluationTypes.map((type) => ({
        id: type.id,
        code: type.code,
        label: type.label,
        isDefault: type.isDefault,
      })),
      students: students.map((row) => row.student),
    };
  }

  async listClassEvaluations(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    await this.ensureClassAccessible(user, schoolId, classId);
    const subjectIds = await this.listAccessibleSubjectIds(
      user,
      schoolId,
      classId,
    );
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        schoolId,
        classId,
        ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        subjectBranch: { select: { id: true, name: true } },
        evaluationType: { select: { id: true, code: true, label: true } },
        attachments: true,
        _count: { select: { scores: true } },
      },
      orderBy: [
        { createdAt: "desc" },
        { subject: { name: "asc" } },
        { subjectBranch: { name: "asc" } },
      ],
    });

    return evaluations;
  }

  async createEvaluation(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    payload: CreateEvaluationDto,
  ) {
    await this.ensureDefaultEvaluationTypes(schoolId);
    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    await this.ensureSubjectAccessible(
      user,
      schoolId,
      classId,
      classEntity.schoolYearId,
      payload.subjectId,
    );
    await this.ensureEvaluationTypeInSchool(schoolId, payload.evaluationTypeId);
    await this.ensureSubjectBranchBelongsToSubject(
      schoolId,
      payload.subjectId,
      payload.subjectBranchId,
    );

    const status =
      payload.status === "PUBLISHED"
        ? EvaluationStatus.PUBLISHED
        : EvaluationStatus.DRAFT;
    const sanitizedDescription = sanitizeRichTextHtml(payload.description, {
      allowImages: false,
    });

    const evaluation = await this.prisma.evaluation.create({
      data: {
        schoolId,
        schoolYearId: classEntity.schoolYearId,
        classId,
        subjectId: payload.subjectId,
        subjectBranchId: payload.subjectBranchId ?? null,
        evaluationTypeId: payload.evaluationTypeId,
        authorUserId: user.id,
        title: payload.title.trim(),
        description: hasMeaningfulRichTextContent(sanitizedDescription)
          ? sanitizedDescription
          : null,
        coefficient: payload.coefficient,
        maxScore: payload.maxScore,
        term: payload.term,
        status,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        publishedAt: status === EvaluationStatus.PUBLISHED ? new Date() : null,
        attachments: {
          create: (payload.attachments ?? []).map((attachment) => ({
            schoolId,
            fileName: attachment.fileName.trim(),
            fileUrl: attachment.fileUrl?.trim() || null,
            sizeLabel: attachment.sizeLabel?.trim() || null,
            mimeType: attachment.mimeType?.trim() || null,
          })),
        },
      },
      include: {
        subject: { select: { id: true, name: true } },
        subjectBranch: { select: { id: true, name: true } },
        evaluationType: { select: { id: true, code: true, label: true } },
        attachments: true,
      },
    });

    await this.logAudit(
      schoolId,
      evaluation.id,
      user.id,
      status === EvaluationStatus.PUBLISHED ? "PUBLISHED" : "CREATED",
      this.toAuditJson(payload),
    );
    return evaluation;
  }

  async getEvaluation(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    evaluationId: string,
  ) {
    const evaluation = await this.findAccessibleEvaluation(
      user,
      schoolId,
      classId,
      evaluationId,
    );
    const students = await this.prisma.enrollment.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId: evaluation.schoolYearId,
        status: "ACTIVE",
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      ...evaluation,
      students: students.map((row) => {
        const score = evaluation.scores.find(
          (entry) => entry.studentId === row.student.id,
        );
        return {
          ...row.student,
          score: score?.score ?? null,
          scoreStatus: score?.status ?? "NOT_GRADED",
          comment: score?.comment ?? null,
        };
      }),
    };
  }

  async updateEvaluation(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    evaluationId: string,
    payload: UpdateEvaluationDto,
  ) {
    const existing = await this.findAccessibleEvaluation(
      user,
      schoolId,
      classId,
      evaluationId,
    );
    if (payload.subjectId) {
      await this.ensureSubjectAccessible(
        user,
        schoolId,
        classId,
        existing.schoolYearId,
        payload.subjectId,
      );
    }
    await this.ensureSubjectBranchBelongsToSubject(
      schoolId,
      payload.subjectId ?? existing.subjectId,
      payload.subjectBranchId,
    );
    if (payload.evaluationTypeId) {
      await this.ensureEvaluationTypeInSchool(
        schoolId,
        payload.evaluationTypeId,
      );
    }

    const nextStatus =
      payload.status === "PUBLISHED"
        ? EvaluationStatus.PUBLISHED
        : payload.status === "DRAFT"
          ? EvaluationStatus.DRAFT
          : existing.status;
    const sanitizedDescription =
      payload.description === undefined
        ? undefined
        : sanitizeRichTextHtml(payload.description, {
            allowImages: false,
          });

    const updated = await this.prisma.evaluation.update({
      where: { id: existing.id },
      data: {
        subjectId: payload.subjectId,
        subjectBranchId:
          payload.subjectBranchId === undefined
            ? undefined
            : payload.subjectBranchId || null,
        evaluationTypeId: payload.evaluationTypeId,
        title: payload.title?.trim(),
        description:
          payload.description === undefined
            ? undefined
            : hasMeaningfulRichTextContent(sanitizedDescription)
              ? sanitizedDescription
              : null,
        coefficient: payload.coefficient,
        maxScore: payload.maxScore,
        term: payload.term,
        status: nextStatus,
        scheduledAt:
          payload.scheduledAt === undefined
            ? undefined
            : payload.scheduledAt
              ? new Date(payload.scheduledAt)
              : null,
        publishedAt:
          nextStatus === EvaluationStatus.PUBLISHED &&
          existing.status !== EvaluationStatus.PUBLISHED
            ? new Date()
            : undefined,
        attachments:
          payload.attachments === undefined
            ? undefined
            : {
                deleteMany: {},
                create: payload.attachments.map((attachment) => ({
                  schoolId,
                  fileName: attachment.fileName.trim(),
                  fileUrl: attachment.fileUrl?.trim() || null,
                  sizeLabel: attachment.sizeLabel?.trim() || null,
                  mimeType: attachment.mimeType?.trim() || null,
                })),
              },
      },
      include: {
        subject: { select: { id: true, name: true } },
        subjectBranch: { select: { id: true, name: true } },
        evaluationType: { select: { id: true, code: true, label: true } },
        attachments: true,
      },
    });

    await this.logAudit(
      schoolId,
      existing.id,
      user.id,
      nextStatus === EvaluationStatus.PUBLISHED &&
        existing.status !== EvaluationStatus.PUBLISHED
        ? "PUBLISHED"
        : "UPDATED",
      this.toAuditJson(payload),
    );

    return updated;
  }

  async upsertScores(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    evaluationId: string,
    payload: UpsertEvaluationScoresDto,
  ) {
    const evaluation = await this.findAccessibleEvaluation(
      user,
      schoolId,
      classId,
      evaluationId,
    );
    const allowedStudentIds = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: {
            schoolId,
            classId,
            schoolYearId: evaluation.schoolYearId,
            status: "ACTIVE",
          },
          select: { studentId: true },
        })
      ).map((row) => row.studentId),
    );

    for (const entry of payload.scores) {
      if (!allowedStudentIds.has(entry.studentId)) {
        throw new BadRequestException("Student is not enrolled in this class");
      }
      if (
        entry.status === "ENTERED" &&
        (entry.score === undefined || entry.score === null || entry.score < 0)
      ) {
        throw new BadRequestException(
          "A positive score is required for entered status",
        );
      }
      if (
        entry.score !== undefined &&
        entry.score !== null &&
        entry.score > evaluation.maxScore
      ) {
        throw new BadRequestException(
          "Score cannot exceed evaluation max score",
        );
      }
    }

    await this.prisma.$transaction(
      payload.scores.map((entry) =>
        this.prisma.studentEvaluationScore.upsert({
          where: {
            evaluationId_studentId: {
              evaluationId,
              studentId: entry.studentId,
            },
          },
          update: {
            score: entry.status === "ENTERED" ? (entry.score ?? null) : null,
            comment: entry.comment?.trim() || null,
            status: entry.status,
          },
          create: {
            evaluationId,
            studentId: entry.studentId,
            score: entry.status === "ENTERED" ? (entry.score ?? null) : null,
            comment: entry.comment?.trim() || null,
            status: entry.status,
          },
        }),
      ),
    );

    await this.logAudit(schoolId, evaluationId, user.id, "SCORES_UPDATED", {
      count: payload.scores.length,
    } as Prisma.JsonObject);

    return this.getEvaluation(user, schoolId, classId, evaluationId);
  }

  async listClassTermReports(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    term?: Term,
  ) {
    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    const subjectIds = await this.listAccessibleSubjectIds(
      user,
      schoolId,
      classId,
    );
    const students = await this.prisma.enrollment.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId: classEntity.schoolYearId,
        status: "ACTIVE",
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const reports = await this.prisma.studentTermReport.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId: classEntity.schoolYearId,
        ...(term ? { term } : {}),
        ...(students.length > 0
          ? { studentId: { in: students.map((row) => row.student.id) } }
          : { studentId: "__none__" }),
      },
      include: {
        subjectEntries: {
          where: subjectIds ? { subjectId: { in: subjectIds } } : undefined,
        },
      },
      orderBy: [
        { term: "asc" },
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    const terms = term ? [term] : [Term.TERM_1, Term.TERM_2, Term.TERM_3];
    return terms.map((currentTerm) => {
      const reportsByStudent = new Map(
        reports
          .filter((report) => report.term === currentTerm)
          .map((report) => [report.studentId, report]),
      );

      return {
        term: currentTerm,
        status: reports
          .filter((report) => report.term === currentTerm)
          .some((report) => report.status === TermReportStatus.PUBLISHED)
          ? "PUBLISHED"
          : "DRAFT",
        councilHeldAt:
          reports
            .filter((report) => report.term === currentTerm)
            .find((report) => report.councilHeldAt)?.councilHeldAt ?? null,
        students: students.map((row) => {
          const report = reportsByStudent.get(row.student.id);
          return {
            studentId: row.student.id,
            firstName: row.student.firstName,
            lastName: row.student.lastName,
            generalAppreciation: report?.generalAppreciation ?? null,
            subjects: (subjectIds
              ? (report?.subjectEntries.filter((entry) =>
                  subjectIds.includes(entry.subjectId),
                ) ?? [])
              : (report?.subjectEntries ?? [])
            ).map((entry) => ({
              subjectId: entry.subjectId,
              appreciation: entry.appreciation,
            })),
          };
        }),
      };
    });
  }

  async upsertClassTermReports(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    term: Term | undefined,
    payload: UpsertTermReportsDto,
  ) {
    if (!term || !Object.values(Term).includes(term)) {
      throw new BadRequestException("Invalid term");
    }

    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    const accessibleSubjectIds = await this.listAccessibleSubjectIds(
      user,
      schoolId,
      classId,
    );
    const allowedSubjectIds = new Set(
      accessibleSubjectIds ??
        (
          await this.prisma.subject.findMany({
            where: { schoolId },
            select: { id: true },
          })
        ).map((subject) => subject.id),
    );
    const enrolledStudentIds = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: {
            schoolId,
            classId,
            schoolYearId: classEntity.schoolYearId,
            status: "ACTIVE",
          },
          select: { studentId: true },
        })
      ).map((row) => row.studentId),
    );

    for (const report of payload.reports) {
      if (!enrolledStudentIds.has(report.studentId)) {
        throw new BadRequestException("Student is not enrolled in this class");
      }
      for (const subject of report.subjects) {
        if (!allowedSubjectIds.has(subject.subjectId)) {
          throw new ForbiddenException("Subject appreciation not accessible");
        }
      }
    }

    for (const report of payload.reports) {
      const existing = await this.prisma.studentTermReport.findUnique({
        where: {
          schoolYearId_classId_studentId_term: {
            schoolYearId: classEntity.schoolYearId,
            classId,
            studentId: report.studentId,
            term,
          },
        },
        select: { id: true, status: true },
      });

      const nextStatus =
        payload.status === "PUBLISHED"
          ? TermReportStatus.PUBLISHED
          : payload.status === "DRAFT"
            ? TermReportStatus.DRAFT
            : (existing?.status ?? TermReportStatus.DRAFT);

      await this.prisma.studentTermReport.upsert({
        where: {
          schoolYearId_classId_studentId_term: {
            schoolYearId: classEntity.schoolYearId,
            classId,
            studentId: report.studentId,
            term,
          },
        },
        update: {
          status: nextStatus,
          councilHeldAt:
            payload.councilHeldAt === undefined
              ? undefined
              : payload.councilHeldAt
                ? new Date(payload.councilHeldAt)
                : null,
          generalAppreciation:
            report.generalAppreciation === undefined
              ? undefined
              : report.generalAppreciation.trim() || null,
          updatedByUserId: user.id,
          publishedAt:
            nextStatus === TermReportStatus.PUBLISHED &&
            existing?.status !== TermReportStatus.PUBLISHED
              ? new Date()
              : undefined,
          subjectEntries: {
            deleteMany: {
              subjectId: { in: Array.from(allowedSubjectIds) },
            },
            create: report.subjects
              .map((subject) => ({
                schoolId,
                subjectId: subject.subjectId,
                appreciation: subject.appreciation?.trim() || "",
                updatedByUserId: user.id,
              }))
              .filter((subject) => subject.appreciation.length > 0),
          },
        },
        create: {
          schoolId,
          schoolYearId: classEntity.schoolYearId,
          classId,
          studentId: report.studentId,
          term,
          status: nextStatus,
          councilHeldAt: payload.councilHeldAt
            ? new Date(payload.councilHeldAt)
            : null,
          generalAppreciation: report.generalAppreciation?.trim() || null,
          publishedAt:
            nextStatus === TermReportStatus.PUBLISHED ? new Date() : null,
          updatedByUserId: user.id,
          subjectEntries: {
            create: report.subjects
              .map((subject) => ({
                schoolId,
                subjectId: subject.subjectId,
                appreciation: subject.appreciation?.trim() || "",
                updatedByUserId: user.id,
              }))
              .filter((subject) => subject.appreciation.length > 0),
          },
        },
      });
    }

    return this.listClassTermReports(user, schoolId, classId, term);
  }

  async listStudentNotes(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
    term?: Term,
  ) {
    await this.ensureStudentNotesAccess(user, schoolId, studentId);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, studentId, status: "ACTIVE" },
      orderBy: [{ schoolYear: { label: "desc" } }],
      select: {
        classId: true,
        schoolYearId: true,
        class: {
          select: {
            id: true,
            name: true,
            curriculumId: true,
          },
        },
      },
    });
    const currentEnrollment = enrollments[0] ?? null;
    const publishedReports = await this.prisma.studentTermReport.findMany({
      where: {
        schoolId,
        studentId,
        status: TermReportStatus.PUBLISHED,
        ...(currentEnrollment
          ? {
              schoolYearId: currentEnrollment.schoolYearId,
              classId: currentEnrollment.classId,
            }
          : {}),
        ...(term ? { term } : {}),
      },
      include: {
        subjectEntries: true,
      },
    });

    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        schoolId,
        status: "PUBLISHED",
        ...(term ? { term } : {}),
        scores: {
          some: {
            studentId,
          },
        },
      },
      include: {
        subject: { select: { id: true, name: true } },
        subjectBranch: { select: { id: true, name: true } },
        scores: true,
      },
      orderBy: [
        { createdAt: "desc" },
        { subject: { name: "asc" } },
        { subjectBranch: { name: "asc" } },
      ],
    });

    const terms = term ? [term] : [Term.TERM_1, Term.TERM_2, Term.TERM_3];
    const subjectWeights = await this.loadSubjectWeights(
      schoolId,
      currentEnrollment?.class.curriculumId ?? null,
      currentEnrollment?.classId ?? null,
    );

    return terms.map((currentTerm) => {
      const termEvaluations = evaluations.filter(
        (evaluation) => evaluation.term === currentTerm,
      );
      const publishedReport =
        publishedReports.find((report) => report.term === currentTerm) ?? null;
      const grouped = this.groupStudentNotesBySubject(
        studentId,
        termEvaluations,
        subjectWeights,
        new Map(
          (publishedReport?.subjectEntries ?? []).map((entry) => [
            entry.subjectId,
            entry.appreciation,
          ]),
        ),
      );
      const publishedAt =
        publishedReport?.publishedAt ?? publishedReport?.updatedAt ?? null;
      const latestEvaluationUpdate = termEvaluations[0]?.updatedAt ?? null;
      const generatedAtSource =
        publishedAt && latestEvaluationUpdate
          ? publishedAt > latestEvaluationUpdate
            ? publishedAt
            : latestEvaluationUpdate
          : (publishedAt ?? latestEvaluationUpdate);

      return {
        term: currentTerm,
        label: this.termLabel(currentTerm),
        councilLabel: this.buildCouncilLabel(
          currentEnrollment?.class.name ?? null,
          currentTerm,
          publishedReport?.councilHeldAt ?? null,
        ),
        generatedAtLabel: generatedAtSource
          ? `Donnees publiees le ${this.formatFrDateTime(generatedAtSource)}`
          : "Aucune evaluation publiee pour cette periode",
        generalAverage: this.computeGeneralAverage(grouped),
        subjects: grouped,
      };
    });
  }

  private groupStudentNotesBySubject(
    studentId: string,
    evaluations: Array<
      Prisma.EvaluationGetPayload<{
        include: {
          subject: { select: { id: true; name: true } };
          subjectBranch: { select: { id: true; name: true } };
          scores: true;
        };
      }>
    >,
    subjectWeights: Map<string, number>,
    subjectAppreciations: Map<string, string>,
  ) {
    const bySubject = new Map<
      string,
      {
        id: string;
        subjectLabel: string;
        teachers: string[];
        coefficient: number;
        studentAverage: number | null;
        classAverage: number | null;
        classMin: number | null;
        classMax: number | null;
        appreciation: string | null;
        evaluations: Array<{
          id: string;
          label: string;
          score: number | null;
          maxScore: number;
          weight?: number;
          recordedAt: string;
          status: "ENTERED" | "ABSENT" | "EXCUSED" | "NOT_GRADED";
        }>;
        weightedStudentSum: number;
        weightedStudentCoeff: number;
        classStudentAverages: number[];
      }
    >();

    for (const evaluation of evaluations) {
      const key = evaluation.subjectId;
      const studentScore = evaluation.scores.find(
        (entry) => entry.studentId === studentId,
      );
      const studentStatus =
        studentScore?.status === "ABSENT"
          ? "ABSENT"
          : studentScore?.status === "EXCUSED"
            ? "EXCUSED"
            : studentScore?.status === "NOT_GRADED"
              ? "NOT_GRADED"
              : "ENTERED";
      const studentNormalized =
        studentScore &&
        studentStatus === "ENTERED" &&
        studentScore.score !== null
          ? (studentScore.score / evaluation.maxScore) * 20
          : null;

      const subjectEntry = bySubject.get(key) ?? {
        id: evaluation.subjectId,
        subjectLabel: evaluation.subject.name,
        teachers: [],
        coefficient: subjectWeights.get(evaluation.subjectId) ?? 1,
        studentAverage: null,
        classAverage: null,
        classMin: null,
        classMax: null,
        appreciation: subjectAppreciations.get(evaluation.subjectId) ?? null,
        evaluations: [],
        weightedStudentSum: 0,
        weightedStudentCoeff: 0,
        classStudentAverages: [],
      };

      if (studentScore) {
        subjectEntry.evaluations.push({
          id: evaluation.id,
          label: evaluation.subjectBranch?.name
            ? `${evaluation.title} - ${evaluation.subjectBranch.name}`
            : evaluation.title,
          score:
            studentStatus === "ENTERED" ? (studentScore?.score ?? null) : null,
          maxScore: evaluation.maxScore,
          weight: evaluation.coefficient,
          recordedAt: this.formatShortDate(
            evaluation.scheduledAt ?? evaluation.createdAt,
          ),
          status: studentStatus,
        });
      }

      if (studentNormalized !== null) {
        subjectEntry.weightedStudentSum +=
          studentNormalized * evaluation.coefficient;
        subjectEntry.weightedStudentCoeff += evaluation.coefficient;
      }

      const byStudent = new Map<string, { sum: number; coeff: number }>();
      for (const score of evaluation.scores) {
        if (score.status !== "ENTERED" || score.score === null) {
          continue;
        }
        const current = byStudent.get(score.studentId) ?? { sum: 0, coeff: 0 };
        current.sum +=
          (score.score / evaluation.maxScore) * 20 * evaluation.coefficient;
        current.coeff += evaluation.coefficient;
        byStudent.set(score.studentId, current);
      }

      const allAverages = Array.from(byStudent.values())
        .filter((entry) => entry.coeff > 0)
        .map((entry) => entry.sum / entry.coeff);

      subjectEntry.classStudentAverages.push(...allAverages);
      bySubject.set(key, subjectEntry);
    }

    return Array.from(bySubject.values())
      .map((entry) => {
        const classValues = entry.classStudentAverages;
        return {
          id: entry.id,
          subjectLabel: entry.subjectLabel,
          teachers: entry.teachers,
          coefficient: entry.coefficient,
          studentAverage:
            entry.weightedStudentCoeff > 0
              ? Number(
                  (
                    entry.weightedStudentSum / entry.weightedStudentCoeff
                  ).toFixed(2),
                )
              : null,
          classAverage:
            classValues.length > 0
              ? Number(
                  (
                    classValues.reduce((sum, value) => sum + value, 0) /
                    classValues.length
                  ).toFixed(2),
                )
              : null,
          classMin:
            classValues.length > 0
              ? Number(Math.min(...classValues).toFixed(2))
              : null,
          classMax:
            classValues.length > 0
              ? Number(Math.max(...classValues).toFixed(2))
              : null,
          appreciation: entry.appreciation,
          evaluations: entry.evaluations.sort((a, b) =>
            b.recordedAt.localeCompare(a.recordedAt),
          ),
        };
      })
      .sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));
  }

  private computeGeneralAverage(
    subjects: Array<{
      coefficient: number;
      studentAverage: number | null;
      classAverage: number | null;
      classMin: number | null;
      classMax: number | null;
    }>,
  ) {
    const validStudent = subjects.filter(
      (subject) => subject.studentAverage !== null,
    );
    const validClass = subjects.filter(
      (subject) => subject.classAverage !== null,
    );
    const studentCoeff = validStudent.reduce(
      (sum, subject) => sum + subject.coefficient,
      0,
    );
    const classCoeff = validClass.reduce(
      (sum, subject) => sum + subject.coefficient,
      0,
    );

    return {
      student:
        studentCoeff > 0
          ? Number(
              (
                validStudent.reduce(
                  (sum, subject) =>
                    sum + (subject.studentAverage ?? 0) * subject.coefficient,
                  0,
                ) / studentCoeff
              ).toFixed(2),
            )
          : null,
      class:
        classCoeff > 0
          ? Number(
              (
                validClass.reduce(
                  (sum, subject) =>
                    sum + (subject.classAverage ?? 0) * subject.coefficient,
                  0,
                ) / classCoeff
              ).toFixed(2),
            )
          : null,
      min:
        validClass.length > 0
          ? Number(
              Math.min(
                ...validClass.map((subject) => subject.classMin ?? 20),
              ).toFixed(2),
            )
          : null,
      max:
        validClass.length > 0
          ? Number(
              Math.max(
                ...validClass.map((subject) => subject.classMax ?? 0),
              ).toFixed(2),
            )
          : null,
    };
  }

  private async loadSubjectWeights(
    schoolId: string,
    curriculumId: string | null,
    classId: string | null,
  ) {
    const map = new Map<string, number>();
    if (curriculumId) {
      const curriculumSubjects = await this.prisma.curriculumSubject.findMany({
        where: { schoolId, curriculumId },
        select: { subjectId: true, coefficient: true },
      });
      for (const row of curriculumSubjects) {
        map.set(row.subjectId, row.coefficient ?? 1);
      }
    }
    if (classId) {
      const overrides = await this.prisma.classSubjectOverride.findMany({
        where: { schoolId, classId },
        select: { subjectId: true, coefficientOverride: true },
      });
      for (const row of overrides) {
        if (row.coefficientOverride !== null) {
          map.set(row.subjectId, row.coefficientOverride);
        }
      }
    }
    return map;
  }

  private async ensureStudentNotesAccess(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
  ) {
    if (
      this.hasAnySchoolRole(user, schoolId, [
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
        "TEACHER",
      ])
    ) {
      return;
    }
    if (this.hasAnySchoolRole(user, schoolId, ["STUDENT"])) {
      const student = await this.prisma.student.findFirst({
        where: { schoolId, userId: user.id },
        select: { id: true },
      });
      if (student?.id !== studentId) {
        throw new ForbiddenException("Student notes not accessible");
      }
      return;
    }
    if (this.hasAnySchoolRole(user, schoolId, ["PARENT"])) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { schoolId, parentUserId: user.id, studentId },
        select: { id: true },
      });
      if (!link) {
        throw new ForbiddenException("Student notes not accessible");
      }
      return;
    }

    throw new ForbiddenException("Student notes not accessible");
  }

  private async findAccessibleEvaluation(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    evaluationId: string,
  ) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, schoolId, classId },
      include: {
        subject: { select: { id: true, name: true } },
        subjectBranch: { select: { id: true, name: true } },
        evaluationType: { select: { id: true, code: true, label: true } },
        attachments: true,
        scores: true,
      },
    });
    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }
    if (this.hasAnySchoolRole(user, schoolId, ["TEACHER"])) {
      await this.ensureSubjectAccessible(
        user,
        schoolId,
        classId,
        evaluation.schoolYearId,
        evaluation.subjectId,
      );
    }
    return evaluation;
  }

  private async ensureClassAccessible(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, name: true, schoolYearId: true },
    });
    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }
    if (
      this.hasAnySchoolRole(user, schoolId, [
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
      ]) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return classEntity;
    }
    if (this.hasAnySchoolRole(user, schoolId, ["TEACHER"])) {
      const assignment = await this.prisma.teacherClassSubject.findFirst({
        where: {
          schoolId,
          schoolYearId: classEntity.schoolYearId,
          classId,
          teacherUserId: user.id,
        },
        select: { id: true },
      });
      if (!assignment) {
        throw new ForbiddenException("Class not accessible");
      }
      return classEntity;
    }
    throw new ForbiddenException("Class not accessible");
  }

  private async ensureSubjectAccessible(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    schoolYearId: string,
    subjectId: string,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException("Subject not found");
    }

    if (
      this.hasAnySchoolRole(user, schoolId, [
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
      ]) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return;
    }

    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        schoolYearId,
        classId,
        subjectId,
        teacherUserId: user.id,
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException("Subject not accessible for this class");
    }
  }

  private async listAccessibleAssignments(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { schoolYearId: true },
    });
    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }
    return this.prisma.teacherClassSubject.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId: classEntity.schoolYearId,
        ...(this.hasAnySchoolRole(user, schoolId, ["TEACHER"])
          ? { teacherUserId: user.id }
          : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ subject: { name: "asc" } }],
    });
  }

  private async listAccessibleSubjectIds(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    if (
      this.hasAnySchoolRole(user, schoolId, [
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
      ]) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return null;
    }
    const assignments = await this.listAccessibleAssignments(
      user,
      schoolId,
      classId,
    );
    return assignments.map((item) => item.subjectId);
  }

  private async ensureEvaluationTypeInSchool(
    schoolId: string,
    evaluationTypeId: string,
  ) {
    const evaluationType = await this.prisma.evaluationType.findFirst({
      where: { id: evaluationTypeId, schoolId },
      select: { id: true },
    });
    if (!evaluationType) {
      throw new NotFoundException("Evaluation type not found");
    }
  }

  private async ensureSubjectBranchBelongsToSubject(
    schoolId: string,
    subjectId: string,
    subjectBranchId?: string,
  ) {
    if (!subjectBranchId) {
      return;
    }

    const branch = await this.prisma.subjectBranch.findFirst({
      where: { id: subjectBranchId, schoolId, subjectId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        "Subject branch does not belong to subject",
      );
    }
  }

  private async logAudit(
    schoolId: string,
    evaluationId: string,
    actorUserId: string,
    action: "CREATED" | "UPDATED" | "PUBLISHED" | "SCORES_UPDATED",
    payloadJson?: Prisma.JsonObject,
  ) {
    await this.prisma.evaluationAuditLog.create({
      data: {
        schoolId,
        evaluationId,
        actorUserId,
        action,
        payloadJson,
      },
    });
  }

  private toAuditJson(payload: unknown): Prisma.JsonObject | undefined {
    if (payload === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(payload)) as Prisma.JsonObject;
  }

  private hasAnySchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    roles: string[],
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId && roles.includes(membership.role),
    );
  }

  private hasPlatformRole(user: AuthenticatedUser, role: string) {
    return user.platformRoles.includes(role as never);
  }

  private termLabel(term: Term) {
    if (term === Term.TERM_1) return "1er Trimestre";
    if (term === Term.TERM_2) return "2eme Trimestre";
    return "3eme Trimestre";
  }

  private buildCouncilLabel(
    className: string | null,
    term: Term,
    councilHeldAt: Date | null,
  ) {
    if (councilHeldAt) {
      return className
        ? `Conseil de classe de ${className} le ${this.formatFrDateTime(councilHeldAt)}`
        : `Conseil de classe le ${this.formatFrDateTime(councilHeldAt)}`;
    }
    return className
      ? `Conseil de classe ${className} - publication ${this.termLabel(term).toLowerCase()}`
      : `Conseil de classe - ${this.termLabel(term).toLowerCase()}`;
  }

  private formatFrDateTime(value: Date) {
    return value.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private formatShortDate(value: Date) {
    return value.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  }
}
