import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformMessageriePage from "./page";

const pushMock = vi.fn();
let searchParamsStore: Record<string, string> = {};

vi.mock("next/navigation", () => ({
  usePathname: () => "/messagerie",
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore[key] ?? null,
  }),
}));

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-test",
}));

const INBOX_MESSAGE = {
  id: "msg-inbox-1",
  folder: "inbox",
  subject: "Question école A",
  preview: "Bonjour, besoin d'aide",
  createdAt: "2026-01-10T10:00:00Z",
  sentAt: "2026-01-10T10:00:00Z",
  unread: true,
  sender: {
    id: "u-1",
    firstName: "Alice",
    lastName: "Martin",
    email: "alice@school.cm",
  },
  school: { slug: "ecole-a", name: "École A" },
  recipientsCount: 1,
  attachments: [],
};

const DETAIL_INBOX = {
  id: "msg-inbox-1",
  subject: "Question école A",
  body: "<p>Corps du message</p>",
  status: "SENT" as const,
  createdAt: "2026-01-10T10:00:00Z",
  sentAt: "2026-01-10T10:00:00Z",
  sender: INBOX_MESSAGE.sender,
  school: INBOX_MESSAGE.school,
  attachments: [],
};

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function makeFetchMock(options: {
  messages?: unknown[];
  archiveSuccess?: boolean;
}) {
  const { messages = [INBOX_MESSAGE], archiveSuccess = true } = options;

  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url.includes("/admin/messages/unread-count")) {
      return jsonResponse({ unread: 1 });
    }

    if (/\/admin\/messages\/[^/?]+\/archive$/.test(url)) {
      return archiveSuccess
        ? jsonResponse({ success: true })
        : jsonResponse({ message: "Archive failed" }, 500);
    }

    if (/\/admin\/messages\/[^/?]+\/read$/.test(url)) {
      return jsonResponse({ success: true });
    }

    const detailMatch = url.match(/\/admin\/messages\/([^/?]+)$/);
    if (detailMatch) {
      return detailMatch[1] === "msg-inbox-1"
        ? jsonResponse(DETAIL_INBOX)
        : jsonResponse({ message: "Not found" }, 404);
    }

    if (url.includes("/admin/messages?")) {
      if (url.includes("folder=drafts") || url.includes("folder=archive")) {
        return jsonResponse({
          items: [],
          meta: { total: 0, page: 1, limit: 1, totalPages: 1 },
        });
      }
      return jsonResponse({
        items: messages,
        meta: { page: 1, limit: 50, total: messages.length, totalPages: 1 },
      });
    }

    return jsonResponse({});
  });
}

describe("PlatformMessageriePage — mailbox agrégée admin/super-admin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    searchParamsStore = {};
  });

  it("charge la boîte de réception au démarrage sans avoir besoin d'un schoolSlug", async () => {
    makeFetchMock({});
    render(<PlatformMessageriePage />);
    await screen.findByText("Question école A");
  });

  it("affiche l'école d'origine à côté de l'expéditeur", async () => {
    makeFetchMock({});
    render(<PlatformMessageriePage />);
    await screen.findByText(/Martin Alice.*École A/);
  });

  it("archive un message depuis l'inbox agrégée", async () => {
    const fetchSpy = makeFetchMock({});
    render(<PlatformMessageriePage />);
    await screen.findByText("Question école A");

    const archiveBtn = await screen.findByLabelText("Archiver");
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      const archiveCalls = fetchSpy.mock.calls.filter(([url]) =>
        /\/admin\/messages\/[^/?]+\/archive$/.test(String(url)),
      );
      expect(archiveCalls.length).toBeGreaterThan(0);
    });
  });

  it("le bouton composer redirige vers /messagerie/nouveau", async () => {
    makeFetchMock({});
    render(<PlatformMessageriePage />);
    await screen.findByText("Question école A");

    const composeButtons = screen.getAllByRole("button", {
      name: /nouveau message|compose/i,
    });
    fireEvent.click(composeButtons[0]);

    expect(pushMock).toHaveBeenCalledWith("/messagerie/nouveau");
  });
});
