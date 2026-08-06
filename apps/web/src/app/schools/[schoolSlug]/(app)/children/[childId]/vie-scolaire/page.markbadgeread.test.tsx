import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildVieScolairePage from "./page";

let paramsMock = { schoolSlug: "college-vogt", childId: "child-1" };

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");
vi.mock("../../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfTokenCookieMock(),
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ChildVieScolairePage — badge marqué comme lu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    paramsMock = { schoolSlug: "college-vogt", childId: "child-1" };
  });

  it("appelle markBadgeRead(DISCIPLINE, childId) au chargement de la page", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("/schools/college-vogt/me")) {
          return createJsonResponse({
            role: "PARENT",
            linkedStudents: [
              { id: "child-1", firstName: "Remi", lastName: "Ntamack" },
            ],
          });
        }

        if (url.includes("/students/child-1/life-events")) {
          return createJsonResponse([]);
        }

        if (url.includes("/me/read-markers")) {
          return createJsonResponse({});
        }

        return createJsonResponse({});
      });

    render(<ChildVieScolairePage />);

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([input, init]) => {
          const url = String(input);
          return (
            url.includes("/schools/college-vogt/me/read-markers") &&
            (init as RequestInit)?.method === "PATCH"
          );
        }),
      ).toBe(true);
    });

    const readMarkerCall = fetchSpy.mock.calls.find(([input]) =>
      String(input).includes("/me/read-markers"),
    );
    const body = JSON.parse(
      (readMarkerCall?.[1] as RequestInit)?.body as string,
    );
    expect(body).toEqual({ scope: "DISCIPLINE", scopeRefId: "child-1" });
  });

  it("n'appelle pas markBadgeRead si le childId est absent", async () => {
    paramsMock = { schoolSlug: "college-vogt", childId: "" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => createJsonResponse({}));

    render(<ChildVieScolairePage />);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      fetchSpy.mock.calls.some(([input]) =>
        String(input).includes("/me/read-markers"),
      ),
    ).toBe(false);
  });

  it("n'affiche pas le bouton d'aide (aide guidée réservée à la vue élève)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          role: "PARENT",
          linkedStudents: [
            { id: "child-1", firstName: "Remi", lastName: "Ntamack" },
          ],
        });
      }

      if (url.includes("/students/child-1/life-events")) {
        return createJsonResponse([]);
      }

      return createJsonResponse({});
    });

    render(<ChildVieScolairePage />);

    await waitFor(() => {
      expect(screen.getByText("Remi Ntamack")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("vie-scolaire-help-toggle")).toBeNull();
  });
});
