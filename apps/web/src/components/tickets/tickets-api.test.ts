import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicketStatus,
  addTicketResponse,
  toggleTicketVote,
  deleteTicket,
  getMyTicketCount,
} from "./tickets-api";

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: vi.fn(() => "test-csrf-token"),
}));

const API = "http://localhost:3001/api";

function makeListResponse() {
  return {
    data: [
      {
        id: "t1",
        type: "BUG",
        status: "OPEN",
        title: "Bug carte notes",
        description: "La carte disparaît.",
        author: {
          id: "u1",
          firstName: "Jean",
          lastName: "D",
          email: null,
          avatarUrl: null,
        },
        school: null,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { votes: 0, responses: 0 },
      },
    ],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  };
}

describe("tickets-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  // ── listTickets ──────────────────────────────────────────────────────────

  describe("listTickets()", () => {
    it("appelle GET /tickets sans paramètre", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => makeListResponse(),
      });

      const result = await listTickets();

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API}/tickets`);
      expect(result.data).toHaveLength(1);
    });

    it("ajoute les query params de filtrage", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await listTickets({
        page: 2,
        limit: 10,
        status: "OPEN",
        type: "BUG",
        q: "crash",
      });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("page=2");
      expect(url).toContain("limit=10");
      expect(url).toContain("status=OPEN");
      expect(url).toContain("type=BUG");
      expect(url).toContain("q=crash");
    });

    it("lève une erreur HTTP", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "Erreur serveur" }),
      });

      await expect(listTickets()).rejects.toThrow("Erreur serveur");
    });
  });

  // ── getTicket ────────────────────────────────────────────────────────────

  describe("getTicket()", () => {
    it("appelle GET /tickets/:id", async () => {
      const ticket = { id: "t1", title: "Bug" };
      fetchMock.mockResolvedValue({ ok: true, json: async () => ticket });

      const result = await getTicket("t1");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(`${API}/tickets/t1`);
      expect(result).toEqual(ticket);
    });
  });

  // ── createTicket ─────────────────────────────────────────────────────────

  describe("createTicket()", () => {
    it("envoie un FormData multipart avec CSRF", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "t2" }),
      });

      await createTicket({
        type: "BUG",
        title: "Interface plantée",
        description: "Le bouton enregistrer ne répond pas depuis hier.",
        schoolSlug: "lycee-test",
        platform: "web",
      });

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API}/tickets`);
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe(
        "test-csrf-token",
      );
    });

    it("lève une erreur si le serveur renvoie 400 avec un tableau de messages", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          message: ["Titre trop court", "Description requise"],
        }),
      });

      await expect(
        createTicket({ type: "BUG", title: "ab", description: "x" }),
      ).rejects.toThrow("Titre trop court, Description requise");
    });
  });

  // ── updateTicketStatus ───────────────────────────────────────────────────

  describe("updateTicketStatus()", () => {
    it("envoie PATCH /tickets/:id/status avec le bon statut", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "t1", status: "IN_PROGRESS" }),
      });

      await updateTicketStatus("t1", "IN_PROGRESS");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API}/tickets/t1/status`);
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body as string)).toEqual({
        status: "IN_PROGRESS",
      });
    });
  });

  // ── addTicketResponse ────────────────────────────────────────────────────

  describe("addTicketResponse()", () => {
    it("envoie POST /tickets/:id/responses", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "r1" }),
      });

      await addTicketResponse("t1", "Réponse admin.", false);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API}/tickets/t1/responses`);
      expect(JSON.parse(options.body as string)).toEqual({
        body: "Réponse admin.",
        isInternal: false,
      });
    });

    it("envoie une note interne avec isInternal=true", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({}),
      });

      await addTicketResponse("t1", "Note interne.", true);

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({
        body: "Note interne.",
        isInternal: true,
      });
    });
  });

  // ── toggleTicketVote ─────────────────────────────────────────────────────

  describe("toggleTicketVote()", () => {
    it("envoie POST /tickets/:id/votes et retourne { voted }", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ voted: true }),
      });

      const result = await toggleTicketVote("t1");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API}/tickets/t1/votes`);
      expect(options.method).toBe("POST");
      expect(result).toEqual({ voted: true });
    });
  });

  // ── deleteTicket ─────────────────────────────────────────────────────────

  describe("deleteTicket()", () => {
    it("envoie DELETE /tickets/:id", async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204 });

      await deleteTicket("t1");

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${API}/tickets/t1`);
      expect(options.method).toBe("DELETE");
    });

    it("lève une erreur si le serveur répond 403", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "Accès refusé" }),
      });

      await expect(deleteTicket("t1")).rejects.toThrow("Accès refusé");
    });
  });

  // ── getMyTicketCount ─────────────────────────────────────────────────────

  describe("getMyTicketCount()", () => {
    it("retourne le compteur de tickets ouverts", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ open: 3 }),
      });

      const result = await getMyTicketCount();

      expect(result).toEqual({ open: 3 });
    });
  });
});
