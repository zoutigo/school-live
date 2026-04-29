import type { TimetableChangePushPayload } from "../../notifications/push.types.js";

export const PUSH_PORT = Symbol("PUSH_PORT");

export type PushPort = {
  sendTimetableChangeNotification(
    payload: TimetableChangePushPayload,
  ): Promise<void>;
};
