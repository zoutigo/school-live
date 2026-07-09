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
};

function baseRouter({
  me = ME,
  items = [ASSESSMENT_ITEM] as unknown[],
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
    if (url.includes("/resources/catalog")) return jsonResponse(CATALOG);
    if (url.includes("/resources/schools")) return jsonResponse(SCHOOLS);
    if (url.includes("/resources?")) {
      return jsonResponse({ items, total: items.length });
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
});
