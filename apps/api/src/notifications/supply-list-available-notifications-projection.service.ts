import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import type { SupplyListAvailableEventPayload } from "./supply-list-available-notification.types.js";

@Injectable()
export class SupplyListAvailableNotificationsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async project(event: SupplyListAvailableEventPayload) {
    const student = await this.prisma.student.findFirst({
      where: { id: event.studentId, schoolId: event.schoolId },
      select: {
        firstName: true,
        lastName: true,
        school: { select: { slug: true } },
        parentLinks: {
          select: {
            parent: { select: { id: true, activationStatus: true } },
          },
        },
      },
    });
    if (!student) return;

    const schoolYear = await this.prisma.schoolYear.findUnique({
      where: { id: event.schoolYearId },
      select: { label: true },
    });
    if (!schoolYear) return;

    const recipientUserIds = student.parentLinks
      .filter((link) => link.parent.activationStatus === "ACTIVE")
      .map((link) => link.parent.id);
    if (recipientUserIds.length === 0) return;

    const studentName = `${student.firstName} ${student.lastName}`;
    const body = `La liste de fournitures scolaires de ${studentName} pour ${schoolYear.label} est disponible dans son menu.`;

    const pushTokens = await this.prisma.mobilePushToken.findMany({
      where: {
        userId: { in: recipientUserIds },
        isActive: true,
        OR: [{ schoolId: event.schoolId }, { schoolId: null }],
      },
      select: { token: true },
      distinct: ["token"],
    });

    await this.pushService.sendSupplyListAvailableNotification({
      tokens: pushTokens.map((row) => row.token),
      title: "Fournitures scolaires disponibles",
      body,
      data: {
        type: "SUPPLY_LIST_AVAILABLE",
        schoolSlug: student.school.slug,
        studentId: event.studentId,
        schoolYearId: event.schoolYearId,
      },
    });
  }
}
