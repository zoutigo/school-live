import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { ArchiveMessageDto } from "./dto/archive-message.dto.js";
import type { CreateMessageDto } from "./dto/create-message.dto.js";
import type { ListMessagesDto } from "./dto/list-messages.dto.js";
import type { MarkMessageReadDto } from "./dto/mark-message-read.dto.js";
import type { UpdateDraftMessageDto } from "./dto/update-draft-message.dto.js";

type MessageFolder = "inbox" | "sent" | "drafts" | "archive";

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listMessages(
    user: AuthenticatedUser,
    schoolId: string,
    query: ListMessagesDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const folder: MessageFolder = query.folder ?? "inbox";
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const searchTerm = query.q?.trim().toLowerCase() ?? "";

    if (folder === "archive") {
      return this.listArchiveMessages(
        effectiveSchoolId,
        user.id,
        page,
        limit,
        searchTerm,
      );
    }

    if (folder === "inbox") {
      const where: Prisma.InternalMessageRecipientWhereInput = {
        schoolId: effectiveSchoolId,
        recipientUserId: user.id,
        deletedAt: null,
        archivedAt: null,
        message: {
          status: "SENT",
          ...(searchTerm
            ? {
                OR: [
                  { subject: { contains: searchTerm, mode: "insensitive" } },
                  { body: { contains: searchTerm, mode: "insensitive" } },
                  {
                    senderUser: {
                      OR: [
                        {
                          firstName: {
                            contains: searchTerm,
                            mode: "insensitive",
                          },
                        },
                        {
                          lastName: {
                            contains: searchTerm,
                            mode: "insensitive",
                          },
                        },
                        {
                          email: {
                            contains: searchTerm,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                ],
              }
            : {}),
        },
      };

      const [total, rows] = await this.prisma.$transaction([
        this.prisma.internalMessageRecipient.count({ where }),
        this.prisma.internalMessageRecipient.findMany({
          where,
          orderBy: [{ message: { sentAt: "desc" } }, { createdAt: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            readAt: true,
            message: {
              select: {
                id: true,
                status: true,
                subject: true,
                body: true,
                createdAt: true,
                sentAt: true,
                senderUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                _count: {
                  select: {
                    recipients: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        items: rows.map((row) => this.mapInboxRow(row)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    const status = folder === "drafts" ? "DRAFT" : "SENT";
    const where: Prisma.InternalMessageWhereInput = {
      schoolId: effectiveSchoolId,
      senderUserId: user.id,
      status,
      ...(folder === "sent" ? { senderArchivedAt: null } : {}),
      ...(searchTerm
        ? {
            OR: [
              { subject: { contains: searchTerm, mode: "insensitive" } },
              { body: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.internalMessage.count({ where }),
      this.prisma.internalMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          subject: true,
          body: true,
          createdAt: true,
          sentAt: true,
          _count: {
            select: {
              recipients: true,
            },
          },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        folder,
        status: row.status,
        subject: row.subject,
        preview: this.toPreview(row.body),
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        unread: false,
        sender: null,
        recipientsCount: row._count.recipients,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUnreadCount(user: AuthenticatedUser, schoolId: string) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const unread = await this.prisma.internalMessageRecipient.count({
      where: {
        schoolId: effectiveSchoolId,
        recipientUserId: user.id,
        readAt: null,
        archivedAt: null,
        deletedAt: null,
        message: {
          status: "SENT",
        },
      },
    });

    return { unread };
  }

  async getMessage(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId: effectiveSchoolId,
      },
      select: {
        id: true,
        schoolId: true,
        senderUserId: true,
        status: true,
        subject: true,
        body: true,
        createdAt: true,
        sentAt: true,
        senderArchivedAt: true,
        senderUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        recipients: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            recipientUserId: true,
            readAt: true,
            archivedAt: true,
            deletedAt: true,
            createdAt: true,
            recipientUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    const isSender = message.senderUserId === user.id;
    const recipientRow = message.recipients.find(
      (entry) => entry.recipientUserId === user.id,
    );

    if (!isSender && !recipientRow) {
      throw new ForbiddenException("Message access denied");
    }

    if (recipientRow?.deletedAt) {
      throw new NotFoundException("Message not found");
    }

    return {
      id: message.id,
      subject: message.subject,
      body: message.body,
      status: message.status,
      createdAt: message.createdAt,
      sentAt: message.sentAt,
      senderArchivedAt: message.senderArchivedAt,
      isSender,
      recipientState: recipientRow
        ? {
            readAt: recipientRow.readAt,
            archivedAt: recipientRow.archivedAt,
            deletedAt: recipientRow.deletedAt,
          }
        : null,
      sender: message.senderUser,
      recipients: message.recipients
        .filter((entry) => !entry.deletedAt)
        .map((entry) => ({
          id: entry.id,
          userId: entry.recipientUser.id,
          firstName: entry.recipientUser.firstName,
          lastName: entry.recipientUser.lastName,
          email: entry.recipientUser.email,
          readAt: entry.readAt,
          archivedAt: entry.archivedAt,
        })),
    };
  }

  async createMessage(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateMessageDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const recipientIds = this.normalizeRecipientIds(payload.recipientUserIds);
    const isDraft = payload.isDraft ?? false;

    if (!isDraft && recipientIds.length === 0) {
      throw new BadRequestException("At least one recipient is required");
    }

    if (recipientIds.length > 0) {
      await this.ensureRecipientsInSchool(effectiveSchoolId, recipientIds);
    }

    const created = await this.prisma.internalMessage.create({
      data: {
        schoolId: effectiveSchoolId,
        senderUserId: user.id,
        status: isDraft ? "DRAFT" : "SENT",
        subject: payload.subject.trim(),
        body: payload.body,
        sentAt: isDraft ? null : new Date(),
        recipients: recipientIds.length
          ? {
              createMany: {
                data: recipientIds.map((recipientUserId) => ({
                  schoolId: effectiveSchoolId,
                  recipientUserId,
                })),
              },
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (!isDraft && recipientIds.length > 0) {
      await this.notifyMessageRecipients(effectiveSchoolId, created.id);
    }

    return this.getMessage(user, effectiveSchoolId, created.id);
  }

  async updateDraft(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
    payload: UpdateDraftMessageDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const draft = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId: effectiveSchoolId,
        senderUserId: user.id,
        status: "DRAFT",
      },
      select: {
        id: true,
      },
    });

    if (!draft) {
      throw new NotFoundException("Draft not found");
    }

    if (
      payload.subject === undefined &&
      payload.body === undefined &&
      payload.recipientUserIds === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const recipientIds =
      payload.recipientUserIds === undefined
        ? undefined
        : this.normalizeRecipientIds(payload.recipientUserIds);

    if (recipientIds) {
      await this.ensureRecipientsInSchool(effectiveSchoolId, recipientIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.internalMessage.update({
        where: { id: messageId },
        data: {
          subject: payload.subject?.trim(),
          body: payload.body,
        },
      });

      if (recipientIds !== undefined) {
        await tx.internalMessageRecipient.deleteMany({
          where: { messageId },
        });

        if (recipientIds.length > 0) {
          await tx.internalMessageRecipient.createMany({
            data: recipientIds.map((recipientUserId) => ({
              messageId,
              schoolId: effectiveSchoolId,
              recipientUserId,
            })),
          });
        }
      }
    });

    return this.getMessage(user, effectiveSchoolId, messageId);
  }

  async sendDraft(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const draft = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId: effectiveSchoolId,
        senderUserId: user.id,
        status: "DRAFT",
      },
      select: {
        id: true,
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException("Draft not found");
    }

    if (draft._count.recipients === 0) {
      throw new BadRequestException("At least one recipient is required");
    }

    await this.prisma.internalMessage.update({
      where: { id: messageId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await this.notifyMessageRecipients(effectiveSchoolId, messageId);

    return this.getMessage(user, effectiveSchoolId, messageId);
  }

  async markRead(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
    read: MarkMessageReadDto["read"],
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const recipient = await this.prisma.internalMessageRecipient.findFirst({
      where: {
        messageId,
        schoolId: effectiveSchoolId,
        recipientUserId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!recipient) {
      throw new NotFoundException("Message not found");
    }

    await this.prisma.internalMessageRecipient.update({
      where: { id: recipient.id },
      data: {
        readAt: read ? new Date() : null,
      },
    });

    return { success: true };
  }

  async archiveMessage(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
    archived: ArchiveMessageDto["archived"],
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId: effectiveSchoolId,
      },
      select: {
        id: true,
        senderUserId: true,
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderUserId === user.id) {
      await this.prisma.internalMessage.update({
        where: { id: message.id },
        data: {
          senderArchivedAt: archived ? new Date() : null,
        },
      });
      return { success: true };
    }

    const recipient = await this.prisma.internalMessageRecipient.findFirst({
      where: {
        messageId,
        schoolId: effectiveSchoolId,
        recipientUserId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException("Message not found");
    }

    await this.prisma.internalMessageRecipient.update({
      where: { id: recipient.id },
      data: {
        archivedAt: archived ? new Date() : null,
      },
    });

    return { success: true };
  }

  async deleteFromMailbox(
    user: AuthenticatedUser,
    schoolId: string,
    messageId: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId: effectiveSchoolId,
      },
      select: {
        id: true,
        status: true,
        senderUserId: true,
      },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.senderUserId === user.id) {
      if (message.status === "DRAFT") {
        await this.prisma.internalMessage.delete({
          where: { id: message.id },
        });
      } else {
        await this.prisma.internalMessage.update({
          where: { id: message.id },
          data: {
            senderArchivedAt: new Date(),
          },
        });
      }

      return { success: true };
    }

    const recipient = await this.prisma.internalMessageRecipient.findFirst({
      where: {
        messageId,
        schoolId: effectiveSchoolId,
        recipientUserId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!recipient) {
      throw new NotFoundException("Message not found");
    }

    await this.prisma.internalMessageRecipient.update({
      where: { id: recipient.id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  private mapInboxRow(row: {
    id: string;
    readAt: Date | null;
    message: {
      id: string;
      status: "DRAFT" | "SENT";
      subject: string;
      body: string;
      createdAt: Date;
      sentAt: Date | null;
      senderUser: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      _count: { recipients: number };
    };
  }) {
    return {
      id: row.message.id,
      folder: "inbox",
      status: row.message.status,
      subject: row.message.subject,
      preview: this.toPreview(row.message.body),
      createdAt: row.message.createdAt,
      sentAt: row.message.sentAt,
      unread: !row.readAt,
      sender: row.message.senderUser,
      recipientsCount: row.message._count.recipients,
      mailboxEntryId: row.id,
    };
  }

  private async listArchiveMessages(
    schoolId: string,
    userId: string,
    page: number,
    limit: number,
    searchTerm: string,
  ) {
    const [received, sent] = await this.prisma.$transaction([
      this.prisma.internalMessageRecipient.findMany({
        where: {
          schoolId,
          recipientUserId: userId,
          archivedAt: { not: null },
          deletedAt: null,
          message: {
            status: "SENT",
          },
        },
        orderBy: [{ archivedAt: "desc" }],
        select: {
          id: true,
          readAt: true,
          message: {
            select: {
              id: true,
              status: true,
              subject: true,
              body: true,
              createdAt: true,
              sentAt: true,
              senderUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  recipients: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.internalMessage.findMany({
        where: {
          schoolId,
          senderUserId: userId,
          senderArchivedAt: { not: null },
          status: "SENT",
        },
        orderBy: [{ senderArchivedAt: "desc" }],
        select: {
          id: true,
          status: true,
          subject: true,
          body: true,
          createdAt: true,
          sentAt: true,
          _count: {
            select: {
              recipients: true,
            },
          },
        },
      }),
    ]);

    const combined = [
      ...received.map((row) => this.mapInboxRow(row)),
      ...sent.map((row) => ({
        id: row.id,
        folder: "sent" as const,
        status: row.status,
        subject: row.subject,
        preview: this.toPreview(row.body),
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        unread: false,
        sender: null,
        recipientsCount: row._count.recipients,
      })),
    ]
      .filter((entry) => {
        if (!searchTerm) {
          return true;
        }

        return (
          entry.subject.toLowerCase().includes(searchTerm) ||
          entry.preview.toLowerCase().includes(searchTerm) ||
          `${entry.sender?.firstName ?? ""} ${entry.sender?.lastName ?? ""}`
            .toLowerCase()
            .includes(searchTerm)
        );
      })
      .sort((a, b) => {
        const left = a.sentAt ?? a.createdAt;
        const right = b.sentAt ?? b.createdAt;
        return right.getTime() - left.getTime();
      });

    const total = combined.length;
    const items = combined.slice((page - 1) * limit, page * limit);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private normalizeRecipientIds(recipientUserIds?: string[]) {
    return Array.from(
      new Set(
        (recipientUserIds ?? [])
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );
  }

  private async ensureRecipientsInSchool(
    schoolId: string,
    recipientIds: string[],
  ) {
    if (recipientIds.length === 0) {
      return;
    }

    const memberships = await this.prisma.schoolMembership.findMany({
      where: {
        schoolId,
        userId: {
          in: recipientIds,
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    const validSet = new Set(memberships.map((entry) => entry.userId));
    const missing = recipientIds.filter(
      (recipientId) => !validSet.has(recipientId),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        "Some recipients are not members of the school",
      );
    }
  }

  private async notifyMessageRecipients(schoolId: string, messageId: string) {
    const message = await this.prisma.internalMessage.findFirst({
      where: {
        id: messageId,
        schoolId,
      },
      select: {
        id: true,
        subject: true,
        body: true,
        senderUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        school: {
          select: {
            name: true,
            slug: true,
          },
        },
        recipients: {
          where: {
            deletedAt: null,
          },
          select: {
            recipientUser: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return;
    }

    const senderFullName =
      `${message.senderUser.firstName} ${message.senderUser.lastName}`.trim();
    const preview = this.toPreview(message.body);

    const jobs = message.recipients
      .filter((entry) => Boolean(entry.recipientUser.email))
      .map((entry) =>
        this.mailService.sendInternalMessageNotification({
          to: entry.recipientUser.email,
          recipientFirstName: entry.recipientUser.firstName,
          schoolName: message.school.name,
          schoolSlug: message.school.slug,
          senderFullName,
          subject: message.subject,
          preview,
        }),
      );

    const results = await Promise.allSettled(jobs);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      // The message is already persisted. Notification failures should not break business flow.
      // This no-op block intentionally swallows downstream mail failures.
    }
  }

  private toPreview(body: string) {
    const plain = body
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length > 180 ? `${plain.slice(0, 177)}...` : plain;
  }

  private getEffectiveSchoolId(user: AuthenticatedUser, schoolId: string) {
    if (
      user.platformRoles.includes("SUPER_ADMIN") ||
      user.platformRoles.includes("ADMIN")
    ) {
      return schoolId;
    }

    const hasMembership = user.memberships.some(
      (membership) => membership.schoolId === schoolId,
    );

    if (!hasMembership) {
      throw new ForbiddenException("Insufficient role");
    }

    return schoolId;
  }
}
