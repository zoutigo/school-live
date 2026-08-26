import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildMessagerieMessagePage from "./page";

vi.mock("../../../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-test",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    childId: "child-1",
    messageId: "msg-1",
  }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockFetchDefault() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/me")) {
      return jsonResponse({
        role: "PARENT",
        linkedStudents: [
          { id: "child-1", firstName: "Nathan", lastName: "Mbele" },
        ],
      });
    }
    if (url.includes("/messages/msg-1/read")) {
      return jsonResponse({ success: true });
    }
    if (url.includes("/messages/msg-1")) {
      return jsonResponse({
        id: "msg-1",
        subject: "Reunion parents-profs",
        body: "<p>Bonjour, la reunion aura lieu vendredi.</p>",
        status: "SENT",
        createdAt: "2026-01-10T10:00:00.000Z",
        sentAt: "2026-01-10T10:00:00.000Z",
        sender: { id: "u1", firstName: "Alice", lastName: "Martin" },
        attachments: [],
        recipients: [],
      });
    }
    return jsonResponse({}, 404);
  });
}

describe("ChildMessagerieMessagePage — consultation seule pour le parent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche le message sans aucune action (repondre/transferer/archiver/supprimer)", async () => {
    mockFetchDefault();

    render(<ChildMessagerieMessagePage />);

    await waitFor(() => {
      expect(screen.getByText("Reunion parents-profs")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /repondre/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /transferer/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /archiver/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /supprimer/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /marquer/i }),
    ).not.toBeInTheDocument();
  });
});
