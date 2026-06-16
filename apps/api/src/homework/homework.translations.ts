export type HomeworkLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "homework.errors.commentBodyRequired":
    "Le commentaire ne peut pas etre vide.",
  "homework.errors.completionNotAccessible": "Suivi du devoir non accessible.",
  "homework.errors.notFound": "Devoir introuvable.",
  "homework.errors.classNotAccessible": "Classe non accessible.",
  "homework.errors.studentIdRequiredForParent":
    "L'identifiant de l'eleve est requis pour un acces parent.",
  "homework.errors.notAccessible": "Devoir non accessible.",
  "homework.errors.managementNotAccessible":
    "Gestion des devoirs non accessible.",
  "homework.errors.classNotFound": "Classe introuvable.",
  "homework.errors.subjectNotFound": "Matiere introuvable.",
  "homework.errors.subjectNotAccessible":
    "Matiere non accessible pour cette classe.",
  "homework.errors.onlyAuthorCanManage": "Seul l'auteur peut gerer ce devoir.",
  "homework.errors.mediaCleanupFailed":
    "Echec de la suppression du media : {message}",
  "homework.errors.missingImageFile": "Fichier image manquant.",
};

const en: TranslationDict = {
  "homework.errors.commentBodyRequired": "Comment body is required.",
  "homework.errors.completionNotAccessible":
    "Homework completion not accessible.",
  "homework.errors.notFound": "Homework not found.",
  "homework.errors.classNotAccessible": "Class not accessible.",
  "homework.errors.studentIdRequiredForParent":
    "studentId is required for parent access.",
  "homework.errors.notAccessible": "Homework not accessible.",
  "homework.errors.managementNotAccessible":
    "Homework management not accessible.",
  "homework.errors.classNotFound": "Class not found.",
  "homework.errors.subjectNotFound": "Subject not found.",
  "homework.errors.subjectNotAccessible":
    "Subject not accessible for this class.",
  "homework.errors.onlyAuthorCanManage":
    "Only the author can manage this homework.",
  "homework.errors.mediaCleanupFailed": "Media deletion failed: {message}",
  "homework.errors.missingImageFile": "Missing image file.",
};

const translations: Record<HomeworkLocale, TranslationDict> = {
  fr,
  en,
};

export function translateHomeworkError(
  locale: HomeworkLocale,
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

export function homeworkLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): HomeworkLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
