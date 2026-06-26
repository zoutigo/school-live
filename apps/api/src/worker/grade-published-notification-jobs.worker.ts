import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { GradePublishedNotificationsProjectionService } from "../notifications/grade-published-notifications-projection.service.js";
import {
  GRADE_NOTIFICATION_JOB_DISPATCH,
  GRADE_NOTIFICATION_QUEUE_NAME,
  type GradePublishedEventPayload,
} from "../notifications/grade-published-notification.types.js";

@Injectable()
export class GradePublishedNotificationJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    GradePublishedNotificationJobsWorker.name,
  );
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: GradePublishedNotificationsProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      GRADE_NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name === GRADE_NOTIFICATION_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as GradePublishedEventPayload,
          );
          return;
        }

        this.logger.warn(
          `Unknown grade notification job received: ${job.name}`,
        );
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(
        `Grade notification job completed: ${job.name}#${job.id}`,
      );
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Grade notification job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
