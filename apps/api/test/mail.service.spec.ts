import { MailService } from "../src/mail/mail.service";
import {
  MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TEMPORARY_PASSWORD,
  MAIL_QUEUE_NAME,
} from "../src/mail/mail.types";

describe("MailService", () => {
  const queue = {
    add: jest.fn(),
  };

  const emailPort = {
    sendTemporaryPasswordEmail: jest.fn(),
    sendStudentLifeEventNotification: jest.fn(),
    sendInternalMessageNotification: jest.fn(),
  };

  const service = new MailService(queue as never, emailPort as never);

  beforeEach(() => {
    queue.add.mockReset();
    emailPort.sendTemporaryPasswordEmail.mockReset();
    emailPort.sendStudentLifeEventNotification.mockReset();
    emailPort.sendInternalMessageNotification.mockReset();
  });

  it("queues temporary password emails", async () => {
    const payload = {
      to: "admin@example.test",
      firstName: "Admin",
      temporaryPassword: "Tmp123!",
      schoolName: "School Live",
      schoolSlug: "school-live",
    };

    await service.sendTemporaryPasswordEmail(payload);

    expect(queue.add).toHaveBeenCalledWith(
      MAIL_QUEUE_NAME,
      MAIL_JOB_SEND_TEMPORARY_PASSWORD,
      payload,
    );
    expect(emailPort.sendTemporaryPasswordEmail).not.toHaveBeenCalled();
  });

  it("falls back to synchronous send when queue is unavailable", async () => {
    queue.add.mockRejectedValue(new Error("redis down"));
    const payload = {
      to: "admin@example.test",
      firstName: "Admin",
      temporaryPassword: "Tmp123!",
      schoolName: "School Live",
      schoolSlug: "school-live",
    };

    await service.sendTemporaryPasswordEmail(payload);

    expect(emailPort.sendTemporaryPasswordEmail).toHaveBeenCalledWith(payload);
  });

  it("queues life-event and internal-message notifications", async () => {
    const lifePayload = {
      to: "parent@example.test",
      parentFirstName: "Parent",
      studentFirstName: "Student",
      studentLastName: "Kid",
      schoolName: "School Live",
      schoolSlug: "school-live",
      eventTypeLabel: "Discipline",
      eventReason: "Retards successifs",
      eventAction: "CREATED" as const,
      eventDate: "2026-02-21T10:00:00.000Z",
    };

    await service.sendStudentLifeEventNotification(lifePayload);

    expect(queue.add).toHaveBeenCalledWith(
      MAIL_QUEUE_NAME,
      MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
      lifePayload,
    );

    const internalPayload = {
      to: "teacher@example.test",
      recipientFirstName: "Anne",
      schoolName: "School Live",
      schoolSlug: "school-live",
      senderFullName: "Valery MBELE",
      subject: "Demande de suivi",
      preview: "Bonjour",
    };

    await service.sendInternalMessageNotification(internalPayload);

    expect(queue.add).toHaveBeenCalledWith(
      MAIL_QUEUE_NAME,
      MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
      internalPayload,
    );
  });
});
