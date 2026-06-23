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
  MAIL_JOB_SEND_EMAIL_VERIFICATION,
  MAIL_JOB_SEND_HOMEWORK_CREATED_NOTIFICATION,
  MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
  MAIL_JOB_SEND_PASSWORD_RESET,
  MAIL_JOB_SEND_ROOM_STATUS_CHANGE_NOTIFICATION,
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TEST_EXECUTION_FAILED_NOTIFICATION,
  MAIL_JOB_SEND_TIMETABLE_CHANGE_NOTIFICATION,
  MAIL_JOB_SEND_TEMPORARY_PASSWORD,
  MAIL_QUEUE_NAME,
  type EmailVerificationMailPayload,
  type HomeworkCreatedMailPayload,
  type InternalMessageNotificationPayload,
  type PasswordResetMailPayload,
  type RoomStatusChangeMailPayload,
  type StudentLifeEventNotificationPayload,
  type TestExecutionFailedNotificationPayload,
  type TimetableChangeMailPayload,
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

  async sendEmailVerification(payload: EmailVerificationMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_EMAIL_VERIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendEmailVerification(payload);
    }
  }

  async sendPasswordResetEmail(payload: PasswordResetMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_PASSWORD_RESET,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendPasswordResetEmail(payload);
    }
  }

  async sendInternalMessageNotification(
    payload: InternalMessageNotificationPayload,
  ) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_INTERNAL_MESSAGE_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendInternalMessageNotification(payload);
    }
  }

  async sendTimetableChangeNotification(payload: TimetableChangeMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_TIMETABLE_CHANGE_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendTimetableChangeNotification(payload);
    }
  }

  async sendTestExecutionFailedNotification(
    payload: TestExecutionFailedNotificationPayload,
  ) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_TEST_EXECUTION_FAILED_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendTestExecutionFailedNotification(payload);
    }
  }

  async sendHomeworkCreatedNotification(payload: HomeworkCreatedMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_HOMEWORK_CREATED_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendHomeworkCreatedNotification(payload);
    }
  }

  async sendRoomStatusChangeNotification(payload: RoomStatusChangeMailPayload) {
    try {
      await this.queue.add(
        MAIL_QUEUE_NAME,
        MAIL_JOB_SEND_ROOM_STATUS_CHANGE_NOTIFICATION,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous email sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.emailPort.sendRoomStatusChangeNotification(payload);
    }
  }
}
