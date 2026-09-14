import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  SUPPLY_LIST_AVAILABLE_NOTIFICATION_JOB_DISPATCH,
  SUPPLY_LIST_AVAILABLE_NOTIFICATION_QUEUE_NAME,
  type SupplyListAvailableEventPayload,
} from "./supply-list-available-notification.types.js";

@Injectable()
export class SupplyListAvailableNotificationsService {
  private readonly logger = new Logger(
    SupplyListAvailableNotificationsService.name,
  );

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: SupplyListAvailableEventPayload) {
    try {
      await this.queue.add(
        SUPPLY_LIST_AVAILABLE_NOTIFICATION_QUEUE_NAME,
        SUPPLY_LIST_AVAILABLE_NOTIFICATION_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue supply list available notification job",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
