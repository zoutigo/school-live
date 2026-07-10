import { Injectable } from "@nestjs/common";
import type { ResourceAttachmentPart } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "../notifications/push.service.js";

const PART_LABEL_FR: Record<ResourceAttachmentPart, string> = {
  STATEMENT: "énoncé",
  CORRECTION: "corrigé",
};

@Injectable()
export class ResourceSubmissionNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private async tokensFor(userId: string): Promise<string[]> {
    const tokens = await this.prisma.mobilePushToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
      distinct: ["token"],
    });
    return tokens.map((t) => t.token);
  }

  async notifyDiscarded(params: {
    resourceId: string;
    part: ResourceAttachmentPart;
    authorUserId: string;
  }) {
    const tokens = await this.tokensFor(params.authorUserId);
    if (tokens.length === 0) return;

    const label = PART_LABEL_FR[params.part];
    await this.pushService.sendResourceSubmissionDiscardedNotification({
      tokens,
      title: "Contribution non retenue",
      body: `Un autre ${label} a été retenu pour cette ressource.`,
      data: {
        type: "RESOURCE_SUBMISSION_DISCARDED",
        resourceId: params.resourceId,
        part: params.part,
      },
    });
  }

  async notifyRejected(params: {
    resourceId: string;
    part: ResourceAttachmentPart;
    authorUserId: string;
    reason?: string;
  }) {
    const tokens = await this.tokensFor(params.authorUserId);
    if (tokens.length === 0) return;

    const label = PART_LABEL_FR[params.part];
    const body = params.reason
      ? `Votre ${label} n'a pas été validé : ${params.reason}`
      : `Votre ${label} n'a pas été validé.`;

    await this.pushService.sendResourceSubmissionRejectedNotification({
      tokens,
      title: "Contribution rejetée",
      body,
      data: {
        type: "RESOURCE_SUBMISSION_REJECTED",
        resourceId: params.resourceId,
        part: params.part,
      },
    });
  }
}
