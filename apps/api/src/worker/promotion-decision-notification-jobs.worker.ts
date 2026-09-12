import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { PromotionDecisionNotificationsProjectionService } from "../notifications/promotion-decision-notifications-projection.service.js";
import {
  PROMOTION_DECISION_NOTIFICATION_JOB_DISPATCH,
  PROMOTION_DECISION_NOTIFICATION_QUEUE_NAME,
  type PromotionDecisionEventPayload,
} from "../notifications/promotion-decision-notification.types.js";

@Injectable()
export class PromotionDecisionNotificationJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    PromotionDecisionNotificationJobsWorker.name,
  );
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: PromotionDecisionNotificationsProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      PROMOTION_DECISION_NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name === PROMOTION_DECISION_NOTIFICATION_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as PromotionDecisionEventPayload,
          );
          return;
        }

        this.logger.warn(
          `Unknown promotion decision notification job received: ${job.name}`,
        );
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(
        `Promotion decision notification job completed: ${job.name}#${job.id}`,
      );
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Promotion decision notification job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
