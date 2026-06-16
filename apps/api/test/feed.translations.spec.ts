import {
  feedLocaleFromUser,
  translateFeed,
} from "../src/feed/feed.translations";

const fr = (key: string, params?: Record<string, string>) =>
  translateFeed("fr", key, params);
const en = (key: string, params?: Record<string, string>) =>
  translateFeed("en", key, params);

const ERROR_KEYS = [
  "feed.errors.classIdRequiredForClassView",
  "feed.errors.postNotFound",
  "feed.errors.notAPoll",
  "feed.errors.voteAlreadyRegistered",
  "feed.errors.invalidPoll",
  "feed.errors.pollOptionNotFound",
  "feed.errors.accessDenied",
  "feed.errors.manageNotAllowed",
  "feed.errors.studentCanOnlyPostForOwnClass",
  "feed.errors.invalidClass",
  "feed.errors.audienceNotAllowed",
  "feed.errors.audienceClassIdRequired",
  "feed.errors.audienceLevelIdRequired",
  "feed.errors.invalidLevel",
  "feed.errors.pollQuestionRequired",
  "feed.errors.pollNeedsTwoOptions",
  "feed.errors.mediaServiceUrlNotConfigured",
  "feed.errors.mediaCleanupFailed",
  "feed.errors.insufficientRole",
  "feed.errors.missingImageFile",
];

// "Administration", "Staff" and "Parents" happen to be spelled identically
// in French and English, so they are checked separately below.
const ROLE_KEYS = [
  "feed.roles.member",
  "feed.roles.direction",
  "feed.roles.supervision",
  "feed.roles.accounting",
  "feed.roles.schoolLife",
  "feed.roles.students",
];

const IDENTICAL_ROLE_KEYS = [
  "feed.roles.administration",
  "feed.roles.staff",
  "feed.roles.parents",
];

const AUDIENCE_KEYS = [
  "feed.audience.staffOnly",
  "feed.audience.parentsAndStudents",
  "feed.audience.parentsOnly",
  "feed.audience.wholeSchool",
  "feed.audience.classAllLabel",
  "feed.audience.classParentsStudentsLabel",
  "feed.audience.levelLabel",
];

describe("feed.translations", () => {
  it.each([...ERROR_KEYS, ...ROLE_KEYS, ...AUDIENCE_KEYS])(
    "has distinct French and English translations for %s",
    (key) => {
      expect(fr(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
      expect(fr(key)).not.toBe(en(key));
    },
  );

  it.each(IDENTICAL_ROLE_KEYS)(
    "has a French and an English translation for %s",
    (key) => {
      expect(fr(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
    },
  );

  it("interpolates {message} in the media cleanup error", () => {
    expect(fr("feed.errors.mediaCleanupFailed", { message: "boom" })).toBe(
      "Echec de la suppression du media : boom",
    );
    expect(en("feed.errors.mediaCleanupFailed", { message: "boom" })).toBe(
      "Media deletion failed: boom",
    );
  });

  it("interpolates {className} and {levelLabel} in audience labels", () => {
    expect(fr("feed.audience.classAllLabel", { className: "6e A" })).toBe(
      "Classe 6e A (eleves, parents, enseignants)",
    );
    expect(en("feed.audience.classAllLabel", { className: "6e A" })).toBe(
      "Class 6e A (students, parents, teachers)",
    );
    expect(
      fr("feed.audience.classParentsStudentsLabel", { className: "6e A" }),
    ).toBe("Parents/eleves classe 6e A");
    expect(
      en("feed.audience.classParentsStudentsLabel", { className: "6e A" }),
    ).toBe("Class 6e A parents/students");
    expect(fr("feed.audience.levelLabel", { levelLabel: "6e" })).toBe(
      "Niveau 6e",
    );
    expect(en("feed.audience.levelLabel", { levelLabel: "6e" })).toBe(
      "Level 6e",
    );
  });

  it("falls back to the French translation for an unknown locale", () => {
    expect(translateFeed("xx" as never, "feed.errors.postNotFound")).toBe(
      fr("feed.errors.postNotFound"),
    );
  });

  it("falls back to the key itself when the key is unknown", () => {
    expect(fr("feed.errors.doesNotExist")).toBe("feed.errors.doesNotExist");
    expect(en("feed.errors.doesNotExist")).toBe("feed.errors.doesNotExist");
  });

  describe("feedLocaleFromUser", () => {
    it("returns 'en' when preferredLocale is EN", () => {
      expect(feedLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns 'fr' when preferredLocale is FR", () => {
      expect(feedLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
    });

    it("defaults to 'fr' when preferredLocale is undefined", () => {
      expect(feedLocaleFromUser({})).toBe("fr");
    });
  });
});
