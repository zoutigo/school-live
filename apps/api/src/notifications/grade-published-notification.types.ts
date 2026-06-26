export const GRADE_NOTIFICATION_QUEUE_NAME = "grade-notification";
export const GRADE_NOTIFICATION_JOB_DISPATCH = "dispatch-grade-notification";

export type GradePublishedEventPayload = {
  schoolId: string;
  evaluationId: string;
};
