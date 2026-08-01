import { createHash } from "crypto";
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ContactSubmission } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ContactInfoService } from "./contact-info.service.js";
import type { CreateContactSubmissionDto } from "./dto/create-contact-submission.dto.js";
import type { ListContactSubmissionsDto } from "./dto/list-contact-submissions.dto.js";
import { isPlatformAdmin } from "./site-content-access.js";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

@Injectable()
export class ContactSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly contactInfoService: ContactInfoService,
  ) {}

  assertCanManage(user: AuthenticatedUser) {
    if (!isPlatformAdmin(user)) {
      throw new ForbiddenException("Réservé aux administrateurs plateforme");
    }
  }

  private hashIp(ip: string): string {
    const pepper =
      process.env.CONTACT_SUBMISSION_IP_PEPPER ??
      "dev-contact-submission-pepper-change-me";
    return createHash("sha256").update(`${ip}:${pepper}`).digest("hex");
  }

  async create(
    dto: CreateContactSubmissionDto,
    ip: string | undefined,
  ): Promise<void> {
    // Honeypot : un bot remplit ce champ invisible pour un humain. On
    // renvoie silencieusement sans rien stocker ni envoyer, sans faire
    // échouer la requête (pour ne pas signaler au bot qu'il a été détecté).
    if (dto.website) {
      return;
    }

    const ipHash = ip ? this.hashIp(ip) : null;

    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recentCount = await this.prisma.contactSubmission.count({
        where: { ipHash, createdAt: { gte: since } },
      });
      if (recentCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
        throw new HttpException(
          "Trop de demandes de contact envoyées récemment, réessayez plus tard.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: sanitizePlainText(dto.name),
        email: dto.email.trim().toLowerCase(),
        phone: sanitizePlainText(dto.phone),
        subject: sanitizePlainText(dto.subject),
        message: sanitizePlainText(dto.message),
        ipHash,
      },
    });

    const contactInfo = await this.contactInfoService.getContactInfo();
    await this.mailService.sendContactFormSubmissionNotification({
      to: contactInfo.email,
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      subject: submission.subject,
      message: submission.message,
      submittedAt: submission.createdAt.toISOString(),
    });
  }

  async list(
    user: AuthenticatedUser,
    query: ListContactSubmissionsDto,
  ): Promise<{
    items: ContactSubmission[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.assertCanManage(user);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactSubmission.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactSubmission.count(),
    ]);

    return { items, total, page, limit };
  }

  async getOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ContactSubmission> {
    this.assertCanManage(user);

    const submission = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException("Prise de contact introuvable");
    }

    if (!submission.readAt) {
      return this.prisma.contactSubmission.update({
        where: { id },
        data: { readAt: new Date(), readById: user.id },
      });
    }

    return submission;
  }
}
