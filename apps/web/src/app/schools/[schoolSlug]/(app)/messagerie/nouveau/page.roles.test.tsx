/**
 * Régression 2026-09-05 : COMPOSER_ALLOWED_ROLES sur cette page excluait
 * STUDENT ("Your current role cannot send messages."), alors que mobile
 * affiche le FAB de composition sans restriction de rôle pour un élève, et
 * que l'API (/messaging/recipients et MessagingController) autorise déjà
 * STUDENT sur toutes les routes concernées.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolNewMessagePage from "./page";

const paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-test",
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockFetchForRole(role: string) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ role, schoolName: "Collège Vogt" });
    }
    if (url.includes("/messaging/recipients")) {
      return jsonResponse({
        platformAdmins: [],
        teachers: [],
        staffFunctions: [],
        staffPeople: [],
      });
    }

    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("SchoolNewMessagePage — accès par rôle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("un élève peut composer un message (pas de blocage de rôle)", async () => {
    mockFetchForRole("STUDENT");

    render(<SchoolNewMessagePage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Objet du message"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Your current role cannot send messages."),
    ).not.toBeInTheDocument();
  });
});
