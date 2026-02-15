export const MAIL_QUEUE_NAME = "mail";
export const MAIL_JOB_SEND_TEMPORARY_PASSWORD = "send-temporary-password-email";
export const MAIL_JOB_SEND_STUDENT_LIFE_EVENT_NOTIFICATION =
  "send-student-life-event-notification";

export type TemporaryPasswordMailPayload = {
  to: string;
  firstName: string;
  temporaryPassword: string;
  schoolSlug: string | null;
};

export type StudentLifeEventNotificationPayload = {
  to: string;
  parentFirstName: string;
  schoolName: string;
  schoolSlug: string | null;
  studentFirstName: string;
  studentLastName: string;
  eventTypeLabel: string;
  eventReason: string;
  eventDate: string;
  eventAction: "CREATED" | "UPDATED";
  className?: string | null;
  authorFullName?: string | null;
};
