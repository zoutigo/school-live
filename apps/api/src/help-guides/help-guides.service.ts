import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  HelpChapter,
  HelpChapterContentType,
  HelpGuide,
  HelpGuideAudience,
  HelpPublicationStatus,
  Prisma,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateHelpChapterDto } from "./dto/create-help-chapter.dto.js";
import type { CreateHelpGuideDto } from "./dto/create-help-guide.dto.js";
import type { GetCurrentGuideDto } from "./dto/get-current-guide.dto.js";
import type { ListHelpGuidesAdminDto } from "./dto/list-help-guides-admin.dto.js";
import type { SearchHelpChaptersDto } from "./dto/search-help-chapters.dto.js";
import type { UpdateHelpChapterDto } from "./dto/update-help-chapter.dto.js";
import type { UpdateHelpGuideDto } from "./dto/update-help-guide.dto.js";

const ROLE_PRIORITY = [
  "PARENT",
  "TEACHER",
  "STUDENT",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_STAFF",
  "SCHOOL_ACCOUNTANT",
] as const;

const GUIDE_SELECT = {
  id: true,
  schoolId: true,
  audience: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      chapters: true,
    },
  },
} satisfies Prisma.HelpGuideSelect;

const CHAPTER_SELECT = {
  id: true,
  guideId: true,
  parentId: true,
  orderIndex: true,
  title: true,
  slug: true,
  summary: true,
  contentType: true,
  contentHtml: true,
  contentJson: true,
  videoUrl: true,
  contentText: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpChapterSelect;

type GuideWithOptionalSchool = Prisma.HelpGuideGetPayload<{
  select: typeof GUIDE_SELECT;
}> & {
  school?: { name: string } | null;
};

type SerializedGuide = {
  id: string;
  schoolId: string | null;
  schoolName: string | null;
  audience: HelpGuideAudience;
  title: string;
  slug: string;
  description: string | null;
  status: HelpPublicationStatus;
  chapterCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type SerializedGuideSource = {
  key: string;
  scopeType: "GLOBAL" | "SCHOOL";
  scopeLabel: string;
  schoolId: string | null;
  schoolName: string | null;
  guide: SerializedGuide;
};

@Injectable()
export class HelpGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  assertCanManage(user: AuthenticatedUser) {
    if (this.isPlatformUser(user)) {
      return;
    }
    this.assertSchoolGuideManager(user);
  }

  async getCurrentGuide(user: AuthenticatedUser, query: GetCurrentGuideDto) {
    const canManageGlobal = this.isPlatformUser(user);
    const schoolScope = this.getSchoolManagementScope(user);
    const sources = await this.resolveGuideSources(
      user,
      query,
      canManageGlobal,
    );

    return {
      permissions: {
        canManageGlobal,
        canManageSchool: Boolean(schoolScope),
      },
      schoolScope,
      sources,
      defaultSourceKey: sources[0]?.key ?? null,
      resolvedAudience: canManageGlobal
        ? (query.audience ?? sources[0]?.guide.audience ?? "STAFF")
        : this.resolveAudience(user),
    };
  }

  async getCurrentPlan(user: AuthenticatedUser, query: GetCurrentGuideDto) {
    const canManage = this.isPlatformUser(user);
    const sources = await this.resolveGuideSources(user, query, canManage);
    if (sources.length === 0) {
      return { sources: [] };
    }

    const chapters = await this.prisma.helpChapter.findMany({
      where: {
        guideId: { in: sources.map((source) => source.guide.id) },
        ...(canManage ? {} : { status: "PUBLISHED" }),
      },
      select: CHAPTER_SELECT,
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });

    return {
      sources: sources.map((source) => ({
        ...source,
        items: this.buildPlan(
          chapters.filter((chapter) => chapter.guideId === source.guide.id),
        ),
      })),
    };
  }

  async getCurrentChapter(
    user: AuthenticatedUser,
    chapterId: string,
    query: GetCurrentGuideDto,
  ) {
    const canManage = this.isPlatformUser(user);
    const sources = await this.resolveGuideSources(user, query, canManage);
    if (sources.length === 0) {
      throw new NotFoundException("Guide introuvable");
    }

    const chapter = await this.prisma.helpChapter.findFirst({
      where: {
        id: chapterId,
        guideId: { in: sources.map((source) => source.guide.id) },
        ...(canManage ? {} : { status: "PUBLISHED" }),
      },
      select: CHAPTER_SELECT,
    });

    if (!chapter) {
      throw new NotFoundException("Chapitre introuvable");
    }

    const source = sources.find((entry) => entry.guide.id === chapter.guideId);
    return {
      source,
      chapter: this.serializeChapter(chapter),
    };
  }

  async searchCurrent(
    user: AuthenticatedUser,
    query: SearchHelpChaptersDto & GetCurrentGuideDto,
  ) {
    const canManage = this.isPlatformUser(user);
    const sources = await this.resolveGuideSources(user, query, canManage);
    if (sources.length === 0) {
      return { sources: [], items: [] };
    }

    const term = query.q.trim();
    const hits = await this.prisma.helpChapter.findMany({
      where: {
        guideId: { in: sources.map((source) => source.guide.id) },
        ...(canManage ? {} : { status: "PUBLISHED" }),
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
          { contentText: { contains: term, mode: "insensitive" } },
        ],
      },
      select: CHAPTER_SELECT,
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      take: 25,
    });

    const all = await this.prisma.helpChapter.findMany({
      where: { guideId: { in: sources.map((source) => source.guide.id) } },
      select: {
        id: true,
        guideId: true,
        parentId: true,
        title: true,
      },
    });
    const map = new Map(all.map((item) => [item.id, item]));

    return {
      sources,
      items: hits.map((hit) => ({
        ...this.serializeChapter(hit),
        breadcrumb: this.buildBreadcrumb(map, hit.id),
        guideId: hit.guideId,
        sourceKey: this.getSourceKey(
          sources.find((source) => source.guide.id === hit.guideId)?.guide
            .schoolId ?? null,
        ),
        scopeType: sources.find((source) => source.guide.id === hit.guideId)
          ?.guide.schoolId
          ? "SCHOOL"
          : "GLOBAL",
        scopeLabel:
          sources.find((source) => source.guide.id === hit.guideId)
            ?.scopeLabel ?? "Scolive",
        schoolId:
          sources.find((source) => source.guide.id === hit.guideId)?.guide
            .schoolId ?? null,
        schoolName:
          sources.find((source) => source.guide.id === hit.guideId)?.guide
            .schoolName ?? null,
      })),
    };
  }

  async listGlobalGuidesAdmin(
    user: AuthenticatedUser,
    query: ListHelpGuidesAdminDto,
  ) {
    this.requirePlatformUser(user);

    const guides = await this.prisma.helpGuide.findMany({
      where: {
        ...(query.audience ? { audience: query.audience } : {}),
        ...(query.status ? { status: query.status } : {}),
        schoolId: null,
      },
      select: GUIDE_SELECT,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return {
      items: guides.map((guide) => this.serializeGuide(guide)),
    };
  }

  async listSchoolGuidesAdmin(
    user: AuthenticatedUser,
    query: ListHelpGuidesAdminDto,
  ) {
    const schoolScope = this.requireSchoolGuideManager(user);

    const guides = await this.prisma.helpGuide.findMany({
      where: {
        ...(query.audience ? { audience: query.audience } : {}),
        ...(query.status ? { status: query.status } : {}),
        schoolId: schoolScope.schoolId,
      },
      select: GUIDE_SELECT,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return {
      items: guides.map((guide) => this.serializeGuide(guide)),
    };
  }

  async createGlobalGuide(user: AuthenticatedUser, dto: CreateHelpGuideDto) {
    this.requirePlatformUser(user);

    const status = dto.status ?? "DRAFT";
    const created = await this.prisma.helpGuide.create({
      data: {
        schoolId: null,
        audience: dto.audience,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status,
        createdById: user.id,
        updatedById: user.id,
      },
      select: GUIDE_SELECT,
    });

    return this.serializeGuide(created);
  }

  async createSchoolGuide(user: AuthenticatedUser, dto: CreateHelpGuideDto) {
    const schoolScope = this.requireSchoolGuideManager(user);

    const status = dto.status ?? "DRAFT";
    const created = await this.prisma.helpGuide.create({
      data: {
        schoolId: schoolScope.schoolId,
        audience: dto.audience,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status,
        createdById: user.id,
        updatedById: user.id,
      },
      select: GUIDE_SELECT,
    });

    return this.serializeGuide(created);
  }

  async updateGlobalGuide(
    user: AuthenticatedUser,
    guideId: string,
    dto: UpdateHelpGuideDto,
  ) {
    this.requirePlatformUser(user);

    await this.ensureGuideExistsForScope(guideId, "GLOBAL");

    const updated = await this.prisma.helpGuide.update({
      where: { id: guideId },
      data: {
        ...(dto.audience ? { audience: dto.audience } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedById: user.id,
      },
      select: GUIDE_SELECT,
    });

    return this.serializeGuide(updated);
  }

  async updateSchoolGuide(
    user: AuthenticatedUser,
    guideId: string,
    dto: UpdateHelpGuideDto,
  ) {
    const schoolScope = this.requireSchoolGuideManager(user);
    await this.ensureGuideExistsForScope(
      guideId,
      "SCHOOL",
      schoolScope.schoolId,
    );

    const updated = await this.prisma.helpGuide.update({
      where: { id: guideId },
      data: {
        ...(dto.audience ? { audience: dto.audience } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedById: user.id,
      },
      select: GUIDE_SELECT,
    });

    return this.serializeGuide(updated);
  }

  async deleteGlobalGuide(user: AuthenticatedUser, guideId: string) {
    this.requirePlatformUser(user);
    await this.ensureGuideExistsForScope(guideId, "GLOBAL");
    await this.prisma.helpGuide.delete({ where: { id: guideId } });
    return { deleted: true };
  }

  async deleteSchoolGuide(user: AuthenticatedUser, guideId: string) {
    const schoolScope = this.requireSchoolGuideManager(user);
    await this.ensureGuideExistsForScope(
      guideId,
      "SCHOOL",
      schoolScope.schoolId,
    );
    await this.prisma.helpGuide.delete({ where: { id: guideId } });
    return { deleted: true };
  }

  async createGlobalChapter(
    user: AuthenticatedUser,
    guideId: string,
    dto: CreateHelpChapterDto,
  ) {
    this.requirePlatformUser(user);
    await this.ensureGuideExistsForScope(guideId, "GLOBAL");
    await this.ensureParentInGuide(guideId, dto.parentId);

    const contentType = dto.contentType ?? "RICH_TEXT";
    this.validateChapterContent(contentType, dto.contentHtml, dto.videoUrl);

    const chapter = await this.prisma.helpChapter.create({
      data: {
        guideId,
        parentId: dto.parentId ?? null,
        orderIndex: dto.orderIndex ?? 0,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        summary: dto.summary,
        contentType,
        contentHtml: dto.contentHtml,
        contentJson: this.toInputJson(dto.contentJson),
        videoUrl: dto.videoUrl,
        contentText: this.extractContentText(
          contentType,
          dto.contentHtml,
          dto.contentJson,
        ),
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: CHAPTER_SELECT,
    });

    return this.serializeChapter(chapter);
  }

  async createSchoolChapter(
    user: AuthenticatedUser,
    guideId: string,
    dto: CreateHelpChapterDto,
  ) {
    const schoolScope = this.requireSchoolGuideManager(user);
    await this.ensureGuideExistsForScope(
      guideId,
      "SCHOOL",
      schoolScope.schoolId,
    );
    await this.ensureParentInGuide(guideId, dto.parentId);

    const contentType = dto.contentType ?? "RICH_TEXT";
    this.validateChapterContent(contentType, dto.contentHtml, dto.videoUrl);

    const chapter = await this.prisma.helpChapter.create({
      data: {
        guideId,
        parentId: dto.parentId ?? null,
        orderIndex: dto.orderIndex ?? 0,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        summary: dto.summary,
        contentType,
        contentHtml: dto.contentHtml,
        contentJson: this.toInputJson(dto.contentJson),
        videoUrl: dto.videoUrl,
        contentText: this.extractContentText(
          contentType,
          dto.contentHtml,
          dto.contentJson,
        ),
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: CHAPTER_SELECT,
    });

    return this.serializeChapter(chapter);
  }

  async updateGlobalChapter(
    user: AuthenticatedUser,
    chapterId: string,
    dto: UpdateHelpChapterDto,
  ) {
    this.requirePlatformUser(user);

    const existing = await this.ensureChapterExistsForScope(
      chapterId,
      "GLOBAL",
    );

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.ensureParentInGuide(existing.guideId, dto.parentId);
      if (dto.parentId === chapterId) {
        throw new BadRequestException(
          "Un chapitre ne peut pas être son propre parent",
        );
      }
    }

    const contentType = dto.contentType ?? existing.contentType;
    const contentHtml = dto.contentHtml ?? existing.contentHtml ?? undefined;
    const videoUrl = dto.videoUrl ?? existing.videoUrl ?? undefined;
    const contentJson =
      dto.contentJson ??
      (existing.contentJson as Record<string, unknown> | null) ??
      undefined;

    this.validateChapterContent(contentType, contentHtml, videoUrl);

    const updated = await this.prisma.helpChapter.update({
      where: { id: chapterId },
      data: {
        ...(dto.parentId !== undefined
          ? { parentId: dto.parentId || null }
          : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.contentType ? { contentType: dto.contentType } : {}),
        ...(dto.contentHtml !== undefined
          ? { contentHtml: dto.contentHtml }
          : {}),
        ...(dto.contentJson !== undefined
          ? { contentJson: this.toInputJson(dto.contentJson) }
          : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        contentText: this.extractContentText(
          contentType,
          contentHtml,
          contentJson,
        ),
        updatedById: user.id,
      },
      select: CHAPTER_SELECT,
    });

    return this.serializeChapter(updated);
  }

  async updateSchoolChapter(
    user: AuthenticatedUser,
    chapterId: string,
    dto: UpdateHelpChapterDto,
  ) {
    const schoolScope = this.requireSchoolGuideManager(user);
    const existing = await this.ensureChapterExistsForScope(
      chapterId,
      "SCHOOL",
      schoolScope.schoolId,
    );

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.ensureParentInGuide(existing.guideId, dto.parentId);
      if (dto.parentId === chapterId) {
        throw new BadRequestException(
          "Un chapitre ne peut pas être son propre parent",
        );
      }
    }

    const contentType = dto.contentType ?? existing.contentType;
    const contentHtml = dto.contentHtml ?? existing.contentHtml ?? undefined;
    const videoUrl = dto.videoUrl ?? existing.videoUrl ?? undefined;
    const contentJson =
      dto.contentJson ??
      (existing.contentJson as Record<string, unknown> | null) ??
      undefined;

    this.validateChapterContent(contentType, contentHtml, videoUrl);

    const updated = await this.prisma.helpChapter.update({
      where: { id: chapterId },
      data: {
        ...(dto.parentId !== undefined
          ? { parentId: dto.parentId || null }
          : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.contentType ? { contentType: dto.contentType } : {}),
        ...(dto.contentHtml !== undefined
          ? { contentHtml: dto.contentHtml }
          : {}),
        ...(dto.contentJson !== undefined
          ? { contentJson: this.toInputJson(dto.contentJson) }
          : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        contentText: this.extractContentText(
          contentType,
          contentHtml,
          contentJson,
        ),
        updatedById: user.id,
      },
      select: CHAPTER_SELECT,
    });

    return this.serializeChapter(updated);
  }

  async deleteGlobalChapter(user: AuthenticatedUser, chapterId: string) {
    this.requirePlatformUser(user);
    await this.ensureChapterExistsForScope(chapterId, "GLOBAL");
    await this.prisma.helpChapter.delete({ where: { id: chapterId } });
    return { deleted: true };
  }

  async deleteSchoolChapter(user: AuthenticatedUser, chapterId: string) {
    const schoolScope = this.requireSchoolGuideManager(user);
    await this.ensureChapterExistsForScope(
      chapterId,
      "SCHOOL",
      schoolScope.schoolId,
    );
    await this.prisma.helpChapter.delete({ where: { id: chapterId } });
    return { deleted: true };
  }

  private async resolveGuideSources(
    user: AuthenticatedUser,
    query: GetCurrentGuideDto,
    canManage: boolean,
  ) {
    if (query.guideId && canManage) {
      const guide = await this.prisma.helpGuide.findUnique({
        where: { id: query.guideId },
        select: {
          ...GUIDE_SELECT,
          school: { select: { name: true } },
        },
      });
      return guide ? [this.serializeGuideSource(guide)] : [];
    }

    const audience = canManage
      ? (query.audience ?? this.resolveAudience(user))
      : this.resolveAudience(user);

    const preferredSchoolId = user.memberships[0]?.schoolId ?? null;

    const guides = await this.prisma.helpGuide.findMany({
      where: {
        audience,
        ...(canManage ? {} : { status: "PUBLISHED" }),
        OR: [{ schoolId: preferredSchoolId }, { schoolId: null }],
      },
      select: {
        ...GUIDE_SELECT,
        school: { select: { name: true } },
      },
      orderBy: [{ schoolId: "asc" }, { updatedAt: "desc" }],
      take: 20,
    });

    return guides
      .filter(
        (guide, index, all) =>
          all.findIndex(
            (candidate) => candidate.schoolId === guide.schoolId,
          ) === index,
      )
      .map((guide) => this.serializeGuideSource(guide));
  }

  private resolveAudience(user: AuthenticatedUser): HelpGuideAudience {
    const roles = new Set(
      user.memberships.map((membership) => membership.role),
    );

    for (const role of ROLE_PRIORITY) {
      if (!roles.has(role)) continue;
      if (role === "PARENT") return "PARENT";
      if (role === "TEACHER") return "TEACHER";
      if (role === "STUDENT") return "STUDENT";
      if (
        role === "SCHOOL_ADMIN" ||
        role === "SCHOOL_MANAGER" ||
        role === "SUPERVISOR"
      ) {
        return "SCHOOL_ADMIN";
      }
      return "STAFF";
    }

    return "STAFF";
  }

  private serializeGuide(guide: GuideWithOptionalSchool): SerializedGuide {
    return {
      id: guide.id,
      schoolId: guide.schoolId,
      schoolName: guide.school?.name ?? null,
      audience: guide.audience,
      title: guide.title,
      slug: guide.slug,
      description: guide.description,
      status: guide.status,
      chapterCount: guide._count.chapters,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
    };
  }

  private serializeGuideSource(
    guide: GuideWithOptionalSchool,
  ): SerializedGuideSource {
    return {
      key: this.getSourceKey(guide.schoolId),
      scopeType: guide.schoolId ? "SCHOOL" : "GLOBAL",
      scopeLabel: guide.schoolId ? (guide.school?.name ?? "École") : "Scolive",
      schoolId: guide.schoolId,
      schoolName: guide.school?.name ?? null,
      guide: this.serializeGuide(guide),
    };
  }

  private serializeChapter(
    chapter: Pick<
      HelpChapter,
      | "id"
      | "guideId"
      | "parentId"
      | "orderIndex"
      | "title"
      | "slug"
      | "summary"
      | "contentType"
      | "contentHtml"
      | "contentJson"
      | "videoUrl"
      | "contentText"
      | "status"
      | "createdAt"
      | "updatedAt"
    >,
  ) {
    return {
      id: chapter.id,
      guideId: chapter.guideId,
      parentId: chapter.parentId,
      orderIndex: chapter.orderIndex,
      title: chapter.title,
      slug: chapter.slug,
      summary: chapter.summary,
      contentType: chapter.contentType,
      contentHtml: chapter.contentHtml,
      contentJson: chapter.contentJson,
      videoUrl: chapter.videoUrl,
      contentText: chapter.contentText,
      status: chapter.status,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
    };
  }

  private buildPlan(
    chapters: Array<
      Prisma.HelpChapterGetPayload<{ select: typeof CHAPTER_SELECT }>
    >,
  ) {
    type PlanNode = {
      id: string;
      title: string;
      slug: string;
      parentId: string | null;
      orderIndex: number;
      depth: number;
      contentType: HelpChapterContentType;
      status: HelpPublicationStatus;
      children: PlanNode[];
    };

    const byParent = new Map<
      string | null,
      Array<Prisma.HelpChapterGetPayload<{ select: typeof CHAPTER_SELECT }>>
    >();
    for (const chapter of chapters) {
      const key = chapter.parentId ?? null;
      const bucket = byParent.get(key) ?? [];
      bucket.push(chapter);
      byParent.set(key, bucket);
    }

    const toNode = (
      chapter: Prisma.HelpChapterGetPayload<{ select: typeof CHAPTER_SELECT }>,
      depth: number,
    ): PlanNode => ({
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      parentId: chapter.parentId,
      orderIndex: chapter.orderIndex,
      depth,
      contentType: chapter.contentType,
      status: chapter.status,
      children: (byParent.get(chapter.id) ?? [])
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((child) => toNode(child, depth + 1)),
    });

    return (byParent.get(null) ?? [])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((chapter) => toNode(chapter, 0));
  }

  private buildBreadcrumb(
    map: Map<
      string,
      { id: string; guideId: string; parentId: string | null; title: string }
    >,
    chapterId: string,
  ) {
    const chain: string[] = [];
    let current = map.get(chapterId);

    while (current) {
      chain.unshift(current.title);
      if (!current.parentId) break;
      current = map.get(current.parentId);
    }

    return chain;
  }

  private validateChapterContent(
    contentType: HelpChapterContentType,
    contentHtml?: string,
    videoUrl?: string,
  ) {
    if (contentType === "VIDEO") {
      if (!videoUrl || !videoUrl.trim()) {
        throw new BadRequestException(
          "Une URL vidéo est requise pour un chapitre vidéo",
        );
      }
      return;
    }

    if (!contentHtml || !contentHtml.trim()) {
      throw new BadRequestException(
        "Le contenu riche est requis pour un chapitre texte",
      );
    }
  }

  private extractContentText(
    contentType: HelpChapterContentType,
    contentHtml?: string,
    contentJson?: Record<string, unknown>,
  ) {
    if (contentType === "VIDEO") {
      return "";
    }

    const html = contentHtml ?? this.pickHtmlFromJson(contentJson) ?? "";
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private pickHtmlFromJson(contentJson?: Record<string, unknown>) {
    if (!contentJson) return undefined;
    const value = contentJson["html"];
    return typeof value === "string" ? value : undefined;
  }

  private toInputJson(
    value?: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    if (!value) return undefined;
    return value as unknown as Prisma.InputJsonValue;
  }

  private isPlatformUser(user: AuthenticatedUser) {
    if (user.activeRole) {
      return user.platformRoles.some((role) => role === user.activeRole);
    }

    return user.platformRoles.length > 0;
  }

  private requirePlatformUser(user: AuthenticatedUser) {
    if (!this.isPlatformUser(user)) {
      throw new ForbiddenException("Réservé aux utilisateurs plateforme");
    }
  }

  private async ensureGuideExists(guideId: string): Promise<HelpGuide> {
    const guide = await this.prisma.helpGuide.findUnique({
      where: { id: guideId },
    });
    if (!guide) {
      throw new NotFoundException("Guide introuvable");
    }
    return guide;
  }

  private async ensureGuideExistsForScope(
    guideId: string,
    scope: "GLOBAL" | "SCHOOL",
    schoolId?: string,
  ): Promise<HelpGuide> {
    const guide = await this.ensureGuideExists(guideId);
    const matchesScope =
      scope === "GLOBAL"
        ? guide.schoolId === null
        : guide.schoolId === schoolId;
    if (!matchesScope) {
      throw new NotFoundException("Guide introuvable");
    }
    return guide;
  }

  private async ensureChapterExistsForScope(
    chapterId: string,
    scope: "GLOBAL" | "SCHOOL",
    schoolId?: string,
  ) {
    const chapter = await this.prisma.helpChapter.findUnique({
      where: { id: chapterId },
      select: {
        ...CHAPTER_SELECT,
        guide: {
          select: { id: true, schoolId: true },
        },
      },
    });
    const matchesScope =
      scope === "GLOBAL"
        ? chapter?.guide.schoolId === null
        : chapter?.guide.schoolId === schoolId;
    if (!chapter || !matchesScope) {
      throw new NotFoundException("Chapitre introuvable");
    }
    return chapter;
  }

  private getSchoolManagementScope(user: AuthenticatedUser) {
    const activeMembership =
      (user.activeRole
        ? user.memberships.find(
            (membership) => membership.role === user.activeRole,
          )
        : null) ??
      user.memberships[0] ??
      null;
    if (!activeMembership || activeMembership.role !== "SCHOOL_ADMIN") {
      return null;
    }

    return {
      schoolId: activeMembership.schoolId,
      schoolName: "École",
    };
  }

  private assertSchoolGuideManager(user: AuthenticatedUser) {
    const schoolScope = this.getSchoolManagementScope(user);
    if (!schoolScope) {
      throw new ForbiddenException("Réservé aux administrateurs d'école");
    }
    return schoolScope;
  }

  private requireSchoolGuideManager(user: AuthenticatedUser) {
    return this.assertSchoolGuideManager(user);
  }

  private getSourceKey(schoolId: string | null) {
    return schoolId ? `school:${schoolId}` : "global";
  }

  private async ensureParentInGuide(guideId: string, parentId?: string) {
    if (!parentId) return;
    const parent = await this.prisma.helpChapter.findFirst({
      where: { id: parentId, guideId },
      select: { id: true },
    });
    if (!parent) {
      throw new BadRequestException("Le parent doit appartenir au même guide");
    }
  }

  private slugify(input: string) {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }
}
