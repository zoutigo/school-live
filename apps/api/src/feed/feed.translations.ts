export type FeedLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "feed.errors.classIdRequiredForClassView":
    "classId est requis lorsque viewScope est CLASS.",
  "feed.errors.postNotFound": "Publication introuvable.",
  "feed.errors.notAPoll": "Cette publication n'est pas un sondage.",
  "feed.errors.voteAlreadyRegistered": "Vote deja enregistre.",
  "feed.errors.invalidPoll": "Sondage invalide.",
  "feed.errors.pollOptionNotFound": "Option de vote introuvable.",
  "feed.errors.accessDenied": "Acces refuse.",
  "feed.errors.manageNotAllowed":
    "Seul l'auteur, un staff/enseignant moderateur, ou le SCHOOL_ADMIN sur un post staff peut modifier ou supprimer cette publication.",
  "feed.errors.studentCanOnlyPostForOwnClass":
    "Un eleve ne peut publier que pour sa classe.",
  "feed.errors.invalidClass": "Classe invalide.",
  "feed.errors.audienceNotAllowed": "Audience non autorisee.",
  "feed.errors.audienceClassIdRequired":
    "audienceClassId est requis pour une audience CLASS.",
  "feed.errors.audienceLevelIdRequired":
    "audienceLevelId est requis pour une audience LEVEL.",
  "feed.errors.invalidLevel": "Niveau invalide.",
  "feed.errors.pollQuestionRequired":
    "La question du sondage est requise pour une publication de type sondage.",
  "feed.errors.pollNeedsTwoOptions":
    "Un sondage doit comporter au moins 2 options.",
  "feed.errors.mediaServiceUrlNotConfigured":
    "MEDIA_SERVICE_URL n'est pas configure.",
  "feed.errors.mediaCleanupFailed":
    "Echec de la suppression du media : {message}",
  "feed.errors.insufficientRole": "Role insuffisant.",
  "feed.errors.missingImageFile": "Fichier image manquant.",

  "feed.roles.member": "Membre",
  "feed.roles.administration": "Administration",
  "feed.roles.direction": "Direction",
  "feed.roles.supervision": "Surveillance",
  "feed.roles.accounting": "Comptabilite",
  "feed.roles.staff": "Staff",
  "feed.roles.schoolLife": "Vie scolaire",
  "feed.roles.parents": "Parents",
  "feed.roles.students": "Eleves",

  "feed.audience.staffOnly": "Staff uniquement",
  "feed.audience.parentsAndStudents": "Parents et eleves",
  "feed.audience.parentsOnly": "Parents uniquement",
  "feed.audience.wholeSchool": "Toute l'ecole",
  "feed.audience.classAllLabel":
    "Classe {className} (eleves, parents, enseignants)",
  "feed.audience.classParentsStudentsLabel": "Parents/eleves classe {className}",
  "feed.audience.levelLabel": "Niveau {levelLabel}",
};

const en: TranslationDict = {
  "feed.errors.classIdRequiredForClassView":
    "classId is required when viewScope is CLASS.",
  "feed.errors.postNotFound": "Post not found.",
  "feed.errors.notAPoll": "This post is not a poll.",
  "feed.errors.voteAlreadyRegistered": "Vote already registered.",
  "feed.errors.invalidPoll": "Invalid poll.",
  "feed.errors.pollOptionNotFound": "Poll option not found.",
  "feed.errors.accessDenied": "Access denied.",
  "feed.errors.manageNotAllowed":
    "Only the author, a staff/teacher moderator, or the SCHOOL_ADMIN on a staff post can edit or delete this post.",
  "feed.errors.studentCanOnlyPostForOwnClass":
    "A student can only post to their own class.",
  "feed.errors.invalidClass": "Invalid class.",
  "feed.errors.audienceNotAllowed": "Audience not allowed.",
  "feed.errors.audienceClassIdRequired":
    "audienceClassId is required for a CLASS audience.",
  "feed.errors.audienceLevelIdRequired":
    "audienceLevelId is required for a LEVEL audience.",
  "feed.errors.invalidLevel": "Invalid level.",
  "feed.errors.pollQuestionRequired":
    "pollQuestion is required for poll posts.",
  "feed.errors.pollNeedsTwoOptions": "A poll needs at least 2 options.",
  "feed.errors.mediaServiceUrlNotConfigured":
    "MEDIA_SERVICE_URL is not configured.",
  "feed.errors.mediaCleanupFailed": "Media deletion failed: {message}",
  "feed.errors.insufficientRole": "Insufficient role.",
  "feed.errors.missingImageFile": "Missing image file.",

  "feed.roles.member": "Member",
  "feed.roles.administration": "Administration",
  "feed.roles.direction": "Management",
  "feed.roles.supervision": "Supervision",
  "feed.roles.accounting": "Accounting",
  "feed.roles.staff": "Staff",
  "feed.roles.schoolLife": "School life",
  "feed.roles.parents": "Parents",
  "feed.roles.students": "Students",

  "feed.audience.staffOnly": "Staff only",
  "feed.audience.parentsAndStudents": "Parents and students",
  "feed.audience.parentsOnly": "Parents only",
  "feed.audience.wholeSchool": "Whole school",
  "feed.audience.classAllLabel": "Class {className} (students, parents, teachers)",
  "feed.audience.classParentsStudentsLabel": "Class {className} parents/students",
  "feed.audience.levelLabel": "Level {levelLabel}",
};

const translations: Record<FeedLocale, TranslationDict> = {
  fr,
  en,
};

export function translateFeed(
  locale: FeedLocale,
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

export function feedLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): FeedLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
