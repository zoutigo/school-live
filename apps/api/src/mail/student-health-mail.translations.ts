export type StudentHealthMailLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "health.mail.careEvent.subject": "Scolive - Soin enregistre a l'ecole",
  "health.mail.careEvent.greeting": "Bonjour {firstName},",
  "health.mail.careEvent.intro":
    "Un soin a ete enregistre pour {studentFullName} a l'ecole.",
  "health.mail.summary": "Motif",
  "health.mail.date": "Heure",
  "health.mail.author": "Enregistre par",
  "health.mail.description": "Details",
  "health.mail.openPortal": "Consulter la sante de l'eleve",

  "health.mail.report.subject": "Scolive - Nouvelle information sante",
  "health.mail.report.greeting": "Bonjour {firstName},",
  "health.mail.report.intro":
    "{reporterFullName} a transmis une information de sante concernant {studentFullName}.",
  "health.mail.report.type": "Type",
  "health.mail.report.sportRestriction":
    "Restriction sportive associee a cette information.",

  "health.types.MALADIE": "Maladie",
  "health.types.TRAITEMENT": "Traitement",
  "health.types.ACCIDENT": "Accident",
  "health.types.CONSULTATION": "Consultation medicale",
  "health.types.HOSPITALISATION": "Hospitalisation",
  "health.types.VACCINATION": "Vaccination",
  "health.types.RESTRICTION_SPORT": "Restriction sportive",
  "health.types.AUTRE": "Autre",
};

const en: TranslationDict = {
  "health.mail.careEvent.subject": "Scolive - Care recorded at school",
  "health.mail.careEvent.greeting": "Hello {firstName},",
  "health.mail.careEvent.intro":
    "A care event has been recorded for {studentFullName} at school.",
  "health.mail.summary": "Reason",
  "health.mail.date": "Time",
  "health.mail.author": "Recorded by",
  "health.mail.description": "Details",
  "health.mail.openPortal": "View the student's health record",

  "health.mail.report.subject": "Scolive - New health information",
  "health.mail.report.greeting": "Hello {firstName},",
  "health.mail.report.intro":
    "{reporterFullName} shared health information about {studentFullName}.",
  "health.mail.report.type": "Type",
  "health.mail.report.sportRestriction":
    "A sport restriction is attached to this information.",

  "health.types.MALADIE": "Illness",
  "health.types.TRAITEMENT": "Treatment",
  "health.types.ACCIDENT": "Accident",
  "health.types.CONSULTATION": "Medical consultation",
  "health.types.HOSPITALISATION": "Hospitalization",
  "health.types.VACCINATION": "Vaccination",
  "health.types.RESTRICTION_SPORT": "Sport restriction",
  "health.types.AUTRE": "Other",
};

const translations: Record<StudentHealthMailLocale, TranslationDict> = {
  fr,
  en,
};

export function translateStudentHealthMail(
  locale: StudentHealthMailLocale,
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

export function healthReportTypeMailLabel(
  locale: StudentHealthMailLocale,
  type: string,
): string {
  return translateStudentHealthMail(locale, `health.types.${type}`);
}
