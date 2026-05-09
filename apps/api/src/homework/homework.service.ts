import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InlineMediaEntityType,
  InlineMediaScope,
  SchoolRole,
  type Prisma,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import {
  hasMeaningfulRichTextContent,
  sanitizeRichTextHtml,
} from "../common/rich-text-sanitizer.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AddHomeworkCommentDto } from "./dto/add-homework-comment.dto.js";
import type {
  CreateHomeworkDto,
  HomeworkAttachmentDto,
} from "./dto/create-homework.dto.js";
import type { ListHomeworkDto } from "./dto/list-homework.dto.js";
import type { SetHomeworkCompletionDto } from "./dto/set-homework-completion.dto.js";
import type { UpdateHomeworkDto } from "./dto/update-homework.dto.js";

type ClassEntity = {
  id: string;
  name: string;
  schoolYearId: string;
};

type ViewerAccess = {
  classEntity: ClassEntity;
  viewerStudent: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  canSeeCompletionStatuses: boolean;
};

type HomeworkWithRelations = Prisma.HomeworkGetPayload<{
  include: {
    subject: { select: { id: true; name: true } };
    authorUser: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        memberships: {
          select: { schoolId: true; role: true };
        };
      };
    };
    attachments: true;
    comments: {
      include: {
        authorUser: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            memberships: {
              select: { schoolId: true; role: true };
            };
          };
        };
      };
      orderBy: [{ createdAt: "asc" }];
    };
    completions: {
      include: {
        student: {
          select: { id: true; firstName: true; lastName: true };
        };
      };
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ];
    };
    _count: { select: { comments: true } };
  };
}>;

