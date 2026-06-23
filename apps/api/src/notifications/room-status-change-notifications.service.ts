import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  ROOM_STATUS_CHANGE_JOB_DISPATCH,
  ROOM_STATUS_CHANGE_QUEUE_NAME,
  type RoomStatusChangeEventPayload,
} from "./room-status-change.types.js";

@Injectable()
export class RoomStatusChangeNotificationsService {
  private readonly logger = new Logger(
    RoomStatusChangeNotificationsService.name,
  );

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: RoomStatusChangeEventPayload) {
    try {
      await this.queue.add(
        ROOM_STATUS_CHANGE_QUEUE_NAME,
        ROOM_STATUS_CHANGE_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue room status change notification job",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
