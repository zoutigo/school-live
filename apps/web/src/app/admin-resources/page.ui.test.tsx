import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminResourcesPage from "./page";

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

const SUPER_ADMIN_ME = { platformRoles: ["SUPER_ADMIN"] };

const PENDING_ASSESSMENT = {
  id: "res-1",
  kind: "ASSESSMENT",
  title: "Contrôle chapitre 3",
  examType: "SEQUENCE_TEST",
  sequence: "SEQ_1",
  statementStatus: "PENDING",
  correctionStatus: "PENDING",
  correctionContent: null,
  school: { id: "school-1", name: "École Test" },
  academicLevel: { id: "level-1", label: "6ème" },
  subject: { id: "subject-1", name: "Mathématiques" },
  authorUser: { id: "teacher-1", firstName: "Paul", lastName: "Martin" },
  createdAt: "2026-07-01T10:00:00.000Z",
};

function baseRouter({
  me = SUPER_ADMIN_ME,
  items = [PENDING_ASSESSMENT] as unknown[],
  extra,
}: {
  me?: unknown;
  items?: unknown[];
  extra?: (url: string, method: string) => Promise<Response> | undefined;
} = {}) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    const extraResult = extra?.(url, method);
    if (extraResult) return extraResult;

    if (url.endsWith("/me")) return jsonResponse(me);
    if (url.includes("/admin/resources"))
      return jsonResponse({ items, total: items.length });
    return jsonResponse({}, 404);
  };
}

describe("AdminResourcesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("redirects a non platform role away", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({ me: { platformRoles: [] } }),
    );

    render(<AdminResourcesPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/acceuil");
    });
  });

  it("redirects home when /me fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) return jsonResponse({}, 401);
      return jsonResponse({}, 404);
    });

    render(<AdminResourcesPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("lists pending statements by default for a SUPER_ADMIN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<AdminResourcesPage />);

    expect(
      await screen.findByTestId("admin-resources-card-res-1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Contrôle chapitre 3")).toBeInTheDocument();
  });

  it("switches to the correction tab and reloads with part=correction", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter());

    render(<AdminResourcesPage />);
    await screen.findByTestId("admin-resources-card-res-1");

    fireEvent.click(screen.getByTestId("admin-resources-tab-correction"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("part=correction"),
      );
      expect(call).toBeDefined();
    });
  });

  it("approves a statement", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url, method) => {
          if (
            url.includes("/admin/resources/res-1/statement/approve") &&
            method === "PATCH"
          ) {
            return jsonResponse({ id: "res-1" });
          }
          return undefined;
        },
      }),
    );

    render(<AdminResourcesPage />);
    await screen.findByTestId("admin-resources-card-res-1");

    fireEvent.click(screen.getByTestId("admin-resources-approve-res-1"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/statement/approve"),
      );
      expect(call).toBeDefined();
    });
  });

  it("rejects a statement with an optional reason", async () => {
    let rejectBody: string | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/me")) return jsonResponse(SUPER_ADMIN_ME);
      if (url.includes("/admin/resources") && method === "GET") {
        return jsonResponse({ items: [PENDING_ASSESSMENT], total: 1 });
      }
      if (
        url.includes("/admin/resources/res-1/statement/reject") &&
        method === "PATCH"
      ) {
        rejectBody = init?.body as string | undefined;
        return jsonResponse({ id: "res-1" });
      }
      return jsonResponse({}, 404);
    });

    render(<AdminResourcesPage />);
    await screen.findByTestId("admin-resources-card-res-1");

    fireEvent.click(screen.getByTestId("admin-resources-reject-res-1"));
    fireEvent.change(
      screen.getByTestId("admin-resources-reject-reason-res-1"),
      { target: { value: "Contenu incomplet" } },
    );
    fireEvent.click(screen.getByTestId("admin-resources-reject-confirm-res-1"));

    await waitFor(() => {
      expect(rejectBody).toBe(
        JSON.stringify({ reason: "Contenu incomplet" }),
      );
    });
  });

  it("shows the empty state when there is nothing pending", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({ items: [] }),
    );

    render(<AdminResourcesPage />);

    expect(await screen.findByTestId("admin-resources-empty")).toBeInTheDocument();
  });
});
