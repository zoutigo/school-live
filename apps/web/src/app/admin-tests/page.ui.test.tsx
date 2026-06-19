import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTestsPage from "./page";

const replaceMock = vi.fn();
const createSchoolMessageMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../components/messaging/messaging-api", () => ({
  createSchoolMessage: (...args: unknown[]) => createSchoolMessageMock(...args),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const SUPER_ADMIN_ME = { platformRoles: ["SUPER_ADMIN"] };

const SYNTHESIS = {
  campaigns: { draft: 1, active: 2, archived: 0, total: 3 },
  totalCases: 10,
  executions: { total: 8, passed: 6, failed: 2, blocked: 0, successRate: 0.75 },
  testersCount: 4,
};

const CAMPAIGN_1 = {
  id: "camp-1",
  reference: 1,
  title: "Recette mobile v1",
  description: "Parcours parent",
  targetVersion: "1.2.0",
  startsAt: null,
  dueAt: null,
  status: "ACTIVE",
  school: { id: "school-1", name: "College Vogt", slug: "college-vogt" },
  testCasesCount: 2,
};

const TESTER_1 = {
  id: "tester-1",
  fullName: "MBELE Valery",
  email: "valery@example.com",
  schools: [{ id: "school-1", name: "College Vogt", slug: "college-vogt" }],
  stats: {
    campaignsCount: 2,
    executionsCount: 5,
    passedCount: 4,
    failedCount: 1,
  },
};

const CASE_1 = {
  id: "case-1",
  reference: 1,
  title: "Connexion email",
  module: "Auth",
  priority: "MEDIUM",
  dueAt: null,
  evidenceRequired: false,
  recycledAt: null,
  audienceRoles: [],
  executionsCount: 3,
};

const ASSIGNMENT_1 = {
  id: "assign-1",
  note: "Prioritaire avant vendredi",
  createdAt: new Date().toISOString(),
  user: {
    id: "tester-1",
    firstName: "Valery",
    lastName: "MBELE",
    email: "valery@example.com",
  },
  assignedBy: { id: "admin-1", firstName: "Admin", lastName: "Scolive" },
};

function baseRouter({
  me = SUPER_ADMIN_ME,
  campaigns = [CAMPAIGN_1],
  testers = [TESTER_1],
  cases = [CASE_1],
  assignments = [ASSIGNMENT_1] as unknown[],
  extra,
}: {
  me?: unknown;
  campaigns?: unknown[];
  testers?: unknown[];
  cases?: unknown[];
  assignments?: unknown[];
  extra?: (url: string, method: string) => Promise<Response> | undefined;
} = {}) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    const extraResult = extra?.(url, method);
    if (extraResult) return extraResult;

    if (url.endsWith("/me")) return jsonResponse(me);
    if (url.includes("/admin/tests/synthesis")) return jsonResponse(SYNTHESIS);
    if (url.includes("/admin/tests/testers"))
      return jsonResponse({ items: testers });
    if (
      url.match(/\/admin\/tests\/campaigns\/[^/]+\/assignments/) &&
      method === "GET"
    )
      return jsonResponse(assignments);
    if (url.match(/\/admin\/tests\/campaigns\/[^/?]+\?*$/) && method === "GET")
      return jsonResponse({ ...CAMPAIGN_1, testCases: cases });
    if (url.includes("/admin/tests/campaigns") && method === "GET")
      return jsonResponse({ items: campaigns });

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  };
}

