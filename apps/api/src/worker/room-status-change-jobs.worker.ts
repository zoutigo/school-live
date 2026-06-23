import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { RoomStatusChangeProjectionService } from "../notifications/room-status-change-projection.service.js";
import {
  ROOM_STATUS_CHANGE_JOB_DISPATCH,
  ROOM_STATUS_CHANGE_QUEUE_NAME,
  type RoomStatusChangeEventPayload,
} from "../notifications/room-status-change.types.js";

@Injectable()
export class RoomStatusChangeJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RoomStatusChangeJobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: RoomStatusChangeProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      ROOM_STATUS_CHANGE_QUEUE_NAME,
      async (job) => {
        if (job.name === ROOM_STATUS_CHANGE_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as RoomStatusChangeEventPayload,
          );
          return;
        }

        this.logger.warn(
          `Unknown room status change job received: ${job.name}`,
        );
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(
        `Room status change job completed: ${job.name}#${job.id}`,
      );
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Room status change job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
