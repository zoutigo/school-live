import { render, screen } from "@testing-library/react";
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
  listGlobalAdmin: vi.fn(),
  listSchoolAdmin: vi.fn(),
  createGlobalGuide: vi.fn(),
  createSchoolGuide: vi.fn(),
  updateGlobalGuide: vi.fn(),
  updateSchoolGuide: vi.fn(),
  deleteGlobalGuide: vi.fn(),
  deleteSchoolGuide: vi.fn(),
  createGlobalChapter: vi.fn(),
  createSchoolChapter: vi.fn(),
  updateGlobalChapter: vi.fn(),
  updateSchoolChapter: vi.fn(),
  deleteGlobalChapter: vi.fn(),
  deleteSchoolChapter: vi.fn(),
}));

vi.mock("./help-guides-api", () => ({
  helpGuidesApi: mockApi,
}));

describe("AssistanceGuidePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.getCurrent.mockResolvedValue({
      permissions: { canManageGlobal: true, canManageSchool: false },
      schoolScope: null,
      resolvedAudience: "PARENT",
      sources: [
        {
          key: "global",
          scopeType: "GLOBAL",
          scopeLabel: "Scolive",
          schoolId: null,
          schoolName: null,
          guide: {
            id: "guide-1",
            schoolId: null,
            schoolName: null,
            audience: "PARENT",
            title: "Guide parent",
            slug: "guide-parent",
            description: null,
            status: "PUBLISHED",
            chapterCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      defaultSourceKey: "global",
    });
    mockApi.getPlan.mockResolvedValue({
      sources: [
        {
          key: "global",
          scopeType: "GLOBAL",
          scopeLabel: "Scolive",
          schoolId: null,
          schoolName: null,
          guide: {
            id: "guide-1",
            schoolId: null,
            schoolName: null,
            audience: "PARENT",
            title: "Guide parent",
            slug: "guide-parent",
            description: null,
            status: "PUBLISHED",
            chapterCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
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
        },
      ],
    });
    mockApi.getChapter.mockResolvedValue({
      source: undefined,
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
    mockApi.listGlobalAdmin.mockResolvedValue({
      items: [
        {
          id: "guide-1",
          schoolId: null,
          schoolName: null,
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

    expect(
      await screen.findByRole("heading", { name: "Guide parent" }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Messagerie").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByTestId("assistance-guide-admin-forms"),
    ).toBeInTheDocument();
  });

  it("masque les formulaires admin sans role platform local", async () => {
    render(<AssistanceGuidePanel canManageOverride={false} />);

    expect(
      await screen.findByRole("heading", { name: "Guide parent" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("assistance-guide-admin-forms"),
    ).not.toBeInTheDocument();
  });
});
