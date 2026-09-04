import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestsPage from "./page";

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
    title: "Recette web v2.0",
    description: "Campagne de recette",
    targetVersion: "2.0.0",
    startsAt: null,
    dueAt: null,
    status: "ACTIVE",
    assignedToMe: true,
    summary: { totalCases: 4, completedCases: 1, totalExecutions: 1 },
  },
  {
    id: "camp-2",
    title: "Recette mobile v1.3",
    description: null,
    targetVersion: null,
    startsAt: null,
    dueAt: null,
    status: "ACTIVE",
    assignedToMe: false,
    summary: { totalCases: 2, completedCases: 2, totalExecutions: 2 },
  },
];

const TO_REDO = [
  {
    id: "case-1",
    title: "Cas à refaire",
    module: null,
    priority: "HIGH",
    evidenceRequired: false,
    campaign: { id: "camp-1", title: "Recette web v2.0" },
    reworkRequestedAt: "2026-08-01T10:00:00.000Z",
    reworkNote: "Merci de reprendre ce test",
    reworkRequestedByName: "Admin",
    lastExecutedAt: "2026-07-30T10:00:00.000Z",
  },
];

function mockFetch(isTester = true) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return jsonResponse({ isTester, onboardingHelpEnabled: false });
    }
    if (url.endsWith("/tests/campaigns")) {
      return jsonResponse(CAMPAIGNS);
    }
    if (url.endsWith("/tests/to-redo")) {
      return jsonResponse(TO_REDO);
    }
    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("TestsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a restricted message for non-tester users", async () => {
    mockFetch(false);
    render(<TestsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tests-restricted")).toBeInTheDocument();
    });
  });

  it("loads campaigns and shows the summary tab by default", async () => {
    mockFetch(true);
    render(<TestsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tests-summary-tab")).toBeInTheDocument();
    });

    expect(screen.getByTestId("tests-highlight-cta")).toHaveAttribute(
      "href",
      "/tests/camp-1",
    );
  });

  it("switches to the campaigns tab and lists campaigns", async () => {
    mockFetch(true);
    render(<TestsPage />);

    await waitFor(() =>
      expect(screen.getByTestId("tests-summary-tab")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("tests-tab-campaigns"));

    await waitFor(() => {
      expect(
        screen.getByTestId("test-campaign-card-camp-1"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tests-campaigns-mine-only"));

    await waitFor(() => {
      expect(
        screen.getByTestId("test-campaign-card-camp-2"),
      ).toBeInTheDocument();
    });
  });

  it("filters campaigns by search text", async () => {
    mockFetch(true);
    render(<TestsPage />);

    fireEvent.click(await screen.findByTestId("tests-tab-summary"));
    fireEvent.click(screen.getByTestId("tests-tab-campaigns"));
    await screen.findByTestId("test-campaign-card-camp-1");

    fireEvent.click(screen.getByTestId("tests-campaigns-mine-only"));
    fireEvent.change(screen.getByTestId("tests-campaigns-search"), {
      target: { value: "mobile" },
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("test-campaign-card-camp-1"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("test-campaign-card-camp-2"),
      ).toBeInTheDocument();
    });
  });

  it("shows the to-redo tab with the badge count", async () => {
    mockFetch(true);
    render(<TestsPage />);

    await screen.findByTestId("tests-summary-tab");
    expect(screen.getByTestId("tests-tab-toRedo").textContent).toContain("1");

    fireEvent.click(screen.getByTestId("tests-tab-toRedo"));

    await waitFor(() => {
      expect(screen.getByTestId("tests-to-redo-card-case-1")).toBeInTheDocument();
    });
  });
});
