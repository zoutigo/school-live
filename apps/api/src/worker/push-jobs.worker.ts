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
  PUSH_JOB_SEND_GRADE_PUBLISHED,
  PUSH_JOB_SEND_HOMEWORK_CREATED,
  PUSH_JOB_SEND_RESOURCE_SUBMISSION_DISCARDED,
  PUSH_JOB_SEND_RESOURCE_SUBMISSION_REJECTED,
  PUSH_JOB_SEND_ROOM_STATUS_CHANGE,
  PUSH_JOB_SEND_STUDENT_LIFE_EVENT,
  PUSH_JOB_SEND_TIMETABLE_CHANGE,
  PUSH_QUEUE_NAME,
  type GradePublishedPushPayload,
  type HomeworkCreatedPushPayload,
  type ResourceSubmissionDiscardedPushPayload,
  type ResourceSubmissionRejectedPushPayload,
  type RoomStatusChangePushPayload,
  type StudentLifeEventPushPayload,
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
        if (job.name === PUSH_JOB_SEND_HOMEWORK_CREATED) {
          await this.pushPort.sendHomeworkCreatedNotification(
            job.data as HomeworkCreatedPushPayload,
          );
          return;
        }
        if (job.name === PUSH_JOB_SEND_ROOM_STATUS_CHANGE) {
          await this.pushPort.sendRoomStatusChangeNotification(
            job.data as RoomStatusChangePushPayload,
          );
          return;
        }
        if (job.name === PUSH_JOB_SEND_GRADE_PUBLISHED) {
          await this.pushPort.sendGradePublishedNotification(
            job.data as GradePublishedPushPayload,
          );
          return;
        }
        if (job.name === PUSH_JOB_SEND_STUDENT_LIFE_EVENT) {
          await this.pushPort.sendStudentLifeEventNotification(
            job.data as StudentLifeEventPushPayload,
          );
          return;
        }
        if (job.name === PUSH_JOB_SEND_RESOURCE_SUBMISSION_DISCARDED) {
          await this.pushPort.sendResourceSubmissionDiscardedNotification(
            job.data as ResourceSubmissionDiscardedPushPayload,
          );
          return;
        }
        if (job.name === PUSH_JOB_SEND_RESOURCE_SUBMISSION_REJECTED) {
          await this.pushPort.sendResourceSubmissionRejectedNotification(
            job.data as ResourceSubmissionRejectedPushPayload,
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
