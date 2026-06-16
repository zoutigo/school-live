import {
  timetableLocaleFromUser,
  translateTimetableError,
} from "../src/timetable/timetable.translations";

const fr = (key: string, params?: Record<string, string>) =>
  translateTimetableError("fr", key, params);
const en = (key: string, params?: Record<string, string>) =>
  translateTimetableError("en", key, params);

const ERROR_KEYS = [
  "timetable.errors.insufficientRole",
  "timetable.errors.calendarEventNotFound",
  "timetable.errors.childNotLinkedToParent",
  "timetable.errors.classHasNoCurriculum",
  "timetable.errors.classNotFound",
  "timetable.errors.classSchoolYearMismatch",
  "timetable.errors.classScopeRequiresClassId",
  "timetable.errors.conflictingOccurrenceForClass",
  "timetable.errors.conflictingOccurrenceForRoom",
  "timetable.errors.conflictingOccurrenceForTeacher",
  "timetable.errors.conflictingSlotForClass",
  "timetable.errors.conflictingSlotForRoom",
  "timetable.errors.conflictingSlotForTeacher",
  "timetable.errors.invalidColorHex",
  "timetable.errors.invalidDate",
  "timetable.errors.invalidDateRange",
  "timetable.errors.invalidFromDate",
  "timetable.errors.invalidToDate",
  "timetable.errors.noFieldsToUpdate",
  "timetable.errors.noLinkedStudent",
  "timetable.errors.oneOffSlotNotFound",
  "timetable.errors.schoolYearNotFound",
  "timetable.errors.slotExceptionNotFound",
  "timetable.errors.startBeforeEnd",
  "timetable.errors.studentEnrollmentNotFound",
  "timetable.errors.studentProfileNotFound",
  "timetable.errors.subjectNotAllowedForClass",
  "timetable.errors.subjectNotInCurriculum",
  "timetable.errors.subjectNotFound",
  "timetable.errors.timetableSlotNotFound",
  "timetable.errors.academicLevelNotFound",
  "timetable.errors.fromDateBeforeToDate",
  "timetable.errors.studentNoEnrollmentForSchoolYear",
  "timetable.errors.colorTooCloseToOtherSubject",
  "timetable.errors.startDateBeforeEndDate",
  "timetable.errors.activeFromBeforeActiveTo",
  "timetable.errors.userNotTeacherInSchool",
  "timetable.errors.teacherNotAssignedToClassSubject",
  "timetable.errors.noActiveSchoolYear",
  "timetable.errors.schoolScopeNoClassOrLevel",
  "timetable.errors.academicLevelScopeRequiresLevelId",
  "timetable.errors.academicLevelScopeNoClassId",
  "timetable.errors.classScopeNoAcademicLevelId",
  "timetable.errors.onlyReferentTeacherCanManage",
  "timetable.errors.teacherOnlyManagesAssignedOneOffSlots",
];

describe("timetable.translations", () => {
  it("has a French and an English translation for every error key", () => {
    for (const key of ERROR_KEYS) {
      expect(fr(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
      expect(fr(key)).not.toBe(en(key));
    }
  });

  it("falls back to the French translation for an unknown locale", () => {
    expect(
      translateTimetableError("xx" as never, "timetable.errors.classNotFound"),
    ).toBe(fr("timetable.errors.classNotFound"));
  });

  it("falls back to the key itself when the key is unknown", () => {
    expect(fr("timetable.errors.doesNotExist")).toBe(
      "timetable.errors.doesNotExist",
    );
    expect(en("timetable.errors.doesNotExist")).toBe(
      "timetable.errors.doesNotExist",
    );
  });

  describe("timetableLocaleFromUser", () => {
    it("returns 'en' when preferredLocale is EN", () => {
      expect(timetableLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns 'fr' when preferredLocale is FR", () => {
      expect(timetableLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
    });

    it("defaults to 'fr' when preferredLocale is undefined", () => {
      expect(timetableLocaleFromUser({})).toBe("fr");
    });
  });
});
