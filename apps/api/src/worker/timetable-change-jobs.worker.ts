import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { TimetableChangeProjectionService } from "../notifications/timetable-change-projection.service.js";
import {
  TIMETABLE_CHANGE_JOB_DISPATCH,
  TIMETABLE_CHANGE_QUEUE_NAME,
  type TimetableChangeEventPayload,
} from "../notifications/timetable-change.types.js";

@Injectable()
export class TimetableChangeJobsWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TimetableChangeJobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectionService: TimetableChangeProjectionService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      TIMETABLE_CHANGE_QUEUE_NAME,
      async (job) => {
        if (job.name === TIMETABLE_CHANGE_JOB_DISPATCH) {
          await this.projectionService.project(
            job.data as TimetableChangeEventPayload,
          );
          return;
        }

        this.logger.warn(`Unknown timetable change job received: ${job.name}`);
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Timetable job completed: ${job.name}#${job.id}`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Timetable job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
