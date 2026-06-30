import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MessagingPage from "./page";

// ── Navigation / routing mocks ─────────────────────────────────────────────

const pushMock = vi.fn();
const replaceMock = vi.fn();
let searchParamsStore: Record<string, string> = {};

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore[key] ?? null,
  }),
}));

vi.mock("../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-test",
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

// List-level fixture (from listSchoolMessages)
const INBOX_MESSAGE = {
  id: "msg-inbox-1",
  folder: "inbox",
  subject: "Réunion parents",
  preview: "Nous vous invitons",
  createdAt: "2026-01-10T10:00:00Z",
  sentAt: "2026-01-10T10:00:00Z",
  unread: true,
  sender: { id: "u-1", firstName: "Alice", lastName: "Martin", email: "alice@school.cm" },
  recipientsCount: 1,
  mailboxEntryId: "me-1",
  attachments: [],
};

const ARCHIVE_INBOX_MSG = {
  ...INBOX_MESSAGE,
  id: "msg-arch-inbox-1",
  folder: "inbox",
  subject: "Message archivé reçu",
  unread: false,
};

const ARCHIVE_SENT_MSG = {
  id: "msg-arch-sent-1",
  folder: "sent",
  subject: "Message archivé envoyé",
  preview: "Aperçu",
  createdAt: "2026-01-08T08:00:00Z",
  sentAt: "2026-01-08T08:00:00Z",
  unread: false,
  sender: null,
  recipientsCount: 2,
  attachments: [],
};

// Detail-level fixtures (from getSchoolMessage — shape expected by mapDetailToUi)
const makeDetail = (id: string, subject: string, sender: { id: string; firstName: string; lastName: string; email: string } | null = null) => ({
  id,
  subject,
  body: `<p>Corps du message ${subject}</p>`,
  status: "SENT" as const,
  createdAt: "2026-01-10T10:00:00Z",
  sentAt: "2026-01-10T10:00:00Z",
  sender,
  attachments: [],
});

const ALICE = { id: "u-1", firstName: "Alice", lastName: "Martin", email: "alice@school.cm" };

const DETAIL_INBOX = makeDetail("msg-inbox-1", "Réunion parents", ALICE);
const DETAIL_ARCHIVE_INBOX = makeDetail("msg-arch-inbox-1", "Message archivé reçu", ALICE);
const DETAIL_ARCHIVE_SENT = makeDetail("msg-arch-sent-1", "Message archivé envoyé");

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// ── Fetch mock ─────────────────────────────────────────────────────────────
//
// URL patterns used by messaging-api.ts:
//  - /schools/{slug}/me                          → profile
//  - /schools/{slug}/messages/unread-count       → unread badge
//  - /schools/{slug}/messages?folder=…           → list
//  - /schools/{slug}/messages/{id}               → detail (no trailing segment)
//  - /schools/{slug}/messages/{id}/archive       → archive toggle
//  - /schools/{slug}/messages/{id}/read          → mark read
//  - /schools/{slug}/messages/{id}/delete        → delete

function makeFetchMock(options: {
  folder?: string;
  messages?: unknown[];
  archiveSuccess?: boolean;
  details?: Record<string, unknown>;
}) {
  const { folder = "inbox", messages, archiveSuccess = true, details = {} } = options;

  const defaultMessages =
    folder === "inbox"
      ? [INBOX_MESSAGE]
      : folder === "archive"
        ? [ARCHIVE_INBOX_MSG]
        : [];

  const resolvedMessages = messages ?? defaultMessages;

  // Default detail map covers fixtures used in tests
  const defaultDetails: Record<string, unknown> = {
    "msg-inbox-1": DETAIL_INBOX,
    "msg-arch-inbox-1": DETAIL_ARCHIVE_INBOX,
    "msg-arch-sent-1": DETAIL_ARCHIVE_SENT,
    ...details,
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ role: "PARENT", schoolName: "Collège Vogt" });
    }

    if (url.includes("/messages/unread-count")) {
      return jsonResponse({ unread: 1 });
    }

    // Archive action: /messages/{id}/archive
    if (/\/messages\/[^/?]+\/archive$/.test(url)) {
      return archiveSuccess
        ? jsonResponse({ success: true })
        : jsonResponse({ message: "Archive failed" }, 500);
    }

    // Mark-read action: /messages/{id}/read
    if (/\/messages\/[^/?]+\/read$/.test(url)) {
      return jsonResponse({ success: true });
    }

    // Message detail: /messages/{id} (no further segment, no query params)
    const detailMatch = url.match(/\/messages\/([^/?]+)$/);
    if (detailMatch) {
      const detail = defaultDetails[detailMatch[1]];
      return detail ? jsonResponse(detail) : jsonResponse({ message: "Not found" }, 404);
    }

    // Message list: /messages?folder=… or /messages&…
    if (url.includes("/messages?") || url.includes("/messages&")) {
      if (url.includes("folder=drafts")) {
        return jsonResponse({ items: [], meta: { total: 0, page: 1, limit: 1, totalPages: 1 } });
      }
      if (url.includes("folder=archive")) {
        return jsonResponse({
          items: folder === "archive" ? resolvedMessages : [],
          meta: {
            page: 1,
            limit: folder === "archive" ? 50 : 1,
            total: folder === "archive" ? resolvedMessages.length : 0,
            totalPages: 1,
          },
        });
      }
      if (url.includes("folder=inbox")) {
        return jsonResponse({
          items: folder === "inbox" ? resolvedMessages : [INBOX_MESSAGE],
          meta: {
            page: 1,
            limit: 50,
            total: folder === "inbox" ? resolvedMessages.length : 1,
            totalPages: 1,
          },
        });
      }
      return jsonResponse({ items: resolvedMessages, meta: { page: 1, limit: 50, total: resolvedMessages.length, totalPages: 1 } });
    }

    return jsonResponse({});
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("MessagingPage — désarchivage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    replaceMock.mockReset();
    searchParamsStore = {};
  });

  it("charge la boîte de réception au démarrage et affiche le message", async () => {
    makeFetchMock({ folder: "inbox" });
    render(<MessagingPage />);
    await screen.findByText("Réunion parents");
    expect(screen.getByText("Réunion parents")).toBeInTheDocument();
  });

  it("archive un message depuis l'inbox : appelle l'API d'archivage", async () => {
    const fetchSpy = makeFetchMock({ folder: "inbox" });
    render(<MessagingPage />);
    await screen.findByText("Réunion parents");

    // Le reader pane auto-sélectionne le premier message et charge son détail.
    // Le bouton "Archiver" est dans la zone topActions du reader.
    const archiveBtn = await screen.findByLabelText("Archiver");
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      const archiveCalls = fetchSpy.mock.calls.filter(([url]) =>
        /\/messages\/[^/?]+\/archive$/.test(String(url)),
      );
      expect(archiveCalls.length).toBeGreaterThan(0);
    });
  });

  it("après désarchivage d'un message reçu, appelle l'API avec archived=false et recharge inbox", async () => {
    searchParamsStore = { folder: "archive" };
    const fetchSpy = makeFetchMock({
      folder: "archive",
      messages: [ARCHIVE_INBOX_MSG],
    });
    render(<MessagingPage />);
    await screen.findByText("Message archivé reçu");

    const unarchiveBtn = await screen.findByLabelText("Desarchiver");
    fireEvent.click(unarchiveBtn);

    await waitFor(() => {
      const archiveCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          /\/messages\/[^/?]+\/archive$/.test(String(url)) &&
          String(init?.body ?? "").includes('"archived":false'),
      );
      expect(archiveCalls.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const inboxReloads = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("folder=inbox") && String(url).includes("limit=50"),
      );
      expect(inboxReloads.length).toBeGreaterThan(0);
    });
  });

  it("après désarchivage d'un message envoyé, appelle l'API et recharge sent", async () => {
    searchParamsStore = { folder: "archive" };
    const fetchSpy = makeFetchMock({
      folder: "archive",
      messages: [ARCHIVE_SENT_MSG],
    });
    render(<MessagingPage />);
    await screen.findByText("Message archivé envoyé");

    // Le reader doit charger le détail et afficher le bouton Desarchiver
    const unarchiveBtn = await screen.findByLabelText("Desarchiver");
    fireEvent.click(unarchiveBtn);

    await waitFor(() => {
      const archiveCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          /\/messages\/[^/?]+\/archive$/.test(String(url)) &&
          String(init?.body ?? "").includes('"archived":false'),
      );
      expect(archiveCalls.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const sentReloads = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("folder=sent"),
      );
      expect(sentReloads.length).toBeGreaterThan(0);
    });
  });

  it("restaurer depuis la liste archive (bouton par ligne) recharge inbox", async () => {
    searchParamsStore = { folder: "archive" };
    const fetchSpy = makeFetchMock({
      folder: "archive",
      messages: [ARCHIVE_INBOX_MSG],
    });
    render(<MessagingPage />);
    await screen.findByText("Message archivé reçu");

    const restoreBtn = await screen.findByLabelText("Restaurer depuis archives");
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      const archiveCalls = fetchSpy.mock.calls.filter(
        ([url, init]) =>
          /\/messages\/[^/?]+\/archive$/.test(String(url)) &&
          String(init?.body ?? "").includes('"archived":false'),
      );
      expect(archiveCalls.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      const inboxReloads = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes("folder=inbox") && String(url).includes("limit=50"),
      );
      expect(inboxReloads.length).toBeGreaterThan(0);
    });
  });

  it("en cas d'échec API lors du désarchivage, affiche un message d'erreur et ne bascule pas", async () => {
    searchParamsStore = { folder: "archive" };
    const fetchSpy = makeFetchMock({
      folder: "archive",
      messages: [ARCHIVE_INBOX_MSG],
      archiveSuccess: false,
    });
    render(<MessagingPage />);
    await screen.findByText("Message archivé reçu");

    const unarchiveBtn = await screen.findByLabelText("Desarchiver");
    fireEvent.click(unarchiveBtn);

    await waitFor(() => {
      expect(screen.getByText(/impossible|erreur/i)).toBeInTheDocument();
    });

    const inboxReloads = fetchSpy.mock.calls.filter(
      ([url]) => String(url).includes("folder=inbox") && String(url).includes("limit=50"),
    );
    expect(inboxReloads.length).toBe(0);
  });
});

