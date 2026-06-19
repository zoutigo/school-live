import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  HOMEWORK_NOTIFICATION_JOB_DISPATCH,
  HOMEWORK_NOTIFICATION_QUEUE_NAME,
  type HomeworkNotificationEventPayload,
} from "./homework-notification.types.js";

@Injectable()
export class HomeworkNotificationsService {
  private readonly logger = new Logger(HomeworkNotificationsService.name);

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: HomeworkNotificationEventPayload) {
    try {
      await this.queue.add(
        HOMEWORK_NOTIFICATION_QUEUE_NAME,
        HOMEWORK_NOTIFICATION_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue homework created notification job",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
