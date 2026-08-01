import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SiteContentPage from "./page";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { ContactInfo, LegalDocumentItem } from "./site-content-api";
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
  address: "Yaoundé, Cameroun",
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

function mockSiteContentFlow(mePayload: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.endsWith("/me")) {
      return jsonResponse(mePayload);
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

  it("redirects a non SUPER_ADMIN user to the platform home", async () => {
    mockSiteContentFlow({ activeRole: "ADMIN" });

    render(<SiteContentPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/acceuil"));
  });

  it("renders the contact form pre-filled for a SUPER_ADMIN", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);

    const emailInput = await screen.findByDisplayValue("contact@scolive.cm");
    expect(emailInput).toBeInTheDocument();
    expect(screen.getByDisplayValue("+237 690000000")).toBeInTheDocument();
  });

  it("starts the site-content onboarding tour by default", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByDisplayValue("contact@scolive.cm");

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
    await screen.findByDisplayValue("contact@scolive.cm");

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("does not restart the tour once already completed", async () => {
    useOnboardingTourStore.setState({
      completedTours: { [`platform:${SITE_CONTENT_TOUR_ID}`]: true },
    });
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByDisplayValue("contact@scolive.cm");

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("lists legal document versions after switching tabs", async () => {
    mockSiteContentFlow({ activeRole: "SUPER_ADMIN" });

    render(<SiteContentPage />);
    await screen.findByDisplayValue("contact@scolive.cm");

    fireEvent.click(screen.getByText("Documents légaux"));

    await screen.findByText("CGU");
    expect(screen.getByText(/Publié/)).toBeInTheDocument();
  });
});
