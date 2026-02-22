import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FeedAudienceScope,
  FeedPostType,
  InlineMediaEntityType,
  SchoolRole,
  type Prisma,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateFeedCommentDto } from "./dto/create-feed-comment.dto.js";
import type {
  CreateFeedPostDto,
  FeedPostAttachmentInput,
} from "./dto/create-feed-post.dto.js";
import type { ListFeedPostsDto } from "./dto/list-feed-posts.dto.js";
import type { UpdateFeedPostDto } from "./dto/update-feed-post.dto.js";

type FeedPostPayloadLike = Pick<
  CreateFeedPostDto,
  | "type"
  | "title"
  | "bodyHtml"
  | "audienceScope"
  | "audienceLabel"
  | "audienceLevelId"
  | "audienceClassId"
  | "featuredDays"
  | "pollQuestion"
  | "pollOptions"
>;

const STAFF_ROLES = new Set<SchoolRole>([
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "TEACHER",
]);

type ViewerContext = {
  schoolId: string;
  roles: Set<SchoolRole>;
  classIds: Set<string>;
  levelIds: Set<string>;
  isStaff: boolean;
  isParent: boolean;
  isStudent: boolean;
};

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClientService: MediaClientService,
    private readonly inlineMediaService: InlineMediaService,
  ) {}

  async listPosts(
    user: AuthenticatedUser,
    schoolId: string,
    query: ListFeedPostsDto,
  ) {
    const context = await this.resolveViewerContext(user, schoolId);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(50, query.limit ?? 30));
    const searchTerm = query.q?.trim().toLowerCase() ?? "";
    const now = new Date();

    const where: Prisma.FeedPostWhereInput = {
      schoolId: context.schoolId,
      ...this.visibilityWhere(context),
      ...(query.filter === "polls" ? { type: "POLL" } : {}),
      ...(query.filter === "featured" ? { featuredUntil: { gt: now } } : {}),
      ...(query.viewScope === "CLASS"
        ? {
            audienceScope: "CLASS",
            audienceClassId: query.classId ?? undefined,
          }
        : {}),
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: "insensitive" } },
              { bodyHtml: { contains: searchTerm, mode: "insensitive" } },
              {
                authorUser: {
                  OR: [
                    {
                      firstName: { contains: searchTerm, mode: "insensitive" },
                    },
                    { lastName: { contains: searchTerm, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    if (query.viewScope === "CLASS" && !query.classId) {
      throw new BadRequestException(
        "classId is required when viewScope is CLASS",
      );
    }

    const [total, posts] = await this.prisma.$transaction([
      this.prisma.feedPost.count({ where }),
      this.prisma.feedPost.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          authorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberships: {
                where: { schoolId: context.schoolId },
                select: { role: true },
              },
            },
          },
          attachments: {
            orderBy: [{ createdAt: "asc" }],
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              sizeLabel: true,
            },
          },
          comments: {
            orderBy: [{ createdAt: "asc" }],
            select: {
              id: true,
              text: true,
              createdAt: true,
              authorUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          likes: {
            where: { userId: user.id },
            select: { id: true },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: posts.map((post) => this.mapPost(post, user.id, context)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createPost(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateFeedPostDto,
  ) {
    const context = await this.resolveViewerContext(user, schoolId);
    const type = payload.type ?? FeedPostType.POST;
    const audience = await this.resolveAudienceForCreate(context, payload);
    const featuredUntil = this.resolveFeaturedUntil(
      context,
      payload.featuredDays,
    );
    const pollData = this.resolvePollData(type, payload);
    const attachments = this.normalizeAttachments(payload.attachments);

    const created = await this.prisma.feedPost.create({
      data: {
        schoolId: context.schoolId,
        authorUserId: user.id,
        type,
        title: payload.title.trim(),
        bodyHtml: payload.bodyHtml.trim(),
        audienceScope: audience.scope,
        audienceLabel: audience.label,
        audienceClassId: audience.classId,
        audienceLevelId: audience.levelId,
        featuredUntil,
        pollQuestion: pollData.question,
        pollOptionsJson: pollData.options ?? undefined,
        attachments: attachments.length
          ? {
              createMany: {
                data: attachments,
              },
            }
          : undefined,
      },
      select: { id: true },
    });

    await this.inlineMediaService.syncEntityImages({
      schoolId: context.schoolId,
      uploadedByUserId: user.id,
      scope: "FEED",
      entityType: InlineMediaEntityType.FEED_POST,
      entityId: created.id,
      nextBodyHtml: payload.bodyHtml,
      deleteRemovedPhysically: false,
    });

    const post = await this.loadPostForViewer(
      created.id,
      context.schoolId,
      user.id,
    );
    return this.mapPost(post, user.id, context);
  }

  async updatePost(
    user: AuthenticatedUser,
    schoolId: string,
    postId: string,
    payload: UpdateFeedPostDto,
  ) {
    const context = await this.resolveViewerContext(user, schoolId);
    const existing = await this.requireManagePermission(
      context,
      postId,
      user.id,
    );
    const existingMedia = await this.loadPostMediaReferences(
      context.schoolId,
      postId,
    );

    const type = payload.type ?? existing.type;
    const audience = await this.resolveAudienceForCreate(context, payload);
    const featuredUntil = this.resolveFeaturedUntil(
      context,
      payload.featuredDays,
    );
    const pollData = this.resolvePollData(type, payload);
    const attachments = this.normalizeAttachments(payload.attachments);
    const urlsToCleanup = this.computeUrlsToCleanup({
      existingBodyHtml: existingMedia.bodyHtml,
      existingAttachmentUrls: existingMedia.attachments
        .map((attachment) => attachment.fileUrl)
        .filter((url): url is string => Boolean(url)),
      nextBodyHtml: payload.bodyHtml,
      nextAttachmentUrls:
        payload.attachments === undefined
          ? existingMedia.attachments
              .map((attachment) => attachment.fileUrl)
              .filter((url): url is string => Boolean(url))
          : attachments
              .map((attachment) => attachment.fileUrl)
              .filter((url): url is string => Boolean(url)),
    });

    await this.cleanupMediaUrls(urlsToCleanup);

    await this.inlineMediaService.syncEntityImages({
      schoolId: context.schoolId,
      uploadedByUserId: user.id,
      scope: "FEED",
      entityType: InlineMediaEntityType.FEED_POST,
      entityId: postId,
      previousBodyHtml: existingMedia.bodyHtml,
      nextBodyHtml: payload.bodyHtml,
      deleteRemovedPhysically: false,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.feedPost.update({
        where: { id: postId },
        data: {
          type,
          title: payload.title.trim(),
          bodyHtml: payload.bodyHtml.trim(),
          audienceScope: audience.scope,
          audienceLabel: audience.label,
          audienceClassId: audience.classId,
          audienceLevelId: audience.levelId,
          featuredUntil,
          pollQuestion: pollData.question,
          pollOptionsJson: pollData.options ?? undefined,
        },
      });

      if (payload.attachments) {
        await tx.feedPostAttachment.deleteMany({
          where: { postId },
        });
        if (attachments.length > 0) {
          await tx.feedPostAttachment.createMany({
            data: attachments.map((attachment) => ({
              postId,
              ...attachment,
            })),
          });
        }
      }
    });

    const post = await this.loadPostForViewer(
      postId,
      context.schoolId,
      user.id,
    );
    return this.mapPost(post, user.id, context);
  }

  async deletePost(user: AuthenticatedUser, schoolId: string, postId: string) {
    const context = await this.resolveViewerContext(user, schoolId);
    await this.requireManagePermission(context, postId, user.id);
    const existingMedia = await this.loadPostMediaReferences(
      context.schoolId,
      postId,
    );
    const allUrls = this.computeAllManagedUrls({
      bodyHtml: existingMedia.bodyHtml,
      attachmentUrls: existingMedia.attachments
        .map((attachment) => attachment.fileUrl)
        .filter((url): url is string => Boolean(url)),
    });

    await this.cleanupMediaUrls(allUrls);
    await this.inlineMediaService.removeEntityImages({
      entityType: InlineMediaEntityType.FEED_POST,
      entityId: postId,
      deletePhysically: false,
    });

    await this.prisma.feedPost.delete({
      where: { id: postId },
    });

    return { success: true, postId };
  }

  async toggleLike(user: AuthenticatedUser, schoolId: string, postId: string) {
    const context = await this.resolveViewerContext(user, schoolId);
    await this.ensurePostVisibleForContext(postId, context);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.feedLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: user.id,
          },
        },
        select: { id: true },
      });

      let liked = false;
      if (existing) {
        await tx.feedLike.delete({
          where: { id: existing.id },
        });
      } else {
        await tx.feedLike.create({
          data: {
            postId,
            schoolId: context.schoolId,
            userId: user.id,
          },
        });
        liked = true;
      }

      const likesCount = await tx.feedLike.count({
        where: { postId },
      });

      return { liked, likesCount };
    });

    return result;
  }

  async addComment(
    user: AuthenticatedUser,
    schoolId: string,
    postId: string,
    payload: CreateFeedCommentDto,
  ) {
    const context = await this.resolveViewerContext(user, schoolId);
    await this.ensurePostVisibleForContext(postId, context);

    const created = await this.prisma.feedComment.create({
      data: {
        postId,
        schoolId: context.schoolId,
        authorUserId: user.id,
        text: payload.text.trim(),
      },
      include: {
        authorUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const commentsCount = await this.prisma.feedComment.count({
      where: { postId },
    });

    return {
      comment: {
        id: created.id,
        authorName:
          `${created.authorUser.firstName} ${created.authorUser.lastName}`.trim(),
        text: created.text,
        createdAt: created.createdAt,
      },
      commentsCount,
    };
  }

  private async ensurePostVisibleForContext(
    postId: string,
    context: ViewerContext,
  ) {
    const post = await this.prisma.feedPost.findFirst({
      where: {
        id: postId,
        schoolId: context.schoolId,
      },
      select: {
        id: true,
        audienceScope: true,
        audienceClassId: true,
        audienceLevelId: true,
      },
    });

    if (!post) {
      throw new NotFoundException("Publication introuvable");
    }

    if (!this.canContextSeeScope(context, post)) {
      throw new ForbiddenException("Acces refuse");
    }
  }

  private async requireManagePermission(
    context: ViewerContext,
    postId: string,
    viewerUserId: string,
  ) {
    const post = await this.prisma.feedPost.findFirst({
      where: {
        id: postId,
        schoolId: context.schoolId,
      },
      select: {
        id: true,
        authorUserId: true,
        type: true,
        authorUser: {
          select: {
            memberships: {
              where: { schoolId: context.schoolId },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Publication introuvable");
    }

    const isAuthor = post.authorUserId === viewerUserId;
    const authorIsParentOrStudent = post.authorUser.memberships.some(
      (membership) =>
        membership.role === SchoolRole.PARENT ||
        membership.role === SchoolRole.STUDENT,
    );
    const authorIsStaff = post.authorUser.memberships.some((membership) =>
      STAFF_ROLES.has(membership.role),
    );
    const isStaffModerator = context.isStaff && authorIsParentOrStudent;
    const isSchoolAdminModerator =
      context.roles.has(SchoolRole.SCHOOL_ADMIN) && authorIsStaff;

    if (!isAuthor && !isStaffModerator && !isSchoolAdminModerator) {
      throw new ForbiddenException(
        "Seul l'auteur, un staff/enseignant moderateur, ou le SCHOOL_ADMIN sur un post staff peut modifier ou supprimer cette publication",
      );
    }

    return post;
  }

  private async resolveViewerContext(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<ViewerContext> {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const roles = new Set(
      user.memberships
        .filter((membership) => membership.schoolId === effectiveSchoolId)
        .map((membership) => membership.role),
    );
    const isStaff =
      user.platformRoles.includes("SUPER_ADMIN") ||
      user.platformRoles.includes("ADMIN") ||
      Array.from(roles).some((role) => STAFF_ROLES.has(role));
    const isParent = roles.has("PARENT");
    const isStudent = roles.has("STUDENT");

    const school = await this.prisma.school.findUnique({
      where: { id: effectiveSchoolId },
      select: { activeSchoolYearId: true },
    });
    const activeSchoolYearId = school?.activeSchoolYearId ?? null;

    const [studentEnrollments, parentEnrollments, teacherAssignments] =
      await this.prisma.$transaction([
        this.prisma.enrollment.findMany({
          where: {
            schoolId: effectiveSchoolId,
            status: "ACTIVE",
            student: {
              userId: user.id,
            },
            ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
          },
          select: {
            classId: true,
            class: { select: { academicLevelId: true } },
          },
        }),
        this.prisma.enrollment.findMany({
          where: {
            schoolId: effectiveSchoolId,
            status: "ACTIVE",
            student: {
              parentLinks: {
                some: { parentUserId: user.id },
              },
            },
            ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
          },
          select: {
            classId: true,
            class: { select: { academicLevelId: true } },
          },
        }),
        this.prisma.teacherClassSubject.findMany({
          where: {
            schoolId: effectiveSchoolId,
            teacherUserId: user.id,
            ...(activeSchoolYearId ? { schoolYearId: activeSchoolYearId } : {}),
          },
          select: {
            classId: true,
            class: {
              select: {
                academicLevelId: true,
              },
            },
          },
          distinct: ["classId"],
        }),
      ]);

    const classIds = new Set<string>();
    const levelIds = new Set<string>();

    for (const row of studentEnrollments) {
      classIds.add(row.classId);
      if (row.class.academicLevelId) {
        levelIds.add(row.class.academicLevelId);
      }
    }
    for (const row of parentEnrollments) {
      classIds.add(row.classId);
      if (row.class.academicLevelId) {
        levelIds.add(row.class.academicLevelId);
      }
    }
    for (const row of teacherAssignments) {
      classIds.add(row.classId);
      if (row.class.academicLevelId) {
        levelIds.add(row.class.academicLevelId);
      }
    }

    return {
      schoolId: effectiveSchoolId,
      roles,
      classIds,
      levelIds,
      isStaff,
      isParent,
      isStudent,
    };
  }

  private visibilityWhere(context: ViewerContext): Prisma.FeedPostWhereInput {
    if (context.isStaff) {
      return {};
    }

    const visibilityOr: Prisma.FeedPostWhereInput[] = [
      { audienceScope: "SCHOOL_ALL" },
    ];

    if (context.isParent || context.isStudent) {
      visibilityOr.push({ audienceScope: "PARENTS_STUDENTS" });
    }

    if (context.isParent) {
      visibilityOr.push({ audienceScope: "PARENTS_ONLY" });
    }

    if (context.classIds.size > 0) {
      visibilityOr.push({
        audienceScope: "CLASS",
        audienceClassId: { in: Array.from(context.classIds) },
      });
    }

    if (context.levelIds.size > 0) {
      visibilityOr.push({
        audienceScope: "LEVEL",
        audienceLevelId: { in: Array.from(context.levelIds) },
      });
    }

    return { OR: visibilityOr };
  }

  private canContextSeeScope(
    context: ViewerContext,
    post: {
      audienceScope: FeedAudienceScope;
      audienceClassId: string | null;
      audienceLevelId: string | null;
    },
  ) {
    if (context.isStaff) {
      return true;
    }

    if (post.audienceScope === "SCHOOL_ALL") {
      return true;
    }

    if (post.audienceScope === "STAFF_ONLY") {
      return false;
    }

    if (post.audienceScope === "PARENTS_STUDENTS") {
      return context.isParent || context.isStudent;
    }

    if (post.audienceScope === "PARENTS_ONLY") {
      return context.isParent;
    }

    if (post.audienceScope === "CLASS") {
      return Boolean(
        post.audienceClassId && context.classIds.has(post.audienceClassId),
      );
    }

    if (post.audienceScope === "LEVEL") {
      return Boolean(
        post.audienceLevelId && context.levelIds.has(post.audienceLevelId),
      );
    }

    return false;
  }

  private async resolveAudienceForCreate(
    context: ViewerContext,
    payload: FeedPostPayloadLike,
  ) {
    if (context.isStudent) {
      const classId =
        payload.audienceClassId ?? Array.from(context.classIds)[0];
      if (!classId || !context.classIds.has(classId)) {
        throw new ForbiddenException(
          "Un eleve ne peut publier que pour sa classe",
        );
      }
      const classRoom = await this.prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: context.schoolId,
        },
        select: {
          id: true,
          name: true,
          academicLevelId: true,
        },
      });
      if (!classRoom) {
        throw new BadRequestException("Classe invalide");
      }
      return {
        scope: FeedAudienceScope.CLASS,
        classId: classRoom.id,
        levelId: classRoom.academicLevelId,
        label:
          payload.audienceLabel?.trim() ||
          `Classe ${classRoom.name} (eleves, parents, enseignants)`,
      };
    }

    if (context.isParent && !context.isStaff) {
      return {
        scope: FeedAudienceScope.PARENTS_ONLY,
        classId: null,
        levelId: null,
        label: payload.audienceLabel?.trim() || "Parents uniquement",
      };
    }

    const scope = payload.audienceScope ?? FeedAudienceScope.SCHOOL_ALL;
    if (!context.isStaff && scope !== FeedAudienceScope.SCHOOL_ALL) {
      throw new ForbiddenException("Audience non autorisee");
    }

    if (scope === FeedAudienceScope.CLASS) {
      if (!payload.audienceClassId) {
        throw new BadRequestException("audienceClassId is required for CLASS");
      }
      const classRoom = await this.prisma.class.findFirst({
        where: {
          id: payload.audienceClassId,
          schoolId: context.schoolId,
        },
        select: {
          id: true,
          name: true,
          academicLevelId: true,
        },
      });
      if (!classRoom) {
        throw new BadRequestException("Classe invalide");
      }
      return {
        scope,
        classId: classRoom.id,
        levelId: classRoom.academicLevelId,
        label:
          payload.audienceLabel?.trim() ||
          `Parents/eleves classe ${classRoom.name}`,
      };
    }

    if (scope === FeedAudienceScope.LEVEL) {
      if (!payload.audienceLevelId) {
        throw new BadRequestException("audienceLevelId is required for LEVEL");
      }
      const level = await this.prisma.academicLevel.findFirst({
        where: {
          id: payload.audienceLevelId,
          schoolId: context.schoolId,
        },
        select: {
          id: true,
          label: true,
        },
      });
      if (!level) {
        throw new BadRequestException("Niveau invalide");
      }
      return {
        scope,
        classId: null,
        levelId: level.id,
        label: payload.audienceLabel?.trim() || `Niveau ${level.label}`,
      };
    }

    return {
      scope,
      classId: null,
      levelId: null,
      label: payload.audienceLabel?.trim() || this.defaultAudienceLabel(scope),
    };
  }

  private resolveFeaturedUntil(context: ViewerContext, featuredDays?: number) {
    if (!context.isStaff || !featuredDays || featuredDays <= 0) {
      return null;
    }

    return new Date(Date.now() + featuredDays * 24 * 60 * 60 * 1000);
  }

  private resolvePollData(type: FeedPostType, payload: FeedPostPayloadLike) {
    if (type !== FeedPostType.POLL) {
      return { question: null, options: null as Prisma.InputJsonValue | null };
    }

    const question = payload.pollQuestion?.trim();
    if (!question) {
      throw new BadRequestException(
        "pollQuestion is required for poll publications",
      );
    }

    const options = Array.from(
      new Set(
        (payload.pollOptions ?? [])
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );

    if (options.length < 2) {
      throw new BadRequestException("A poll needs at least 2 options");
    }

    return {
      question,
      options: options.map((option, index) => ({
        id: `option-${index + 1}`,
        label: option,
        votes: 0,
      })) as Prisma.InputJsonValue,
    };
  }

  private normalizeAttachments(attachments?: FeedPostAttachmentInput[]) {
    return (attachments ?? []).map((attachment) => ({
      fileName: attachment.fileName.trim(),
      fileUrl: attachment.fileUrl?.trim() || null,
      sizeLabel: attachment.sizeLabel?.trim() || null,
    }));
  }

  private defaultAudienceLabel(scope: FeedAudienceScope) {
    if (scope === FeedAudienceScope.STAFF_ONLY) {
      return "Staff uniquement";
    }
    if (scope === FeedAudienceScope.PARENTS_STUDENTS) {
      return "Parents et eleves";
    }
    if (scope === FeedAudienceScope.PARENTS_ONLY) {
      return "Parents uniquement";
    }
    return "Toute l'ecole";
  }

  private async loadPostForViewer(
    postId: string,
    schoolId: string,
    viewerUserId: string,
  ) {
    const post = await this.prisma.feedPost.findFirst({
      where: {
        id: postId,
        schoolId,
      },
      include: {
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
        attachments: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            sizeLabel: true,
          },
        },
        comments: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            text: true,
            createdAt: true,
            authorUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        likes: {
          where: { userId: viewerUserId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Publication introuvable");
    }

    return post;
  }

  private async loadPostMediaReferences(schoolId: string, postId: string) {
    const post = await this.prisma.feedPost.findFirst({
      where: {
        id: postId,
        schoolId,
      },
      select: {
        id: true,
        bodyHtml: true,
        attachments: {
          select: {
            fileUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Publication introuvable");
    }

    return post;
  }

  private extractInlineImageUrls(bodyHtml: string) {
    const urls = new Set<string>();
    const pattern = /<img[^>]+src=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null = null;
    while (true) {
      match = pattern.exec(bodyHtml);
      if (!match) {
        break;
      }
      const url = match[1]?.trim();
      if (url && this.isManagedMediaUrl(url)) {
        urls.add(url);
      }
    }
    return Array.from(urls);
  }

  private isManagedMediaUrl(url: string) {
    const mediaBase = process.env.MEDIA_PUBLIC_BASE_URL?.trim().replace(
      /\/$/,
      "",
    );
    if (mediaBase) {
      return url.startsWith(`${mediaBase}/`);
    }
    return url.includes("/messaging/inline-images/");
  }

  private computeAllManagedUrls(input: {
    bodyHtml: string;
    attachmentUrls: string[];
  }) {
    const urls = new Set<string>([
      ...this.extractInlineImageUrls(input.bodyHtml),
      ...input.attachmentUrls.filter((url) => this.isManagedMediaUrl(url)),
    ]);
    return Array.from(urls);
  }

  private computeUrlsToCleanup(input: {
    existingBodyHtml: string;
    existingAttachmentUrls: string[];
    nextBodyHtml: string;
    nextAttachmentUrls: string[];
  }) {
    const existing = new Set<string>(
      this.computeAllManagedUrls({
        bodyHtml: input.existingBodyHtml,
        attachmentUrls: input.existingAttachmentUrls,
      }),
    );
    const next = new Set<string>(
      this.computeAllManagedUrls({
        bodyHtml: input.nextBodyHtml,
        attachmentUrls: input.nextAttachmentUrls,
      }),
    );
    return Array.from(existing).filter((url) => !next.has(url));
  }

  private async cleanupMediaUrls(urls: string[]) {
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL?.trim();
    if (!mediaServiceUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new BadGatewayException("MEDIA_SERVICE_URL not configured");
      }
      return;
    }

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

  private mapPost(
    post: {
      id: string;
      type: FeedPostType;
      title: string;
      bodyHtml: string;
      createdAt: Date;
      featuredUntil: Date | null;
      audienceScope: FeedAudienceScope;
      audienceLabel: string;
      audienceLevelId: string | null;
      audienceClassId: string | null;
      pollQuestion: string | null;
      pollOptionsJson: Prisma.JsonValue | null;
      authorUser: {
        id: string;
        firstName: string;
        lastName: string;
        memberships: Array<{ role: SchoolRole }>;
      };
      attachments: Array<{
        id: string;
        fileName: string;
        fileUrl: string | null;
        sizeLabel: string | null;
      }>;
      comments: Array<{
        id: string;
        text: string;
        createdAt: Date;
        authorUser: {
          firstName: string;
          lastName: string;
        };
      }>;
      likes: Array<{ id: string }>;
      _count: {
        likes: number;
        comments: number;
      };
    },
    viewerUserId: string,
    viewerContext: ViewerContext,
  ) {
    const roleLabel = this.roleLabel(post.authorUser.memberships[0]?.role);
    const parsedPollOptions = this.parsePollOptions(post.pollOptionsJson);
    const authorIsParentOrStudent = post.authorUser.memberships.some(
      (membership) =>
        membership.role === SchoolRole.PARENT ||
        membership.role === SchoolRole.STUDENT,
    );
    const authorIsStaff = post.authorUser.memberships.some((membership) =>
      STAFF_ROLES.has(membership.role),
    );
    const viewerIsSchoolAdmin = viewerContext.roles.has(
      SchoolRole.SCHOOL_ADMIN,
    );
    const canManage =
      post.authorUser.id === viewerUserId ||
      (viewerContext.isStaff && authorIsParentOrStudent) ||
      (viewerIsSchoolAdmin && authorIsStaff);

    return {
      id: post.id,
      type: post.type,
      author: {
        id: post.authorUser.id,
        fullName:
          `${post.authorUser.firstName} ${post.authorUser.lastName}`.trim(),
        civility: "M.",
        roleLabel,
        avatarText: post.authorUser.firstName.charAt(0).toUpperCase(),
      },
      title: post.title,
      bodyHtml: post.bodyHtml,
      createdAt: post.createdAt,
      featuredUntil: post.featuredUntil,
      audience: {
        scope: post.audienceScope,
        label: post.audienceLabel,
        levelId: post.audienceLevelId ?? undefined,
        classId: post.audienceClassId ?? undefined,
      },
      attachments: post.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeLabel: attachment.sizeLabel ?? "",
      })),
      likedByViewer: post.likes.length > 0,
      likesCount: post._count.likes,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        authorName:
          `${comment.authorUser.firstName} ${comment.authorUser.lastName}`.trim(),
        text: comment.text,
        createdAt: comment.createdAt,
      })),
      commentsCount: post._count.comments,
      authoredByViewer: post.authorUser.id === viewerUserId,
      canManage,
      poll:
        post.type === "POLL" && post.pollQuestion
          ? {
              question: post.pollQuestion,
              options: parsedPollOptions,
              votedOptionId: null,
            }
          : undefined,
    };
  }

  private parsePollOptions(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const raw = entry as {
          id?: unknown;
          label?: unknown;
          votes?: unknown;
        };
        return {
          id:
            typeof raw.id === "string" && raw.id.trim().length > 0
              ? raw.id
              : `option-${index + 1}`,
          label:
            typeof raw.label === "string" ? raw.label : `Option ${index + 1}`,
          votes: typeof raw.votes === "number" ? raw.votes : 0,
        };
      })
      .filter((entry): entry is { id: string; label: string; votes: number } =>
        Boolean(entry),
      );
  }

  private roleLabel(role?: SchoolRole) {
    if (!role) {
      return "Membre";
    }
    if (role === "SCHOOL_ADMIN") return "Administration";
    if (role === "SCHOOL_MANAGER") return "Direction";
    if (role === "SUPERVISOR") return "Surveillance";
    if (role === "SCHOOL_ACCOUNTANT") return "Comptabilite";
    if (role === "SCHOOL_STAFF") return "Staff";
    if (role === "TEACHER") return "Vie scolaire";
    if (role === "PARENT") return "Parents";
    return "Eleves";
  }

  private getEffectiveSchoolId(user: AuthenticatedUser, schoolId: string) {
    if (
      user.platformRoles.includes("SUPER_ADMIN") ||
      user.platformRoles.includes("ADMIN")
    ) {
      return schoolId;
    }

    const hasMembership = user.memberships.some(
      (membership) => membership.schoolId === schoolId,
    );

    if (!hasMembership) {
      throw new ForbiddenException("Insufficient role");
    }

    return schoolId;
  }
}
