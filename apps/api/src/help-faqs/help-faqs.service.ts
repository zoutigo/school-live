import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  HelpFaq,
  HelpFaqItem,
  HelpFaqTheme,
  HelpGuideAudience,
  HelpPublicationStatus,
  Prisma,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateHelpFaqDto } from "./dto/create-help-faq.dto.js";
import type { CreateHelpFaqItemDto } from "./dto/create-help-faq-item.dto.js";
import type { CreateHelpFaqThemeDto } from "./dto/create-help-faq-theme.dto.js";
import type { GetCurrentHelpFaqDto } from "./dto/get-current-help-faq.dto.js";
import type { ListHelpFaqsAdminDto } from "./dto/list-help-faqs-admin.dto.js";
import type { SearchHelpFaqItemsDto } from "./dto/search-help-faq-items.dto.js";
import type { UpdateHelpFaqDto } from "./dto/update-help-faq.dto.js";
import type { UpdateHelpFaqItemDto } from "./dto/update-help-faq-item.dto.js";
import type { UpdateHelpFaqThemeDto } from "./dto/update-help-faq-theme.dto.js";

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

const FAQ_SELECT = {
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
      themes: true,
    },
  },
} satisfies Prisma.HelpFaqSelect;

const THEME_SELECT = {
  id: true,
  faqId: true,
  orderIndex: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpFaqThemeSelect;

const ITEM_SELECT = {
  id: true,
  themeId: true,
  orderIndex: true,
  question: true,
  answerHtml: true,
  answerJson: true,
  answerText: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpFaqItemSelect;

type SerializedFaq = {
  id: string;
  schoolId: string | null;
  schoolName: string | null;
  audience: HelpGuideAudience;
  title: string;
  slug: string;
  description: string | null;
  status: HelpPublicationStatus;
  themeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type FaqWithOptionalSchool = Prisma.HelpFaqGetPayload<{
  select: typeof FAQ_SELECT;
}> & {
  school?: { name: string } | null;
};

type SerializedFaqSource = {
  key: string;
  scopeType: "GLOBAL" | "SCHOOL";
  scopeLabel: string;
  schoolId: string | null;
  schoolName: string | null;
  faq: SerializedFaq;
};

@Injectable()
export class HelpFaqsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentFaq(user: AuthenticatedUser, query: GetCurrentHelpFaqDto) {
    const canManageGlobal = this.isPlatformUser(user);
    const schoolScope = await this.getSchoolManagementScope(user);
    const sources = await this.resolveFaqSources(user, query, canManageGlobal);

    return {
      permissions: {
        canManageGlobal,
        canManageSchool: Boolean(schoolScope),
      },
      schoolScope,
      sources,
      defaultSourceKey: sources[0]?.key ?? null,
      resolvedAudience: canManageGlobal
        ? (query.audience ?? sources[0]?.faq.audience ?? "STAFF")
        : this.resolveAudience(user),
    };
  }

  async getCurrentThemes(user: AuthenticatedUser, query: GetCurrentHelpFaqDto) {
    const canManage = this.isPlatformUser(user);
    const sources = await this.resolveFaqSources(user, query, canManage);
    if (sources.length === 0) {
      return { sources: [] };
    }

    const themes = await this.prisma.helpFaqTheme.findMany({
      where: {
        faqId: { in: sources.map((source) => source.faq.id) },
        ...(canManage ? {} : { status: "PUBLISHED" }),
      },
      select: {
        ...THEME_SELECT,
        items: {
          where: canManage ? {} : { status: "PUBLISHED" },
          select: ITEM_SELECT,
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });

    return {
      sources: sources.map((source) => ({
        ...source,
        themes: themes
          .filter((theme) => theme.faqId === source.faq.id)
          .map((theme) => ({
            ...this.serializeTheme(theme),
            items: theme.items.map((item) => this.serializeItem(item)),
          })),
      })),
    };
  }

  async searchCurrent(
    user: AuthenticatedUser,
    query: SearchHelpFaqItemsDto & GetCurrentHelpFaqDto,
  ) {
    const canManage = this.isPlatformUser(user);
    const sources = await this.resolveFaqSources(user, query, canManage);
    if (sources.length === 0) {
      return { sources: [], items: [] };
    }

    const term = query.q.trim();
    const items = await this.prisma.helpFaqItem.findMany({
      where: {
        theme: {
          faqId: { in: sources.map((source) => source.faq.id) },
          ...(canManage ? {} : { status: "PUBLISHED" }),
        },
        ...(canManage ? {} : { status: "PUBLISHED" }),
        OR: [
          { question: { contains: term, mode: "insensitive" } },
          { answerText: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        ...ITEM_SELECT,
        theme: {
          select: {
            id: true,
            title: true,
            faq: {
              select: {
                id: true,
                schoolId: true,
                school: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      take: 25,
    });

    return {
      sources,
      items: items.map((item) => ({
        ...this.serializeItem(item),
        themeId: item.theme.id,
        themeTitle: item.theme.title,
        faqId: item.theme.faq.id,
        sourceKey: this.getSourceKey(item.theme.faq.schoolId),
        scopeType: item.theme.faq.schoolId ? "SCHOOL" : "GLOBAL",
        scopeLabel: item.theme.faq.schoolId
          ? (item.theme.faq.school?.name ?? "École")
          : "Scolive",
        schoolId: item.theme.faq.schoolId,
        schoolName: item.theme.faq.school?.name ?? null,
      })),
    };
  }

  async listGlobalFaqsAdmin(
    user: AuthenticatedUser,
    query: ListHelpFaqsAdminDto,
  ) {
    this.requirePlatformUser(user);

    const faqs = await this.prisma.helpFaq.findMany({
      where: {
        ...(query.audience ? { audience: query.audience } : {}),
        ...(query.status ? { status: query.status } : {}),
        schoolId: null,
      },
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return { items: faqs.map((faq) => this.serializeFaq(faq)) };
  }

  async listSchoolFaqsAdmin(
    user: AuthenticatedUser,
    query: ListHelpFaqsAdminDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);

    const faqs = await this.prisma.helpFaq.findMany({
      where: {
        ...(query.audience ? { audience: query.audience } : {}),
        ...(query.status ? { status: query.status } : {}),
        schoolId: schoolScope.schoolId,
      },
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return { items: faqs.map((faq) => this.serializeFaq(faq)) };
  }

  async createGlobalFaq(user: AuthenticatedUser, dto: CreateHelpFaqDto) {
    this.requirePlatformUser(user);

    const created = await this.prisma.helpFaq.create({
      data: {
        schoolId: null,
        audience: dto.audience,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
    });

    return this.serializeFaq(created);
  }

  async createSchoolFaq(user: AuthenticatedUser, dto: CreateHelpFaqDto) {
    const schoolScope = await this.requireSchoolFaqManager(user);

    const created = await this.prisma.helpFaq.create({
      data: {
        schoolId: schoolScope.schoolId,
        audience: dto.audience,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
    });

    return this.serializeFaq(created);
  }

  async updateGlobalFaq(
    user: AuthenticatedUser,
    faqId: string,
    dto: UpdateHelpFaqDto,
  ) {
    this.requirePlatformUser(user);

    const existing = await this.prisma.helpFaq.findUnique({
      where: { id: faqId },
      select: { id: true, schoolId: true },
    });
    if (!existing || existing.schoolId !== null) {
      throw new NotFoundException("FAQ introuvable");
    }

    const updated = await this.prisma.helpFaq.update({
      where: { id: faqId },
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
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
    });

    return this.serializeFaq(updated);
  }

  async updateSchoolFaq(
    user: AuthenticatedUser,
    faqId: string,
    dto: UpdateHelpFaqDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);

    const existing = await this.prisma.helpFaq.findUnique({
      where: { id: faqId },
      select: { id: true, schoolId: true },
    });
    if (!existing || existing.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("FAQ introuvable");
    }

    const updated = await this.prisma.helpFaq.update({
      where: { id: faqId },
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
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
    });

    return this.serializeFaq(updated);
  }

  async deleteGlobalFaq(user: AuthenticatedUser, faqId: string) {
    this.requirePlatformUser(user);
    const existing = await this.prisma.helpFaq.findUnique({
      where: { id: faqId },
      select: { id: true, schoolId: true },
    });
    if (!existing || existing.schoolId !== null) {
      throw new NotFoundException("FAQ introuvable");
    }
    await this.prisma.helpFaq.delete({ where: { id: faqId } });
    return { deleted: true };
  }

  async deleteSchoolFaq(user: AuthenticatedUser, faqId: string) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    const existing = await this.prisma.helpFaq.findUnique({
      where: { id: faqId },
      select: { id: true, schoolId: true },
    });
    if (!existing || existing.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("FAQ introuvable");
    }
    await this.prisma.helpFaq.delete({ where: { id: faqId } });
    return { deleted: true };
  }

  async createGlobalTheme(
    user: AuthenticatedUser,
    faqId: string,
    dto: CreateHelpFaqThemeDto,
  ) {
    this.requirePlatformUser(user);
    await this.ensureFaqExistsForScope(faqId, "GLOBAL");

    const created = await this.prisma.helpFaqTheme.create({
      data: {
        faqId,
        orderIndex: dto.orderIndex ?? 0,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: THEME_SELECT,
    });

    return this.serializeTheme(created);
  }

  async createSchoolTheme(
    user: AuthenticatedUser,
    faqId: string,
    dto: CreateHelpFaqThemeDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    await this.ensureFaqExistsForScope(faqId, "SCHOOL", schoolScope.schoolId);

    const created = await this.prisma.helpFaqTheme.create({
      data: {
        faqId,
        orderIndex: dto.orderIndex ?? 0,
        title: dto.title,
        slug: this.slugify(dto.slug ?? dto.title),
        description: dto.description,
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: THEME_SELECT,
    });

    return this.serializeTheme(created);
  }

  async updateGlobalTheme(
    user: AuthenticatedUser,
    themeId: string,
    dto: UpdateHelpFaqThemeDto,
  ) {
    this.requirePlatformUser(user);

    const existing = await this.prisma.helpFaqTheme.findUnique({
      where: { id: themeId },
      select: { id: true, faq: { select: { schoolId: true } } },
    });
    if (!existing || existing.faq.schoolId !== null) {
      throw new NotFoundException("Thème introuvable");
    }

    const updated = await this.prisma.helpFaqTheme.update({
      where: { id: themeId },
      data: {
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedById: user.id,
      },
      select: THEME_SELECT,
    });

    return this.serializeTheme(updated);
  }

  async updateSchoolTheme(
    user: AuthenticatedUser,
    themeId: string,
    dto: UpdateHelpFaqThemeDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    const existing = await this.prisma.helpFaqTheme.findUnique({
      where: { id: themeId },
      select: { id: true, faq: { select: { schoolId: true } } },
    });
    if (!existing || existing.faq.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("Thème introuvable");
    }

    const updated = await this.prisma.helpFaqTheme.update({
      where: { id: themeId },
      data: {
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.slug ? { slug: this.slugify(dto.slug) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedById: user.id,
      },
      select: THEME_SELECT,
    });

    return this.serializeTheme(updated);
  }

  async deleteGlobalTheme(user: AuthenticatedUser, themeId: string) {
    this.requirePlatformUser(user);
    const existing = await this.prisma.helpFaqTheme.findUnique({
      where: { id: themeId },
      select: { id: true, faq: { select: { schoolId: true } } },
    });
    if (!existing || existing.faq.schoolId !== null) {
      throw new NotFoundException("Thème introuvable");
    }
    await this.prisma.helpFaqTheme.delete({ where: { id: themeId } });
    return { deleted: true };
  }

  async deleteSchoolTheme(user: AuthenticatedUser, themeId: string) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    const existing = await this.prisma.helpFaqTheme.findUnique({
      where: { id: themeId },
      select: { id: true, faq: { select: { schoolId: true } } },
    });
    if (!existing || existing.faq.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("Thème introuvable");
    }
    await this.prisma.helpFaqTheme.delete({ where: { id: themeId } });
    return { deleted: true };
  }

  async createGlobalItem(
    user: AuthenticatedUser,
    themeId: string,
    dto: CreateHelpFaqItemDto,
  ) {
    this.requirePlatformUser(user);
    await this.ensureThemeExistsForScope(themeId, "GLOBAL");
    this.validateAnswer(dto.answerHtml);

    const created = await this.prisma.helpFaqItem.create({
      data: {
        themeId,
        orderIndex: dto.orderIndex ?? 0,
        question: dto.question,
        answerHtml: dto.answerHtml,
        answerJson: this.toInputJson(dto.answerJson),
        answerText: this.extractAnswerText(dto.answerHtml, dto.answerJson),
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: ITEM_SELECT,
    });

    return this.serializeItem(created);
  }

  async createSchoolItem(
    user: AuthenticatedUser,
    themeId: string,
    dto: CreateHelpFaqItemDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    await this.ensureThemeExistsForScope(
      themeId,
      "SCHOOL",
      schoolScope.schoolId,
    );
    this.validateAnswer(dto.answerHtml);

    const created = await this.prisma.helpFaqItem.create({
      data: {
        themeId,
        orderIndex: dto.orderIndex ?? 0,
        question: dto.question,
        answerHtml: dto.answerHtml,
        answerJson: this.toInputJson(dto.answerJson),
        answerText: this.extractAnswerText(dto.answerHtml, dto.answerJson),
        status: dto.status ?? "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      select: ITEM_SELECT,
    });

    return this.serializeItem(created);
  }

  async updateGlobalItem(
    user: AuthenticatedUser,
    itemId: string,
    dto: UpdateHelpFaqItemDto,
  ) {
    this.requirePlatformUser(user);

    const existing = await this.prisma.helpFaqItem.findUnique({
      where: { id: itemId },
      select: {
        ...ITEM_SELECT,
        theme: { select: { faq: { select: { schoolId: true } } } },
      },
    });
    if (!existing || existing.theme.faq.schoolId !== null) {
      throw new NotFoundException("Question FAQ introuvable");
    }

    const answerHtml = dto.answerHtml ?? existing.answerHtml;
    const answerJson =
      dto.answerJson ??
      (existing.answerJson as Record<string, unknown> | null) ??
      undefined;

    this.validateAnswer(answerHtml);

    const updated = await this.prisma.helpFaqItem.update({
      where: { id: itemId },
      data: {
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.question ? { question: dto.question } : {}),
        ...(dto.answerHtml !== undefined ? { answerHtml: dto.answerHtml } : {}),
        ...(dto.answerJson !== undefined
          ? { answerJson: this.toInputJson(dto.answerJson) }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        answerText: this.extractAnswerText(answerHtml, answerJson),
        updatedById: user.id,
      },
      select: ITEM_SELECT,
    });

    return this.serializeItem(updated);
  }

  async updateSchoolItem(
    user: AuthenticatedUser,
    itemId: string,
    dto: UpdateHelpFaqItemDto,
  ) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    const existing = await this.prisma.helpFaqItem.findUnique({
      where: { id: itemId },
      select: {
        ...ITEM_SELECT,
        theme: { select: { faq: { select: { schoolId: true } } } },
      },
    });
    if (!existing || existing.theme.faq.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("Question FAQ introuvable");
    }

    const answerHtml = dto.answerHtml ?? existing.answerHtml;
    const answerJson =
      dto.answerJson ??
      (existing.answerJson as Record<string, unknown> | null) ??
      undefined;

    this.validateAnswer(answerHtml);

    const updated = await this.prisma.helpFaqItem.update({
      where: { id: itemId },
      data: {
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.question ? { question: dto.question } : {}),
        ...(dto.answerHtml !== undefined ? { answerHtml: dto.answerHtml } : {}),
        ...(dto.answerJson !== undefined
          ? { answerJson: this.toInputJson(dto.answerJson) }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        answerText: this.extractAnswerText(answerHtml, answerJson),
        updatedById: user.id,
      },
      select: ITEM_SELECT,
    });

    return this.serializeItem(updated);
  }

  async deleteGlobalItem(user: AuthenticatedUser, itemId: string) {
    this.requirePlatformUser(user);
    const existing = await this.prisma.helpFaqItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        theme: { select: { faq: { select: { schoolId: true } } } },
      },
    });
    if (!existing || existing.theme.faq.schoolId !== null) {
      throw new NotFoundException("Question FAQ introuvable");
    }
    await this.prisma.helpFaqItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async deleteSchoolItem(user: AuthenticatedUser, itemId: string) {
    const schoolScope = await this.requireSchoolFaqManager(user);
    const existing = await this.prisma.helpFaqItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        theme: { select: { faq: { select: { schoolId: true } } } },
      },
    });
    if (!existing || existing.theme.faq.schoolId !== schoolScope.schoolId) {
      throw new NotFoundException("Question FAQ introuvable");
    }
    await this.prisma.helpFaqItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  private async resolveFaqSources(
    user: AuthenticatedUser,
    query: GetCurrentHelpFaqDto,
    canManage: boolean,
  ) {
    if (query.faqId && canManage) {
      const faq = await this.prisma.helpFaq.findUnique({
        where: { id: query.faqId },
        select: {
          ...FAQ_SELECT,
          school: { select: { name: true } },
        },
      });
      return faq ? [this.serializeSource(faq)] : [];
    }

    const audience = canManage
      ? (query.audience ?? this.resolveAudience(user))
      : this.resolveAudience(user);
    const preferredSchoolId = user.memberships[0]?.schoolId ?? null;

    const faqs = await this.prisma.helpFaq.findMany({
      where: {
        audience,
        ...(canManage ? {} : { status: "PUBLISHED" }),
        OR: preferredSchoolId
          ? [{ schoolId: preferredSchoolId }, { schoolId: null }]
          : [{ schoolId: null }],
      },
      select: {
        ...FAQ_SELECT,
        school: { select: { name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
    });

    return faqs
      .sort((left, right) => {
        const leftRank = left.schoolId ? 1 : 0;
        const rightRank = right.schoolId ? 1 : 0;
        return leftRank - rightRank;
      })
      .map((faq) => this.serializeSource(faq));
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

  private serializeFaq(faq: FaqWithOptionalSchool): SerializedFaq {
    return {
      id: faq.id,
      schoolId: faq.schoolId,
      schoolName: faq.school?.name ?? null,
      audience: faq.audience,
      title: faq.title,
      slug: faq.slug,
      description: faq.description,
      status: faq.status,
      themeCount: faq._count.themes,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
    };
  }

  private serializeSource(faq: FaqWithOptionalSchool): SerializedFaqSource {
    return {
      key: this.getSourceKey(faq.schoolId),
      scopeType: faq.schoolId ? "SCHOOL" : "GLOBAL",
      scopeLabel: faq.schoolId ? (faq.school?.name ?? "École") : "Scolive",
      schoolId: faq.schoolId,
      schoolName: faq.school?.name ?? null,
      faq: this.serializeFaq(faq),
    };
  }

  private serializeTheme(
    theme: Pick<
      HelpFaqTheme,
      | "id"
      | "faqId"
      | "orderIndex"
      | "title"
      | "slug"
      | "description"
      | "status"
      | "createdAt"
      | "updatedAt"
    >,
  ) {
    return {
      id: theme.id,
      faqId: theme.faqId,
      orderIndex: theme.orderIndex,
      title: theme.title,
      slug: theme.slug,
      description: theme.description,
      status: theme.status,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }

  private serializeItem(
    item: Pick<
      HelpFaqItem,
      | "id"
      | "themeId"
      | "orderIndex"
      | "question"
      | "answerHtml"
      | "answerJson"
      | "answerText"
      | "status"
      | "createdAt"
      | "updatedAt"
    >,
  ) {
    return {
      id: item.id,
      themeId: item.themeId,
      orderIndex: item.orderIndex,
      question: item.question,
      answerHtml: item.answerHtml,
      answerJson: item.answerJson,
      answerText: item.answerText,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private validateAnswer(answerHtml?: string) {
    if (!answerHtml || !answerHtml.trim()) {
      throw new BadRequestException("La réponse riche est requise");
    }
  }

  private extractAnswerText(
    answerHtml?: string,
    answerJson?: Record<string, unknown>,
  ) {
    const html = answerHtml ?? this.pickHtmlFromJson(answerJson) ?? "";
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private pickHtmlFromJson(value?: Record<string, unknown>) {
    if (!value) return undefined;
    const html = value["html"];
    return typeof html === "string" ? html : undefined;
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

  private async getSchoolManagementScope(user: AuthenticatedUser) {
    if (user.activeRole !== "SCHOOL_ADMIN") {
      return null;
    }

    const membership = user.memberships.find(
      (entry) => entry.role === "SCHOOL_ADMIN",
    );
    if (!membership) {
      return null;
    }

    const school = await this.prisma.school.findUnique({
      where: { id: membership.schoolId },
      select: { id: true, name: true },
    });
    if (!school) {
      return null;
    }

    return { schoolId: school.id, schoolName: school.name };
  }

  private async requireSchoolFaqManager(user: AuthenticatedUser) {
    const scope = await this.getSchoolManagementScope(user);
    if (!scope) {
      throw new ForbiddenException(
        "Réservé aux administrateurs d'école en mode école",
      );
    }
    return scope;
  }

  private async ensureFaqExistsForScope(
    faqId: string,
    scope: "GLOBAL" | "SCHOOL",
    schoolId?: string,
  ): Promise<HelpFaq> {
    const faq = await this.prisma.helpFaq.findUnique({ where: { id: faqId } });
    const matchesScope =
      scope === "GLOBAL" ? faq?.schoolId === null : faq?.schoolId === schoolId;
    if (!faq || !matchesScope) {
      throw new NotFoundException("FAQ introuvable");
    }
    return faq;
  }

  private async ensureThemeExistsForScope(
    themeId: string,
    scope: "GLOBAL" | "SCHOOL",
    schoolId?: string,
  ): Promise<HelpFaqTheme> {
    const theme = await this.prisma.helpFaqTheme.findUnique({
      where: { id: themeId },
      include: { faq: true },
    });
    const matchesScope =
      scope === "GLOBAL"
        ? theme?.faq.schoolId === null
        : theme?.faq.schoolId === schoolId;
    if (!theme || !matchesScope) {
      throw new NotFoundException("Thème introuvable");
    }
    return theme;
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

  private getSourceKey(schoolId: string | null) {
    return schoolId ? `school:${schoolId}` : "global";
  }
}
