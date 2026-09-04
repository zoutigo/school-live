import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestCampaignDetailPage from "./page";

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ campaignId: "camp-1" }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const CAMPAIGN_DETAIL = {
  id: "camp-1",
  title: "Recette web v2.0",
  description: "Campagne de recette",
  targetVersion: "2.0.0",
  startsAt: null,
  dueAt: null,
  status: "ACTIVE",
  summary: { totalCases: 2, completedCases: 1 },
  testCases: [
    {
      id: "case-1",
      title: "Se connecter",
      module: "Auth",
      expectedResult: "L'utilisateur est connecté",
      priority: "HIGH",
      dueAt: null,
      evidenceRequired: false,
      totalExecutions: 1,
      latestExecution: {
        id: "exec-1",
        status: "PASSED",
        executedAt: "2026-08-01T10:00:00.000Z",
      },
    },
    {
      id: "case-2",
      title: "Réinitialiser le mot de passe",
      module: null,
      expectedResult: "Un email est envoyé",
      priority: "MEDIUM",
      dueAt: null,
      evidenceRequired: true,
      totalExecutions: 0,
      latestExecution: null,
    },
  ],
};

describe("TestCampaignDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays the campaign hero and its test cases", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/tests/campaigns/camp-1")) {
        return jsonResponse(CAMPAIGN_DETAIL);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TestCampaignDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("campaign-hero")).toBeInTheDocument();
    });

    expect(screen.getByTestId("test-case-card-case-1")).toHaveTextContent(
      "Consulter",
    );
    expect(screen.getByTestId("test-case-card-case-2")).toHaveTextContent(
      "Démarrer",
    );
    expect(
      screen.getByTestId("test-case-card-case-1").getAttribute("href"),
    ).toBe("/tests/cases/case-1");
  });

  it("shows an error message when the campaign cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({ message: "Campagne introuvable" }, 404),
    );

    render(<TestCampaignDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tests-campaign-error")).toHaveTextContent(
        "Campagne introuvable",
      );
    });
  });
});
