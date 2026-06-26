import type {
  GradePublishedPushPayload,
  HomeworkCreatedPushPayload,
  RoomStatusChangePushPayload,
  TimetableChangePushPayload,
} from "../../notifications/push.types.js";

export const PUSH_PORT = Symbol("PUSH_PORT");

export type PushPort = {
  sendTimetableChangeNotification(
    payload: TimetableChangePushPayload,
  ): Promise<void>;
  sendHomeworkCreatedNotification(
    payload: HomeworkCreatedPushPayload,
  ): Promise<void>;
  sendRoomStatusChangeNotification(
    payload: RoomStatusChangePushPayload,
  ): Promise<void>;
  sendGradePublishedNotification(
    payload: GradePublishedPushPayload,
  ): Promise<void>;
};
