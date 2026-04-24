import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistanceGuidePanel } from "./assistance-guide-panel";

vi.mock("../ui/form-rich-text-editor", () => ({
  FormRichTextEditor: ({ label }: { label: string }) => (
    <div data-testid="mock-rich-editor">{label}</div>
  ),
}));

const mockApi = vi.hoisted(() => ({
  getCurrent: vi.fn(),
  getPlan: vi.fn(),
  getChapter: vi.fn(),
  search: vi.fn(),
  listAdmin: vi.fn(),
  createGuide: vi.fn(),
  updateGuide: vi.fn(),
  deleteGuide: vi.fn(),
  createChapter: vi.fn(),
  updateChapter: vi.fn(),
  deleteChapter: vi.fn(),
}));

vi.mock("./help-guides-api", () => ({
  helpGuidesApi: mockApi,
}));

describe("AssistanceGuidePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.getCurrent.mockResolvedValue({
      canManage: true,
      resolvedAudience: "PARENT",
      guide: {
        id: "guide-1",
        schoolId: "school-1",
        audience: "PARENT",
        title: "Guide parent",
        slug: "guide-parent",
        description: null,
        status: "PUBLISHED",
        chapterCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    mockApi.getPlan.mockResolvedValue({
      guide: null,
      items: [
        {
          id: "chapter-1",
          title: "Messagerie",
          slug: "messagerie",
          parentId: null,
          orderIndex: 1,
          depth: 0,
          contentType: "RICH_TEXT",
          status: "PUBLISHED",
          children: [],
        },
      ],
    });
    mockApi.getChapter.mockResolvedValue({
      guide: null,
      chapter: {
        id: "chapter-1",
        guideId: "guide-1",
        parentId: null,
        orderIndex: 1,
        title: "Messagerie",
        slug: "messagerie",
        summary: "Résumé test",
        contentType: "RICH_TEXT",
        contentHtml: "<p>Contenu guide</p>",
        contentJson: { html: "<p>Contenu guide</p>" },
        videoUrl: null,
        contentText: "Contenu guide",
        status: "PUBLISHED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    mockApi.listAdmin.mockResolvedValue({
      items: [
        {
          id: "guide-1",
          schoolId: "school-1",
          audience: "PARENT",
          title: "Guide parent",
          slug: "guide-parent",
          description: null,
          status: "PUBLISHED",
          chapterCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  });

  it("charge le guide courant et affiche les formulaires admin", async () => {
    render(<AssistanceGuidePanel />);

    await waitFor(() => {
      expect(screen.getByText("Guide parent")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Messagerie").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByTestId("assistance-guide-admin-forms"),
    ).toBeInTheDocument();
  });

  it("masque les formulaires admin sans role platform local", async () => {
    render(<AssistanceGuidePanel canManageOverride={false} />);

    await waitFor(() => {
      expect(screen.getByText("Guide parent")).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("assistance-guide-admin-forms"),
    ).not.toBeInTheDocument();
  });
});