// ── Couverture par rôle ────────────────────────────────────────────────────

describe("MessagingPage — types d'utilisateurs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    searchParamsStore = { folder: "archive" };
  });

  const roles = [
    "PARENT",
    "TEACHER",
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "SCHOOL_STAFF",
  ] as const;

  for (const role of roles) {
    it(`un ${role} peut désarchiver un message reçu et revenir sur inbox`, async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = String(input);

        if (url.endsWith("/me")) return jsonResponse({ role, schoolName: "Collège" });
        if (url.includes("/messages/unread-count")) return jsonResponse({ unread: 0 });

        if (/\/messages\/[^/?]+\/archive$/.test(url)) return jsonResponse({ success: true });
        if (/\/messages\/[^/?]+\/read$/.test(url)) return jsonResponse({ success: true });

        const detailMatch = url.match(/\/messages\/([^/?]+)$/);
        if (detailMatch) return jsonResponse(DETAIL_ARCHIVE_INBOX);

        if (url.includes("folder=drafts")) return jsonResponse({ items: [], meta: { total: 0, page: 1, limit: 1, totalPages: 1 } });
        if (url.includes("folder=archive")) {
          return jsonResponse({
            items: [ARCHIVE_INBOX_MSG],
            meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
          });
        }
        if (url.includes("folder=inbox")) {
          return jsonResponse({
            items: [INBOX_MESSAGE],
            meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
          });
        }
        return jsonResponse({ items: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } });
      });

      render(<MessagingPage />);
      await screen.findByText("Message archivé reçu");

      const unarchiveBtn = await screen.findByLabelText("Desarchiver");
      fireEvent.click(unarchiveBtn);

      await waitFor(() => {
        const inboxReloads = fetchSpy.mock.calls.filter(([url]) =>
          String(url).includes("folder=inbox") && String(url).includes("limit=50"),
        );
        expect(inboxReloads.length).toBeGreaterThan(0);
      });
    });
  }
});
