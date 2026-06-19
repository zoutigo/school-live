export const HOMEWORK_NOTIFICATION_QUEUE_NAME = "homework-notification";
export const HOMEWORK_NOTIFICATION_JOB_DISPATCH =
  "dispatch-homework-notification";

export type HomeworkNotificationEventPayload = {
  schoolId: string;
  classId: string;
  homeworkId: string;
};
