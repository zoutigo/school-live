import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestExecutionDetailPage from "./page";

vi.mock("../../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ executionId: "exec-1" }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const EXECUTION_DETAIL = {
  id: "exec-1",
  status: "PASSED",
  resultText: "Connexion réussie",
  comment: "RAS",
  executedAt: "2026-08-01T10:00:00.000Z",
  adminReviewedAt: null,
  adminReviewNote: null,
  reworkRequestedAt: null,
  reworkNote: null,
  user: { id: "user-1", fullName: "Jeanne Testeuse" },
  adminReviewedBy: null,
  reworkRequestedBy: null,
  testCase: { id: "case-1", title: "Se connecter" },
  campaign: { id: "camp-1", title: "Recette web v2.0" },
  deviceInfo: "web",
  appVersion: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  attachments: [],
};

describe("TestExecutionDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(isTester = true) {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/me")) {
        return jsonResponse({ isTester, platformRoles: [] });
      }
      if (url.endsWith("/tests/executions/exec-1") && method === "GET") {
        return jsonResponse(EXECUTION_DETAIL);
      }
      if (url.endsWith("/tests/executions/exec-1") && method === "PATCH") {
        return jsonResponse({ ...EXECUTION_DETAIL, resultText: "Mis à jour" });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("shows execution details and hides the edit button for non-testers", async () => {
    mockFetch(false);
    render(<TestExecutionDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("test-execution-detail")).toBeInTheDocument();
    });
    expect(screen.getByText("Se connecter")).toBeInTheDocument();
    expect(screen.queryByTestId("execution-edit-btn")).not.toBeInTheDocument();
  });

  it("lets a tester edit and save the result", async () => {
    mockFetch(true);
    render(<TestExecutionDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("execution-edit-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("execution-edit-btn"));
    await screen.findByTestId("edit-execution-form");

    fireEvent.change(screen.getByTestId("edit-execution-result-input"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByTestId("edit-execution-submit-btn"));
    expect(
      await screen.findByTestId("edit-execution-result-error"),
    ).toHaveTextContent("Le résultat est obligatoire.");

    fireEvent.change(screen.getByTestId("edit-execution-result-input"), {
      target: { value: "Nouveau résultat" },
    });
    fireEvent.click(screen.getByTestId("edit-execution-submit-btn"));

    await waitFor(() => {
      expect(screen.getByText("Résultat mis à jour")).toBeInTheDocument();
    });
  });
});
