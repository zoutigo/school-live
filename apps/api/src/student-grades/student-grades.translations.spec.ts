import {
  studentGradesLocaleFromUser,
  translateStudentGradesError,
} from "./student-grades.translations.js";

const KNOWN_KEYS: Record<string, true> = {
  "studentGrades.errors.notAccessible": true,
  "studentGrades.errors.gradeNotFound": true,
  "studentGrades.errors.userNotBoundToSchool": true,
  "studentGrades.errors.teacherNotAssigned": true,
  "studentGrades.errors.studentNotFound": true,
  "studentGrades.errors.studentNotEnrolled": true,
  "studentGrades.errors.classNotFound": true,
  "studentGrades.errors.subjectNotAllowedForClass": true,
  "studentGrades.errors.subjectNotInCurriculum": true,
  "studentGrades.errors.subjectNotFound": true,
};

function getDictKeys(locale: "fr" | "en"): string[] {
  return Object.keys(KNOWN_KEYS).filter((key) => {
    const value = translateStudentGradesError(locale, key);
    return value !== key;
  });
}

describe("student-grades.translations", () => {
  it("has matching key sets for fr and en with non-empty values", () => {
    const frKeys = getDictKeys("fr");
    const enKeys = getDictKeys("en");

    expect(frKeys.sort()).toEqual(Object.keys(KNOWN_KEYS).sort());
    expect(enKeys.sort()).toEqual(Object.keys(KNOWN_KEYS).sort());

    for (const key of Object.keys(KNOWN_KEYS)) {
      const frValue = translateStudentGradesError("fr", key);
      const enValue = translateStudentGradesError("en", key);
      expect(frValue.trim().length).toBeGreaterThan(0);
      expect(enValue.trim().length).toBeGreaterThan(0);
      expect(frValue).not.toBe(key);
      expect(enValue).not.toBe(key);
    }
  });

  it("translates a known key per locale", () => {
    expect(
      translateStudentGradesError("fr", "studentGrades.errors.gradeNotFound"),
    ).toBe("Note de l'eleve introuvable.");
    expect(
      translateStudentGradesError("en", "studentGrades.errors.gradeNotFound"),
    ).toBe("Student grade not found.");
  });

  it("falls back to fr for an unknown locale", () => {
    expect(
      translateStudentGradesError(
        "xx" as unknown as "fr",
        "studentGrades.errors.classNotFound",
      ),
    ).toBe(
      translateStudentGradesError("fr", "studentGrades.errors.classNotFound"),
    );
  });

  it("returns the key itself for an unknown key", () => {
    expect(
      translateStudentGradesError("fr", "studentGrades.errors.unknownKey"),
    ).toBe("studentGrades.errors.unknownKey");
    expect(
      translateStudentGradesError("en", "studentGrades.errors.unknownKey"),
    ).toBe("studentGrades.errors.unknownKey");
  });

  describe("studentGradesLocaleFromUser", () => {
    it("returns en for EN preferred locale", () => {
      expect(studentGradesLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns fr for FR preferred locale or undefined", () => {
      expect(studentGradesLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
      expect(studentGradesLocaleFromUser({})).toBe("fr");
    });
  });
});
