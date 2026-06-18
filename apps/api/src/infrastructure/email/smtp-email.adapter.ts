import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type {
  EmailVerificationMailPayload,
  InternalMessageNotificationPayload,
  PasswordResetMailPayload,
  StudentLifeEventNotificationPayload,
  TestExecutionFailedNotificationPayload,
  TimetableChangeMailPayload,
  TemporaryPasswordMailPayload,
} from "../../mail/mail.types.js";
import {
  lifeEventTypeMailLabel,
  translateStudentLifeEventMail,
} from "../../mail/student-life-event-mail.translations.js";
import type { EmailPort } from "./email.port.js";

@Injectable()
export class SmtpEmailAdapter implements EmailPort {
  constructor(private readonly configService: ConfigService) {}

  private getMailerConfig() {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = Number(this.configService.get<string>("SMTP_PORT") ?? 465);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    const secure =
      String(this.configService.get<string>("SMTP_SECURE") ?? "true") ===
      "true";
    const from = this.configService.get<string>("MAIL_FROM") ?? user;

    if (!host || !user || !pass || !from) {
      throw new InternalServerErrorException("SMTP configuration missing");
    }

    return { host, port, user, pass, secure, from };
  }

  async sendTemporaryPasswordEmail(payload: TemporaryPasswordMailPayload) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();

    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const loginUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/login`
      : `${webUrl}/`;
    const firstPasswordParams = new URLSearchParams({ email: payload.to });
    if (payload.schoolSlug) {
      firstPasswordParams.set("schoolSlug", payload.schoolSlug);
    }
    const firstPasswordUrl = `${webUrl}/onboarding?${firstPasswordParams.toString()}`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: "Scolive - Votre compte a ete cree",
      text: [
        `Bonjour ${payload.firstName},`,
        "",
        "Votre compte Scolive a ete cree.",
        `Mot de passe provisoire: ${payload.temporaryPassword}`,
        "",
        `1) Connectez-vous ici: ${loginUrl}`,
        `2) Changez obligatoirement votre mot de passe ici: ${firstPasswordUrl}`,
        "",
        "Apres changement de mot de passe, reconnectez-vous normalement.",
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bienvenue ${payload.firstName},
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Votre compte a ete cree. Pour des raisons de securite, vous devez changer votre mot de passe provisoire avant votre premiere utilisation.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#F8F9FA;border:1px solid #E3E6E8;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px;font-size:13px;color:#4A4A4A;">Mot de passe provisoire</p>
                      <p style="margin:0;font-size:18px;font-family:Consolas,Monaco,monospace;color:#084A8A;font-weight:700;">
                        ${payload.temporaryPassword}
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Etapes:
                </p>
                <ol style="margin:0 0 20px;padding-left:20px;color:#4A4A4A;font-size:15px;line-height:1.7;">
                  <li>Connectez-vous au portail.</li>
                  <li>Changez votre mot de passe sur la page de premiere connexion.</li>
                </ol>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 10px;">
                  <tr>
                    <td>
                      <a href="${loginUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                        Ouvrir la connexion
                      </a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">
                  <tr>
                    <td>
                      <a href="${firstPasswordUrl}" style="display:inline-block;background:#FFFFFF;color:#0A62BF;text-decoration:none;padding:10px 16px;border:1px solid #0A62BF;border-radius:8px;font-size:14px;font-weight:600;">
                        Changer mon mot de passe
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:12px;line-height:1.6;color:#4A4A4A;">
                  Si vous n'etes pas a l'origine de cette creation de compte, contactez votre administrateur.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });
  }

  async sendStudentLifeEventNotification(
    payload: StudentLifeEventNotificationPayload,
  ) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const schoolUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/dashboard`
      : `${webUrl}/`;
    const locale = payload.locale;
    const tr = (key: string, params?: Record<string, string>) =>
      translateStudentLifeEventMail(locale, key, params);
    const actionLabel = tr(
      payload.eventAction === "UPDATED"
        ? "discipline.mail.actionUpdated"
        : "discipline.mail.actionCreated",
    );
    const eventTypeLabel = lifeEventTypeMailLabel(locale, payload.eventType);
    const subject = tr(
      payload.eventAction === "UPDATED"
        ? "discipline.mail.subjectUpdated"
        : "discipline.mail.subjectCreated",
    );
    const studentFullName = `${payload.studentFirstName} ${payload.studentLastName}`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject,
      text: [
        tr("discipline.mail.greeting", { firstName: payload.parentFirstName }),
        "",
        tr("discipline.mail.intro", { action: actionLabel, studentFullName }),
        `${tr("discipline.mail.type")}: ${eventTypeLabel}`,
        `${tr("discipline.mail.reason")}: ${payload.eventReason}`,
        `${tr("discipline.mail.date")}: ${payload.eventDate}`,
        payload.className
          ? `${tr("discipline.mail.class")}: ${payload.className}`
          : "",
        payload.authorFullName
          ? `${tr("discipline.mail.author")}: ${payload.authorFullName}`
          : "",
        "",
        `${tr("discipline.mail.consultPortal")}: ${schoolUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  ${tr("discipline.mail.greeting", { firstName: payload.parentFirstName })}
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  ${tr("discipline.mail.intro", { action: `<strong>${actionLabel}</strong>`, studentFullName: `<strong>${studentFullName}</strong>` })}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#F8F9FA;border:1px solid #E3E6E8;border-radius:8px;">
                  <tr><td style="padding:12px 16px;font-size:14px;color:#4A4A4A;">
                    <div><strong>${tr("discipline.mail.type")} :</strong> ${eventTypeLabel}</div>
                    <div><strong>${tr("discipline.mail.reason")} :</strong> ${payload.eventReason}</div>
                    <div><strong>${tr("discipline.mail.date")} :</strong> ${payload.eventDate}</div>
                    ${payload.className ? `<div><strong>${tr("discipline.mail.class")} :</strong> ${payload.className}</div>` : ""}
                    ${payload.authorFullName ? `<div><strong>${tr("discipline.mail.author")} :</strong> ${payload.authorFullName}</div>` : ""}
                  </td></tr>
                </table>
                <a href="${schoolUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  ${tr("discipline.mail.openPortal")}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  async sendEmailVerification(payload: EmailVerificationMailPayload) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: "Scolive - Verification de votre adresse email",
      text: [
        `Bonjour ${payload.firstName},`,
        "",
        "Vous avez demande a ajouter cette adresse email a votre compte Scolive.",
        "Cliquez sur le lien ci-dessous pour confirmer votre adresse (valable 24 heures) :",
        payload.verificationUrl,
        "",
        "Si vous n'etes pas a l'origine de cette demande, ignorez ce message.",
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bonjour ${payload.firstName},
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Vous avez demande a ajouter cette adresse email a votre compte Scolive.<br/>
                  Ce lien est valable <strong>24 heures</strong>.
                </p>
                <a href="${payload.verificationUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  Confirmer mon adresse email
                </a>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#4A4A4A;">
                  Si vous n'etes pas a l'origine de cette demande, ignorez simplement ce message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  async sendTimetableChangeNotification(payload: TimetableChangeMailPayload) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const schoolUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/dashboard`
      : `${webUrl}/`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: `Scolive - ${payload.title} (${payload.className})`,
      text: [
        `Bonjour ${payload.recipientFirstName},`,
        "",
        payload.summary,
        "",
        ...payload.details,
        "",
        `Consulter le portail: ${schoolUrl}`,
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bonjour ${payload.recipientFirstName},
                </h1>
                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  <strong>${payload.title}</strong> pour la classe <strong>${payload.className}</strong>.
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  ${payload.summary}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#F8F9FA;border:1px solid #E3E6E8;border-radius:8px;">
                  <tr>
                    <td style="padding:12px 16px;font-size:14px;color:#4A4A4A;">
                      <ul style="margin:0;padding-left:18px;">
                        ${payload.details.map((line) => `<li>${line}</li>`).join("")}
                      </ul>
                    </td>
                  </tr>
                </table>
                <a href="${schoolUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  Ouvrir le portail
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  async sendPasswordResetEmail(payload: PasswordResetMailPayload) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: "Scolive - Reinitialisation de votre mot de passe",
      text: [
        `Bonjour ${payload.firstName},`,
        "",
        "Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte Scolive.",
        `Ce lien est valable ${payload.expiresInMinutes} minutes.`,
        `Lien de reinitialisation: ${payload.resetUrl}`,
        "",
        "Si vous n'etes pas a l'origine de cette demande, ignorez ce message.",
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bonjour ${payload.firstName},
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Une demande de reinitialisation de mot de passe a ete detectee pour votre compte.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4A4A;">
                  Ce lien est valable <strong>${payload.expiresInMinutes} minutes</strong>.
                </p>
                <a href="${payload.resetUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  Reinitialiser mon mot de passe
                </a>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#4A4A4A;">
                  Si vous n'etes pas a l'origine de cette demande, ignorez simplement ce message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  async sendInternalMessageNotification(
    payload: InternalMessageNotificationPayload,
  ) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const mailboxUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/messagerie`
      : `${webUrl}/`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: `Scolive - Nouveau message: ${payload.subject}`,
      text: [
        `Bonjour ${payload.recipientFirstName},`,
        "",
        `Vous avez recu un nouveau message interne sur ${payload.schoolName}.`,
        `Expediteur: ${payload.senderFullName}`,
        `Sujet: ${payload.subject}`,
        "",
        payload.preview,
        "",
        `Consulter la messagerie: ${mailboxUrl}`,
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0A62BF;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bonjour ${payload.recipientFirstName},
                </h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Vous avez recu un nouveau message interne sur <strong>${payload.schoolName}</strong>.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4A4A;">
                  <strong>Expediteur :</strong> ${payload.senderFullName}<br/>
                  <strong>Sujet :</strong> ${payload.subject}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#F8F9FA;border:1px solid #E3E6E8;border-radius:8px;">
                  <tr><td style="padding:12px 16px;font-size:14px;color:#4A4A4A;">
                    ${payload.preview}
                  </td></tr>
                </table>
                <a href="${mailboxUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  Ouvrir la messagerie
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }

  async sendTestExecutionFailedNotification(
    payload: TestExecutionFailedNotificationPayload,
  ) {
    const { host, port, user, pass, secure, from } = this.getMailerConfig();
    const webUrl =
      this.configService.get<string>("WEB_URL") ?? "http://localhost:3000";
    const schoolUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/dashboard`
      : `${webUrl}/`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: `Scolive - Test echoue: ${payload.testCaseTitle}`,
      text: [
        `Bonjour ${payload.recipientFirstName},`,
        "",
        `Un test a echoue sur ${payload.schoolName}.`,
        `Campagne: ${payload.campaignTitle}`,
        `Test: ${payload.testCaseTitle}`,
        `Testeur: ${payload.testerFullName}`,
        "",
        payload.resultText,
        ...(payload.comment ? ["", payload.comment] : []),
        "",
        `Consulter le portail: ${schoolUrl}`,
      ].join("\n"),
      html: `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Roboto,Arial,sans-serif;color:#212529;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E6E8;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#B42318;padding:16px 24px;color:#FFFFFF;font-family:Poppins,Arial,sans-serif;font-size:20px;font-weight:700;">
                Scolive - Test echoue
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:1.3;color:#212529;">
                  Bonjour ${payload.recipientFirstName},
                </h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4A4A4A;">
                  Un test a echoue sur <strong>${payload.schoolName}</strong>.
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4A4A;">
                  <strong>Campagne :</strong> ${payload.campaignTitle}<br/>
                  <strong>Test :</strong> ${payload.testCaseTitle}<br/>
                  <strong>Testeur :</strong> ${payload.testerFullName}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#F8F9FA;border:1px solid #E3E6E8;border-radius:8px;">
                  <tr><td style="padding:12px 16px;font-size:14px;color:#4A4A4A;">
                    ${payload.resultText}${payload.comment ? `<br/><br/>${payload.comment}` : ""}
                  </td></tr>
                </table>
                <a href="${schoolUrl}" style="display:inline-block;background:#0A62BF;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;">
                  Ouvrir le portail
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  }
}
