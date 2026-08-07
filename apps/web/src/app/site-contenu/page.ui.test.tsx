import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SiteContentPage from "./page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelpStore } from "../../store/page-help";
import {
  ContactInfo,
  ContactSubmission,
  LegalDocumentItem,
} from "./site-content-api";
import { SITE_CONTENT_TOUR_ID } from "./site-content-tour.config";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/site-contenu",
}));

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CONTACT_PAYLOAD: ContactInfo = {
  email: "contact@scolive.cm",
  phone: "+237 690000000",
  addressStreet: "Rue des Manguiers",
  addressDistrict: "Bastos",
  addressCity: "Yaoundé",
  addressCountry: "Cameroun",
  legalRepresentativeFirstName: "",
  legalRepresentativeLastName: "",
};

const LEGAL_ITEMS: LegalDocumentItem[] = [
  {
    id: "doc-1",
    slug: "cgu",
    locale: "fr",
    version: 1,
    title: "CGU",
    contentHtml: "<p>Contenu</p>",
    status: "PUBLISHED",
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const CONTACT_SUBMISSIONS: ContactSubmission[] = [
  {
    id: "sub-1",
    name: "Awa Ngono",
    email: "awa@example.cm",
    phone: "690000000",
    subject: "Demande de devis",
    message: "Bonjour, je souhaite en savoir plus sur Scolive.",
    readAt: null,
    readById: null,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
];

function mockSiteContentFlow(mePayload: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.endsWith("/me")) {
      return jsonResponse(mePayload);
    }
    if (url.includes("/site-content/admin/contact-submissions/sub-1")) {
      return jsonResponse({
        ...CONTACT_SUBMISSIONS[0],
        readAt: "2026-08-01T12:00:00.000Z",
        readById: "user-1",
      });
    }
    if (url.includes("/site-content/admin/contact-submissions")) {
      return jsonResponse({
        items: CONTACT_SUBMISSIONS,
        total: CONTACT_SUBMISSIONS.length,
        page: 1,
        limit: 20,
      });
    }
    if (url.includes("/site-content/admin/contact")) {
      return jsonResponse(CONTACT_PAYLOAD);
    }
    if (url.includes("/site-content/admin/legal-documents")) {
      return jsonResponse(LEGAL_ITEMS);
    }

    return jsonResponse({ message: "Not found" }, 404);
  });
}

