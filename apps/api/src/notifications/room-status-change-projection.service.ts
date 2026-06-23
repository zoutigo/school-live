import { Injectable } from "@nestjs/common";
import { publicEmailOrNull } from "../common/email.util.js";
import { FeedService } from "../feed/feed.service.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import { buildRoomStatusChangeContent } from "./room-status-change-formatter.js";
import type { RoomStatusChangeEventPayload } from "./room-status-change.types.js";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

@Injectable()
export class RoomStatusChangeProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

  private async findFutureAffectedClasses(
    schoolId: string,
    roomId: string,
  ): Promise<Map<string, string>> {
    const today = startOfTodayUtc();

    const [recurringSlots, oneOffSlots, overrideExceptions] = await Promise.all(
      [
        this.prisma.classTimetableSlot.findMany({
          where: {
            schoolId,
            roomId,
            OR: [{ activeToDate: null }, { activeToDate: { gte: today } }],
          },
          select: { classId: true, class: { select: { name: true } } },
        }),
        this.prisma.classTimetableOneOffSlot.findMany({
          where: {
            schoolId,
            roomId,
            status: "PLANNED",
            occurrenceDate: { gte: today },
          },
          select: { classId: true, class: { select: { name: true } } },
        }),
        this.prisma.classTimetableSlotException.findMany({
          where: {
            schoolId,
            roomId,
            type: "OVERRIDE",
            occurrenceDate: { gte: today },
          },
          select: { classId: true, class: { select: { name: true } } },
        }),
      ],
    );

    const affectedClasses = new Map<string, string>();
    for (const row of [
      ...recurringSlots,
      ...oneOffSlots,
      ...overrideExceptions,
    ]) {
      affectedClasses.set(row.classId, row.class.name);
    }
    return affectedClasses;
  }

  async project(event: RoomStatusChangeEventPayload) {
    const school = await this.prisma.school.findUnique({
      where: { id: event.schoolId },
      select: { name: true, slug: true },
    });
    if (!school) {
      return;
    }

    const affectedClasses = await this.findFutureAffectedClasses(
      event.schoolId,
      event.roomId,
    );
    if (affectedClasses.size === 0) {
      return;
    }

    const content = buildRoomStatusChangeContent(event);

    for (const [classId, className] of affectedClasses) {
      await this.feedService.createSystemClassPost({
        schoolId: event.schoolId,
        authorUserId: event.actorUserId,
        classId,
        className,
        title: `${content.title} · ${className}`,
        bodyHtml: content.bodyHtml,
      });

      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          schoolId: event.schoolId,
          classId,
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
          const studentEmail = publicEmailOrNull(studentUser.email);
          if (studentEmail) {
            emailRecipients.set(studentEmail, {
              firstName: studentUser.firstName,
              email: studentEmail,
            });
          }
        }

        for (const link of row.student.parentLinks) {
          const parentUser = link.parent;
          if (parentUser.activationStatus === "ACTIVE") {
            recipientUserIds.add(parentUser.id);
            const parentEmail = publicEmailOrNull(parentUser.email);
            if (parentEmail) {
              emailRecipients.set(parentEmail, {
                firstName: parentUser.firstName,
                email: parentEmail,
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

      await this.pushService.sendRoomStatusChangeNotification({
        tokens: pushTokens.map((row) => row.token),
        title: `${content.title} · ${className}`,
        body: content.summary,
        data: {
          type: "ROOM_STATUS_CHANGE",
          schoolSlug: school.slug,
          classId,
          roomId: event.roomId,
        },
      });

      await Promise.all(
        Array.from(emailRecipients.values()).map((recipient) =>
          this.mailService.sendRoomStatusChangeNotification({
            to: recipient.email,
            recipientFirstName: recipient.firstName,
            schoolName: school.name,
            schoolSlug: school.slug,
            className,
            roomName: event.roomName,
            title: content.title,
            summary: content.summary,
            details: content.details,
          }),
        ),
      );
    }
  }
}
