import { Injectable } from "@nestjs/common";
import { publicEmailOrNull } from "../common/email.util.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import type { HomeworkNotificationEventPayload } from "./homework-notification.types.js";

@Injectable()
export class HomeworkNotificationsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

  async project(event: HomeworkNotificationEventPayload) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: event.homeworkId },
      select: {
        id: true,
        title: true,
        expectedAt: true,
        classId: true,
        schoolYearId: true,
        subject: { select: { name: true } },
        class: { select: { name: true } },
        authorUser: { select: { firstName: true, lastName: true } },
        school: { select: { name: true, slug: true } },
      },
    });
    if (!homework) {
      return;
    }

    const expectedAtLabel = homework.expectedAt.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const authorFullName =
      `${homework.authorUser.firstName} ${homework.authorUser.lastName}`.trim();

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: event.schoolId,
        classId: event.classId,
        schoolYearId: homework.schoolYearId,
        status: "ACTIVE",
      },
      select: {
        student: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                activationStatus: true,
              },
            },
            parentLinks: {
              select: {
                parent: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    activationStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const recipientUserIds = new Set<string>();
    const emailRecipients = new Map<
      string,
      { firstName: string; email: string }
    >();

    for (const row of enrollments) {
      const studentUser = row.student.user;
      if (studentUser?.id && studentUser.activationStatus === "ACTIVE") {
        recipientUserIds.add(studentUser.id);
        const studentPublicEmail = publicEmailOrNull(studentUser.email);
        if (studentPublicEmail) {
          emailRecipients.set(studentPublicEmail, {
            firstName: studentUser.firstName,
            email: studentPublicEmail,
          });
        }
      }

      for (const link of row.student.parentLinks) {
        const parentUser = link.parent;
        if (parentUser.activationStatus === "ACTIVE") {
          recipientUserIds.add(parentUser.id);
          const parentPublicEmail = publicEmailOrNull(parentUser.email);
          if (parentPublicEmail) {
            emailRecipients.set(parentPublicEmail, {
              firstName: parentUser.firstName,
              email: parentPublicEmail,
            });
          }
        }
      }
    }

    const pushTokens = recipientUserIds.size
      ? await this.prisma.mobilePushToken.findMany({
          where: {
            userId: { in: Array.from(recipientUserIds) },
            isActive: true,
            OR: [{ schoolId: event.schoolId }, { schoolId: null }],
          },
          select: { token: true },
          distinct: ["token"],
        })
      : [];

    await this.pushService.sendHomeworkCreatedNotification({
      tokens: pushTokens.map((row) => row.token),
      title: `Nouveau devoir · ${homework.class.name}`,
      body: `${homework.subject.name} : ${homework.title}`,
      data: {
        type: "HOMEWORK_CREATED",
        schoolSlug: homework.school.slug,
        classId: homework.classId,
        homeworkId: homework.id,
      },
    });

    await Promise.all(
      Array.from(emailRecipients.values()).map((recipient) =>
        this.mailService.sendHomeworkCreatedNotification({
          to: recipient.email,
          recipientFirstName: recipient.firstName,
          schoolName: homework.school.name,
          schoolSlug: homework.school.slug,
          className: homework.class.name,
          subjectName: homework.subject.name,
          title: homework.title,
          expectedAtLabel,
          authorFullName,
        }),
      ),
    );
  }
}
