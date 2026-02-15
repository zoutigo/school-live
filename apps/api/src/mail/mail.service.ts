import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  EMAIL_PORT,
  type EmailPort,
} from "../infrastructure/email/email.port.js";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TEMPORARY_PASSWORD,
  MAIL_QUEUE_NAME,
  type StudentLifeEventNotificationPayload,
  type TemporaryPasswordMailPayload,
} from "./mail.types.js";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(QUEUE_PORT) private readonly queue: QueuePort,
    @Inject(EMAIL_PORT) private readonly emailPort: EmailPort,
  ) {}

  async sendTemporaryPasswordEmail(payload: TemporaryPasswordMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_TEMPORARY_PASSWORD,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendTemporaryPasswordEmail(payload);
    }
  }

  async sendStudentLifeEventNotification(
    payload: StudentLifeEventNotificationPayload,
  ) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendStudentLifeEventNotification(payload);
    }
  }
}
