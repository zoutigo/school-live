import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  legalRepresentativeFirstName: "",
  legalRepresentativeLastName: "",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nom complet"), "Awa Ngono");
  await user.type(screen.getByLabelText("Email"), "awa@example.cm");
  await user.type(screen.getByLabelText("Téléphone"), "690000000");
  await user.type(screen.getByLabelText("Sujet"), "Demande de devis");
  await user.type(
    screen.getByLabelText("Message"),
    "Bonjour, je souhaite en savoir plus sur Scolive pour mon école.",
  );
}

describe("ContactContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejette un numéro de téléphone invalide", async () => {
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await user.type(screen.getByLabelText("Téléphone"), "123");
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(
      await screen.findByText(
        "Numéro de téléphone invalide (9 chiffres attendus).",
      ),
    ).toBeInTheDocument();
  });

  it("submits successfully once all fields are valid, calling the API", async () => {
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await fillValidForm(user);

    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(await screen.findByText("Message envoyé !")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/public/site-content/contact-submissions"),
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      name: "Awa Ngono",
      email: "awa@example.cm",
      phone: "690000000",
      subject: "Demande de devis",
    });
  });

  it("affiche une erreur serveur si l'API répond en échec", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await fillValidForm(user);
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(
      await screen.findByText(
        "Une erreur est survenue lors de l'envoi. Merci de réessayer.",
      ),
    ).toBeInTheDocument();
  });

  it("affiche un message dédié en cas de limitation de fréquence (429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    );
    const user = userEvent.setup();
    render(<ContactContent contactInfo={CONTACT_INFO} />);

    await fillValidForm(user);
    await user.click(
      screen.getByRole("button", { name: "Envoyer le message" }),
    );

    expect(
      await screen.findByText(
        "Trop de messages envoyés récemment. Merci de réessayer dans quelques minutes.",
      ),
    ).toBeInTheDocument();
  });
});
