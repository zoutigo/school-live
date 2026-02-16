import type {
  InternalMessageNotificationPayload,
  StudentLifeEventNotificationPayload,
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
  sendInternalMessageNotification(
    payload: InternalMessageNotificationPayload,
  ): Promise<void>;
};
