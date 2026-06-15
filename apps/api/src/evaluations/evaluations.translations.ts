export type EvaluationsLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "evaluations.errors.studentNotEnrolled":
    "L'eleve n'est pas inscrit dans cette classe.",
  "evaluations.errors.positiveScoreRequired":
    "Une note positive est requise pour le statut 'saisie'.",
  "evaluations.errors.scoreExceedsMaxScore":
    "La note ne peut pas depasser la note maximale de l'evaluation.",
  "evaluations.errors.invalidTerm": "Trimestre invalide.",
  "evaluations.errors.subjectAppreciationNotAccessible":
    "Appreciation de matiere non accessible.",
  "evaluations.errors.studentNotFound": "Eleve introuvable.",
  "evaluations.errors.studentNotesNotAccessible":
    "Notes de l'eleve non accessibles.",
  "evaluations.errors.evaluationNotFound": "Evaluation introuvable.",
  "evaluations.errors.classNotFound": "Classe introuvable.",
  "evaluations.errors.classNotAccessible": "Classe non accessible.",
  "evaluations.errors.subjectNotFound": "Matiere introuvable.",
  "evaluations.errors.subjectNotAccessible":
    "Matiere non accessible pour cette classe.",
  "evaluations.errors.evaluationTypeNotFound": "Type d'evaluation introuvable.",
  "evaluations.errors.subjectBranchMismatch":
    "La sous-matiere n'appartient pas a cette matiere.",
};

const en: TranslationDict = {
  "evaluations.errors.studentNotEnrolled":
    "Student is not enrolled in this class.",
  "evaluations.errors.positiveScoreRequired":
    "A positive score is required for entered status.",
  "evaluations.errors.scoreExceedsMaxScore":
    "Score cannot exceed evaluation max score.",
  "evaluations.errors.invalidTerm": "Invalid term.",
  "evaluations.errors.subjectAppreciationNotAccessible":
    "Subject appreciation not accessible.",
  "evaluations.errors.studentNotFound": "Student not found.",
  "evaluations.errors.studentNotesNotAccessible":
    "Student notes not accessible.",
  "evaluations.errors.evaluationNotFound": "Evaluation not found.",
  "evaluations.errors.classNotFound": "Class not found.",
  "evaluations.errors.classNotAccessible": "Class not accessible.",
  "evaluations.errors.subjectNotFound": "Subject not found.",
  "evaluations.errors.subjectNotAccessible":
    "Subject not accessible for this class.",
  "evaluations.errors.evaluationTypeNotFound": "Evaluation type not found.",
  "evaluations.errors.subjectBranchMismatch":
    "Subject branch does not belong to subject.",
};

const translations: Record<EvaluationsLocale, TranslationDict> = {
  fr,
  en,
};

export function translateEvaluationsError(
  locale: EvaluationsLocale,
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

export function evaluationsLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): EvaluationsLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
