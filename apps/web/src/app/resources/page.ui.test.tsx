import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResourcesBrowsePage from "./page";

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

const ME = { platformRoles: [] };

const CATALOG = {
  academicLevels: [{ id: "level-1", label: "6ème" }],
  subjects: [{ id: "subject-1", name: "Mathématiques" }],
};

const SCHOOLS = [{ id: "school-1", name: "École Test" }];

const ASSESSMENT_ITEM = {
  id: "res-1",
  kind: "ASSESSMENT",
  title: "Contrôle chapitre 3",
  examType: "SEQUENCE_TEST",
  sequence: "SEQ_1",
  academicYearLabel: "2025-2026",
  school: { id: "school-1", name: "École Test" },
  academicLevel: { id: "level-1", label: "6ème" },
  subject: { id: "subject-1", name: "Mathématiques" },
  correctionContent: null,
  correctionStatus: "PENDING" as const,
};

function baseRouter({
  me = ME,
  items = [ASSESSMENT_ITEM] as unknown[],
  total,
  extra,
}: {
  me?: unknown;
  items?: unknown[];
  total?: number;
  extra?: (url: string, method: string) => Promise<Response> | undefined;
} = {}) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    const extraResult = extra?.(url, method);
    if (extraResult) return extraResult;

    if (url.endsWith("/me")) return jsonResponse(me);
    if (url.includes("/resources/catalog")) return jsonResponse(CATALOG);
    if (url.includes("/resources/schools")) return jsonResponse(SCHOOLS);
    if (url.includes("/resources?")) {
      const params = new URL(url, "http://localhost").searchParams;
      const page = Number(params.get("page") ?? "1");
      const limit = Number(params.get("limit") ?? "20");
      return jsonResponse({
        items,
        total: total ?? items.length,
        page,
        limit,
      });
    }
    return jsonResponse({}, 404);
  };
}

describe("ResourcesBrowsePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("redirects home when /me fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me")) return jsonResponse({}, 401);
      return jsonResponse({}, 404);
    });

    render(<ResourcesBrowsePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("lists assessments for any authenticated role, with the academic year shown", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);

    expect(
      await screen.findByTestId("resources-card-res-1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Contrôle chapitre 3")).toBeInTheDocument();
    expect(
      screen.getByTestId("resources-card-res-1-academic-year"),
    ).toHaveTextContent("2025-2026");
  });

  it("shows the empty state when nothing matches", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter({ items: [] }));

    render(<ResourcesBrowsePage />);

    expect(await screen.findByTestId("resources-empty")).toBeInTheDocument();
  });

  it("hides the filter panel until the search button is toggled", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");

    expect(screen.queryByTestId("resources-filter-panel")).toBeNull();

    fireEvent.click(screen.getByTestId("resources-search-toggle"));
    expect(screen.getByTestId("resources-filter-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("resources-search-toggle"));
    expect(screen.queryByTestId("resources-filter-panel")).toBeNull();
  });

  it("hides the sequence filter on the Exams tab", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");
    fireEvent.click(screen.getByTestId("resources-search-toggle"));
    expect(screen.getByTestId("resources-filter-sequence")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("resources-tab-EXAM"));
    await waitFor(() =>
      expect(screen.queryByTestId("resources-filter-sequence")).toBeNull(),
    );
  });

  it("applies the school filter and refetches with schoolId", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");
    fireEvent.click(screen.getByTestId("resources-search-toggle"));

    fireEvent.change(screen.getByTestId("resources-filter-school"), {
      target: { value: "school-1" },
    });

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("schoolId=school-1"),
      );
      expect(call).toBeDefined();
    });
  });

  it("reset clears every filter and reloads without any criteria", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");
    fireEvent.click(screen.getByTestId("resources-search-toggle"));

    fireEvent.change(screen.getByTestId("resources-filter-school"), {
      target: { value: "school-1" },
    });
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("schoolId=school-1"),
      );
      expect(call).toBeDefined();
    });

    expect(screen.getByTestId("resources-filter-reset")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("resources-filter-reset"));

    await waitFor(() => {
      const call = fetchMock.mock.calls
        .filter(([u]) => String(u).includes("/resources?"))
        .at(-1);
      expect(String(call?.[0])).not.toContain("schoolId=");
    });
    expect(screen.getByTestId("resources-filter-reset")).toBeDisabled();
  });

  it("expands a card to show its statement content", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url) => {
          if (url.endsWith("/resources/res-1")) {
            return jsonResponse({
              ...ASSESSMENT_ITEM,
              statementContent: "<p>Enoncé complet</p>",
              correctionContent: null,
            });
          }
          return undefined;
        },
      }),
    );

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");

    fireEvent.click(screen.getByTestId("resources-card-res-1-toggle"));

    await waitFor(() =>
      expect(screen.getByText("Enoncé complet")).toBeInTheDocument(),
    );
  });

  it("expands a card with no approved statement yet and shows the fallback message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url) => {
          if (url.endsWith("/resources/res-1")) {
            return jsonResponse({
              ...ASSESSMENT_ITEM,
              statementContent: null,
              correctionContent: null,
            });
          }
          return undefined;
        },
      }),
    );

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");

    fireEvent.click(screen.getByTestId("resources-card-res-1-toggle"));

    await waitFor(() =>
      expect(
        screen.getByText("Aucun enonce valide pour le moment."),
      ).toBeInTheDocument(),
    );
  });

  it("shows a « correction available » badge when the correction is approved", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        items: [
          {
            ...ASSESSMENT_ITEM,
            correctionContent: "<p>Corrigé</p>",
            correctionStatus: "APPROVED",
          },
        ],
      }),
    );

    render(<ResourcesBrowsePage />);

    expect(
      await screen.findByTestId("resources-card-res-1-correction-badge"),
    ).toBeInTheDocument();
  });

  it("hides the « correction available » badge when the correction is not approved", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");

    expect(
      screen.queryByTestId("resources-card-res-1-correction-badge"),
    ).toBeNull();
  });

  it("requests page/limit and paginates beyond the first page", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter({ total: 45 }));

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");

    const firstCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/resources?"),
    );
    expect(String(firstCall?.[0])).toContain("page=1");
    expect(String(firstCall?.[0])).toContain("limit=20");

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls
        .filter(([u]) => String(u).includes("/resources?"))
        .at(-1);
      expect(String(call?.[0])).toContain("page=2");
    });
  });

  it("resets to page 1 when switching tabs or applying a filter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(baseRouter({ total: 45 }));

    render(<ResourcesBrowsePage />);
    await screen.findByTestId("resources-card-res-1");
    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    await waitFor(() => {
      const call = fetchMock.mock.calls
        .filter(([u]) => String(u).includes("/resources?"))
        .at(-1);
      expect(String(call?.[0])).toContain("page=2");
    });

    fireEvent.click(screen.getByTestId("resources-tab-EXAM"));

    await waitFor(() => {
      const call = fetchMock.mock.calls
        .filter(([u]) => String(u).includes("/resources?"))
        .at(-1);
      expect(String(call?.[0])).toContain("page=1");
      expect(String(call?.[0])).toContain("kind=EXAM");
    });
  });
});
