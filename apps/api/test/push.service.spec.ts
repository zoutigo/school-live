import { Logger } from "@nestjs/common";
import { PushService } from "../src/notifications/push.service";
import {
  PUSH_JOB_SEND_ROOM_STATUS_CHANGE,
  PUSH_JOB_SEND_TIMETABLE_CHANGE,
  PUSH_QUEUE_NAME,
} from "../src/notifications/push.types";

describe("PushService", () => {
  const queue = {
    add: jest.fn(),
  };

  const pushPort = {
    sendTimetableChangeNotification: jest.fn(),
    sendRoomStatusChangeNotification: jest.fn(),
  };

  const service = new PushService(queue as never, pushPort as never);

  beforeEach(() => {
    queue.add.mockReset();
    pushPort.sendTimetableChangeNotification.mockReset();
    pushPort.sendRoomStatusChangeNotification.mockReset();
  });

  it("queues timetable change push notifications", async () => {
    const payload = {
      tokens: ["ExponentPushToken[a]", "ExponentPushToken[b]"],
      title: "Seance annulee",
      body: "Le cours de mathematiques a ete annule.",
      data: {
        type: "TIMETABLE_CHANGE" as const,
        schoolSlug: "college-vogt",
        classId: "class-1",
      },
    };

    await service.sendTimetableChangeNotification(payload);

    expect(queue.add).toHaveBeenCalledWith(
      PUSH_QUEUE_NAME,
      PUSH_JOB_SEND_TIMETABLE_CHANGE,
      payload,
    );
    expect(pushPort.sendTimetableChangeNotification).not.toHaveBeenCalled();
  });

  it("skips queueing when no token is available", async () => {
    await service.sendTimetableChangeNotification({
      tokens: [],
      title: "Ignored",
      body: "Ignored",
      data: {
        type: "TIMETABLE_CHANGE",
        schoolSlug: "college-vogt",
        classId: "class-1",
      },
    });

    expect(queue.add).not.toHaveBeenCalled();
    expect(pushPort.sendTimetableChangeNotification).not.toHaveBeenCalled();
  });

  it("falls back to synchronous sending when queue is unavailable", async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const payload = {
      tokens: ["ExponentPushToken[a]"],
      title: "Seance annulee",
      body: "Le cours de mathematiques a ete annule.",
      data: {
        type: "TIMETABLE_CHANGE" as const,
        schoolSlug: "college-vogt",
        classId: "class-1",
      },
    };
    queue.add.mockRejectedValue(new Error("redis down"));

    await service.sendTimetableChangeNotification(payload);

    expect(pushPort.sendTimetableChangeNotification).toHaveBeenCalledWith(
      payload,
    );
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });

  it("queues room status change push notifications", async () => {
    const payload = {
      tokens: ["ExponentPushToken[a]", "ExponentPushToken[b]"],
      title: "Changement de statut de salle",
      body: "La salle B14 est maintenant en maintenance.",
      data: {
        type: "ROOM_STATUS_CHANGE" as const,
        schoolSlug: "college-vogt",
        classId: "class-1",
        roomId: "room-1",
      },
    };

    await service.sendRoomStatusChangeNotification(payload);

    expect(queue.add).toHaveBeenCalledWith(
      PUSH_QUEUE_NAME,
      PUSH_JOB_SEND_ROOM_STATUS_CHANGE,
      payload,
    );
    expect(pushPort.sendRoomStatusChangeNotification).not.toHaveBeenCalled();
  });

  it("skips queueing room status change push when no token is available", async () => {
    await service.sendRoomStatusChangeNotification({
      tokens: [],
      title: "Ignored",
      body: "Ignored",
      data: {
        type: "ROOM_STATUS_CHANGE",
        schoolSlug: "college-vogt",
        classId: "class-1",
        roomId: "room-1",
      },
    });

    expect(queue.add).not.toHaveBeenCalled();
    expect(pushPort.sendRoomStatusChangeNotification).not.toHaveBeenCalled();
  });

  it("falls back to synchronous sending for room status change push when queue is unavailable", async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const payload = {
      tokens: ["ExponentPushToken[a]"],
      title: "Changement de statut de salle",
      body: "La salle B14 est maintenant en maintenance.",
      data: {
        type: "ROOM_STATUS_CHANGE" as const,
        schoolSlug: "college-vogt",
        classId: "class-1",
        roomId: "room-1",
      },
    };
    queue.add.mockRejectedValue(new Error("redis down"));

    await service.sendRoomStatusChangeNotification(payload);

    expect(pushPort.sendRoomStatusChangeNotification).toHaveBeenCalledWith(
      payload,
    );
    expect(loggerSpy).toHaveBeenCalled();
    loggerSpy.mockRestore();
  });
});
