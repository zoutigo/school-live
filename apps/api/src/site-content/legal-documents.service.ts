import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { LegalDocument } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateLegalDocumentDto } from "./dto/create-legal-document.dto.js";
import type { ListLegalDocumentsDto } from "./dto/list-legal-documents.dto.js";
import type { UpdateLegalDocumentDto } from "./dto/update-legal-document.dto.js";
import { isSuperAdmin } from "./site-content-access.js";

export type PublicLegalDocument = {
  slug: string;
  locale: string;
  title: string;
  contentHtml: string;
  updatedAt: Date;
};

// Filet de sécurité SEO : utilisé uniquement si aucune version PUBLISHED
// n'existe encore pour (slug, locale). Volontairement minimal — le vrai
// contenu doit être saisi via l'admin le plus tôt possible.
const LEGAL_FALLBACK_TITLES: Record<string, { fr: string; en: string }> = {
  cgu: {
    fr: "Conditions générales d'utilisation",
    en: "Terms of Service",
  },
  "mentions-legales": {
    fr: "Mentions légales",
    en: "Legal Notice",
  },
  confidentialite: {
    fr: "Politique de confidentialité",
    en: "Privacy Policy",
  },
};

const LEGAL_FALLBACK_BODY: Record<"fr" | "en", string> = {
  fr: "<p>Ce contenu est en cours de rédaction. Contactez-nous pour toute question.</p>",
  en: "<p>This content is being drafted. Contact us with any question.</p>",
};

function buildFallback(slug: string, locale: string): PublicLegalDocument {
  const localeKey = locale === "en" ? "en" : "fr";
  const titles = LEGAL_FALLBACK_TITLES[slug];
  return {
    slug,
    locale,
    title: titles ? titles[localeKey] : slug,
    contentHtml: LEGAL_FALLBACK_BODY[localeKey],
    updatedAt: new Date(0),
  };
}

@Injectable()
export class LegalDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  assertCanManage(user: AuthenticatedUser) {
    if (!isSuperAdmin(user)) {
      throw new ForbiddenException("Réservé aux administrateurs plateforme");
    }
  }

  async getPublished(
    slug: string,
    locale: string,
  ): Promise<PublicLegalDocument> {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { slug, locale, status: "PUBLISHED" },
      orderBy: { version: "desc" },
    });

    if (!doc) {
      return buildFallback(slug, locale);
    }

    return {
      slug: doc.slug,
      locale: doc.locale,
      title: doc.title,
      contentHtml: doc.contentHtml,
      updatedAt: doc.updatedAt,
    };
  }

  async list(user: AuthenticatedUser, query: ListLegalDocumentsDto) {
    this.assertCanManage(user);

    return this.prisma.legalDocument.findMany({
      where: {
        slug: query.slug,
        locale: query.locale,
      },
      orderBy: [{ slug: "asc" }, { locale: "asc" }, { version: "desc" }],
    });
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateLegalDocumentDto,
  ): Promise<LegalDocument> {
    this.assertCanManage(user);

    const latest = await this.prisma.legalDocument.findFirst({
      where: { slug: dto.slug, locale: dto.locale },
      orderBy: { version: "desc" },
    });

    return this.prisma.legalDocument.create({
      data: {
        slug: dto.slug,
        locale: dto.locale,
        title: dto.title,
        contentHtml: dto.contentHtml,
        version: (latest?.version ?? 0) + 1,
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
    });
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocument> {
    this.assertCanManage(user);

    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document légal introuvable");
    }
    if (doc.status === "PUBLISHED") {
      throw new ForbiddenException(
        "Une version publiée ne peut plus être modifiée ; créez une nouvelle version",
      );
    }

    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        title: dto.title,
        contentHtml: dto.contentHtml,
        updatedById: user.id,
      },
    });
  }

  async publish(user: AuthenticatedUser, id: string): Promise<LegalDocument> {
    this.assertCanManage(user);

    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document légal introuvable");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.legalDocument.updateMany({
        where: {
          slug: doc.slug,
          locale: doc.locale,
          status: "PUBLISHED",
        },
        data: { status: "ARCHIVED" },
      });

      return tx.legalDocument.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          updatedById: user.id,
        },
      });
    });
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertCanManage(user);

    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document légal introuvable");
    }
    if (doc.status === "PUBLISHED") {
      throw new ForbiddenException(
        "Une version publiée ne peut pas être supprimée",
      );
    }

    await this.prisma.legalDocument.delete({ where: { id } });
  }
}
