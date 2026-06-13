import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocaleStore } from "./locale-store";
import { DEFAULT_LOCALE } from "./translations";
import { translate, useTranslation } from "./useTranslation";

describe("translate", () => {
  it("returns the French string by default", () => {
    expect(translate("fr", "header.logout")).toBe("Se deconnecter");
  });

  it("returns the English string for the en locale", () => {
    expect(translate("en", "header.logout")).toBe("Log out");
  });

  it("falls back to French when a key is missing in the target locale", () => {
    expect(translate("en", "common.save")).toBe("Save");
  });

  it("falls back to the raw key when the key does not exist in any locale", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("useTranslation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("translates using the current locale and reacts to locale changes", () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.locale).toBe("fr");
    expect(result.current.t("header.logout")).toBe("Se deconnecter");

    act(() => {
      result.current.setLocale("en");
    });

    expect(result.current.locale).toBe("en");
    expect(result.current.t("header.logout")).toBe("Log out");
  });
});
