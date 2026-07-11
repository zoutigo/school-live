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
  "resources.errors.invalidPart":
    "La partie demandee doit etre 'statement' ou 'correction'.",
  "resources.errors.duplicateBlocked":
    "Une ressource quasi identique existe deja pour cette ecole, cette matiere, ce niveau, cette annee et cette sequence.",
  "resources.errors.duplicateWarning":
    "Une ressource similaire existe peut-etre deja. Confirmez pour creer quand meme.",
  "resources.errors.correctionRequiresApprovedStatement":
    "Le corrige ne peut etre propose que lorsque l'enonce a ete valide.",
  "resources.errors.submissionAlreadyReviewed":
    "Cette soumission a deja ete traitee par un autre administrateur.",
  "resources.errors.notSubmissionAuthor":
    "Seul l'auteur de la soumission peut effectuer cette action.",
  "resources.errors.submissionNotDraft":
    "Seul un brouillon peut etre soumis a validation.",
  "resources.errors.submissionAwaitingReview":
    "Une soumission est deja en attente de validation pour cette partie.",
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
  "resources.errors.invalidPart":
    "The requested part must be 'statement' or 'correction'.",
  "resources.errors.duplicateBlocked":
    "A near-identical resource already exists for this school, subject, level, year and sequence.",
  "resources.errors.duplicateWarning":
    "A similar resource may already exist. Confirm to create it anyway.",
  "resources.errors.correctionRequiresApprovedStatement":
    "The correction can only be proposed once the statement has been approved.",
  "resources.errors.submissionAlreadyReviewed":
    "This submission was already reviewed by another administrator.",
  "resources.errors.notSubmissionAuthor":
    "Only the submission's author can perform this action.",
  "resources.errors.submissionNotDraft":
    "Only a draft can be submitted for review.",
  "resources.errors.submissionAwaitingReview":
    "A submission is already awaiting review for this part.",
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
