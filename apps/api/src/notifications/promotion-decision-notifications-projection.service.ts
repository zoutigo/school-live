import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import type { PromotionDecisionEventPayload } from "./promotion-decision-notification.types.js";

@Injectable()
export class PromotionDecisionNotificationsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async project(event: PromotionDecisionEventPayload) {
    const report = await this.prisma.studentTermReport.findUnique({
      where: { id: event.reportId },
      select: {
        decision: true,
        studentId: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { id: true, activationStatus: true } },
            parentLinks: {
              select: {
                parent: { select: { id: true, activationStatus: true } },
              },
            },
          },
        },
        nextAcademicLevel: { select: { label: true } },
        school: { select: { slug: true } },
      },
    });
    if (!report || !report.decision) return;

    const recipientUserIds = new Set<string>();
    if (
      report.student.user?.id &&
      report.student.user.activationStatus === "ACTIVE"
    ) {
      recipientUserIds.add(report.student.user.id);
    }
    for (const link of report.student.parentLinks) {
      if (link.parent.activationStatus === "ACTIVE") {
        recipientUserIds.add(link.parent.id);
      }
    }
    if (recipientUserIds.size === 0) return;

    const studentName = `${report.student.firstName} ${report.student.lastName}`;
    const body = this.buildBody(
      studentName,
      report.decision,
      report.nextAcademicLevel?.label ?? null,
    );

    const pushTokens = await this.prisma.mobilePushToken.findMany({
      where: {
        userId: { in: Array.from(recipientUserIds) },
        isActive: true,
        OR: [{ schoolId: event.schoolId }, { schoolId: null }],
      },
      select: { token: true },
      distinct: ["token"],
    });

    await this.pushService.sendPromotionDecisionNotification({
      tokens: pushTokens.map((row) => row.token),
      title: "Décision du conseil de classe",
      body,
      data: {
        type: "PROMOTION_DECISION",
        schoolSlug: report.school.slug,
        studentId: report.studentId,
        decision: report.decision,
      },
    });
  }

  private buildBody(
    studentName: string,
    decision: "PROMOTED" | "REPEATED" | "LEFT",
    nextLevelLabel: string | null,
  ): string {
    if (decision === "PROMOTED") {
      return nextLevelLabel
        ? `${studentName} est admis(e) en ${nextLevelLabel}. Finalisez la réinscription depuis votre espace parent.`
        : `${studentName} est admis(e) en classe supérieure. Finalisez la réinscription depuis votre espace parent.`;
    }
    if (decision === "REPEATED") {
      return nextLevelLabel
        ? `${studentName} redouble en ${nextLevelLabel}. Finalisez la réinscription depuis votre espace parent.`
        : `${studentName} redouble cette année. Finalisez la réinscription depuis votre espace parent.`;
    }
    return `Le conseil de classe a statué sur la scolarité de ${studentName}. Consultez votre espace parent pour le détail.`;
  }
}
