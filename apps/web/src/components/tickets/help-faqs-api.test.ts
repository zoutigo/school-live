import { beforeEach, describe, expect, it, vi } from "vitest";
import { helpFaqsApi } from "./help-faqs-api";

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: vi.fn(() => "csrf-token"),
}));

const API = "http://localhost:3001/api";

describe("help-faqs-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("appelle /help-faqs/current", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        permissions: { canManageGlobal: false, canManageSchool: false },
        schoolScope: null,
        sources: [],
        defaultSourceKey: null,
        resolvedAudience: "PARENT",
      }),
    });

    await helpFaqsApi.getCurrent();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API}/help-faqs/current`);
  });

  it("appelle la recherche avec query string", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ sources: [], items: [] }),
    });

    await helpFaqsApi.search("connexion", { faqId: "f1" });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/help-faqs/current/search?");
    expect(url).toContain("q=connexion");
    expect(url).toContain("faqId=f1");
  });

  it("envoie un POST admin avec CSRF", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "faq-1" }),
    });

    await helpFaqsApi.createGlobalFaq({
      title: "FAQ parent",
      audience: "PARENT",
      status: "DRAFT",
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/help-faqs/admin/global/faqs`);
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe(
      "csrf-token",
    );
  });
});
