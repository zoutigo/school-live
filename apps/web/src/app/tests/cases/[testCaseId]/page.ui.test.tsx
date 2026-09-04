import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestCaseDetailPage from "./page";

const routerRefresh = vi.fn();

vi.mock("../../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ testCaseId: "case-2" }),
  useRouter: () => ({ refresh: routerRefresh }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const CASE_DETAIL = {
  id: "case-2",
  title: "Réinitialiser le mot de passe",
  module: null,
  objective: "Vérifier le flux de récupération",
  preconditions: "Compte existant",
  steps: ["Ouvrir la page de connexion", "Cliquer sur mot de passe oublié"],
  expectedResult: "Un email est envoyé",
  orderIndex: 0,
  priority: "MEDIUM",
  evidenceRequired: false,
  dueAt: null,
  campaign: {
    id: "camp-1",
    title: "Recette web v2.0",
    dueAt: null,
    targetVersion: "2.0.0",
  },
  audienceRoles: [],
  latestOwnExecution: null,
  executionSummary: { totalExecutions: 0, passed: 0, failed: 0, blocked: 0 },
  completedByUsers: [],
  executions: [],
};

describe("TestCaseDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    routerRefresh.mockReset();
  });

  it("submits a test result and confirms success", async () => {
    const createExecutionCalls: Array<{ hasStatus: boolean }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/tests/cases/case-2") && method === "GET") {
        return jsonResponse(CASE_DETAIL);
      }
      if (url.endsWith("/tests/cases/case-2/executions") && method === "POST") {
        createExecutionCalls.push({ hasStatus: true });
        return jsonResponse({
          id: "exec-9",
          status: "PASSED",
          resultText: "OK",
          comment: null,
          deviceInfo: "web",
          appVersion: null,
          executedAt: "2026-08-01T10:00:00.000Z",
          attachments: [],
        });
      }
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<TestCaseDetailPage />);

    await waitFor(() =>
      expect(screen.getByTestId("test-case-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("tests-submit-result-btn"));
    await screen.findByTestId("tests-submit-form");

    fireEvent.click(screen.getByTestId("tests-submit-btn"));
    expect(
      await screen.findByText("Sélectionnez un statut avant d'enregistrer."),
    ).toBeInTheDocument();
    expect(createExecutionCalls).toHaveLength(0);

    fireEvent.change(screen.getByTestId("tests-submit-status"), {
      target: { value: "PASSED" },
    });
    fireEvent.change(screen.getByTestId("tests-result-input"), {
      target: { value: "Tout fonctionne comme attendu" },
    });
    fireEvent.click(screen.getByTestId("tests-submit-btn"));

    await waitFor(() => expect(createExecutionCalls).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByText("Résultat enregistré")).toBeInTheDocument(),
    );
  });

  it("blocks submission when evidence is required but no attachment is added", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/tests/cases/case-2")) {
        return jsonResponse({ ...CASE_DETAIL, evidenceRequired: true });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TestCaseDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId("test-case-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("tests-submit-result-btn"));
    await screen.findByTestId("tests-submit-form");

    fireEvent.change(screen.getByTestId("tests-submit-status"), {
      target: { value: "PASSED" },
    });
    fireEvent.change(screen.getByTestId("tests-result-input"), {
      target: { value: "Résultat sans capture" },
    });
    fireEvent.click(screen.getByTestId("tests-submit-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Ce test exige au moins une capture en preuve."),
      ).toBeInTheDocument();
    });
  });
});
