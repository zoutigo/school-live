import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./page";
import { useLocaleStore } from "../i18n/locale-store";
import { DEFAULT_LOCALE } from "../i18n/translations";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../components/auth/sso-buttons", () => ({
  SsoButtons: () => <div>SSO buttons</div>,
}));

describe("LandingPage language switch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("translates the whole page immediately when EN is clicked, with no reload", () => {
    render(<LandingPage />);

    expect(screen.getByText("Acces Scolive")).toBeInTheDocument();
    expect(screen.getByText("Suivi des notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Telephone")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("login-language-en"));

    expect(screen.getByText("Scolive Access")).toBeInTheDocument();
    expect(screen.getByText("Grade tracking")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.queryByText("Acces Scolive")).not.toBeInTheDocument();
    expect(screen.queryByText("Suivi des notes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Telephone")).not.toBeInTheDocument();
  });

  it("translates the whole page back to French immediately when FR is clicked again", () => {
    useLocaleStore.setState({ locale: "en" });
    render(<LandingPage />);

    expect(screen.getByText("Scolive Access")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("login-language-fr"));

    expect(screen.getByText("Acces Scolive")).toBeInTheDocument();
    expect(screen.getByText("Suivi des notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Telephone")).toBeInTheDocument();
    expect(screen.queryByText("Scolive Access")).not.toBeInTheDocument();
  });

  it("keeps the Scolive brand name unchanged in both languages", () => {
    render(<LandingPage />);

    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("login-language-en"));

    expect(screen.getAllByText("Scolive").length).toBeGreaterThan(0);
  });
});