const HOMEWORK_MANAGER_ROLES: SchoolRole[] = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
];

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  async listClassHomework(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    query: ListHomeworkDto,
  ) {
    const access = await this.ensureViewerAccess(
      user,
      schoolId,
      classId,
      query.studentId,
    );
    const subjectColors = await this.loadSubjectColorMap(
      schoolId,
      classId,
      access.classEntity.schoolYearId,
    );
    const activeStudents = access.canSeeCompletionStatuses
      ? await this.listActiveStudents(
          schoolId,
          classId,
          access.classEntity.schoolYearId,
        )
      : [];

    const homeworks = await this.prisma.homework.findMany({
      where: {
        schoolId,
        classId,
        ...(query.fromDate
          ? { expectedAt: { gte: new Date(query.fromDate) } }
          : {}),
        ...(query.toDate
          ? {
              expectedAt: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                lte: new Date(query.toDate),
              },
            }
          : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberships: {
              where: { schoolId },
              select: { role: true },
            },
          },
        },
        attachments: { orderBy: [{ createdAt: "asc" }] },
        completions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { comments: true } },
      },
      orderBy: [{ expectedAt: "asc" }, { createdAt: "desc" }],
    });

    return homeworks.map((homework) =>
      this.mapHomeworkRow(homework, {
        subjectColors,
        viewerStudentId: access.viewerStudent?.id ?? null,
        activeStudents,
        includeSummary: access.canSeeCompletionStatuses,
      }),
    );
  }

  async getHomeworkDetail(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homeworkId: string,
    studentId?: string,
  ) {
    const access = await this.ensureViewerAccess(
      user,
      schoolId,
      classId,
      studentId,
    );
    const homework = await this.findHomeworkOrThrow(
      schoolId,
      classId,
      homeworkId,
    );
    const subjectColors = await this.loadSubjectColorMap(
      schoolId,
      classId,
      homework.schoolYearId,
    );
    const activeStudents = await this.listActiveStudents(
      schoolId,
      classId,
      homework.schoolYearId,
    );

    return this.mapHomeworkDetail(homework, user.id, {
      subjectColors,
      viewerStudentId: access.viewerStudent?.id ?? null,
      activeStudents,
      includeSummary: access.canSeeCompletionStatuses,
      includeCompletionStatuses: access.canSeeCompletionStatuses,
    });
  }

  async createHomework(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    payload: CreateHomeworkDto,
  ) {
    const classEntity = await this.ensureClassManageAccess(
      user,
      schoolId,
      classId,
    );
    await this.ensureSubjectAccessibleForCreation(
      user,
      schoolId,
      classId,
      classEntity.schoolYearId,
      payload.subjectId,
    );

    const attachments = this.normalizeAttachments(payload.attachments);
    const contentHtml = this.normalizeHomeworkContent(payload.contentHtml);

    const created = await this.prisma.homework.create({
      data: {
        schoolId,
        schoolYearId: classEntity.schoolYearId,
        classId,
        subjectId: payload.subjectId,
        authorUserId: user.id,
        title: payload.title.trim(),
        contentHtml,
        expectedAt: new Date(payload.expectedAt),
        attachments: attachments.length
          ? {
              create: attachments.map((attachment) => ({
                schoolId,
                ...attachment,
              })),
            }
          : undefined,
      },
      select: { id: true },
    });

    await this.inlineMediaService.syncEntityImages({
      schoolId,
      uploadedByUserId: user.id,
      scope: InlineMediaScope.HOMEWORK,
      entityType: InlineMediaEntityType.HOMEWORK,
      entityId: created.id,
      nextBodyHtml: contentHtml ?? "",
      deleteRemovedPhysically: true,
    });

    return this.loadMappedHomeworkRow(created.id, user.id, null);
  }

  async updateHomework(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homeworkId: string,
    payload: UpdateHomeworkDto,
  ) {
    const existing = await this.findHomeworkOrThrow(
      schoolId,
      classId,
      homeworkId,
    );
    await this.assertCanManageHomework(user, schoolId, classId, existing);

    const nextSubjectId = payload.subjectId ?? existing.subjectId;
    await this.ensureSubjectAccessibleForCreation(
      user,
      schoolId,
      classId,
      existing.schoolYearId,
      nextSubjectId,
    );

    const existingAttachmentUrls = existing.attachments
      .map((attachment) => attachment.fileUrl)
      .filter((url): url is string => Boolean(url));
    const nextAttachments =
      payload.attachments === undefined
        ? existing.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl ?? undefined,
            sizeLabel: attachment.sizeLabel ?? undefined,
            mimeType: attachment.mimeType ?? undefined,
          }))
        : this.normalizeAttachments(payload.attachments);
    const nextAttachmentUrls = nextAttachments
      .map((attachment) => attachment.fileUrl)
      .filter((url): url is string => Boolean(url));

    await this.cleanupMediaUrls(
      existingAttachmentUrls.filter((url) => !nextAttachmentUrls.includes(url)),
    );

    const nextContentHtml =
      payload.contentHtml === undefined
        ? existing.contentHtml
        : this.normalizeHomeworkContent(payload.contentHtml);

    await this.inlineMediaService.syncEntityImages({
      schoolId,
      uploadedByUserId: user.id,
      scope: InlineMediaScope.HOMEWORK,
      entityType: InlineMediaEntityType.HOMEWORK,
      entityId: existing.id,
      previousBodyHtml: existing.contentHtml ?? "",
      nextBodyHtml: nextContentHtml ?? "",
      deleteRemovedPhysically: true,
    });

    await this.prisma.homework.update({
      where: { id: existing.id },
      data: {
        subjectId: payload.subjectId,
        title: payload.title?.trim(),
        contentHtml:
          payload.contentHtml === undefined ? undefined : nextContentHtml,
        expectedAt:
          payload.expectedAt === undefined
            ? undefined
            : new Date(payload.expectedAt),
        attachments:
          payload.attachments === undefined
            ? undefined
            : {
                deleteMany: {},
                create: nextAttachments.map((attachment) => ({
                  schoolId,
                  ...attachment,
                })),
              },
      },
    });

    return this.loadMappedHomeworkRow(
      homeworkId,
      user.id,
      null,
      existing.schoolYearId,
      classId,
    );
  }

  async deleteHomework(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homeworkId: string,
  ) {
    const existing = await this.findHomeworkOrThrow(
      schoolId,
      classId,
      homeworkId,
    );
    await this.assertCanManageHomework(user, schoolId, classId, existing);

    await this.cleanupMediaUrls(
      existing.attachments
        .map((attachment) => attachment.fileUrl)
        .filter((url): url is string => Boolean(url)),
    );
    await this.inlineMediaService.removeEntityImages({
      entityType: InlineMediaEntityType.HOMEWORK,
      entityId: existing.id,
      deletePhysically: true,
    });

    await this.prisma.homework.delete({
      where: { id: existing.id },
    });

    return { success: true, homeworkId: existing.id };
  }

  async addComment(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homeworkId: string,
    payload: AddHomeworkCommentDto,
  ) {
    const access = await this.ensureViewerAccess(
      user,
      schoolId,
      classId,
      payload.studentId,
    );
    const body = payload.body.trim();
    if (!body) {
      throw new BadRequestException("Comment body is required");
    }

    await this.findHomeworkOrThrow(schoolId, classId, homeworkId);
    await this.prisma.homeworkComment.create({
      data: {
        schoolId,
        homeworkId,
        authorUserId: user.id,
        studentId: access.viewerStudent?.id ?? null,
        body,
      },
    });

    return this.getHomeworkDetail(
      user,
      schoolId,
      classId,
      homeworkId,
      access.viewerStudent?.id,
    );
  }

  async setCompletion(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homeworkId: string,
    payload: SetHomeworkCompletionDto,
  ) {
    const access = await this.ensureViewerAccess(
      user,
      schoolId,
      classId,
      payload.studentId,
    );
    if (!access.viewerStudent) {
      throw new ForbiddenException("Homework completion not accessible");
    }

    await this.findHomeworkOrThrow(schoolId, classId, homeworkId);
    if (payload.done) {
      await this.prisma.homeworkCompletion.upsert({
        where: {
          homeworkId_studentId: {
            homeworkId,
            studentId: access.viewerStudent.id,
          },
        },
        update: {
          doneAt: new Date(),
        },
        create: {
          schoolId,
          homeworkId,
          studentId: access.viewerStudent.id,
          doneAt: new Date(),
        },
      });
    } else {
      await this.prisma.homeworkCompletion.deleteMany({
        where: {
          homeworkId,
          studentId: access.viewerStudent.id,
        },
      });
    }

    return this.getHomeworkDetail(
      user,
      schoolId,
      classId,
      homeworkId,
      access.viewerStudent.id,
    );
  }

  private async loadMappedHomeworkRow(
    homeworkId: string,
    viewerUserId: string,
    viewerStudentId: string | null,
    schoolYearId?: string,
    classId?: string,
  ) {
    const homework = await this.findHomeworkOrThrowById(homeworkId);
    const effectiveClassId = classId ?? homework.classId;
    const effectiveSchoolYearId = schoolYearId ?? homework.schoolYearId;
    const subjectColors = await this.loadSubjectColorMap(
      homework.schoolId,
      effectiveClassId,
      effectiveSchoolYearId,
    );
    const activeStudents = await this.listActiveStudents(
      homework.schoolId,
      effectiveClassId,
      effectiveSchoolYearId,
    );

    return this.mapHomeworkRow(homework, {
      subjectColors,
      viewerStudentId,
      activeStudents,
      includeSummary: true,
      viewerUserId,
    });
  }

  private async findHomeworkOrThrow(
    schoolId: string,
    classId: string,
    homeworkId: string,
  ) {
    const homework = await this.findHomeworkOrThrowById(homeworkId);
    if (homework.schoolId !== schoolId || homework.classId !== classId) {
      throw new NotFoundException("Homework not found");
    }
    return homework;
  }

  private async findHomeworkOrThrowById(homeworkId: string) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId },
      include: {
        subject: { select: { id: true, name: true } },
        authorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberships: {
              select: { schoolId: true, role: true },
            },
          },
        },
        attachments: { orderBy: [{ createdAt: "asc" }] },
        comments: {
          include: {
            authorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                memberships: {
                  select: { schoolId: true, role: true },
                },
              },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
        completions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [
            { student: { lastName: "asc" } },
            { student: { firstName: "asc" } },
          ],
        },
        _count: { select: { comments: true } },
      },
    });
    if (!homework) {
      throw new NotFoundException("Homework not found");
    }
    return homework;
  }

  private async ensureViewerAccess(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    studentId?: string,
  ): Promise<ViewerAccess> {
    const classEntity = await this.ensureClassExists(schoolId, classId);

    // A user can hold multiple school roles (e.g. teacher AND parent).
    // When they explicitly chose "PARENT" or "STUDENT" as their active role,
    // skip the teacher/manager branches so the correct viewer context is used.
    const activeRole = user.activeRole as string | null | undefined;
    const actingAsConsumer =
      activeRole === "PARENT" || activeRole === "STUDENT";

    if (
      !actingAsConsumer &&
      (this.hasAnySchoolRole(user, schoolId, HOMEWORK_MANAGER_ROLES) ||
        this.hasPlatformRole(user, "SUPER_ADMIN"))
    ) {
      return {
        classEntity,
        viewerStudent: null,
        canSeeCompletionStatuses: true,
      };
    }

    if (
      !actingAsConsumer &&
      this.hasAnySchoolRole(user, schoolId, ["TEACHER"])
    ) {
      const assignment = await this.prisma.teacherClassSubject.findFirst({
        where: {
          schoolId,
          classId,
          schoolYearId: classEntity.schoolYearId,
          teacherUserId: user.id,
        },
        select: { id: true },
      });
      if (!assignment) {
        throw new ForbiddenException("Class not accessible");
      }
      return {
        classEntity,
        viewerStudent: null,
        canSeeCompletionStatuses: true,
      };
    }

    if (this.hasAnySchoolRole(user, schoolId, ["STUDENT"])) {
      const viewerStudent = await this.prisma.student.findFirst({
        where: {
          schoolId,
          userId: user.id,
          enrollments: {
            some: {
              schoolId,
              classId,
              schoolYearId: classEntity.schoolYearId,
              status: "ACTIVE",
            },
          },
        },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!viewerStudent) {
        throw new ForbiddenException("Class not accessible");
      }
      return {
        classEntity,
        viewerStudent,
        canSeeCompletionStatuses: false,
      };
    }

    if (this.hasAnySchoolRole(user, schoolId, ["PARENT"])) {
      const linkedStudents = await this.prisma.parentStudent.findMany({
        where: {
          schoolId,
          parentUserId: user.id,
          ...(studentId ? { studentId } : {}),
          student: {
            enrollments: {
              some: {
                schoolId,
                classId,
                schoolYearId: classEntity.schoolYearId,
                status: "ACTIVE",
              },
            },
          },
        },
        select: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
      if (linkedStudents.length === 0) {
        throw new ForbiddenException("Class not accessible");
      }
      if (!studentId && linkedStudents.length > 1) {
        throw new BadRequestException(
          "studentId is required for parent access",
        );
      }
      return {
        classEntity,
        viewerStudent: linkedStudents[0].student,
        canSeeCompletionStatuses: false,
      };
    }

    throw new ForbiddenException("Homework not accessible");
  }

  private async ensureClassManageAccess(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const access = await this.ensureViewerAccess(user, schoolId, classId);
    if (
      !this.hasAnySchoolRole(user, schoolId, [
        "TEACHER",
        ...HOMEWORK_MANAGER_ROLES,
      ])
    ) {
      throw new ForbiddenException("Homework management not accessible");
    }
    return access.classEntity;
  }

  private async ensureClassExists(schoolId: string, classId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, name: true, schoolYearId: true },
    });
    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }
    return classEntity;
  }

  private async ensureSubjectAccessibleForCreation(
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
      this.hasAnySchoolRole(user, schoolId, HOMEWORK_MANAGER_ROLES) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return;
    }
    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        classId,
        schoolYearId,
        subjectId,
        teacherUserId: user.id,
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException("Subject not accessible for this class");
    }
  }

  private async assertCanManageHomework(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    homework: HomeworkWithRelations,
  ) {
    await this.ensureClassManageAccess(user, schoolId, classId);
    if (
      this.hasAnySchoolRole(user, schoolId, HOMEWORK_MANAGER_ROLES) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return;
    }
    if (homework.authorUserId !== user.id) {
      throw new ForbiddenException("Only the author can manage this homework");
    }
  }

  private normalizeHomeworkContent(contentHtml?: string) {
    if (contentHtml === undefined) {
      return undefined;
    }
    const sanitized = sanitizeRichTextHtml(contentHtml, { allowImages: true });
    return hasMeaningfulRichTextContent(sanitized) ? sanitized : null;
  }

  private normalizeAttachments(attachments?: HomeworkAttachmentDto[]) {
    return (attachments ?? []).map((attachment) => ({
      fileName: attachment.fileName.trim(),
      fileUrl: attachment.fileUrl?.trim() || null,
      sizeLabel: attachment.sizeLabel?.trim() || null,
      mimeType: attachment.mimeType?.trim() || null,
    }));
  }

  private async loadSubjectColorMap(
    schoolId: string,
    classId: string,
    schoolYearId: string,
  ) {
    const rows = await this.prisma.classTimetableSubjectStyle.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId,
      },
      select: { subjectId: true, colorHex: true },
    });
    return new Map(rows.map((row) => [row.subjectId, row.colorHex]));
  }

  private async listActiveStudents(
    schoolId: string,
    classId: string,
    schoolYearId: string,
  ) {
    return this.prisma.enrollment.findMany({
      where: {
        schoolId,
        classId,
        schoolYearId,
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
  }

  private mapHomeworkRow(
    homework: {
      id: string;
      classId: string;
      title: string;
      contentHtml: string | null;
      expectedAt: Date;
      createdAt: Date;
      updatedAt: Date;
      authorUserId: string;
      subject: { id: string; name: string };
      authorUser: {
        id: string;
        firstName: string;
        lastName: string;
        memberships: Array<{ role: SchoolRole; schoolId?: string }>;
      };
      attachments: Array<{
        id: string;
        fileName: string;
        fileUrl: string | null;
        sizeLabel: string | null;
        mimeType: string | null;
      }>;
      completions: Array<{
        doneAt: Date;
        student: { id: string; firstName: string; lastName: string };
      }>;
      _count?: { comments: number };
    },
    options: {
      subjectColors: Map<string, string>;
      viewerStudentId: string | null;
      activeStudents: Array<{
        student: { id: string; firstName: string; lastName: string };
      }>;
      includeSummary: boolean;
      viewerUserId?: string;
    },
  ) {
    const completionByStudent = new Map(
      homework.completions.map((completion) => [
        completion.student.id,
        completion,
      ]),
    );
    const totalStudents = options.activeStudents.length;
    const doneStudents = options.activeStudents.filter((row) =>
      completionByStudent.has(row.student.id),
    ).length;

    return {
      id: homework.id,
      classId: homework.classId,
      title: homework.title,
      contentHtml: homework.contentHtml,
      expectedAt: homework.expectedAt.toISOString(),
      createdAt: homework.createdAt.toISOString(),
      updatedAt: homework.updatedAt.toISOString(),
      authorUserId: homework.authorUserId,
      authorDisplayName: this.displayName(
        homework.authorUser.firstName,
        homework.authorUser.lastName,
      ),
      subject: {
        id: homework.subject.id,
        name: homework.subject.name,
        colorHex: options.subjectColors.get(homework.subject.id) ?? null,
      },
      attachments: homework.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeLabel: attachment.sizeLabel,
        mimeType: attachment.mimeType,
      })),
      commentsCount: homework._count?.comments ?? 0,
      summary: options.includeSummary
        ? {
            totalStudents,
            doneStudents,
            pendingStudents: Math.max(0, totalStudents - doneStudents),
          }
        : null,
      myDoneAt:
        options.viewerStudentId &&
        completionByStudent.get(options.viewerStudentId)?.doneAt
          ? completionByStudent
              .get(options.viewerStudentId)
              ?.doneAt.toISOString()
          : null,
    };
  }

  private mapHomeworkDetail(
    homework: HomeworkWithRelations,
    viewerUserId: string,
    options: {
      subjectColors: Map<string, string>;
      viewerStudentId: string | null;
      activeStudents: Array<{
        student: { id: string; firstName: string; lastName: string };
      }>;
      includeSummary: boolean;
      includeCompletionStatuses: boolean;
    },
  ) {
    return {
      ...this.mapHomeworkRow(homework, {
        subjectColors: options.subjectColors,
        viewerStudentId: options.viewerStudentId,
        activeStudents: options.activeStudents,
        includeSummary: options.includeSummary,
        viewerUserId,
      }),
      comments: homework.comments.map((comment) => ({
        id: comment.id,
        authorUserId: comment.authorUserId,
        authorDisplayName: this.displayName(
          comment.authorUser.firstName,
          comment.authorUser.lastName,
        ),
        authorRole:
          comment.authorUser.memberships.find(
            (membership) => membership.schoolId === homework.schoolId,
          )?.role ?? null,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        mine: comment.authorUserId === viewerUserId,
      })),
      completionStatuses: options.includeCompletionStatuses
        ? options.activeStudents.map((row) => {
            const completion = homework.completions.find(
              (item) => item.student.id === row.student.id,
            );
            return {
              studentId: row.student.id,
              firstName: row.student.firstName,
              lastName: row.student.lastName,
              doneAt: completion?.doneAt?.toISOString() ?? null,
            };
          })
        : [],
    };
  }

  private displayName(firstName: string, lastName: string) {
    return `${firstName} ${lastName}`.trim();
  }

  private async cleanupMediaUrls(urls: string[]) {
    for (const url of urls) {
      try {
        await this.mediaClientService.deleteImageByUrl(url);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : "media cleanup failed";
        throw new BadGatewayException(`Echec suppression media: ${message}`);
      }
    }
  }

  private hasAnySchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    roles: SchoolRole[],
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId &&
        roles.includes(membership.role as SchoolRole),
    );
  }

  private hasPlatformRole(user: AuthenticatedUser, role: string) {
    return user.platformRoles.includes(role as never);
  }
}
