import { beforeEach, describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY, useLocaleStore } from "./locale-store";
import { DEFAULT_LOCALE } from "./translations";

describe("locale-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("defaults to French", () => {
    expect(useLocaleStore.getState().locale).toBe("fr");
  });

  it("updates the locale via setLocale", () => {
    useLocaleStore.getState().setLocale("en");
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("persists the chosen locale to localStorage", () => {
    useLocaleStore.getState().setLocale("en");

    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toMatchObject({
      state: { locale: "en" },
    });
  });

  it("restores the persisted locale on rehydration", async () => {
    // Simulate a fresh app load: storage already has "en" from a previous session.
    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ state: { locale: "en" }, version: 0 }),
    );

    await useLocaleStore.persist.rehydrate();

    expect(useLocaleStore.getState().locale).toBe("en");
  });
});
