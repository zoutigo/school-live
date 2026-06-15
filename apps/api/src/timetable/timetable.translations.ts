export type TimetableLocale = "fr" | "en";

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  "timetable.errors.insufficientRole": "Rôle insuffisant.",
  "timetable.errors.calendarEventNotFound":
    "Événement de calendrier introuvable.",
  "timetable.errors.childNotLinkedToParent":
    "Cet enfant n'est pas lié à ce parent.",
  "timetable.errors.classHasNoCurriculum":
    "La classe n'a pas de programme défini.",
  "timetable.errors.classNotFound": "Classe introuvable.",
  "timetable.errors.classSchoolYearMismatch":
    "L'année scolaire de la classe ne correspond pas.",
  "timetable.errors.classScopeRequiresClassId":
    "La portée CLASS nécessite un identifiant de classe.",
  "timetable.errors.conflictingOccurrenceForClass":
    "Occurrence en conflit pour la classe.",
  "timetable.errors.conflictingOccurrenceForRoom":
    "Occurrence en conflit pour la salle.",
  "timetable.errors.conflictingOccurrenceForTeacher":
    "Occurrence en conflit pour l'enseignant.",
  "timetable.errors.conflictingSlotForClass":
    "Créneau en conflit pour la classe.",
  "timetable.errors.conflictingSlotForRoom":
    "Créneau en conflit pour la salle.",
  "timetable.errors.conflictingSlotForTeacher":
    "Créneau en conflit pour l'enseignant.",
  "timetable.errors.invalidColorHex": "Couleur invalide.",
  "timetable.errors.invalidDate": "Date invalide.",
  "timetable.errors.invalidDateRange": "Plage de dates invalide.",
  "timetable.errors.invalidFromDate": "Date de début invalide.",
  "timetable.errors.invalidToDate": "Date de fin invalide.",
  "timetable.errors.noFieldsToUpdate": "Aucun champ à mettre à jour.",
  "timetable.errors.noLinkedStudent": "Aucun élève lié.",
  "timetable.errors.oneOffSlotNotFound": "Créneau ponctuel introuvable.",
  "timetable.errors.schoolYearNotFound": "Année scolaire introuvable.",
  "timetable.errors.slotExceptionNotFound": "Exception de créneau introuvable.",
  "timetable.errors.startBeforeEnd":
    "L'heure de début doit être antérieure à l'heure de fin.",
  "timetable.errors.studentEnrollmentNotFound":
    "Inscription de l'élève introuvable.",
  "timetable.errors.studentProfileNotFound": "Profil élève introuvable.",
  "timetable.errors.subjectNotAllowedForClass":
    "Cette matière n'est pas autorisée pour cette classe.",
  "timetable.errors.subjectNotInCurriculum":
    "Cette matière ne fait pas partie du programme de la classe.",
  "timetable.errors.subjectNotFound": "Matière introuvable.",
  "timetable.errors.timetableSlotNotFound":
    "Créneau d'emploi du temps introuvable.",
  "timetable.errors.academicLevelNotFound": "Niveau scolaire introuvable.",
  "timetable.errors.fromDateBeforeToDate":
    "La date de début doit être antérieure ou égale à la date de fin.",
  "timetable.errors.studentNoEnrollmentForSchoolYear":
    "L'élève n'a pas d'inscription pour l'année scolaire demandée.",
  "timetable.errors.colorTooCloseToOtherSubject":
    "Couleur trop proche de celle d'une autre matière pour cette classe et cette année scolaire.",
  "timetable.errors.startDateBeforeEndDate":
    "La date de début doit être antérieure ou égale à la date de fin.",
  "timetable.errors.activeFromBeforeActiveTo":
    "La date de début d'activation doit être antérieure ou égale à la date de fin d'activation.",
  "timetable.errors.userNotTeacherInSchool":
    "L'utilisateur sélectionné n'est pas enseignant dans cette école.",
  "timetable.errors.teacherNotAssignedToClassSubject":
    "L'enseignant n'est pas affecté à cette classe et cette matière pour cette année scolaire.",
  "timetable.errors.noActiveSchoolYear":
    "Aucune année scolaire active configurée pour cette école.",
  "timetable.errors.schoolScopeNoClassOrLevel":
    "La portée SCHOOL ne doit pas inclure d'identifiant de classe ni de niveau scolaire.",
  "timetable.errors.academicLevelScopeRequiresLevelId":
    "La portée ACADEMIC_LEVEL nécessite un identifiant de niveau scolaire.",
  "timetable.errors.academicLevelScopeNoClassId":
    "La portée ACADEMIC_LEVEL ne doit pas inclure d'identifiant de classe.",
  "timetable.errors.classScopeNoAcademicLevelId":
    "La portée CLASS ne doit pas inclure d'identifiant de niveau scolaire.",
  "timetable.errors.onlyReferentTeacherCanManage":
    "Seul l'enseignant référent de la classe peut gérer l'emploi du temps de cette classe.",
  "timetable.errors.teacherOnlyManagesAssignedOneOffSlots":
    "L'enseignant ne peut gérer que les créneaux ponctuels qui lui sont affectés.",
};

