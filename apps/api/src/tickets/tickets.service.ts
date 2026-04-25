import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser, PlatformRole } from "../auth/auth.types.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateTicketDto } from "./dto/create-ticket.dto.js";
import type { ListTicketsDto } from "./dto/list-tickets.dto.js";
import type { RespondTicketDto } from "./dto/respond-ticket.dto.js";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";

const PLATFORM_ADMIN_ROLES: PlatformRole[] = ["SUPER_ADMIN", "ADMIN"];
const PLATFORM_STAFF_ROLES: PlatformRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
];
const ALL_PLATFORM_ROLES: PlatformRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "SALES",
];

type UploadedFile = {
  originalname?: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const TICKET_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  email: true,
} as const;

const TICKET_DETAIL_INCLUDE = {
  author: { select: TICKET_AUTHOR_SELECT },
  school: { select: { id: true, name: true, slug: true } },
  attachments: true,
  votes: {
    select: {
      id: true,
      userId: true,
      user: { select: TICKET_AUTHOR_SELECT },
      createdAt: true,
    },
  },
  responses: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: TICKET_AUTHOR_SELECT },
    },
  },
  _count: { select: { votes: true } },
} satisfies Prisma.TicketInclude;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClient: MediaClientService,
  ) {}

  async createTicket(
    user: AuthenticatedUser,
    dto: CreateTicketDto,
    files: UploadedFile[],
  ) {
    let schoolId: string | null = null;
    if (dto.schoolSlug) {
      const school = await this.prisma.school.findUnique({
        where: { slug: dto.schoolSlug },
        select: { id: true },
      });
      if (!school) {
        throw new NotFoundException("École introuvable");
      }
      schoolId = school.id;
    }

    const uploadedAttachments = await Promise.all(
      files.map(async (file) => {
        const result = await this.mediaClient.uploadImage("ticket-attachment", {
          buffer: file.buffer,
          mimetype: file.mimetype,
          size: file.size,
        });
        return {
          fileName: file.originalname ?? "fichier",
          fileUrl: result.url,
          mimeType: result.mimeType,
          sizeBytes: result.size,
        };
      }),
    );

    return this.prisma.ticket.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        platform: dto.platform,
        appVersion: dto.appVersion,
        screenPath: dto.screenPath,
        authorId: user.id,
        ...(schoolId ? { schoolId } : {}),
        attachments: uploadedAttachments.length
          ? { create: uploadedAttachments }
          : undefined,
      },
      include: TICKET_DETAIL_INCLUDE,
    });
  }

  async listTickets(user: AuthenticatedUser, query: ListTicketsDto) {
    const isPlatformRole = this.hasPlatformRole(user, ALL_PLATFORM_ROLES);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const searchTerm = query.q?.trim().toLowerCase() ?? "";

    const where: Prisma.TicketWhereInput = {
      ...(isPlatformRole ? {} : { authorId: user.id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: "insensitive" } },
              { description: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: TICKET_AUTHOR_SELECT },
          school: { select: { id: true, name: true, slug: true } },
          attachments: true,
          _count: { select: { votes: true, responses: true } },
        },
      }),
    ]);

    return {
      data: tickets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTicket(user: AuthenticatedUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: TICKET_DETAIL_INCLUDE,
    });

    if (!ticket) {
      throw new NotFoundException("Ticket introuvable");
    }

    const isPlatformRole = this.hasPlatformRole(user, ALL_PLATFORM_ROLES);
    if (!isPlatformRole && ticket.authorId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }

    const isStaff = this.hasPlatformRole(user, PLATFORM_STAFF_ROLES);
    if (!isStaff) {
      return {
        ...ticket,
        responses: ticket.responses.filter((r) => !r.isInternal),
      };
    }

    return ticket;
  }

  async updateStatus(
    user: AuthenticatedUser,
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ) {
    this.requirePlatformRole(user, PLATFORM_STAFF_ROLES);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) {
      throw new NotFoundException("Ticket introuvable");
    }

    const resolvedAt =
      dto.status === "RESOLVED" || dto.status === "CLOSED" ? new Date() : null;

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      },
      include: TICKET_DETAIL_INCLUDE,
    });
  }

  async addResponse(
    user: AuthenticatedUser,
    ticketId: string,
    dto: RespondTicketDto,
  ) {
    this.requirePlatformRole(user, PLATFORM_STAFF_ROLES);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: { select: { id: true, email: true, firstName: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException("Ticket introuvable");
    }

    const isInternal = dto.isInternal ?? false;

    const [response] = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketResponse.create({
        data: {
          ticketId,
          authorId: user.id,
          body: dto.body,
          isInternal,
        },
        include: { author: { select: TICKET_AUTHOR_SELECT } },
      });

      if (!isInternal) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: "ANSWERED" },
        });

        if (ticket.schoolId) {
          await tx.internalMessage.create({
            data: {
              schoolId: ticket.schoolId,
              senderUserId: user.id,
              status: "SENT",
              subject: `Réponse à votre ticket : ${ticket.title}`,
              body: `${dto.body}\n\n---\nConsultez votre ticket : ${ticket.id}`,
              sentAt: new Date(),
              recipients: {
                create: {
                  schoolId: ticket.schoolId,
                  recipientUserId: ticket.author.id,
                },
              },
            },
          });
        }
      }

      return [created];
    });

    return response;
  }

  async toggleVote(user: AuthenticatedUser, ticketId: string) {
    this.requirePlatformRole(user, ALL_PLATFORM_ROLES);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!ticket) {
      throw new NotFoundException("Ticket introuvable");
    }

    const existing = await this.prisma.ticketVote.findUnique({
      where: { ticketId_userId: { ticketId, userId: user.id } },
    });

    if (existing) {
      await this.prisma.ticketVote.delete({ where: { id: existing.id } });
      return { voted: false };
    }

    await this.prisma.ticketVote.create({
      data: { ticketId, userId: user.id },
    });
    return { voted: true };
  }

  async deleteTicket(user: AuthenticatedUser, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, authorId: true },
    });
    if (!ticket) {
      throw new NotFoundException("Ticket introuvable");
    }

    const isAdmin = this.hasPlatformRole(user, PLATFORM_ADMIN_ROLES);
    if (!isAdmin && ticket.authorId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }

    await this.prisma.ticket.delete({ where: { id: ticketId } });
    return { deleted: true };
  }

  async getMyTicketCount(user: AuthenticatedUser) {
    const open = await this.prisma.ticket.count({
      where: {
        authorId: user.id,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    });
    return { open };
  }

  private hasPlatformRole(
    user: AuthenticatedUser,
    roles: PlatformRole[],
  ): boolean {
    return user.platformRoles.some((r) => roles.includes(r));
  }

  private requirePlatformRole(
    user: AuthenticatedUser,
    roles: PlatformRole[],
  ): void {
    if (!this.hasPlatformRole(user, roles)) {
      throw new ForbiddenException(
        "Réservé aux administrateurs de la plateforme",
      );
    }
  }
}
