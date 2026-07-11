import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminResourceModerationReviewPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();
let currentPart = "statement";

vi.mock("next/navigation", () => ({
  useParams: () => ({ submissionId: "sub-1" }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "resourceId") return "res-1";
      if (key === "part") return currentPart;
      return null;
    },
  }),
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("../../../components/layout/app-shell", () => ({
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

const SUPER_ADMIN_ME = {
  platformRoles: ["SUPER_ADMIN"],
  activeRole: "SUPER_ADMIN",
};

const RESOURCE_DETAIL = {
  id: "res-1",
  title: "Contrôle chapitre 3",
  examType: "SEQUENCE_TEST",
  sequence: "SEQ_1",
  academicYearLabel: "2025-2026",
  school: { id: "school-1", name: "École Test" },
  academicLevel: { id: "level-1", label: "6ème" },
  subject: { id: "subject-1", name: "Mathématiques" },
  statementContent: "<p>Voici l'énoncé complet</p>",
  statementStatus: "APPROVED" as const,
  attachments: [
    {
      id: "att-1",
      part: "STATEMENT" as const,
      fileName: "sujet.pdf",
      fileUrl: "https://files.example.com/sujet.pdf",
    },
  ],
};

const SUBMISSION = {
  id: "sub-1",
  content: "<p>Voici le corrigé proposé</p>",
  authorUser: { id: "teacher-2", firstName: "Léa", lastName: "Dupont" },
  attachments: [
    {
      id: "att-9",
      part: "CORRECTION" as const,
      fileName: "correction-scanne.pdf",
      fileUrl: "https://files.example.com/correction-scanne.pdf",
    },
  ],
};

function baseRouter({
  me = SUPER_ADMIN_ME,
  submissions = [SUBMISSION] as unknown[],
  resource = RESOURCE_DETAIL as unknown,
  extra,
}: {
  me?: unknown;
  submissions?: unknown[];
  resource?: unknown;
  extra?: (url: string, method: string) => Promise<Response> | undefined;
} = {}) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    const extraResult = extra?.(url, method);
    if (extraResult) return extraResult;

    if (url.endsWith("/me")) return jsonResponse(me);
    if (url.endsWith("/resources/res-1")) return jsonResponse(resource);
    if (url.includes("/resources/res-1/submissions") && method === "GET") {
      return jsonResponse(submissions);
    }
    return jsonResponse({}, 404);
  };
}

describe("AdminResourceModerationReviewPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
    currentPart = "correction";
  });

  it("shows the reference statement and the proposed correction content", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(baseRouter());

    render(<AdminResourceModerationReviewPage />);

    expect(
      await screen.findByTestId("admin-resources-review-reference"),
    ).toHaveTextContent("Voici l'énoncé complet");
    expect(
      screen.getByTestId("admin-resources-review-content"),
    ).toHaveTextContent("Voici le corrigé proposé");
    expect(screen.getByText(/Léa Dupont/)).toBeInTheDocument();
  });

  it("shows a not-approved message instead of the reference when the statement isn't approved", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        resource: { ...RESOURCE_DETAIL, statementStatus: "PENDING" },
      }),
    );

    render(<AdminResourceModerationReviewPage />);

    await screen.findByTestId("admin-resources-review-content");
    expect(
      screen.queryByTestId("admin-resources-review-reference"),
    ).not.toBeInTheDocument();
  });

  it("shows a not-found message when the submission is no longer awaiting review", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({ submissions: [] }),
    );

    render(<AdminResourceModerationReviewPage />);

    expect(
      await screen.findByTestId("admin-resources-review-notfound"),
    ).toBeInTheDocument();
  });

  it("approves the submission and navigates back to the list", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      baseRouter({
        extra: (url, method) => {
          if (
            url.includes("/admin/resources/submissions/sub-1/approve") &&
            method === "PATCH"
          ) {
            return jsonResponse({ id: "res-1" });
          }
          return undefined;
        },
      }),
    );

    render(<AdminResourceModerationReviewPage />);
    await screen.findByTestId("admin-resources-review-content");

    fireEvent.click(screen.getByTestId("admin-resources-review-approve"));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) =>
        String(u).includes("/submissions/sub-1/approve"),
      );
      expect(call).toBeDefined();
    });
    expect(pushMock).toHaveBeenCalledWith("/admin-resources");
  });

  it("rejects the submission with the reason typed", async () => {
    let rejectBody: string | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/me")) return jsonResponse(SUPER_ADMIN_ME);
      if (url.endsWith("/resources/res-1"))
        return jsonResponse(RESOURCE_DETAIL);
      if (url.includes("/resources/res-1/submissions") && method === "GET") {
        return jsonResponse([SUBMISSION]);
      }
      if (
        url.includes("/admin/resources/submissions/sub-1/reject") &&
        method === "PATCH"
      ) {
        rejectBody = init?.body as string | undefined;
        return jsonResponse({ id: "sub-1", status: "REJECTED" });
      }
      return jsonResponse({}, 404);
    });

    render(<AdminResourceModerationReviewPage />);
    await screen.findByTestId("admin-resources-review-content");

    fireEvent.change(
      screen.getByTestId("admin-resources-review-reject-reason"),
      { target: { value: "Corrigé incomplet" } },
    );
    fireEvent.click(screen.getByTestId("admin-resources-review-reject"));

    await waitFor(() => {
      expect(rejectBody).toBe(JSON.stringify({ reason: "Corrigé incomplet" }));
    });
    expect(pushMock).toHaveBeenCalledWith("/admin-resources");
  });

  it("shows a conflict message and reloads when another admin already handled it", async () => {
    let approveCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/me")) return jsonResponse(SUPER_ADMIN_ME);
      if (url.endsWith("/resources/res-1"))
        return jsonResponse(RESOURCE_DETAIL);
      if (url.includes("/resources/res-1/submissions") && method === "GET") {
        return jsonResponse([SUBMISSION]);
      }
      if (
        url.includes("/admin/resources/submissions/sub-1/approve") &&
        method === "PATCH"
      ) {
        approveCalls += 1;
        return jsonResponse({}, 409);
      }
      return jsonResponse({}, 404);
    });

    render(<AdminResourceModerationReviewPage />);
    await screen.findByTestId("admin-resources-review-content");

    fireEvent.click(screen.getByTestId("admin-resources-review-approve"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Cette soumission a deja ete traitee par un autre administrateur.",
        ),
      ).toBeInTheDocument();
    });
    expect(approveCalls).toBe(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("lets the platform admin edit the proposed content before approving", async () => {
    let editBody: string | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/me")) return jsonResponse(SUPER_ADMIN_ME);
      if (url.endsWith("/resources/res-1"))
        return jsonResponse(RESOURCE_DETAIL);
      if (url.includes("/resources/res-1/submissions") && method === "GET") {
        return jsonResponse([SUBMISSION]);
      }
      if (
        url.endsWith("/admin/resources/submissions/sub-1") &&
        method === "PATCH"
      ) {
        editBody = init?.body as string | undefined;
        return jsonResponse({
          ...SUBMISSION,
          content: "<p>Corrigé par la plateforme</p>",
        });
      }
      return jsonResponse({}, 404);
    });

    render(<AdminResourceModerationReviewPage />);
    await screen.findByTestId("admin-resources-review-content");

    fireEvent.click(screen.getByTestId("admin-resources-review-edit-start"));
    fireEvent.change(
      screen.getByTestId("admin-resources-review-edit-textarea"),
      { target: { value: "<p>Corrigé par la plateforme</p>" } },
    );
    fireEvent.click(screen.getByTestId("admin-resources-review-edit-save"));

    await waitFor(() => {
      expect(editBody).toBe(
        JSON.stringify({
          content: "<p>Corrigé par la plateforme</p>",
          attachments: SUBMISSION.attachments,
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("admin-resources-review-content"),
      ).toHaveTextContent("Corrigé par la plateforme");
    });
  });
});
