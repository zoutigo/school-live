export const ROOM_STATUS_CHANGE_QUEUE_NAME = "room-status-change";
export const ROOM_STATUS_CHANGE_JOB_DISPATCH = "dispatch-room-status-change";

export type RoomStatus = "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

export type RoomStatusChangeEventPayload = {
  schoolId: string;
  roomId: string;
  roomName: string;
  previousStatus: RoomStatus;
  newStatus: RoomStatus;
  actorUserId: string;
  actorFullName: string;
};
