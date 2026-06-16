export type StudentGradesLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "studentGrades.errors.notAccessible":
    "Les notes des eleves sont reservees au personnel de l'etablissement, aux enseignants et a l'eleve concerne.",
  "studentGrades.errors.gradeNotFound": "Note de l'eleve introuvable.",
  "studentGrades.errors.userNotBoundToSchool":
    "L'utilisateur n'est pas rattache a cet etablissement.",
  "studentGrades.errors.teacherNotAssigned":
    "L'enseignant n'est pas affecte a cette classe/matiere.",
  "studentGrades.errors.studentNotFound": "Eleve introuvable.",
  "studentGrades.errors.studentNotEnrolled":
    "L'eleve n'est pas inscrit dans cette classe pour cette annee scolaire.",
  "studentGrades.errors.classNotFound": "Classe introuvable.",
  "studentGrades.errors.subjectNotAllowedForClass":
    "Cette matiere n'est pas autorisee pour cette classe.",
  "studentGrades.errors.subjectNotInCurriculum":
    "Cette matiere ne fait pas partie du programme de la classe.",
  "studentGrades.errors.subjectNotFound": "Matiere introuvable.",
};

const en: TranslationDict = {
  "studentGrades.errors.notAccessible":
    "Student grades are reserved for school staff, teachers and the student owner.",
  "studentGrades.errors.gradeNotFound": "Student grade not found.",
  "studentGrades.errors.userNotBoundToSchool":
    "User is not bound to this school.",
  "studentGrades.errors.teacherNotAssigned":
    "Teacher is not assigned to this class/subject.",
  "studentGrades.errors.studentNotFound": "Student not found.",
  "studentGrades.errors.studentNotEnrolled":
    "Student is not enrolled in this class for the school year.",
  "studentGrades.errors.classNotFound": "Class not found.",
  "studentGrades.errors.subjectNotAllowedForClass":
    "Subject is not allowed for this class.",
  "studentGrades.errors.subjectNotInCurriculum":
    "Subject is not in the class curriculum.",
  "studentGrades.errors.subjectNotFound": "Subject not found.",
};

const translations: Record<StudentGradesLocale, TranslationDict> = {
  fr,
  en,
};

export function translateStudentGradesError(
  locale: StudentGradesLocale,
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

export function studentGradesLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): StudentGradesLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