describe("AdminTestsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    createSchoolMessageMock.mockReset();
    createSchoolMessageMock.mockResolvedValue({ id: "msg-1" });
  });

  it("redirects non admin/super_admin users away", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({ me: { platformRoles: ["SALES"] } }),
    );

    render(<AdminTestsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/acceuil");
    });
  });

  it("redirects to home when /me fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) return jsonResponse({}, 401);
      return jsonResponse({}, 404);
    });

    render(<AdminTestsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows synthesis KPIs by default for a SUPER_ADMIN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<AdminTestsPage />);

    expect(
      await screen.findByTestId("admin-tests-synthesis"),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("lists campaigns, filters by search, and creates a new campaign", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url, method) => {
          if (url.endsWith("/admin/tests/campaigns") && method === "POST")
            return jsonResponse({ ...CAMPAIGN_1, id: "camp-2" }, 201);
          return undefined;
        },
      }),
    );

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));

    expect(await screen.findByText("Recette mobile v1")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("admin-tests-search"), {
      target: { value: "1" },
    });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("search=1"),
      );
      expect(call).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("create-campaign-btn"));
    fireEvent.change(screen.getByTestId("campaign-title-input"), {
      target: { value: "Nouvelle recette" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("campaign-save-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("campaign-save-btn"));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).endsWith("/admin/tests/campaigns") &&
          (i as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      expect(String((postCall?.[1] as RequestInit)?.body)).toContain(
        '"title":"Nouvelle recette"',
      );
    });
  });

  it("edits and deletes a campaign", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url, method) => {
          if (
            url.includes("/admin/tests/campaigns/camp-1") &&
            method === "PATCH"
          )
            return jsonResponse({ ...CAMPAIGN_1, title: "Recette mobile v2" });
          if (
            url.includes("/admin/tests/campaigns/camp-1") &&
            method === "DELETE"
          )
            return jsonResponse({});
          return undefined;
        },
      }),
    );

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));
    expect(await screen.findByText("Recette mobile v1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.change(screen.getByTestId("campaign-title-input"), {
      target: { value: "Recette mobile v2" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("campaign-save-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("campaign-save-btn"));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).includes("/admin/tests/campaigns/camp-1") &&
          (i as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(
      screen.getByText(/Supprimer "Recette mobile v1" ?/),
    ).toBeInTheDocument();
    const supprimerButtons = screen.getAllByRole("button", {
      name: "Supprimer",
    });
    fireEvent.click(supprimerButtons[supprimerButtons.length - 1]);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).includes("/admin/tests/campaigns/camp-1") &&
          (i as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it("opens campaign detail, recycles a case, and creates a new case", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url, method) => {
          if (
            url.includes("/admin/tests/cases/case-1/recycle") &&
            method === "POST"
          )
            return jsonResponse({});
          if (
            url.includes("/admin/tests/campaigns/camp-1/cases") &&
            method === "POST"
          )
            return jsonResponse({ id: "case-2" }, 201);
          return undefined;
        },
      }),
    );

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));
    fireEvent.click(await screen.findByText("Recette mobile v1"));

    expect(await screen.findByText("Connexion email")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("case-recycle-case-1"));
    await waitFor(() => {
      const recycleCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).includes("/admin/tests/cases/case-1/recycle") &&
          (i as RequestInit | undefined)?.method === "POST",
      );
      expect(recycleCall).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("create-case-btn"));
    fireEvent.change(screen.getByTestId("case-title-input"), {
      target: { value: "Réinitialisation mot de passe" },
    });
    fireEvent.change(screen.getByTestId("case-expected-result-input"), {
      target: { value: "Le mot de passe est réinitialisé" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("case-save-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("case-save-btn"));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).includes("/admin/tests/campaigns/camp-1/cases") &&
          (i as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("assigns and unassigns a tester from the campaign detail", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        assignments: [],
        extra: (url, method) => {
          if (
            url.includes("/admin/tests/campaigns/camp-1/assignments") &&
            method === "POST"
          )
            return jsonResponse(ASSIGNMENT_1, 201);
          if (
            url.includes("/admin/tests/assignments/assign-1") &&
            method === "DELETE"
          )
            return jsonResponse({});
          return undefined;
        },
      }),
    );

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-campaigns"));
    fireEvent.click(await screen.findByText("Recette mobile v1"));

    expect(
      await screen.findByText("Aucun testeur affecté."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("open-assign-btn"));
    fireEvent.change(screen.getByTestId("assign-tester-select"), {
      target: { value: "tester-1" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("assign-save-btn")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("assign-save-btn"));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([u, i]) =>
          String(u).includes("/admin/tests/campaigns/camp-1/assignments") &&
          (i as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
      expect(String((postCall?.[1] as RequestInit)?.body)).toContain(
        '"testerId":"tester-1"',
      );
    });
  });

  it("sends a quick message to a tester from the testers tab", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-testers"));

    expect(await screen.findByTestId("testers-table")).toBeInTheDocument();
    expect(screen.getByText("MBELE Valery")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Message rapide" }));
    fireEvent.change(screen.getByTestId("quick-message-subject"), {
      target: { value: "Merci de tester le module" },
    });
    fireEvent.change(screen.getByTestId("quick-message-body"), {
      target: { value: "Pouvez-vous rejouer la campagne ?" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("quick-message-send")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("quick-message-send"));

    await waitFor(() => {
      expect(createSchoolMessageMock).toHaveBeenCalledWith(
        "college-vogt",
        expect.objectContaining({
          subject: "Merci de tester le module",
          body: "Pouvez-vous rejouer la campagne ?",
          recipientUserIds: ["tester-1"],
        }),
      );
    });

    expect(await screen.findByTestId("quick-message-sent")).toBeInTheDocument();
  });

  it("searches testers by name", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter());

    render(<AdminTestsPage />);
    fireEvent.click(await screen.findByTestId("admin-tests-tab-testers"));
    expect(await screen.findByTestId("testers-table")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("testers-search"), {
      target: { value: "Valery" },
    });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/admin/tests/testers?search=Valery"),
      );
      expect(call).toBeDefined();
    });
  });
});
