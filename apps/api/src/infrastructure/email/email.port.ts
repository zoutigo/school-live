import type {
  EmailVerificationMailPayload,
  GradePublishedMailPayload,
  HomeworkCreatedMailPayload,
  InternalMessageNotificationPayload,
  PasswordResetMailPayload,
  RoomStatusChangeMailPayload,
  StudentLifeEventNotificationPayload,
  TestExecutionFailedNotificationPayload,
  TimetableChangeMailPayload,
  TemporaryPasswordMailPayload,
} from "../../mail/mail.types.js";

export const EMAIL_PORT = Symbol("EMAIL_PORT");

export type EmailPort = {
  sendTemporaryPasswordEmail(
    payload: TemporaryPasswordMailPayload,
  ): Promise<void>;
  sendStudentLifeEventNotification(
    payload: StudentLifeEventNotificationPayload,
  ): Promise<void>;
  sendPasswordResetEmail(payload: PasswordResetMailPayload): Promise<void>;
  sendEmailVerification(payload: EmailVerificationMailPayload): Promise<void>;
  sendInternalMessageNotification(
    payload: InternalMessageNotificationPayload,
  ): Promise<void>;
  sendTimetableChangeNotification(
    payload: TimetableChangeMailPayload,
  ): Promise<void>;
  sendTestExecutionFailedNotification(
    payload: TestExecutionFailedNotificationPayload,
  ): Promise<void>;
  sendHomeworkCreatedNotification(
    payload: HomeworkCreatedMailPayload,
  ): Promise<void>;
  sendRoomStatusChangeNotification(
    payload: RoomStatusChangeMailPayload,
  ): Promise<void>;
  sendGradePublishedNotification(
    payload: GradePublishedMailPayload,
  ): Promise<void>;
};
