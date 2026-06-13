import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LOCALE_STORAGE_KEY, useLocaleStore } from "./locale-store";
import { DEFAULT_LOCALE } from "./translations";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders both language options with French selected by default", () => {
    render(<LanguageSwitcher />);

    const french = screen.getByRole("radio", { name: "Francais" });
    const english = screen.getByRole("radio", { name: "Anglais" });

    expect(french).toBeChecked();
    expect(english).not.toBeChecked();
  });

  it("switches the locale and persists it when selecting English", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: "Anglais" }));

    expect(useLocaleStore.getState().locale).toBe("en");

    const stored = JSON.parse(
      window.localStorage.getItem(LOCALE_STORAGE_KEY) as string,
    );
    expect(stored.state.locale).toBe("en");
  });

  it("re-renders with English labels once the locale switches to English", () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: "Anglais" }));

    expect(screen.getByRole("radio", { name: "French" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
  });
});
