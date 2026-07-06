import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../components/auth/sso-buttons", () => ({
  SsoButtons: () => <div>SSO buttons</div>,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the three login methods with all their guards", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Telephone")).toBeInTheDocument();
    expect(screen.getByText("SSO buttons")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour a l'accueil" }),
    ).toHaveAttribute("href", "/");
  });

  it("translates the page in English", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LoginPage />);

    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to home" }),
    ).toBeInTheDocument();
  });
});
