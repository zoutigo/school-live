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