describe("SiteContentPage UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects a non-authenticated user", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "Unauthorized" }, 401),
    );

    render(<SiteContentPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("redirects a non SUPER_ADMIN/ADMIN user to the platform home", async () => {
    mockSiteContentFlow({ activeRole: "SCHOOL_ADMIN" });

    render(<SiteContentPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/acceuil"));
  });

  it("renders the contact details read-only for an ADMIN", async () => {
    mockSiteContentFlow({ activeRole: "ADMIN" });

    render(<SiteContentPage />);

    expect(await screen.findByText("contact@scolive.cm")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("renders the contact details read-only for a SUPER_ADMIN, with the composed address", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);

    expect(await screen.findByText("contact@scolive.cm")).toBeInTheDocument();
    expect(screen.getByText("+237 690000000")).toBeInTheDocument();
    expect(
      screen.getByText("Rue des Manguiers, Bastos, Yaoundé, Cameroun"),
    ).toBeInTheDocument();
  });

  it("switches to the edit form when clicking Modifier, pre-filled with the split address fields", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));

    expect(
      await screen.findByDisplayValue("contact@scolive.cm"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("+237 690000000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rue des Manguiers")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bastos")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Yaoundé")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cameroun")).toBeInTheDocument();
  });

  it("cancels the edit form and returns to the read-only view without saving", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await screen.findByDisplayValue("Rue des Manguiers");

    fireEvent.change(screen.getByDisplayValue("Rue des Manguiers"), {
      target: { value: "Rue changée" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      await screen.findByText("Rue des Manguiers, Bastos, Yaoundé, Cameroun"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Voie")).not.toBeInTheDocument();
  });

  it("saves the edited address and returns to the read-only view with a success message", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });
    const updatedContact: ContactInfo = {
      ...CONTACT_PAYLOAD,
      addressStreet: "Nouvelle voie",
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return jsonResponse({ activeRole: "SUPER_ADMIN" });
      }
      if (
        url.includes("/site-content/admin/contact") &&
        init?.method === "PUT"
      ) {
        return jsonResponse(updatedContact);
      }
      if (url.includes("/site-content/admin/contact")) {
        return jsonResponse(CONTACT_PAYLOAD);
      }
      if (url.includes("/site-content/admin/legal-documents")) {
        return jsonResponse(LEGAL_ITEMS);
      }
      return jsonResponse({ message: "Not found" }, 404);
    });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await screen.findByDisplayValue("Rue des Manguiers");

    fireEvent.change(screen.getByDisplayValue("Rue des Manguiers"), {
      target: { value: "Nouvelle voie" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Coordonnées mises à jour."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nouvelle voie, Bastos, Yaoundé, Cameroun"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Voie")).not.toBeInTheDocument();
  });

  it("shows inline validation errors in the edit form and does not submit", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    const streetInput = await screen.findByDisplayValue("Rue des Manguiers");
    fireEvent.change(streetInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("La voie est obligatoire."),
    ).toBeInTheDocument();
  });

  it("starts the site-content onboarding tour by default", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    expect(useOnboardingTourStore.getState().activeTourId).toBe(
      SITE_CONTENT_TOUR_ID,
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("platform");
  });

  it("does not start the tour when onboardingHelpEnabled is false", async () => {
    mockSiteContentFlow({
      activeRole: "SUPER_ADMIN",
      onboardingHelpEnabled: false,
    });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("does not restart the tour once already completed", async () => {
    useOnboardingTourStore.setState({
      completedTours: { [`platform:${SITE_CONTENT_TOUR_ID}`]: true },
    });
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("registers help content for the active tab in the side menu", async () => {
    usePageHelpStore.setState({ entry: null, open: false });
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Contact",
      );
    });
    let sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Consulter les coordonnées publiques",
      "Modifier les coordonnées",
    ]);

    fireEvent.click(screen.getByText("Documents légaux"));
    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Documents légaux",
      );
    });
    sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Choisir le document et la langue",
      "Créer ou modifier un brouillon",
      "Publier ou supprimer un document",
    ]);

    fireEvent.click(screen.getByText("Messages"));
    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Messages",
      );
    });
    sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Consulter les messages reçus",
    ]);
  });

  it("lists legal document versions after switching tabs", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByText("Documents légaux"));

    await screen.findByText("CGU");
    expect(screen.getByText(/Publié/)).toBeInTheDocument();
  });

  it("lists contact submissions and marks one as read on open", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByText("Messages"));

    await screen.findByTestId("message-item-sub-1");
    expect(screen.getByText("Awa Ngono")).toBeInTheDocument();
    expect(screen.getByText("Demande de devis")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("message-item-sub-1"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("awa@example.cm");
    await waitFor(() => expect(dialog).toHaveTextContent("Message lu"));
  });

  it("shows the empty state when there are no contact submissions", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/me")) {
        return jsonResponse({ activeRole: "SUPER_ADMIN" });
      }
      if (url.includes("/site-content/admin/contact-submissions")) {
        return jsonResponse({ items: [], total: 0, page: 1, limit: 20 });
      }
      if (url.includes("/site-content/admin/contact")) {
        return jsonResponse(CONTACT_PAYLOAD);
      }
      if (url.includes("/site-content/admin/legal-documents")) {
        return jsonResponse(LEGAL_ITEMS);
      }
      return jsonResponse({ message: "Not found" }, 404);
    });

    render(<SiteContentPage />);
    await screen.findByText("contact@scolive.cm");

    fireEvent.click(screen.getByText("Messages"));

    expect(
      await screen.findByText("Aucune prise de contact"),
    ).toBeInTheDocument();
  });
});
