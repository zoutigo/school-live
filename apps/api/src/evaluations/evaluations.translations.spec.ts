import {
  evaluationsLocaleFromUser,
  translateEvaluationsError,
} from "./evaluations.translations.js";

function getDictKeys(locale: "fr" | "en"): string[] {
  // A key is considered "present" in the dictionary if translating it does
  // not fall back to returning the key itself.
  return Object.keys(KNOWN_KEYS).filter((key) => {
    const value = translateEvaluationsError(locale, key);
    return value !== key;
  });
}

const KNOWN_KEYS: Record<string, true> = {
  "evaluations.errors.studentNotEnrolled": true,
  "evaluations.errors.positiveScoreRequired": true,
  "evaluations.errors.scoreExceedsMaxScore": true,
  "evaluations.errors.invalidTerm": true,
  "evaluations.errors.subjectAppreciationNotAccessible": true,
  "evaluations.errors.studentNotFound": true,
  "evaluations.errors.studentNotesNotAccessible": true,
  "evaluations.errors.evaluationNotFound": true,
  "evaluations.errors.classNotFound": true,
  "evaluations.errors.classNotAccessible": true,
  "evaluations.errors.subjectNotFound": true,
  "evaluations.errors.subjectNotAccessible": true,
  "evaluations.errors.evaluationTypeNotFound": true,
  "evaluations.errors.subjectBranchMismatch": true,
};

describe("evaluations.translations", () => {
  it("has matching key sets for fr and en with non-empty values", () => {
    const frKeys = getDictKeys("fr");
    const enKeys = getDictKeys("en");

    expect(frKeys.sort()).toEqual(Object.keys(KNOWN_KEYS).sort());
    expect(enKeys.sort()).toEqual(Object.keys(KNOWN_KEYS).sort());

    for (const key of Object.keys(KNOWN_KEYS)) {
      const frValue = translateEvaluationsError("fr", key);
      const enValue = translateEvaluationsError("en", key);
      expect(frValue.trim().length).toBeGreaterThan(0);
      expect(enValue.trim().length).toBeGreaterThan(0);
      expect(frValue).not.toBe(key);
      expect(enValue).not.toBe(key);
    }
  });

  it("translates a known key per locale", () => {
    expect(
      translateEvaluationsError("fr", "evaluations.errors.studentNotEnrolled"),
    ).toBe("L'eleve n'est pas inscrit dans cette classe.");
    expect(
      translateEvaluationsError("en", "evaluations.errors.studentNotEnrolled"),
    ).toBe("Student is not enrolled in this class.");
  });

  it("falls back to fr for an unknown locale", () => {
    expect(
      translateEvaluationsError(
        "xx" as unknown as "fr",
        "evaluations.errors.classNotFound",
      ),
    ).toBe(translateEvaluationsError("fr", "evaluations.errors.classNotFound"));
  });

  it("returns the key itself for an unknown key", () => {
    expect(
      translateEvaluationsError("fr", "evaluations.errors.unknownKey"),
    ).toBe("evaluations.errors.unknownKey");
    expect(
      translateEvaluationsError("en", "evaluations.errors.unknownKey"),
    ).toBe("evaluations.errors.unknownKey");
  });

  describe("evaluationsLocaleFromUser", () => {
    it("returns en for EN preferred locale", () => {
      expect(evaluationsLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns fr for FR preferred locale or undefined", () => {
      expect(evaluationsLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
      expect(evaluationsLocaleFromUser({})).toBe("fr");
    });
  });
});
