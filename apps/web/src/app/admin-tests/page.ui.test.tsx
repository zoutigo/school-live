import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTestsPage from "./page";
import { selectSearchableOption } from "../../test/searchable-select";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const CAMPAIGNS = [
  {
    id: "camp-1",
    title: "Recette mobile v1.3",
    status: "DRAFT",
    description: null,
    targetVersion: null,
    startsAt: null,
    dueAt: null,
  },
  {
    id: "camp-2",
    title: "Recette web v2.0",
    status: "ACTIVE",
    description: null,
    targetVersion: null,
    startsAt: null,
    dueAt: null,
  },
];

function mockFetchBase() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/me")) {
      return jsonResponse({ platformRoles: ["SUPER_ADMIN"] });
    }
    if (url.endsWith("/admin/tests/campaigns") && method === "POST") {
      return jsonResponse({ id: "camp-3" }, 201);
    }
    if (url.includes("/admin/tests/campaigns")) {
      return jsonResponse({ items: CAMPAIGNS });
    }
    if (url.includes("/admin/tests/testers")) {
      return jsonResponse({ items: [] });
    }
    if (url.includes("/admin/tests/executions")) {
      return jsonResponse({ items: [] });
    }
    if (url.includes("/admin/tests/synthesis")) {
      return jsonResponse({
        campaigns: { draft: 1, active: 1, archived: 0, total: 2 },
        totalCases: 0,
        executions: {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          successRate: 0,
          pendingReview: 0,
        },
        testersCount: 0,
      });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("AdminTestsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
  });

  it("filtre les campagnes par statut via la liste deroulante", async () => {
    mockFetchBase();
    render(<AdminTestsPage />);

    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));

    await screen.findByText("Recette mobile v1.3");
    await screen.findByText("Recette web v2.0");

    await selectSearchableOption("Filtrer par statut", "Active");

    await waitFor(() => {
      expect(screen.getByTestId("admin-tests-status-filter")).toHaveTextContent(
        "Active",
      );
    });
  });

  it("cree une campagne avec le statut choisi dans le formulaire", async () => {
    const fetchMock = mockFetchBase();
    render(<AdminTestsPage />);

    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));
    await screen.findByText("Recette mobile v1.3");

    fireEvent.click(screen.getByTestId("create-campaign-btn"));

    fireEvent.change(screen.getByTestId("campaign-title-input"), {
      target: { value: "Recette API v3" },
    });
    await selectSearchableOption("Statut", "Active");

    await waitFor(() =>
      expect(screen.getByTestId("campaign-save-btn")).toBeEnabled(),
    );

    fireEvent.click(screen.getByTestId("campaign-save-btn"));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([callUrl, callInit]) =>
          String(callUrl).endsWith("/admin/tests/campaigns") &&
          (callInit as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(String(postCall?.[1]?.body));
      expect(body.status).toBe("ACTIVE");
    });
  });
});
