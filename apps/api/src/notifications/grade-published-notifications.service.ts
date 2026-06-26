import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  GRADE_NOTIFICATION_JOB_DISPATCH,
  GRADE_NOTIFICATION_QUEUE_NAME,
  type GradePublishedEventPayload,
} from "./grade-published-notification.types.js";

@Injectable()
export class GradePublishedNotificationsService {
  private readonly logger = new Logger(GradePublishedNotificationsService.name);

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: GradePublishedEventPayload) {
    try {
      await this.queue.add(
        GRADE_NOTIFICATION_QUEUE_NAME,
        GRADE_NOTIFICATION_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue grade published notification job",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
