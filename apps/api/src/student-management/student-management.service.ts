import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

@Injectable()
export class StudentManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestUsername(
    studentId: string,
    schoolId: string,
  ): Promise<{ username: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { firstName: true, lastName: true },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const base = this.buildUsernameBase(student.firstName, student.lastName);
    const username = await this.ensureUniqueUsername(base);
    return { username };
  }

  async promoteStudent(
    studentId: string,
    schoolId: string,
    _adminUserId: string,
    proposedUsername?: string,
  ): Promise<{ username: string; temporaryPassword: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    if (student.userId) {
      throw new ConflictException("Student already has a user account");
    }

    let username: string;
    if (proposedUsername) {
      const normalized = proposedUsername.trim();
      const existing = await this.prisma.user.findUnique({
        where: { username: normalized },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `Username "${normalized}" is already taken`,
        );
      }
      username = normalized;
    } else {
      const base = this.buildUsernameBase(student.firstName, student.lastName);
      username = await this.ensureUniqueUsername(base);
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    try {
      await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            firstName: student.firstName,
            lastName: student.lastName,
            username,
            passwordHash,
            mustChangePassword: true,
            profileCompleted: true,
            activationStatus: "ACTIVE",
          },
        });

        await tx.schoolMembership.create({
          data: {
            userId: newUser.id,
            schoolId,
            role: "STUDENT",
          },
        });

        await tx.student.update({
          where: { id: studentId },
          data: { userId: newUser.id },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(`Username "${username}" is already taken`);
      }
      throw error;
    }

    await this.sendParentNotification(
      studentId,
      schoolId,
      `Le compte de ${student.firstName} ${student.lastName} a été activé. Nom d'utilisateur: ${username}`,
      "Activation du compte élève",
    );

    return { username, temporaryPassword };
  }

  async resetStudentPassword(
    studentId: string,
    schoolId: string,
  ): Promise<{ temporaryPassword: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    if (!student.userId) {
      throw new NotFoundException(
        "This student does not have a user account yet",
      );
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    await this.sendParentNotification(
      studentId,
      schoolId,
      `Le mot de passe de ${student.firstName} ${student.lastName} a été réinitialisé.`,
      "Réinitialisation du mot de passe",
    );

    return { temporaryPassword };
  }

  private async sendParentNotification(
    studentId: string,
    schoolId: string,
    messageBody: string,
    subject: string,
  ): Promise<void> {
    try {
      const parentLinks = await this.prisma.parentStudent.findMany({
        where: { studentId, schoolId },
        select: { parentUserId: true },
      });

      if (!parentLinks.length) {
        return;
      }

      // Find a school admin to use as sender
      const senderMembership = await this.prisma.schoolMembership.findFirst({
        where: { schoolId, role: "SCHOOL_ADMIN" },
        select: { userId: true },
      });

      if (!senderMembership) {
        return;
      }

      const senderUserId = senderMembership.userId;

      const message = await this.prisma.internalMessage.create({
        data: {
          schoolId,
          senderUserId,
          subject,
          body: messageBody,
          status: "SENT",
          sentAt: new Date(),
        },
      });

      await this.prisma.internalMessageRecipient.createMany({
        data: parentLinks.map((link) => ({
          messageId: message.id,
          schoolId,
          recipientUserId: link.parentUserId,
        })),
        skipDuplicates: true,
      });
    } catch {
      // Notifications are best-effort — don't fail the main operation
    }
  }

  private buildUsernameBase(firstName: string, lastName: string): string {
    const normalizeStr = (str: string): string =>
      str
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z]/g, "");

    const first = normalizeStr(firstName);
    // Capitalize first letter, lowercase rest for each word
    const firstPart = first
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("");

    const last = normalizeStr(lastName).toUpperCase();

    return `${firstPart}${last}`;
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { username: base },
      select: { id: true },
    });

    if (!existing) {
      return base;
    }

    // Find the next available suffix
    let suffix = 2;
    while (true) {
      const candidate = `${base}${suffix}`;
      const check = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!check) {
        return candidate;
      }
      suffix++;
    }
  }

  private generateTemporaryPassword(): string {
    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const allChars = upperChars + lowerChars + digits;

    const getRandomChar = (charset: string): string => {
      const bytes = randomBytes(1);
      return charset[bytes[0] % charset.length];
    };

    // Ensure at least 1 uppercase, 1 lowercase, 1 digit
    const required = [
      getRandomChar(upperChars),
      getRandomChar(lowerChars),
      getRandomChar(digits),
    ];

    // Fill remaining 9 chars
    const remaining = Array.from({ length: 9 }, () => getRandomChar(allChars));

    // Shuffle combined array
    const combined = [...required, ...remaining];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = randomBytes(1)[0] % (i + 1);
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join("");
  }
}
