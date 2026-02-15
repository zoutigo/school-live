import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import {
  EMAIL_PORT,
  type EmailPort,
} from "../infrastructure/email/email.port.js";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import {
  MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION,
  MAIL_JOB_SEND_TEMPORARY_PASSWORD,
  MAIL_QUEUE_NAME,
  type StudentLifeEventNotificationPayload,
  type TemporaryPasswordMailPayload,
} from "../mail/mail.types.js";

@Injectable()
export class MailJobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailJobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(EMAIL_PORT) private readonly emailPort: EmailPort,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      MAIL_QUEUE_NAME,
      async (job) => {
        if (job.name === MAIL_JOB_SEND_TEMPORARY_PASSWORD) {
          await this.emailPort.sendTemporaryPasswordEmail(
            job.data as TemporaryPasswordMailPayload,
          );
          return;
        }
        if (job.name === MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION) {
          await this.emailPort.sendStudentLifeEventNotification(
            job.data as StudentLifeEventNotificationPayload,
          );
          return;
        }

        this.logger.warn(`Unknown mail job received: ${job.name}`);
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Mail job completed: ${job.name}#${job.id}`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Mail job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
