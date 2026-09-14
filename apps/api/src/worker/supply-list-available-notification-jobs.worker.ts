import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { SupplyListAvailableNotificationsProjectionService } from "../notifications/supply-list-available-notifications-projection.service.js";
import {
  SUPPLY_LIST_AVAILABLE_NOTIFICATION_JOB_DISPATCH,
  SUPPLY_LIST_AVAILABLE_NOTIFICATION_QUEUE_NAME,
  type SupplyListAvailableEventPayload,
} from "../notifications/supply-list-available-notification.types.js";

@Injectable()
export class SupplyListAvailableNotificationJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    SupplyListAvailableNotificationJobsWorker.name,
  );
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: SupplyListAvailableNotificationsProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      SUPPLY_LIST_AVAILABLE_NOTIFICATION_QUEUE_NAME,
      async (job) => {
        if (job.name === SUPPLY_LIST_AVAILABLE_NOTIFICATION_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as SupplyListAvailableEventPayload,
          );
          return;
        }

        this.logger.warn(
          `Unknown supply list available notification job received: ${job.name}`,
        );
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(
        `Supply list available notification job completed: ${job.name}#${job.id}`,
      );
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Supply list available notification job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
