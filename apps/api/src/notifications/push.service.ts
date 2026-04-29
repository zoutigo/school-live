import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  QUEUE_PORT,
  type QueuePort,
} from "../infrastructure/messaging/queue.port.js";
import { PUSH_PORT, type PushPort } from "../infrastructure/push/push.port.js";
import {
  PUSH_JOB_SEND_TIMETABLE_CHANGE,
  PUSH_QUEUE_NAME,
  type TimetableChangePushPayload,
} from "./push.types.js";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @Inject(QUEUE_PORT) private readonly queue: QueuePort,
    @Inject(PUSH_PORT) private readonly pushPort: PushPort,
  ) {}

  async sendTimetableChangeNotification(payload: TimetableChangePushPayload) {
    if (payload.tokens.length === 0) {
      return;
    }

    try {
      await this.queue.add(
        PUSH_QUEUE_NAME,
        PUSH_JOB_SEND_TIMETABLE_CHANGE,
        payload,
      );
    } catch (error) {
      this.logger.error(
        "Queue unavailable, fallback to synchronous push sending",
        error instanceof Error ? error.stack : String(error),
      );
      await this.pushPort.sendTimetableChangeNotification(payload);
    }
  }
}
