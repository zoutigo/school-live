import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  PROMOTION_DECISION_NOTIFICATION_JOB_DISPATCH,
  PROMOTION_DECISION_NOTIFICATION_QUEUE_NAME,
  type PromotionDecisionEventPayload,
} from "./promotion-decision-notification.types.js";

@Injectable()
export class PromotionDecisionNotificationsService {
  private readonly logger = new Logger(
    PromotionDecisionNotificationsService.name,
  );

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: PromotionDecisionEventPayload) {
    try {
      await this.queue.add(
        PROMOTION_DECISION_NOTIFICATION_QUEUE_NAME,
        PROMOTION_DECISION_NOTIFICATION_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue promotion decision notification job",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
