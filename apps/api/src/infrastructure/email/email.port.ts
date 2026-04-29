import type {
  EmailVerificationMailPayload,
  InternalMessageNotificationPayload,
  PasswordResetMailPayload,
  StudentLifeEventNotificationPayload,
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
};
