import { beforeEach, describe, expect, it, vi } from "vitest";
import { helpGuidesApi } from "./help-guides-api";

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: vi.fn(() => "csrf-token"),
}));

const API = "http://localhost:3001/api";

describe("help-guides-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("appelle /help-guides/current", async () => {
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

    await helpGuidesApi.getCurrent();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${API}/help-guides/current`);
  });

  it("appelle la recherche avec query string", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ sources: [], items: [] }),
    });

    await helpGuidesApi.search("message", { guideId: "g1" });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/help-guides/current/search?");
    expect(url).toContain("q=message");
    expect(url).toContain("guideId=g1");
  });

  it("envoie un POST admin avec CSRF", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "guide-1" }),
    });

    await helpGuidesApi.createGlobalGuide({
      title: "Guide parent",
      audience: "PARENT",
      status: "DRAFT",
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/help-guides/admin/global/guides`);
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe(
      "csrf-token",
    );
  });

  it("uploade une video inline", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example.test/guide-video.mp4" }),
    });

    const file = new File(["video"], "guide-video.mp4", { type: "video/mp4" });
    const url = await helpGuidesApi.uploadInlineVideo(file);

    expect(url).toBe("https://cdn.example.test/guide-video.mp4");
    const [endpoint, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(endpoint).toBe(`${API}/help-guides/admin/uploads/inline-video`);
    expect(options.method).toBe("POST");
  });
});
