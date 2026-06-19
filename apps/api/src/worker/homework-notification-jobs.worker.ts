import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { HomeworkNotificationsProjectionService } from "../notifications/homework-notifications-projection.service.js";
import {
  HOMEWORK_NOTIFICATION_JOB_DISPATCH,
  HOMEWORK_NOTIFICATION_QUEUE_NAME,
  type HomeworkNotificationEventPayload,
} from "../notifications/homework-notification.types.js";

@Injectable()
export class HomeworkNotificationJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(HomeworkNotificationJobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: HomeworkNotificationsProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      HOMEWORK_NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name === HOMEWORK_NOTIFICATION_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as HomeworkNotificationEventPayload,
          );
          return;
        }

        this.logger.warn(
          `Unknown homework notification job received: ${job.name}`,
        );
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(
        `Homework notification job completed: ${job.name}#${job.id}`,
      );
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Homework notification job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
