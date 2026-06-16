import type { StudentLifeEventType } from "@prisma/client";

export type StudentLifeEventMailLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "discipline.types.absence": "Absence",
  "discipline.types.retard": "Retard",
  "discipline.types.sanction": "Sanction",
  "discipline.types.punition": "Punition",

  "discipline.mail.subjectCreated":
    "Scolive - Evenement vie scolaire enregistre",
  "discipline.mail.subjectUpdated":
    "Scolive - Evenement vie scolaire mis a jour",
  "discipline.mail.actionCreated": "enregistre",
  "discipline.mail.actionUpdated": "mis a jour",
  "discipline.mail.greeting": "Bonjour {firstName},",
  "discipline.mail.intro":
    "Un evenement de vie scolaire a ete {action} pour {studentFullName}.",
  "discipline.mail.type": "Type",
  "discipline.mail.reason": "Motif",
  "discipline.mail.date": "Date",
  "discipline.mail.class": "Classe",
  "discipline.mail.author": "Saisi par",
  "discipline.mail.openPortal": "Ouvrir le portail",
  "discipline.mail.consultPortal": "Consulter le portail",
};

const en: TranslationDict = {
  "discipline.types.absence": "Absence",
  "discipline.types.retard": "Late arrival",
  "discipline.types.sanction": "Sanction",
  "discipline.types.punition": "Punishment",

  "discipline.mail.subjectCreated": "Scolive - School life event recorded",
  "discipline.mail.subjectUpdated": "Scolive - School life event updated",
  "discipline.mail.actionCreated": "recorded",
  "discipline.mail.actionUpdated": "updated",
  "discipline.mail.greeting": "Hello {firstName},",
  "discipline.mail.intro":
    "A school life event has been {action} for {studentFullName}.",
  "discipline.mail.type": "Type",
  "discipline.mail.reason": "Reason",
  "discipline.mail.date": "Date",
  "discipline.mail.class": "Class",
  "discipline.mail.author": "Recorded by",
  "discipline.mail.openPortal": "Open the portal",
  "discipline.mail.consultPortal": "View the portal",
};

const translations: Record<StudentLifeEventMailLocale, TranslationDict> = {
  fr,
  en,
};

export function translateStudentLifeEventMail(
  locale: StudentLifeEventMailLocale,
  key: string,
  params?: Record<string, string>,
): string {
  const dict = translations[locale] ?? translations.fr;
  let value = dict[key] ?? translations.fr[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, paramValue);
    }
  }

  return value;
}

export function lifeEventTypeMailLabel(
  locale: StudentLifeEventMailLocale,
  type: StudentLifeEventType,
): string {
  switch (type) {
    case "ABSENCE":
      return translateStudentLifeEventMail(locale, "discipline.types.absence");
    case "RETARD":
      return translateStudentLifeEventMail(locale, "discipline.types.retard");
    case "SANCTION":
      return translateStudentLifeEventMail(locale, "discipline.types.sanction");
    case "PUNITION":
    default:
      return translateStudentLifeEventMail(locale, "discipline.types.punition");
  }
}
