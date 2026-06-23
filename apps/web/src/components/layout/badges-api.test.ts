import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getUnreadSummary,
  markBadgeRead,
  readCachedUnreadSummary,
  type UnreadSummary,
} from "./badges-api";

const SUMMARY: UnreadSummary = {
  messagesUnread: 2,
  feedUnread: 1,
  ticketsNeedingResponse: 0,
  ticketsUnreadReplies: 0,
  children: [
    {
      studentId: "child-1",
      firstName: "Lisa",
      lastName: "Mbele",
      homeworkPending: 1,
      notesUnread: 3,
      disciplineUnread: 0,
    },
  ],
  teacherClasses: [],
  total: 7,
};

describe("badges-api", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUnreadSummary", () => {
    it("fetches the aggregated summary and caches it under the school slug", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(SUMMARY), { status: 200 }),
      );

      const result = await getUnreadSummary("college-vogt");

      expect(result).toEqual(SUMMARY);
      expect(readCachedUnreadSummary("college-vogt")).toEqual(SUMMARY);
    });

    it("throws when the request fails, without touching the cache", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ message: "nope" }), { status: 500 }),
      );

      await expect(getUnreadSummary("college-vogt")).rejects.toThrow(
        "UNREAD_SUMMARY_FETCH_FAILED",
      );
      expect(readCachedUnreadSummary("college-vogt")).toBeNull();
    });
  });

  describe("readCachedUnreadSummary", () => {
    it("returns null when there is nothing cached", () => {
      expect(readCachedUnreadSummary("college-vogt")).toBeNull();
    });

    it("returns null when the cached value is corrupted JSON", () => {
      window.localStorage.setItem("scolive:badges:college-vogt", "{not-json");
      expect(readCachedUnreadSummary("college-vogt")).toBeNull();
    });

    it("scopes the cache per school slug", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(SUMMARY), { status: 200 }),
      );
      await getUnreadSummary("college-vogt");

      expect(readCachedUnreadSummary("another-school")).toBeNull();
      expect(readCachedUnreadSummary("college-vogt")).toEqual(SUMMARY);
    });
  });

  describe("markBadgeRead", () => {
    it("throws when there is no CSRF cookie", async () => {
      await expect(
        markBadgeRead("college-vogt", "NOTES", "child-1"),
      ).rejects.toThrow("CSRF_TOKEN_MISSING");
    });

    it("sends the scope and scopeRefId with the CSRF header when the cookie is present", async () => {
      document.cookie = "school_live_csrf_token=csrf-123";
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      await markBadgeRead("college-vogt", "DISCIPLINE", "child-1");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/schools/college-vogt/me/read-markers"),
        expect.objectContaining({
          method: "PATCH",
          credentials: "include",
          headers: expect.objectContaining({ "X-CSRF-Token": "csrf-123" }),
          body: JSON.stringify({
            scope: "DISCIPLINE",
            scopeRefId: "child-1",
          }),
        }),
      );
    });

    it("throws when the server rejects the request", async () => {
      document.cookie = "school_live_csrf_token=csrf-123";
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ message: "bad" }), { status: 400 }),
      );

      await expect(markBadgeRead("college-vogt", "FEED")).rejects.toThrow(
        "MARK_BADGE_READ_FAILED",
      );
    });
  });
});
