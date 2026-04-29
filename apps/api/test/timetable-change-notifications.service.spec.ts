import { TimetableChangeNotificationsService } from "../src/notifications/timetable-change-notifications.service";
import {
  TIMETABLE_CHANGE_JOB_DISPATCH,
  TIMETABLE_CHANGE_QUEUE_NAME,
} from "../src/notifications/timetable-change.types";

describe("TimetableChangeNotificationsService", () => {
  const queue = {
    add: jest.fn(),
  };

  const service = new TimetableChangeNotificationsService(queue as never);

  beforeEach(() => {
    queue.add.mockReset();
  });

  it("enqueues timetable change jobs", async () => {
    const event = {
      schoolId: "school-1",
      classId: "class-1",
      className: "6e C",
      actorUserId: "teacher-1",
      actorFullName: "Albert M",
      kind: "ONE_OFF_CREATED" as const,
      after: {
        date: "2026-04-29",
        startMinute: 480,
        endMinute: 540,
        subjectId: "subject-1",
        subjectName: "Mathematiques",
        teacherUserId: "teacher-1",
        teacherName: "Albert M",
        room: "B12",
        status: "PLANNED" as const,
        sourceKind: "ONE_OFF" as const,
      },
    };

    await service.enqueue(event);

    expect(queue.add).toHaveBeenCalledWith(
      TIMETABLE_CHANGE_QUEUE_NAME,
      TIMETABLE_CHANGE_JOB_DISPATCH,
      event,
    );
  });
});
