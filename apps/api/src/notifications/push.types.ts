export const PUSH_QUEUE_NAME = "push";
export const PUSH_JOB_SEND_TIMETABLE_CHANGE = "send-timetable-change-push";

export type TimetableChangePushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data: {
    type: "TIMETABLE_CHANGE";
    schoolSlug: string;
    classId: string;
  };
};

export const PUSH_JOB_SEND_HOMEWORK_CREATED = "send-homework-created-push";

export type HomeworkCreatedPushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data: {
    type: "HOMEWORK_CREATED";
    schoolSlug: string;
    classId: string;
    homeworkId: string;
  };
};

export const PUSH_JOB_SEND_ROOM_STATUS_CHANGE = "send-room-status-change-push";
export const PUSH_JOB_SEND_GRADE_PUBLISHED = "send-grade-published-push";

export type RoomStatusChangePushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data: {
    type: "ROOM_STATUS_CHANGE";
    schoolSlug: string;
    classId: string;
    roomId: string;
  };
};

export type GradePublishedPushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data: {
    type: "GRADE_PUBLISHED";
    schoolSlug: string;
    classId: string;
    evaluationId: string;
  };
};

export const PUSH_JOB_SEND_STUDENT_LIFE_EVENT = "send-student-life-event-push";

export type StudentLifeEventPushPayload = {
  tokens: string[];
  title: string;
  body: string;
  data: {
    type: "STUDENT_LIFE_EVENT";
    schoolSlug: string;
    studentId: string;
  };
};
