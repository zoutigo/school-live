import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactContent } from "./contact-content";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import type { PublicContactInfo } from "../../lib/site-content";

vi.mock("next/navigation", () => ({
  usePathname: () => "/contact",
}));

const CONTACT_INFO: PublicContactInfo = {
  email: "contact@scolive.cm",
  phone: "+237 690000000",
  address: "Yaoundé, Cameroun",
};

describe("ContactContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("shows inline validation errors and keeps the submit button enabled", async () => {
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(
      await screen.findByText("Le nom doit contenir au moins 2 caractères."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Envoyer le message" }),
    ).toBeEnabled();
  });

  it("submits successfully once all fields are valid", async () => {
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await user.type(screen.getByLabelText("Nom complet"), "Awa Ngono");
    await user.type(screen.getByLabelText("Email"), "awa@example.cm");
    await user.type(screen.getByLabelText("Sujet"), "Demande de devis");
    await user.type(
      screen.getByLabelText("Message"),
      "Bonjour, je souhaite en savoir plus sur Scolive pour mon école.",
    );

    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(await screen.findByText("Message envoyé !")).toBeInTheDocument();
  });
});
