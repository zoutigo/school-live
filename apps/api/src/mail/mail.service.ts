import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendTemporaryPasswordEmail(payload: {
    to: string;
    firstName: string;
    temporaryPassword: string;
    schoolSlug: string | null;
  }) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 465);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = String(this.configService.get<string>('SMTP_SECURE') ?? 'true') === 'true';
    const from = this.configService.get<string>('MAIL_FROM') ?? user;

    if (!host || !user || !pass || !from) {
      throw new InternalServerErrorException('SMTP configuration missing');
    }

    const webUrl = this.configService.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const loginUrl = payload.schoolSlug
      ? `${webUrl}/schools/${payload.schoolSlug}/login`
      : `${webUrl}/`;
    const firstPasswordParams = new URLSearchParams({ email: payload.to });
    if (payload.schoolSlug) {
      firstPasswordParams.set('schoolSlug', payload.schoolSlug);
    }
    const firstPasswordUrl = `${webUrl}/first-password?${firstPasswordParams.toString()}`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: payload.to,
      subject: 'School-Live - Votre compte a ete cree',
      text: [
        `Bonjour ${payload.firstName},`,
        '',
        'Votre compte School-Live a ete cree.',
        `Mot de passe provisoire: ${payload.temporaryPassword}`,
        '',
        `1) Connectez-vous ici: ${loginUrl}`,
        `2) Changez obligatoirement votre mot de passe ici: ${firstPasswordUrl}`,
        '',
        'Apres changement de mot de passe, reconnectez-vous normalement.'
      ].join('\n'),
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
                School-Live
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
      `
    });
  }
}