const en: TranslationDict = {
  "timetable.errors.insufficientRole": "Insufficient role.",
  "timetable.errors.calendarEventNotFound": "Calendar event not found.",
  "timetable.errors.childNotLinkedToParent":
    "Child is not linked to this parent.",
  "timetable.errors.classHasNoCurriculum": "Class has no curriculum.",
  "timetable.errors.classNotFound": "Class not found.",
  "timetable.errors.classSchoolYearMismatch": "Class school year mismatch.",
  "timetable.errors.classScopeRequiresClassId":
    "CLASS scope requires a classId.",
  "timetable.errors.conflictingOccurrenceForClass":
    "Conflicting occurrence for the class.",
  "timetable.errors.conflictingOccurrenceForRoom":
    "Conflicting occurrence for the room.",
  "timetable.errors.conflictingOccurrenceForTeacher":
    "Conflicting occurrence for the teacher.",
  "timetable.errors.conflictingSlotForClass": "Conflicting slot for the class.",
  "timetable.errors.conflictingSlotForRoom": "Conflicting slot for the room.",
  "timetable.errors.conflictingSlotForTeacher":
    "Conflicting slot for the teacher.",
  "timetable.errors.invalidColorHex": "Invalid color.",
  "timetable.errors.invalidDate": "Invalid date.",
  "timetable.errors.invalidDateRange": "Invalid date range.",
  "timetable.errors.invalidFromDate": "Invalid start date.",
  "timetable.errors.invalidToDate": "Invalid end date.",
  "timetable.errors.noFieldsToUpdate": "No fields to update.",
  "timetable.errors.noLinkedStudent": "No linked student.",
  "timetable.errors.oneOffSlotNotFound": "One-off slot not found.",
  "timetable.errors.schoolYearNotFound": "School year not found.",
  "timetable.errors.slotExceptionNotFound": "Slot exception not found.",
  "timetable.errors.startBeforeEnd":
    "Start time must be earlier than end time.",
  "timetable.errors.studentEnrollmentNotFound": "Student enrollment not found.",
  "timetable.errors.studentProfileNotFound": "Student profile not found.",
  "timetable.errors.subjectNotAllowedForClass":
    "Subject is not allowed for this class.",
  "timetable.errors.subjectNotInCurriculum":
    "Subject is not in class curriculum.",
  "timetable.errors.subjectNotFound": "Subject not found.",
  "timetable.errors.timetableSlotNotFound": "Timetable slot not found.",
  "timetable.errors.academicLevelNotFound": "Academic level not found.",
  "timetable.errors.fromDateBeforeToDate":
    "fromDate must be before or equal to toDate.",
  "timetable.errors.studentNoEnrollmentForSchoolYear":
    "Student has no enrollment for the requested school year.",
  "timetable.errors.colorTooCloseToOtherSubject":
    "Color too close to another subject's color for this class and school year.",
  "timetable.errors.startDateBeforeEndDate":
    "startDate must be before or equal to endDate.",
  "timetable.errors.activeFromBeforeActiveTo":
    "activeFromDate must be before or equal to activeToDate.",
  "timetable.errors.userNotTeacherInSchool":
    "Selected user is not a teacher in this school.",
  "timetable.errors.teacherNotAssignedToClassSubject":
    "Teacher is not assigned to this class and subject for the school year.",
  "timetable.errors.noActiveSchoolYear":
    "No active school year configured for this school.",
  "timetable.errors.schoolScopeNoClassOrLevel":
    "SCHOOL scope must not include a classId or academicLevelId.",
  "timetable.errors.academicLevelScopeRequiresLevelId":
    "ACADEMIC_LEVEL scope requires an academicLevelId.",
  "timetable.errors.academicLevelScopeNoClassId":
    "ACADEMIC_LEVEL scope must not include a classId.",
  "timetable.errors.classScopeNoAcademicLevelId":
    "CLASS scope must not include an academicLevelId.",
  "timetable.errors.onlyReferentTeacherCanManage":
    "Only the class's referent teacher can manage the timetable for this class.",
  "timetable.errors.teacherOnlyManagesAssignedOneOffSlots":
    "Teacher can only manage one-off slots they are assigned to.",
};

const translations: Record<TimetableLocale, TranslationDict> = {
  fr,
  en,
};

export function translateTimetableError(
  locale: TimetableLocale,
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

export function timetableLocaleFromUser(user: {
  preferredLocale?: "FR" | "EN";
}): TimetableLocale {
  return user.preferredLocale === "EN" ? "en" : "fr";
}
