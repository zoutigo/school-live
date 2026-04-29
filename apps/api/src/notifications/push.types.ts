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
