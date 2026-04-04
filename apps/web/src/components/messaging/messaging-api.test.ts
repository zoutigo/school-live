import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSchoolMessage,
  getSchoolMessage,
  listSchoolMessages,
} from "./messaging-api";

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: vi.fn(() => "csrf-token"),
}));

describe("messaging-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("serializes message creation as multipart/form-data with attachments", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "msg-1",
        subject: "Sujet",
        body: "<p>Bonjour</p>",
        status: "SENT",
        createdAt: "2026-04-04T10:00:00.000Z",
        sentAt: "2026-04-04T10:00:00.000Z",
        sender: null,
        attachments: [],
      }),
    });

    const attachment = new File(["pdf"], "bulletin.pdf", {
      type: "application/pdf",
    });

    await createSchoolMessage("college-vogt", {
      subject: "Sujet",
      body: "<p>Bonjour</p>",
      recipientUserIds: ["u-1", "u-2"],
      attachments: [attachment],
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    const formData = options.body as FormData;
    expect(formData.get("subject")).toBe("Sujet");
    expect(formData.get("body")).toBe("<p>Bonjour</p>");
    expect(formData.getAll("recipientUserIds")).toEqual(["u-1", "u-2"]);
    expect(formData.getAll("attachments")).toHaveLength(1);
  });

  it("maps attachments from the messages list response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "msg-1",
            folder: "sent",
            subject: "Sujet",
            preview: "Bonjour",
            createdAt: "2026-04-04T10:00:00.000Z",
            unread: false,
            sender: null,
            attachments: [
              {
                id: "att-1",
                fileName: "bulletin.pdf",
                url: "https://cdn.example.com/bulletin.pdf",
                mimeType: "application/pdf",
                sizeBytes: 2048,
              },
            ],
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });

    const result = await listSchoolMessages("college-vogt", { folder: "sent" });

    expect(result.items[0]?.attachments).toEqual([
      {
        id: "att-1",
        fileName: "bulletin.pdf",
        sizeLabel: "2 Ko",
        mimeType: "application/pdf",
        downloadUrl: "https://cdn.example.com/bulletin.pdf",
      },
    ]);
  });

  it("maps attachments from the message detail response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "msg-1",
        subject: "Sujet",
        body: "<p>Bonjour</p>",
        status: "SENT",
        createdAt: "2026-04-04T10:00:00.000Z",
        sentAt: "2026-04-04T10:00:00.000Z",
        sender: null,
        attachments: [
          {
            id: "att-1",
            fileName: "bulletin.pdf",
            url: "https://cdn.example.com/bulletin.pdf",
            mimeType: "application/pdf",
            sizeBytes: 2048,
          },
        ],
      }),
    });

    const result = await getSchoolMessage("college-vogt", "msg-1");

    expect(result.attachments).toEqual([
      {
        id: "att-1",
        fileName: "bulletin.pdf",
        sizeLabel: "2 Ko",
        mimeType: "application/pdf",
        downloadUrl: "https://cdn.example.com/bulletin.pdf",
      },
    ]);
  });
});
