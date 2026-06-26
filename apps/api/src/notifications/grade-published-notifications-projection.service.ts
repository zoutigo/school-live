import { Injectable } from "@nestjs/common";
import { publicEmailOrNull } from "../common/email.util.js";
import {
  evaluationCountsForAverage,
  sequenceLabel,
} from "../common/sequence.util.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PushService } from "./push.service.js";
import type { GradePublishedEventPayload } from "./grade-published-notification.types.js";

@Injectable()
export class GradePublishedNotificationsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

  async project(event: GradePublishedEventPayload) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: event.evaluationId },
      select: {
        id: true,
        title: true,
        sequence: true,
        isFinalExam: true,
        classId: true,
        schoolYearId: true,
        subject: { select: { name: true } },
        class: { select: { name: true } },
        school: { select: { name: true, slug: true } },
        scores: { select: { studentId: true } },
      },
    });
    if (!evaluation) return;

    const counts = evaluationCountsForAverage(
      evaluation.sequence,
      evaluation.isFinalExam,
    );
    const seqLabel = sequenceLabel(evaluation.sequence);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId: event.schoolId,
        classId: evaluation.classId,
        schoolYearId: evaluation.schoolYearId,
        status: "ACTIVE",
        studentId: {
          in: evaluation.scores.map((s) => s.studentId),
        },
      },
      select: {
        student: {
          select: {
            id: true,
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

    const recipientUserIds = new Set<string>();
    const emailJobs: Array<{
      email: string;
      firstName: string;
      studentFirstName: string;
      studentLastName: string;
    }> = [];

    for (const row of enrollments) {
      const { student } = row;
      const studentFirstName = student.firstName;
      const studentLastName = student.lastName;

      const studentUser = student.user;
      if (studentUser?.id && studentUser.activationStatus === "ACTIVE") {
        recipientUserIds.add(studentUser.id);
        const email = publicEmailOrNull(studentUser.email);
        if (email) {
          emailJobs.push({
            email,
            firstName: studentUser.firstName,
            studentFirstName,
            studentLastName,
          });
        }
      }

      for (const link of student.parentLinks) {
        const parent = link.parent;
        if (parent.activationStatus === "ACTIVE") {
          recipientUserIds.add(parent.id);
          const email = publicEmailOrNull(parent.email);
          if (email) {
            emailJobs.push({
              email,
              firstName: parent.firstName,
              studentFirstName,
              studentLastName,
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

    await this.pushService.sendGradePublishedNotification({
      tokens: pushTokens.map((row) => row.token),
      title: `Nouvelle note · ${evaluation.class.name}`,
      body: `${evaluation.subject.name} — ${evaluation.title} (${seqLabel})`,
      data: {
        type: "GRADE_PUBLISHED",
        schoolSlug: evaluation.school.slug,
        classId: evaluation.classId,
        evaluationId: evaluation.id,
      },
    });

    await Promise.all(
      emailJobs.map((job) =>
        this.mailService.sendGradePublishedNotification({
          to: job.email,
          recipientFirstName: job.firstName,
          schoolName: evaluation.school.name,
          schoolSlug: evaluation.school.slug,
          studentFirstName: job.studentFirstName,
          studentLastName: job.studentLastName,
          className: evaluation.class.name,
          subjectName: evaluation.subject.name,
          evaluationTitle: evaluation.title,
          sequenceLabel: seqLabel,
          isFinalExam: evaluation.isFinalExam,
          countsForAverage: counts,
        }),
      ),
    );
  }
}
