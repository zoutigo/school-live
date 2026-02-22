import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import {
  InlineMediaEntityType,
  InlineMediaScope,
  InlineMediaStatus,
} from "@prisma/client";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

type SyncEntityImagesParams = {
  schoolId: string;
  uploadedByUserId: string;
  scope: InlineMediaScope;
  entityType: InlineMediaEntityType;
  entityId: string;
  nextBodyHtml: string;
  previousBodyHtml?: string;
  deleteRemovedPhysically: boolean;
};

@Injectable()
export class InlineMediaService {
  private readonly logger = new Logger(InlineMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClientService: MediaClientService,
  ) {}

  async registerTempUpload(params: {
    schoolId: string;
    uploadedByUserId: string;
    scope: InlineMediaScope;
    url: string;
  }) {
    if (!this.isManagedMediaUrl(params.url)) {
      return;
    }

    await this.purgeExpiredTempUploads();
    await this.prisma.inlineMediaAsset.upsert({
      where: { url: params.url },
      create: {
        schoolId: params.schoolId,
        uploadedByUserId: params.uploadedByUserId,
        scope: params.scope,
        status: InlineMediaStatus.TEMP,
        url: params.url,
        expiresAt: this.defaultTempExpiry(),
      },
      update: {
        schoolId: params.schoolId,
        uploadedByUserId: params.uploadedByUserId,
        scope: params.scope,
        status: InlineMediaStatus.TEMP,
        entityType: null,
        entityId: null,
        expiresAt: this.defaultTempExpiry(),
      },
    });
  }

  async syncEntityImages(params: SyncEntityImagesParams) {
    await this.purgeExpiredTempUploads();

    const nextUrls = new Set(
      this.extractManagedInlineImageUrls(params.nextBodyHtml),
    );
    const previousUrls = new Set(
      params.previousBodyHtml !== undefined
        ? this.extractManagedInlineImageUrls(params.previousBodyHtml)
        : (
            await this.prisma.inlineMediaAsset.findMany({
              where: {
                entityType: params.entityType,
                entityId: params.entityId,
                status: InlineMediaStatus.LINKED,
              },
              select: { url: true },
            })
          ).map((row) => row.url),
    );

    const removedUrls = Array.from(previousUrls).filter(
      (url) => !nextUrls.has(url),
    );
    if (removedUrls.length > 0) {
      await this.deleteUrls(removedUrls, params.deleteRemovedPhysically);
    }

    await this.prisma.inlineMediaAsset.deleteMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        url: { in: removedUrls },
      },
    });

    for (const url of nextUrls) {
      await this.prisma.inlineMediaAsset.upsert({
        where: { url },
        create: {
          schoolId: params.schoolId,
          uploadedByUserId: params.uploadedByUserId,
          scope: params.scope,
          status: InlineMediaStatus.LINKED,
          url,
          entityType: params.entityType,
          entityId: params.entityId,
          expiresAt: null,
        },
        update: {
          schoolId: params.schoolId,
          uploadedByUserId: params.uploadedByUserId,
          scope: params.scope,
          status: InlineMediaStatus.LINKED,
          entityType: params.entityType,
          entityId: params.entityId,
          expiresAt: null,
        },
      });
    }
  }

  async removeEntityImages(params: {
    entityType: InlineMediaEntityType;
    entityId: string;
    deletePhysically: boolean;
  }) {
    const linked = await this.prisma.inlineMediaAsset.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        status: InlineMediaStatus.LINKED,
      },
      select: {
        id: true,
        url: true,
      },
    });
    if (linked.length === 0) {
      return;
    }

    await this.deleteUrls(
      linked.map((entry) => entry.url),
      params.deletePhysically,
    );

    await this.prisma.inlineMediaAsset.deleteMany({
      where: {
        id: {
          in: linked.map((entry) => entry.id),
        },
      },
    });
  }

  async purgeExpiredTempUploads(limit = 100) {
    const expired = await this.prisma.inlineMediaAsset.findMany({
      where: {
        status: InlineMediaStatus.TEMP,
        expiresAt: { lte: new Date() },
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
      select: {
        id: true,
        url: true,
      },
    });

    if (expired.length === 0) {
      return;
    }

    const deletedIds: string[] = [];
    for (const entry of expired) {
      try {
        await this.deleteUrls([entry.url], true);
        deletedIds.push(entry.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "purge failed unexpectedly";
        this.logger.warn(`inline media purge skipped: ${message}`);
      }
    }

    if (deletedIds.length > 0) {
      await this.prisma.inlineMediaAsset.deleteMany({
        where: {
          id: { in: deletedIds },
        },
      });
    }
  }

  private extractManagedInlineImageUrls(bodyHtml: string) {
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

  private defaultTempExpiry() {
    const ttlMinutes = Math.max(
      1,
      Number(process.env.INLINE_MEDIA_TEMP_TTL_MINUTES ?? 60 * 24),
    );
    return new Date(Date.now() + ttlMinutes * 60 * 1000);
  }

  private async deleteUrls(urls: string[], deletePhysically: boolean) {
    if (!deletePhysically || urls.length === 0) {
      return;
    }

    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL?.trim();
    if (!mediaServiceUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new BadGatewayException("MEDIA_SERVICE_URL not configured");
      }
      // Local/dev/test fallback: keep operation non-blocking if media service is absent.
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
}
