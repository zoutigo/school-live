export type AttendanceLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "attendance.errors.classNotFound": "Classe introuvable.",
  "attendance.errors.classNotAccessible": "Classe non accessible.",
  "attendance.errors.studentsNotEnrolled":
    "Un ou plusieurs eleves ne sont pas inscrits dans cette classe.",
};

const en: TranslationDict = {
  "attendance.errors.classNotFound": "Class not found.",
  "attendance.errors.classNotAccessible": "Class not accessible.",
  "attendance.errors.studentsNotEnrolled":
    "One or more students are not enrolled in this class.",
};

const translations: Record<AttendanceLocale, TranslationDict> = {
  fr,
  en,
};

export function translateAttendanceError(
  locale: AttendanceLocale,
  key: string,
): string {
  const dict = translations[locale] ?? translations.fr;
  return dict[key] ?? translations.fr[key] ?? key;
}

export function attendanceLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): AttendanceLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
