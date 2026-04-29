import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker } from "bullmq";
import { buildRedisConnection } from "../infrastructure/messaging/redis-connection.js";
import { PUSH_PORT, type PushPort } from "../infrastructure/push/push.port.js";
import {
  PUSH_JOB_SEND_TIMETABLE_CHANGE,
  PUSH_QUEUE_NAME,
  type TimetableChangePushPayload,
} from "../notifications/push.types.js";

@Injectable()
export class PushJobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushJobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(PUSH_PORT) private readonly pushPort: PushPort,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      PUSH_QUEUE_NAME,
      async (job) => {
        if (job.name === PUSH_JOB_SEND_TIMETABLE_CHANGE) {
          await this.pushPort.sendTimetableChangeNotification(
            job.data as TimetableChangePushPayload,
          );
          return;
        }

        this.logger.warn(`Unknown push job received: ${job.name}`);
      },
      {
        connection: buildRedisConnection(this.configService),
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Push job completed: ${job.name}#${job.id}`);
    });
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `Push job failed: ${job?.name ?? "unknown"}#${job?.id ?? "unknown"}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    this.worker = null;
  }
}
