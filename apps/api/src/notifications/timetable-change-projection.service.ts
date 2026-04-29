import { Injectable } from "@nestjs/common";
import { FeedService } from "../feed/feed.service.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import { buildTimetableChangeContent } from "./timetable-change-formatter.js";
import type { TimetableChangeEventPayload } from "./timetable-change.types.js";

@Injectable()
export class TimetableChangeProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

  async project(event: TimetableChangeEventPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id: event.schoolId },
      select: { name: true, slug: true },
    });
    if (!school) {
      return;
    }

    const content = buildTimetableChangeContent(event);

    await this.feedService.createSystemClassPost({
      schoolId: event.schoolId,
      authorUserId: event.actorUserId,
      classId: event.classId,
      className: event.className,
      title: `${content.title} · ${event.className}`,
      bodyHtml: content.bodyHtml,
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: event.schoolId,
        classId: event.classId,
        status: "ACTIVE",
      },
      select: {
        student: {
          select: {
            firstName: true,
            lastName: true,
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

    const studentUserIds = new Set<string>();
    const emailRecipients = new Map<
      string,
      { firstName: string; email: string }
    >();

    for (const row of enrollments) {
      const studentUser = row.student.user;
      if (studentUser?.id && studentUser.activationStatus === "ACTIVE") {
        studentUserIds.add(studentUser.id);
        if (studentUser.email) {
          emailRecipients.set(studentUser.email, {
            firstName: studentUser.firstName,
            email: studentUser.email,
          });
        }
      }

      for (const link of row.student.parentLinks) {
        const parentUser = link.parent;
        if (parentUser.activationStatus === "ACTIVE" && parentUser.email) {
          emailRecipients.set(parentUser.email, {
            firstName: parentUser.firstName,
            email: parentUser.email,
          });
        }
      }
    }

    const pushTokens = studentUserIds.size
      ? await this.prisma.mobilePushToken.findMany({
          where: {
            userId: { in: Array.from(studentUserIds) },
            isActive: true,
            OR: [{ schoolId: event.schoolId }, { schoolId: null }],
          },
          select: { token: true },
          distinct: ["token"],
        })
      : [];

    await this.pushService.sendTimetableChangeNotification({
      tokens: pushTokens.map((row) => row.token),
      title: `${content.title} · ${event.className}`,
      body: content.summary,
      data: {
        type: "TIMETABLE_CHANGE",
        schoolSlug: school.slug,
        classId: event.classId,
      },
    });

    await Promise.all(
      Array.from(emailRecipients.values()).map((recipient) =>
        this.mailService.sendTimetableChangeNotification({
          to: recipient.email,
          recipientFirstName: recipient.firstName,
          schoolName: school.name,
          schoolSlug: school.slug,
          className: event.className,
          title: content.title,
          summary: content.summary,
          details: content.details,
        }),
      ),
    );
  }
}
