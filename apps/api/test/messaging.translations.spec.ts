import {
  messagingLocaleFromUser,
  translateMessagingError,
} from "../src/messaging/messaging.translations";

const fr = (key: string, params?: Record<string, string>) =>
  translateMessagingError("fr", key, params);
const en = (key: string, params?: Record<string, string>) =>
  translateMessagingError("en", key, params);

const ERROR_KEYS = [
  "messaging.errors.missingImageFile",
  "messaging.errors.invalidSubject",
  "messaging.errors.invalidBody",
  "messaging.errors.invalidRecipientUserIds",
  "messaging.errors.invalidIsDraft",
  "messaging.errors.messageNotFound",
  "messaging.errors.accessDenied",
  "messaging.errors.recipientRequired",
  "messaging.errors.draftNotFound",
  "messaging.errors.noFieldsToUpdate",
  "messaging.errors.recipientsNotInSchool",
  "messaging.errors.insufficientRole",
];

describe("messaging.translations", () => {
  it("has a French and an English translation for every error key", () => {
    for (const key of ERROR_KEYS) {
      expect(fr(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
      expect(fr(key)).not.toBe(en(key));
    }
  });

  it("falls back to the French translation for an unknown locale", () => {
    expect(
      translateMessagingError(
        "xx" as never,
        "messaging.errors.messageNotFound",
      ),
    ).toBe(fr("messaging.errors.messageNotFound"));
  });

  it("falls back to the key itself when the key is unknown", () => {
    expect(fr("messaging.errors.doesNotExist")).toBe(
      "messaging.errors.doesNotExist",
    );
    expect(en("messaging.errors.doesNotExist")).toBe(
      "messaging.errors.doesNotExist",
    );
  });

  describe("messagingLocaleFromUser", () => {
    it("returns 'en' when preferredLocale is EN", () => {
      expect(messagingLocaleFromUser({ preferredLocale: "EN" })).toBe("en");
    });

    it("returns 'fr' when preferredLocale is FR", () => {
      expect(messagingLocaleFromUser({ preferredLocale: "FR" })).toBe("fr");
    });

    it("defaults to 'fr' when preferredLocale is undefined", () => {
      expect(messagingLocaleFromUser({})).toBe("fr");
    });
  });
});
