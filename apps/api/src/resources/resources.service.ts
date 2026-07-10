import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ResourceApprovalStatus } from "@prisma/client";
import type { ResourceAttachmentPart } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateResourceDto } from "./dto/create-resource.dto.js";
import type { ListAdminResourcesQueryDto } from "./dto/list-admin-resources-query.dto.js";
import type { ListMyResourcesQueryDto } from "./dto/list-my-resources-query.dto.js";
import type { ListResourcesQueryDto } from "./dto/list-resources-query.dto.js";
import type { ReviewResourceDto } from "./dto/review-resource.dto.js";
import type { SaveSubmissionDraftDto } from "./dto/save-submission-draft.dto.js";
import type { UpdateResourceDto } from "./dto/update-resource.dto.js";
import { ResourceSubmissionNotificationsService } from "./resource-submission-notifications.service.js";
import {
  DUPLICATE_BLOCK_THRESHOLD,
  findPotentialDuplicates,
} from "./resources-duplicate.util.js";
import {
  resourceLocaleFromUser,
  translateResourceError,
} from "./resources.translations.js";

const RESOURCE_LIST_SELECT = {
  id: true,
  kind: true,
  schoolId: true,
  academicLevelId: true,
  subjectId: true,
  examType: true,
  sequence: true,
  academicYearLabel: true,
  title: true,
  authorUserId: true,
  statementStatus: true,
  correctionContent: true,
  correctionStatus: true,
  createdAt: true,
  updatedAt: true,
  school: { select: { id: true, name: true } },
  academicLevel: { select: { id: true, code: true, label: true } },
  subject: { select: { id: true, name: true } },
  authorUser: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ResourceSelect;

const NON_AUTHOR_ROLES = new Set(["PARENT", "STUDENT"]);

function canActAsResourceAuthor(user: AuthenticatedUser): boolean {
  return (
    user.activeRole == null || !NON_AUTHOR_ROLES.has(user.activeRole)
  );
}

function isResourcePlatformAdmin(user: AuthenticatedUser): boolean {
  return user.activeRole === "ADMIN" || user.activeRole === "SUPER_ADMIN";
}

const SUBMISSION_SELECT = {
  id: true,
  resourceId: true,
  part: true,
  status: true,
  content: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  authorUser: { select: { id: true, firstName: true, lastName: true } },
  attachments: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      sizeLabel: true,
      mimeType: true,
    },
  },
} satisfies Prisma.ResourceSubmissionSelect;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inlineMediaService: InlineMediaService,
    private readonly notificationsService: ResourceSubmissionNotificationsService,
  ) {}

  private inlineEntityId(resourceId: string, part: "statement" | "correction") {
    return `${resourceId}:${part}`;
  }

  private inlineSubmissionEntityId(submissionId: string) {
    return `submission:${submissionId}`;
  }

  private maskCorrection<
    T extends {
      correctionStatus: ResourceApprovalStatus;
      correctionContent: string | null;
    },
  >(resource: T): T {
    if (resource.correctionStatus !== "APPROVED") {
      return { ...resource, correctionContent: null };
    }
    return resource;
  }

  // Lecture seule du catalogue national (niveaux/matières), nécessaire à tout
  // utilisateur du module pour filtrer la recherche ou soumettre une ressource —
  // la gestion (create/update/delete) reste réservée à SUPER_ADMIN/ADMIN via
  // `management.controller.ts` (`system/academic-levels` / `system/subjects`).
  async listCatalog() {
    const [academicLevels, subjects] = await Promise.all([
      this.prisma.academicLevel.findMany({
        where: { schoolId: null },
        orderBy: [{ code: "asc" }],
        select: { id: true, code: true, label: true },
      }),
      this.prisma.subject.findMany({
        where: { schoolId: null },
        orderBy: [{ name: "asc" }],
        select: { id: true, code: true, name: true },
      }),
    ]);
    return { academicLevels, subjects };
  }

  // Écoles ayant au moins un assessment approuvé — alimente le filtre "établissement
  // scolaire" du formulaire de recherche, sans exposer la liste complète des écoles.
  async listSchoolsWithResources() {
    const schoolIds = await this.prisma.resource.findMany({
      where: {
        kind: "ASSESSMENT",
        statementStatus: "APPROVED",
        schoolId: { not: null },
      },
      distinct: ["schoolId"],
      select: { schoolId: true },
    });
    const ids = schoolIds
      .map((r) => r.schoolId)
      .filter((id): id is string => id !== null);
    if (ids.length === 0) return [];
    const schools = await this.prisma.school.findMany({
      where: { id: { in: ids } },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    });
    return schools;
  }

  async listResources(user: AuthenticatedUser, query: ListResourcesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Par défaut, parcours public = énoncé approuvé uniquement. needsStatement
    // inverse ce filtre pour laisser les contributeurs trouver les fiches à
    // compléter ; needsCorrection restreint aux fiches à énoncé approuvé mais
    // sans corrigé approuvé, pour les contributeurs de corrigés.
    const statementFilter: Prisma.ResourceWhereInput["statementStatus"] =
      query.needsStatement ? { not: "APPROVED" } : "APPROVED";

    const where: Prisma.ResourceWhereInput = {
      kind: query.kind,
      statementStatus: statementFilter,
      ...(query.needsCorrection
        ? { correctionStatus: { not: "APPROVED" } }
        : {}),
      ...(query.academicLevelId
        ? { academicLevelId: query.academicLevelId }
        : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.examType ? { examType: query.examType } : {}),
      ...(query.sequence ? { sequence: query.sequence } : {}),
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.academicYearLabel
        ? { academicYearLabel: query.academicYearLabel }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, total, favoriteIds] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        select: RESOURCE_LIST_SELECT,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
      this.prisma.resourceFavorite.findMany({
        where: { userId: user.id },
        select: { resourceId: true },
      }),
    ]);

    const favoriteSet = new Set(favoriteIds.map((f) => f.resourceId));

    return {
      items: items.map((item) => ({
        ...this.maskCorrection(item),
        isFavorite: favoriteSet.has(item.id),
      })),
      total,
      page,
      limit,
    };
  }

  async listFavorites(user: AuthenticatedUser) {
    const favorites = await this.prisma.resourceFavorite.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        resource: { select: RESOURCE_LIST_SELECT },
      },
    });

    return favorites
      .filter((f) => f.resource.statementStatus === "APPROVED")
      .map((f) => ({
        ...this.maskCorrection(f.resource),
        isFavorite: true,
      }));
  }

  async listMyResources(
    user: AuthenticatedUser,
    query: ListMyResourcesQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ResourceWhereInput = {
      authorUserId: user.id,
      ...(query.kind ? { kind: query.kind } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        select: RESOURCE_LIST_SELECT,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getResource(user: AuthenticatedUser, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        ...RESOURCE_LIST_SELECT,
        statementContent: true,
        statementSubmissionId: true,
        correctionSubmissionId: true,
        attachments: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            part: true,
            fileName: true,
            fileUrl: true,
            sizeLabel: true,
            mimeType: true,
            submissionId: true,
          },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.notFound",
        ),
      );
    }

    const isAuthor =
      resource.authorUserId === user.id && canActAsResourceAuthor(user);
    const isPlatform = isResourcePlatformAdmin(user);
    if (resource.statementStatus !== "APPROVED" && !isAuthor && !isPlatform) {
      throw new NotFoundException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.notFound",
        ),
      );
    }

    const favorite = await this.prisma.resourceFavorite.findUnique({
      where: { resourceId_userId: { resourceId, userId: user.id } },
      select: { id: true },
    });

    const showCorrection =
      resource.correctionStatus === "APPROVED" || isAuthor || isPlatform;

    // Les pièces jointes sont désormais rattachées à des ResourceSubmission
    // concurrentes ; seules celles de la soumission effectivement approuvée
    // pour chaque partie doivent apparaître en lecture.
    const attachments = resource.attachments.filter((a) => {
      if (a.part === "STATEMENT") {
        return (
          resource.statementSubmissionId !== null &&
          a.submissionId === resource.statementSubmissionId
        );
      }
      return (
        showCorrection &&
        resource.correctionSubmissionId !== null &&
        a.submissionId === resource.correctionSubmissionId
      );
    });

    const { statementSubmissionId, correctionSubmissionId, ...rest } = resource;
    void statementSubmissionId;
    void correctionSubmissionId;

    return {
      ...rest,
      correctionContent: showCorrection ? resource.correctionContent : null,
      attachments,
      isFavorite: Boolean(favorite),
    };
  }

  private async assertNationalReferences(
    user: AuthenticatedUser,
    academicLevelId: string,
    subjectId: string,
  ) {
    const locale = resourceLocaleFromUser(user);
    const [level, subject] = await Promise.all([
      this.prisma.academicLevel.findUnique({
        where: { id: academicLevelId },
        select: { schoolId: true },
      }),
      this.prisma.subject.findUnique({
        where: { id: subjectId },
        select: { schoolId: true },
      }),
    ]);

    if (!level || level.schoolId !== null) {
      throw new BadRequestException(
        translateResourceError(
          locale,
          "resources.errors.academicLevelNotNational",
        ),
      );
    }
    if (!subject || subject.schoolId !== null) {
      throw new BadRequestException(
        translateResourceError(locale, "resources.errors.subjectNotNational"),
      );
    }
  }

  // Ne crée plus que la fiche (métadonnées) : l'énoncé et le corrigé sont
  // saisis séparément par n'importe quel contributeur via le circuit de
  // soumissions (saveSubmissionDraft / submitSubmission / approveSubmission).
  async createResource(user: AuthenticatedUser, payload: CreateResourceDto) {
    const locale = resourceLocaleFromUser(user);

    if (payload.kind === "ASSESSMENT") {
      if (!payload.schoolId) {
        throw new BadRequestException(
          translateResourceError(
            locale,
            "resources.errors.schoolRequiredForAssessment",
          ),
        );
      }
      if (!payload.sequence) {
        throw new BadRequestException(
          translateResourceError(
            locale,
            "resources.errors.sequenceRequiredForAssessment",
          ),
        );
      }
    } else {
      if (payload.schoolId) {
        throw new BadRequestException(
          translateResourceError(
            locale,
            "resources.errors.schoolForbiddenForExam",
          ),
        );
      }
      if (payload.sequence) {
        throw new BadRequestException(
          translateResourceError(
            locale,
            "resources.errors.sequenceForbiddenForExam",
          ),
        );
      }
    }

    await this.assertNationalReferences(
      user,
      payload.academicLevelId,
      payload.subjectId,
    );

    if (!payload.confirmDuplicate) {
      const duplicates = await findPotentialDuplicates(this.prisma, {
        kind: payload.kind,
        schoolId:
          payload.kind === "ASSESSMENT" ? (payload.schoolId ?? null) : null,
        academicLevelId: payload.academicLevelId,
        subjectId: payload.subjectId,
        academicYearLabel: payload.academicYearLabel,
        examType: payload.examType,
        sequence:
          payload.kind === "ASSESSMENT" ? (payload.sequence ?? null) : null,
        title: payload.title,
      });

      const blocking = duplicates.find(
        (candidate) => candidate.score >= DUPLICATE_BLOCK_THRESHOLD,
      );
      if (blocking) {
        throw new BadRequestException(
          translateResourceError(locale, "resources.errors.duplicateBlocked"),
        );
      }
      if (duplicates.length > 0) {
        throw new ConflictException({
          message: translateResourceError(
            locale,
            "resources.errors.duplicateWarning",
          ),
          warning: true,
          candidates: duplicates,
        });
      }
    }

    const resource = await this.prisma.resource.create({
      data: {
        kind: payload.kind,
        schoolId: payload.kind === "ASSESSMENT" ? payload.schoolId : null,
        academicLevelId: payload.academicLevelId,
        subjectId: payload.subjectId,
        examType: payload.examType,
        sequence: payload.kind === "ASSESSMENT" ? payload.sequence : null,
        academicYearLabel: payload.academicYearLabel,
        title: payload.title,
        authorUserId: user.id,
        auditLogs: {
          create: { actorUserId: user.id, action: "SUBMIT" },
        },
      },
      select: { id: true },
    });

    return this.getResource(user, resource.id);
  }

  async updateResource(
    user: AuthenticatedUser,
    resourceId: string,
    payload: UpdateResourceDto,
  ) {
    const locale = resourceLocaleFromUser(user);
    const existing = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        kind: true,
        authorUserId: true,
        academicLevelId: true,
        subjectId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        translateResourceError(locale, "resources.errors.notFound"),
      );
    }
    const isAuthor =
      existing.authorUserId === user.id && canActAsResourceAuthor(user);
    const isPlatform = isResourcePlatformAdmin(user);
    if (!isAuthor && !isPlatform) {
      throw new ForbiddenException(
        translateResourceError(locale, "resources.errors.onlyAuthorCanEdit"),
      );
    }

    if (
      payload.academicLevelId !== undefined ||
      payload.subjectId !== undefined
    ) {
      await this.assertNationalReferences(
        user,
        payload.academicLevelId ?? existing.academicLevelId,
        payload.subjectId ?? existing.subjectId,
      );
    }

    const data: Prisma.ResourceUncheckedUpdateInput = {};
    if (payload.title !== undefined) {
      data.title = payload.title;
    }
    if (payload.academicLevelId !== undefined) {
      data.academicLevelId = payload.academicLevelId;
    }
    if (payload.subjectId !== undefined) {
      data.subjectId = payload.subjectId;
    }
    if (payload.examType !== undefined) {
      data.examType = payload.examType;
    }
    if (existing.kind === "ASSESSMENT" && payload.sequence !== undefined) {
      data.sequence = payload.sequence;
    }
    if (existing.kind === "ASSESSMENT" && payload.schoolId !== undefined) {
      data.schoolId = payload.schoolId;
    }
    if (payload.academicYearLabel !== undefined) {
      data.academicYearLabel = payload.academicYearLabel;
    }

    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...data,
        auditLogs: { create: { actorUserId: user.id, action: "EDIT" } },
      },
    });

    return this.getResource(user, resourceId);
  }

  async favoriteResource(user: AuthenticatedUser, resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, statementStatus: true },
    });
    if (!resource || resource.statementStatus !== "APPROVED") {
      throw new NotFoundException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.notFound",
        ),
      );
    }

    await this.prisma.resourceFavorite.upsert({
      where: { resourceId_userId: { resourceId, userId: user.id } },
      create: { resourceId, userId: user.id },
      update: {},
    });
    return { favorite: true };
  }

  async unfavoriteResource(user: AuthenticatedUser, resourceId: string) {
    await this.prisma.resourceFavorite.deleteMany({
      where: { resourceId, userId: user.id },
    });
    return { favorite: false };
  }

  // ── Circuit de soumissions (énoncé / corrigé) ─────────────────────────

  private async findResourceOrThrow(
    user: AuthenticatedUser,
    resourceId: string,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        schoolId: true,
        statementStatus: true,
        correctionStatus: true,
      },
    });
    if (!resource) {
      throw new NotFoundException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.notFound",
        ),
      );
    }
    return resource;
  }

  async saveSubmissionDraft(
    user: AuthenticatedUser,
    resourceId: string,
    part: ResourceAttachmentPart,
    payload: SaveSubmissionDraftDto,
  ) {
    const locale = resourceLocaleFromUser(user);
    const resource = await this.findResourceOrThrow(user, resourceId);

    if (part === "CORRECTION" && resource.statementStatus !== "APPROVED") {
      throw new BadRequestException(
        translateResourceError(
          locale,
          "resources.errors.correctionRequiresApprovedStatement",
        ),
      );
    }

    const existing = await this.prisma.resourceSubmission.findFirst({
      where: {
        resourceId,
        part,
        authorUserId: user.id,
        status: { in: ["DRAFT", "AWAITING"] },
      },
    });

    if (existing && existing.status === "AWAITING") {
      throw new BadRequestException(
        translateResourceError(
          locale,
          "resources.errors.submissionAwaitingReview",
        ),
      );
    }

    const attachmentsData = payload.attachments.map((a) => ({
      resourceId,
      part,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      sizeLabel: a.sizeLabel,
      mimeType: a.mimeType,
    }));

    let submission;
    if (existing) {
      await this.prisma.resourceAttachment.deleteMany({
        where: { submissionId: existing.id },
      });
      submission = await this.prisma.resourceSubmission.update({
        where: { id: existing.id },
        data: {
          content: payload.content,
          attachments: { create: attachmentsData },
        },
        select: SUBMISSION_SELECT,
      });
    } else {
      submission = await this.prisma.resourceSubmission.create({
        data: {
          resourceId,
          part,
          authorUserId: user.id,
          content: payload.content,
          status: "DRAFT",
          attachments: { create: attachmentsData },
        },
        select: SUBMISSION_SELECT,
      });
    }

    await this.prisma.resourceAuditLog.create({
      data: {
        resourceId,
        actorUserId: user.id,
        action: "SUBMISSION_DRAFT",
        payloadJson: { submissionId: submission.id, part },
      },
    });

    await this.inlineMediaService.syncEntityImages({
      schoolId: resource.schoolId,
      uploadedByUserId: user.id,
      scope: "RESOURCE",
      entityType: "RESOURCE",
      entityId: this.inlineSubmissionEntityId(submission.id),
      nextBodyHtml: payload.content,
      deleteRemovedPhysically: false,
    });

    return submission;
  }

  async submitSubmission(
    user: AuthenticatedUser,
    resourceId: string,
    submissionId: string,
  ) {
    const locale = resourceLocaleFromUser(user);
    const submission = await this.prisma.resourceSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || submission.resourceId !== resourceId) {
      throw new NotFoundException(
        translateResourceError(locale, "resources.errors.notFound"),
      );
    }
    if (submission.authorUserId !== user.id) {
      throw new ForbiddenException(
        translateResourceError(locale, "resources.errors.notSubmissionAuthor"),
      );
    }
    if (submission.status !== "DRAFT") {
      throw new BadRequestException(
        translateResourceError(locale, "resources.errors.submissionNotDraft"),
      );
    }
    if (submission.part === "CORRECTION") {
      const resource = await this.findResourceOrThrow(user, resourceId);
      if (resource.statementStatus !== "APPROVED") {
        throw new BadRequestException(
          translateResourceError(
            locale,
            "resources.errors.correctionRequiresApprovedStatement",
          ),
        );
      }
    }

    const updated = await this.prisma.resourceSubmission.update({
      where: { id: submissionId },
      data: { status: "AWAITING" },
      select: SUBMISSION_SELECT,
    });

    await this.prisma.resourceAuditLog.create({
      data: {
        resourceId,
        actorUserId: user.id,
        action: "SUBMISSION_SUBMIT",
        payloadJson: { submissionId },
      },
    });

    return updated;
  }

  // Vue "candidats" pour un admin (soumissions AWAITING d'une fiche/partie),
  // ou historique personnel pour un contributeur non-admin.
  async listSubmissions(
    user: AuthenticatedUser,
    resourceId: string,
    part: ResourceAttachmentPart,
  ) {
    await this.findResourceOrThrow(user, resourceId);
    const isPlatform = isResourcePlatformAdmin(user);

    const where: Prisma.ResourceSubmissionWhereInput = isPlatform
      ? { resourceId, part, status: "AWAITING" }
      : { resourceId, part, authorUserId: user.id };

    return this.prisma.resourceSubmission.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
      select: SUBMISSION_SELECT,
    });
  }

  async approveSubmission(admin: AuthenticatedUser, submissionId: string) {
    const locale = resourceLocaleFromUser(admin);

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.resourceSubmission.updateMany({
        where: { id: submissionId, status: "AWAITING" },
        data: {
          status: "APPROVED",
          reviewedByUserId: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          translateResourceError(
            locale,
            "resources.errors.submissionAlreadyReviewed",
          ),
        );
      }

      const submission = await tx.resourceSubmission.findUniqueOrThrow({
        where: { id: submissionId },
      });

      const siblings = await tx.resourceSubmission.findMany({
        where: {
          resourceId: submission.resourceId,
          part: submission.part,
          status: "AWAITING",
          id: { not: submissionId },
        },
        select: { id: true, authorUserId: true },
      });

      if (siblings.length > 0) {
        await tx.resourceSubmission.updateMany({
          where: { id: { in: siblings.map((s) => s.id) } },
          data: {
            status: "DISCARDED",
            reviewedByUserId: admin.id,
            reviewedAt: new Date(),
          },
        });
      }

      await tx.resource.update({
        where: { id: submission.resourceId },
        data:
          submission.part === "STATEMENT"
            ? {
                statementContent: submission.content,
                statementStatus: "APPROVED",
                statementApprovedByUserId: admin.id,
                statementApprovedAt: new Date(),
                statementSubmissionId: submission.id,
                auditLogs: {
                  create: {
                    actorUserId: admin.id,
                    action: "SUBMISSION_APPROVE",
                    payloadJson: { submissionId },
                  },
                },
              }
            : {
                correctionContent: submission.content,
                correctionStatus: "APPROVED",
                correctionApprovedByUserId: admin.id,
                correctionApprovedAt: new Date(),
                correctionSubmissionId: submission.id,
                auditLogs: {
                  create: {
                    actorUserId: admin.id,
                    action: "SUBMISSION_APPROVE",
                    payloadJson: { submissionId },
                  },
                },
              },
      });

      return {
        resourceId: submission.resourceId,
        part: submission.part,
        discarded: siblings,
      };
    });

    await Promise.all(
      result.discarded.map((sibling) =>
        this.notificationsService.notifyDiscarded({
          resourceId: result.resourceId,
          part: result.part,
          authorUserId: sibling.authorUserId,
        }),
      ),
    );

    return this.getResource(admin, result.resourceId);
  }

  async rejectSubmission(
    admin: AuthenticatedUser,
    submissionId: string,
    payload: ReviewResourceDto,
  ) {
    const locale = resourceLocaleFromUser(admin);

    const submission = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.resourceSubmission.updateMany({
        where: { id: submissionId, status: "AWAITING" },
        data: {
          status: "REJECTED",
          reason: payload.reason ?? null,
          reviewedByUserId: admin.id,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException(
          translateResourceError(
            locale,
            "resources.errors.submissionAlreadyReviewed",
          ),
        );
      }

      const found = await tx.resourceSubmission.findUniqueOrThrow({
        where: { id: submissionId },
      });

      await tx.resourceAuditLog.create({
        data: {
          resourceId: found.resourceId,
          actorUserId: admin.id,
          action: "SUBMISSION_REJECT",
          payloadJson: payload.reason
            ? { submissionId, reason: payload.reason }
            : { submissionId },
        },
      });

      return found;
    });

    await this.notificationsService.notifyRejected({
      resourceId: submission.resourceId,
      part: submission.part,
      authorUserId: submission.authorUserId,
      reason: payload.reason,
    });

    return { id: submission.id, status: submission.status };
  }

  async revokeSubmission(admin: AuthenticatedUser, submissionId: string) {
    const locale = resourceLocaleFromUser(admin);
    const submission = await this.prisma.resourceSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException(
        translateResourceError(locale, "resources.errors.notFound"),
      );
    }
    if (submission.status !== "APPROVED") {
      throw new BadRequestException(
        translateResourceError(locale, "resources.errors.alreadyReviewed"),
      );
    }

    const isStatement = submission.part === "STATEMENT";
    await this.prisma.resource.update({
      where: { id: submission.resourceId },
      data: isStatement
        ? {
            statementStatus: "PENDING",
            statementApprovedByUserId: null,
            statementApprovedAt: null,
            statementSubmissionId: null,
            auditLogs: {
              create: {
                actorUserId: admin.id,
                action: "REVOKE_STATEMENT",
                payloadJson: { submissionId },
              },
            },
          }
        : {
            correctionStatus: "PENDING",
            correctionApprovedByUserId: null,
            correctionApprovedAt: null,
            correctionSubmissionId: null,
            auditLogs: {
              create: {
                actorUserId: admin.id,
                action: "REVOKE_CORRECTION",
                payloadJson: { submissionId },
              },
            },
          },
    });

    await this.prisma.resourceSubmission.update({
      where: { id: submissionId },
      data: { status: "AWAITING", reviewedByUserId: null, reviewedAt: null },
    });

    return this.getResource(admin, submission.resourceId);
  }

  // ── Modération platform ──────────────────────────────────────────────

  async listAdminSubmissions(query: ListAdminResourcesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const status = query.status ?? "AWAITING";
    const part: ResourceAttachmentPart =
      query.part === "correction" ? "CORRECTION" : "STATEMENT";

    const where: Prisma.ResourceSubmissionWhereInput = {
      part,
      status,
      ...(query.kind ? { resource: { kind: query.kind } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.resourceSubmission.findMany({
        where,
        orderBy: [{ createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...SUBMISSION_SELECT,
          resource: {
            select: {
              id: true,
              kind: true,
              title: true,
              examType: true,
              sequence: true,
              academicYearLabel: true,
              school: { select: { id: true, name: true } },
              academicLevel: { select: { id: true, label: true } },
              subject: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.resourceSubmission.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
