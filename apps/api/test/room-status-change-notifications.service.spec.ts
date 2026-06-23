import { Logger } from "@nestjs/common";
import { RoomStatusChangeNotificationsService } from "../src/notifications/room-status-change-notifications.service";
import {
  ROOM_STATUS_CHANGE_JOB_DISPATCH,
  ROOM_STATUS_CHANGE_QUEUE_NAME,
} from "../src/notifications/room-status-change.types";

describe("RoomStatusChangeNotificationsService", () => {
  const queue = {
    add: jest.fn(),
  };

  const service = new RoomStatusChangeNotificationsService(queue as never);

  beforeEach(() => {
    queue.add.mockReset();
  });

  const event = {
    schoolId: "school-1",
    roomId: "room-1",
    roomName: "B14",
    previousStatus: "AVAILABLE" as const,
    newStatus: "MAINTENANCE" as const,
    actorUserId: "admin-1",
    actorFullName: "Aline Admin",
  };

  it("enqueues room status change jobs", async () => {
    await service.enqueue(event);

    expect(queue.add).toHaveBeenCalledWith(
      ROOM_STATUS_CHANGE_QUEUE_NAME,
      ROOM_STATUS_CHANGE_JOB_DISPATCH,
      event,
    );
  });

  it("logs and rethrows when the queue is unavailable", async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    queue.add.mockRejectedValue(new Error("redis down"));

    await expect(service.enqueue(event)).rejects.toThrow("redis down");
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });
});
