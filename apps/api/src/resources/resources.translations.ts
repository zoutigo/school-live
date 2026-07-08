export type ResourceLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "resources.errors.notFound": "Ressource introuvable.",
  "resources.errors.schoolRequiredForAssessment":
    "L'ecole est requise pour une ressource de type Evaluation.",
  "resources.errors.schoolForbiddenForExam":
    "Un examen national ne peut pas etre rattache a une ecole.",
  "resources.errors.sequenceRequiredForAssessment":
    "La sequence est requise pour une ressource de type Evaluation.",
  "resources.errors.sequenceForbiddenForExam":
    "La sequence ne s'applique pas a un examen national.",
  "resources.errors.academicLevelNotNational":
    "Le niveau selectionne doit provenir du catalogue national.",
  "resources.errors.subjectNotNational":
    "La matiere selectionnee doit provenir du catalogue national.",
  "resources.errors.onlyAuthorCanEdit":
    "Seul l'auteur peut modifier cette ressource.",
  "resources.errors.correctionContentRequired":
    "Le contenu du corrige est requis.",
  "resources.errors.missingImageFile": "Fichier image manquant.",
  "resources.errors.alreadyReviewed":
    "Cette partie de la ressource a deja ete traitee.",
};

const en: TranslationDict = {
  "resources.errors.notFound": "Resource not found.",
  "resources.errors.schoolRequiredForAssessment":
    "School is required for an Assessment resource.",
  "resources.errors.schoolForbiddenForExam":
    "A national exam cannot be linked to a school.",
  "resources.errors.sequenceRequiredForAssessment":
    "Sequence is required for an Assessment resource.",
  "resources.errors.sequenceForbiddenForExam":
    "Sequence does not apply to a national exam.",
  "resources.errors.academicLevelNotNational":
    "The selected level must come from the national catalog.",
  "resources.errors.subjectNotNational":
    "The selected subject must come from the national catalog.",
  "resources.errors.onlyAuthorCanEdit":
    "Only the author can edit this resource.",
  "resources.errors.correctionContentRequired":
    "Correction content is required.",
  "resources.errors.missingImageFile": "Missing image file.",
  "resources.errors.alreadyReviewed":
    "This resource part was already reviewed.",
};

const translations: Record<ResourceLocale, TranslationDict> = {
  fr,
  en,
};

export function translateResourceError(
  locale: ResourceLocale,
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

export function resourceLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): ResourceLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
