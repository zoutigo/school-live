import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addFeedComment,
  listFeedPosts,
  toggleFeedLike,
  uploadFeedInlineImage,
  voteFeedPoll,
} from "./feed-api";

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: vi.fn(() => "csrf-token"),
}));

describe("feed-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("maps polls, attachments and comments from the feed list response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "post-1",
            type: "POLL",
            author: {
              id: "u-1",
              fullName: "Alice Martin",
              roleLabel: "Parent",
              avatarText: "AM",
            },
            title: "Choix de sortie",
            bodyHtml: "<p>Votez avant jeudi</p>",
            createdAt: "2026-04-05T10:00:00.000Z",
            featuredUntil: null,
            audience: { scope: "PARENTS_ONLY", label: "Parents uniquement" },
            attachments: [
              {
                id: "att-1",
                fileName: "programme.pdf",
                fileUrl: "https://cdn.example.test/programme.pdf",
                sizeLabel: "120 Ko",
              },
            ],
            likedByViewer: false,
            likesCount: 2,
            comments: [
              {
                id: "c-1",
                authorName: "Robert Ntamack",
                text: "Merci",
                createdAt: "2026-04-05T11:00:00.000Z",
              },
            ],
            poll: {
              question: "Quel créneau ?",
              votedOptionId: null,
              options: [
                { id: "o-1", label: "Mercredi", votes: 4 },
                { id: "o-2", label: "Vendredi", votes: 3 },
              ],
            },
          },
        ],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      }),
    });

    const result = await listFeedPosts("college-vogt", { viewScope: "GENERAL" });

    expect(result.items[0]).toMatchObject({
      schoolSlug: "college-vogt",
      poll: expect.objectContaining({ question: "Quel créneau ?" }),
      comments: [expect.objectContaining({ text: "Merci" })],
      attachments: [
        expect.objectContaining({
          fileName: "programme.pdf",
          fileUrl: "https://cdn.example.test/programme.pdf",
        }),
      ],
    });
  });

  it("calls the like toggle endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ liked: true, likesCount: 5 }),
    });

    const result = await toggleFeedLike("college-vogt", "post-1");

    expect(result).toEqual({ liked: true, likesCount: 5 });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/schools/college-vogt/feed/post-1/likes/toggle",
    );
  });

  it("posts a comment payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        comment: {
          id: "c-1",
          authorName: "Alice Martin",
          text: "Merci",
          createdAt: "2026-04-05T10:00:00.000Z",
        },
        commentsCount: 1,
      }),
    });

    const result = await addFeedComment("college-vogt", "post-1", "Merci");

    expect(result.commentsCount).toBe(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ text: "Merci" }));
  });

  it("posts a poll vote payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        votedOptionId: "o-1",
        options: [
          { id: "o-1", label: "Mercredi", votes: 5 },
          { id: "o-2", label: "Vendredi", votes: 3 },
        ],
      }),
    });

    const result = await voteFeedPoll("college-vogt", "post-1", "o-1");

    expect(result.votedOptionId).toBe("o-1");
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/schools/college-vogt/feed/post-1/polls/o-1/vote",
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
  });

  it("uploads inline image as multipart form-data", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example.test/feed.png" }),
    });

    const file = new File(["png"], "feed.png", { type: "image/png" });
    const result = await uploadFeedInlineImage("college-vogt", file);

    expect(result).toBe("https://cdn.example.test/feed.png");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("surfaces backend upload failure messages", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Format non supporte" }),
    });

    const file = new File(["svg"], "feed.svg", { type: "image/svg+xml" });

    await expect(
      uploadFeedInlineImage("college-vogt", file),
    ).rejects.toThrow("Format non supporte");
  });
});
