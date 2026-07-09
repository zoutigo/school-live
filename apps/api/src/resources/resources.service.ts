import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ResourceApprovalStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateResourceDto } from "./dto/create-resource.dto.js";
import type { ListAdminResourcesQueryDto } from "./dto/list-admin-resources-query.dto.js";
import type { ListMyResourcesQueryDto } from "./dto/list-my-resources-query.dto.js";
import type { ListResourcesQueryDto } from "./dto/list-resources-query.dto.js";
import type { ReviewResourceDto } from "./dto/review-resource.dto.js";
import type { UpdateResourceDto } from "./dto/update-resource.dto.js";
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

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  private inlineEntityId(resourceId: string, part: "statement" | "correction") {
    return `${resourceId}:${part}`;
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

    const where: Prisma.ResourceWhereInput = {
      kind: query.kind,
      statementStatus: "APPROVED",
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
        attachments: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            part: true,
            fileName: true,
            fileUrl: true,
            sizeLabel: true,
            mimeType: true,
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

    const isAuthor = resource.authorUserId === user.id;
    const isPlatform = user.platformRoles.length > 0;
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

    return {
      ...resource,
      correctionContent: showCorrection ? resource.correctionContent : null,
      attachments: resource.attachments.filter(
        (a) => a.part === "STATEMENT" || showCorrection,
      ),
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
        statementContent: payload.statementContent,
        correctionContent: payload.correctionContent ?? null,
        attachments: {
          create: [
            ...(payload.statementAttachments ?? []).map((a) => ({
              part: "STATEMENT" as const,
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              sizeLabel: a.sizeLabel,
              mimeType: a.mimeType,
            })),
            ...(payload.correctionAttachments ?? []).map((a) => ({
              part: "CORRECTION" as const,
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              sizeLabel: a.sizeLabel,
              mimeType: a.mimeType,
            })),
          ],
        },
        auditLogs: {
          create: { actorUserId: user.id, action: "SUBMIT" },
        },
      },
      select: { id: true, schoolId: true },
    });

    await this.inlineMediaService.syncEntityImages({
      schoolId: resource.schoolId,
      uploadedByUserId: user.id,
      scope: "RESOURCE",
      entityType: "RESOURCE",
      entityId: this.inlineEntityId(resource.id, "statement"),
      nextBodyHtml: payload.statementContent,
      deleteRemovedPhysically: false,
    });
    if (payload.correctionContent) {
      await this.inlineMediaService.syncEntityImages({
        schoolId: resource.schoolId,
        uploadedByUserId: user.id,
        scope: "RESOURCE",
        entityType: "RESOURCE",
        entityId: this.inlineEntityId(resource.id, "correction"),
        nextBodyHtml: payload.correctionContent,
        deleteRemovedPhysically: false,
      });
    }

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
        schoolId: true,
        academicLevelId: true,
        subjectId: true,
        statementContent: true,
        statementStatus: true,
        correctionContent: true,
        correctionStatus: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        translateResourceError(locale, "resources.errors.notFound"),
      );
    }
    const isAuthor = existing.authorUserId === user.id;
    const isPlatform = user.platformRoles.length > 0;
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

    const statementChanged =
      payload.statementContent !== undefined &&
      payload.statementContent !== existing.statementContent;
    if (payload.statementContent !== undefined) {
      data.statementContent = payload.statementContent;
    }
    if (statementChanged && existing.statementStatus === "APPROVED") {
      data.statementStatus = "PENDING";
      data.statementApprovedByUserId = null;
      data.statementApprovedAt = null;
    }

    const correctionChanged =
      payload.correctionContent !== undefined &&
      payload.correctionContent !== existing.correctionContent;
    if (payload.correctionContent !== undefined) {
      data.correctionContent = payload.correctionContent;
    }
    if (correctionChanged && existing.correctionStatus === "APPROVED") {
      data.correctionStatus = "PENDING";
      data.correctionApprovedByUserId = null;
      data.correctionApprovedAt = null;
    }

    if (payload.statementAttachments !== undefined) {
      await this.prisma.resourceAttachment.deleteMany({
        where: { resourceId, part: "STATEMENT" },
      });
      await this.prisma.resourceAttachment.createMany({
        data: payload.statementAttachments.map((a) => ({
          resourceId,
          part: "STATEMENT" as const,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          sizeLabel: a.sizeLabel,
          mimeType: a.mimeType,
        })),
      });
    }
    if (payload.correctionAttachments !== undefined) {
      await this.prisma.resourceAttachment.deleteMany({
        where: { resourceId, part: "CORRECTION" },
      });
      await this.prisma.resourceAttachment.createMany({
        data: payload.correctionAttachments.map((a) => ({
          resourceId,
          part: "CORRECTION" as const,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          sizeLabel: a.sizeLabel,
          mimeType: a.mimeType,
        })),
      });
    }

    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...data,
        auditLogs: { create: { actorUserId: user.id, action: "EDIT" } },
      },
    });

    if (payload.statementContent !== undefined) {
      await this.inlineMediaService.syncEntityImages({
        schoolId: existing.schoolId,
        uploadedByUserId: user.id,
        scope: "RESOURCE",
        entityType: "RESOURCE",
        entityId: this.inlineEntityId(resourceId, "statement"),
        nextBodyHtml: payload.statementContent,
        deleteRemovedPhysically: false,
      });
    }
    if (payload.correctionContent !== undefined) {
      await this.inlineMediaService.syncEntityImages({
        schoolId: existing.schoolId,
        uploadedByUserId: user.id,
        scope: "RESOURCE",
        entityType: "RESOURCE",
        entityId: this.inlineEntityId(resourceId, "correction"),
        nextBodyHtml: payload.correctionContent,
        deleteRemovedPhysically: false,
      });
    }

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

  // ── Modération platform ──────────────────────────────────────────────

  async listAdminResources(query: ListAdminResourcesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const status = query.status ?? "PENDING";
    const part = query.part ?? "statement";

    const where: Prisma.ResourceWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(part === "statement"
        ? { statementStatus: status }
        : { correctionStatus: status, correctionContent: { not: null } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        select: RESOURCE_LIST_SELECT,
        orderBy: [{ createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  private async findResourceOrThrow(
    user: AuthenticatedUser,
    resourceId: string,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, statementStatus: true, correctionStatus: true },
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

  async approveStatement(user: AuthenticatedUser, resourceId: string) {
    await this.findResourceOrThrow(user, resourceId);
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        statementStatus: "APPROVED",
        statementApprovedByUserId: user.id,
        statementApprovedAt: new Date(),
        auditLogs: {
          create: { actorUserId: user.id, action: "APPROVE_STATEMENT" },
        },
      },
    });
    return this.getResource(user, resourceId);
  }

  async rejectStatement(
    user: AuthenticatedUser,
    resourceId: string,
    payload: ReviewResourceDto,
  ) {
    await this.findResourceOrThrow(user, resourceId);
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        statementStatus: "REJECTED",
        statementApprovedByUserId: null,
        statementApprovedAt: null,
        auditLogs: {
          create: {
            actorUserId: user.id,
            action: "REJECT_STATEMENT",
            payloadJson: payload.reason
              ? { reason: payload.reason }
              : undefined,
          },
        },
      },
    });
    return this.getResource(user, resourceId);
  }

  async revokeStatement(user: AuthenticatedUser, resourceId: string) {
    const resource = await this.findResourceOrThrow(user, resourceId);
    if (resource.statementStatus !== "APPROVED") {
      throw new BadRequestException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.alreadyReviewed",
        ),
      );
    }
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        statementStatus: "PENDING",
        statementApprovedByUserId: null,
        statementApprovedAt: null,
        auditLogs: {
          create: { actorUserId: user.id, action: "REVOKE_STATEMENT" },
        },
      },
    });
    return this.getResource(user, resourceId);
  }

  async approveCorrection(user: AuthenticatedUser, resourceId: string) {
    await this.findResourceOrThrow(user, resourceId);
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        correctionStatus: "APPROVED",
        correctionApprovedByUserId: user.id,
        correctionApprovedAt: new Date(),
        auditLogs: {
          create: { actorUserId: user.id, action: "APPROVE_CORRECTION" },
        },
      },
    });
    return this.getResource(user, resourceId);
  }

  async rejectCorrection(
    user: AuthenticatedUser,
    resourceId: string,
    payload: ReviewResourceDto,
  ) {
    await this.findResourceOrThrow(user, resourceId);
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        correctionStatus: "REJECTED",
        correctionApprovedByUserId: null,
        correctionApprovedAt: null,
        auditLogs: {
          create: {
            actorUserId: user.id,
            action: "REJECT_CORRECTION",
            payloadJson: payload.reason
              ? { reason: payload.reason }
              : undefined,
          },
        },
      },
    });
    return this.getResource(user, resourceId);
  }

  async revokeCorrection(user: AuthenticatedUser, resourceId: string) {
    const resource = await this.findResourceOrThrow(user, resourceId);
    if (resource.correctionStatus !== "APPROVED") {
      throw new BadRequestException(
        translateResourceError(
          resourceLocaleFromUser(user),
          "resources.errors.alreadyReviewed",
        ),
      );
    }
    await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        correctionStatus: "PENDING",
        correctionApprovedByUserId: null,
        correctionApprovedAt: null,
        auditLogs: {
          create: { actorUserId: user.id, action: "REVOKE_CORRECTION" },
        },
      },
    });
    return this.getResource(user, resourceId);
  }
}
