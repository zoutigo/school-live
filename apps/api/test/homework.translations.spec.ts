import {
  homeworkLocaleFromUser,
  translateHomeworkError,
} from "../src/homework/homework.translations";

const fr = (key: string, params?: Record<string, string>) =>
  translateHomeworkError("fr", key, params);
const en = (key: string, params?: Record<string, string>) =>
  translateHomeworkError("en", key, params);

const ERROR_KEYS = [
  "homework.errors.commentBodyRequired",
  "homework.errors.completionNotAccessible",
  "homework.errors.notFound",
  "homework.errors.classNotAccessible",
  "homework.errors.studentIdRequiredForParent",
  "homework.errors.notAccessible",
  "homework.errors.managementNotAccessible",
  "homework.errors.classNotFound",
  "homework.errors.subjectNotFound",
  "homework.errors.subjectNotAccessible",
  "homework.errors.onlyAuthorCanManage",
  "homework.errors.mediaCleanupFailed",
  "homework.errors.missingImageFile",
];

describe("homework.translations", () => {
  it("has a French and an English translation for every error key", () => {
    for (const key of ERROR_KEYS) {
      expect(fr(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
      expect(fr(key)).not.toBe(en(key));
    }
  });

  it("interpolates {message} in the media cleanup error", () => {
    expect(fr("homework.errors.mediaCleanupFailed", { message: "boom" })).toBe(
      "Echec de la suppression du media : boom",
    );
    expect(en("homework.errors.mediaCleanupFailed", { message: "boom" })).toBe(
      "Media deletion failed: boom",
    );
  });

  it("falls back to the French translation for an unknown locale", () => {
    expect(
      translateHomeworkError("xx" as never, "homework.errors.notFound"),
    ).toBe(fr("homework.errors.notFound"));
  });

  it("falls back to the key itself when the key is unknown", () => {
    expect(fr("homework.errors.doesNotExist")).toBe(
      "homework.errors.doesNotExist",
    );
    expect(en("homework.errors.doesNotExist")).toBe(
      "homework.errors.doesNotExist",
    );
  });

  describe("homeworkLocaleFromUser", () => {
    it("returns 'en' when preferredLocale is EN", () => {
      expect(homeworkLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns 'fr' when preferredLocale is FR", () => {
      expect(homeworkLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
    });

    it("defaults to 'fr' when preferredLocale is undefined", () => {
      expect(homeworkLocaleFromUser({})).toBe("fr");
    });
  });
});
