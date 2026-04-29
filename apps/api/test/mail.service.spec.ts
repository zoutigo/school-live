import { Logger } from "@nestjs/common";
import { MailService } from "../src/mail/mail.service";
import {
  MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
  MAIL_JOB_SEND_PASSWORD_RESET,
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TIMETABLE_CHANGE_NOTIFICATION,
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
    sendPasswordResetEmail: jest.fn(),
    sendInternalMessageNotification: jest.fn(),
    sendTimetableChangeNotification: jest.fn(),
  };

  const service = new MailService(queue as never, emailPort as never);

  beforeEach(() => {
    queue.add.mockReset();
    emailPort.sendTemporaryPasswordEmail.mockReset();
    emailPort.sendStudentLifeEventNotification.mockReset();
    emailPort.sendPasswordResetEmail.mockReset();
    emailPort.sendInternalMessageNotification.mockReset();
    emailPort.sendTimetableChangeNotification.mockReset();
  });

  it("queues temporary password emails", async () => {
    const payload = {
      to: "admin@example.test",
      firstName: "Admin",
      temporaryPassword: "Tmp123!",
      schoolName: "Scolive",
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
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    queue.add.mockRejectedValue(new Error("redis down"));
    const payload = {
      to: "admin@example.test",
      firstName: "Admin",
      temporaryPassword: "Tmp123!",
      schoolName: "Scolive",
      schoolSlug: "school-live",
    };

    await service.sendTemporaryPasswordEmail(payload);

    expect(emailPort.sendTemporaryPasswordEmail).toHaveBeenCalledWith(payload);
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });

  it("queues life-event and internal-message notifications", async () => {
    const lifePayload = {
      to: "parent@example.test",
      parentFirstName: "Parent",
      studentFirstName: "Student",
      studentLastName: "Kid",
      schoolName: "Scolive",
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
      schoolName: "Scolive",
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

  it("queues password reset emails", async () => {
    const payload = {
      to: "parent@example.test",
      firstName: "Parent",
      resetUrl: "https://school-live.test/mot-de-passe-oublie?token=abc",
      expiresInMinutes: 15,
      schoolSlug: "college-vogt",
    };

    await service.sendPasswordResetEmail(payload);

    expect(queue.add).toHaveBeenCalledWith(
      MAIL_QUEUE_NAME,
      MAIL_JOB_SEND_PASSWORD_RESET,
      payload,
    );
    expect(emailPort.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("queues timetable change emails", async () => {
    const payload = {
      to: "parent@example.test",
      recipientFirstName: "Parent",
      schoolName: "Scolive",
      schoolSlug: "college-vogt",
      className: "6e C",
      title: "Seance annulee",
      summary: "Le cours a ete annule.",
      details: ["Le cours a ete annule."],
    };

    await service.sendTimetableChangeNotification(payload);

    expect(queue.add).toHaveBeenCalledWith(
      MAIL_QUEUE_NAME,
      MAIL_JOB_SEND_TIMETABLE_CHANGE_NOTIFICATION,
      payload,
    );
    expect(emailPort.sendTimetableChangeNotification).not.toHaveBeenCalled();
  });
});
