import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import {
  TIMETABLE_CHANGE_JOB_DISPATCH,
  TIMETABLE_CHANGE_QUEUE_NAME,
  type TimetableChangeEventPayload,
} from "./timetable-change.types.js";

@Injectable()
export class TimetableChangeNotificationsService {
  private readonly logger = new Logger(
    TimetableChangeNotificationsService.name,
  );

  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort) {}

  async enqueue(event: TimetableChangeEventPayload) {
    try {
      await this.queue.add(
        TIMETABLE_CHANGE_QUEUE_NAME,
        TIMETABLE_CHANGE_JOB_DISPATCH,
        event,
      );
    } catch (error) {
      this.logger.error(
        "Unable to enqueue timetable change notification job",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
