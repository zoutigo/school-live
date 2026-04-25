import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistanceFaqPanel } from "./assistance-faq-panel";

const { mockFaqsApi } = vi.hoisted(() => ({
  mockFaqsApi: {
    getCurrent: vi.fn(),
    getThemes: vi.fn(),
    search: vi.fn(),
    listGlobalAdmin: vi.fn(),
    listSchoolAdmin: vi.fn(),
    createGlobalFaq: vi.fn(),
    createSchoolFaq: vi.fn(),
    updateGlobalFaq: vi.fn(),
    updateSchoolFaq: vi.fn(),
    deleteGlobalFaq: vi.fn(),
    deleteSchoolFaq: vi.fn(),
    createGlobalTheme: vi.fn(),
    createSchoolTheme: vi.fn(),
    updateGlobalTheme: vi.fn(),
    updateSchoolTheme: vi.fn(),
    deleteGlobalTheme: vi.fn(),
    deleteSchoolTheme: vi.fn(),
    createGlobalItem: vi.fn(),
    createSchoolItem: vi.fn(),
    updateGlobalItem: vi.fn(),
    updateSchoolItem: vi.fn(),
    deleteGlobalItem: vi.fn(),
    deleteSchoolItem: vi.fn(),
  },
}));

vi.mock("./help-faqs-api", () => ({
  helpFaqsApi: mockFaqsApi,
}));

describe("AssistanceFaqPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFaqsApi.getCurrent.mockResolvedValue({
      permissions: { canManageGlobal: true, canManageSchool: false },
      schoolScope: null,
      resolvedAudience: "PARENT",
      defaultSourceKey: "global",
      sources: [
        {
          key: "global",
          scopeType: "GLOBAL",
          scopeLabel: "Scolive",
          schoolId: null,
          schoolName: null,
          faq: {
            id: "faq-1",
            schoolId: null,
            schoolName: null,
            audience: "PARENT",
            title: "FAQ parent",
            slug: "faq-parent",
            description: "Réponses parent",
            status: "PUBLISHED",
            themeCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    });

    mockFaqsApi.getThemes.mockResolvedValue({
      sources: [
        {
          key: "global",
          scopeType: "GLOBAL",
          scopeLabel: "Scolive",
          schoolId: null,
          schoolName: null,
          faq: {
            id: "faq-1",
            schoolId: null,
            schoolName: null,
            audience: "PARENT",
            title: "FAQ parent",
            slug: "faq-parent",
            description: "Réponses parent",
            status: "PUBLISHED",
            themeCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          themes: [
            {
              id: "theme-1",
              faqId: "faq-1",
              orderIndex: 0,
              title: "Connexion",
              slug: "connexion",
              description: "Accès au compte",
              status: "PUBLISHED",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              items: [
                {
                  id: "item-1",
                  themeId: "theme-1",
                  orderIndex: 0,
                  question: "Comment me connecter ?",
                  answerHtml: "<p>Utilisez votre email.</p>",
                  answerJson: { html: "<p>Utilisez votre email.</p>" },
                  answerText: "Utilisez votre email.",
                  status: "PUBLISHED",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ],
    });

    mockFaqsApi.listGlobalAdmin.mockResolvedValue({
      items: [
        {
          id: "faq-1",
          schoolId: null,
          schoolName: null,
          audience: "PARENT",
          title: "FAQ parent",
          slug: "faq-parent",
          description: "Réponses parent",
          status: "PUBLISHED",
          themeCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  });

  it("affiche la faq et les formulaires admin", async () => {
    render(<AssistanceFaqPanel />);

    await waitFor(() => {
      expect(screen.getAllByText("FAQ parent").length).toBeGreaterThanOrEqual(
        1,
      );
    });

    expect(screen.getAllByText("Connexion").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByTestId("assistance-faq-admin-forms"),
    ).toBeInTheDocument();
  });

  it("masque les formulaires admin sans role platform local", async () => {
    render(<AssistanceFaqPanel canManageOverride={false} />);

    await waitFor(() => {
      expect(screen.getAllByText("FAQ parent").length).toBeGreaterThanOrEqual(
        1,
      );
    });

    expect(screen.queryByTestId("assistance-faq-admin-forms")).toBeNull();
  });
});
