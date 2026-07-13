import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceContributionPanel } from "./resource-contribution-panel";
import type { ResourceDetail, ResourceSubmission } from "./resources-api";

vi.mock("../ui/form-rich-text-editor", () => ({
  FormRichTextEditor: ({
    label,
    value,
    onChange,
    editorTestId,
    error,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    editorTestId?: string;
    error?: string | null;
  }) => (
    <div>
      <label>{label}</label>
      <textarea
        data-testid={editorTestId ?? "rich-text-editor"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p data-testid={`${editorTestId}-error`}>{error}</p> : null}
    </div>
  ),
}));

const mockApi = vi.hoisted(() => ({
  getResource: vi.fn(),
  listSubmissions: vi.fn(),
  saveSubmissionDraft: vi.fn(),
  submitSubmission: vi.fn(),
  uploadAttachment: vi.fn(),
  uploadInlineImage: vi.fn(),
}));

vi.mock("./resources-api", async () => {
  const actual =
    await vi.importActual<typeof import("./resources-api")>("./resources-api");
  return {
    ...actual,
    getResource: mockApi.getResource,
    listSubmissions: mockApi.listSubmissions,
    saveSubmissionDraft: mockApi.saveSubmissionDraft,
    submitSubmission: mockApi.submitSubmission,
    uploadAttachment: mockApi.uploadAttachment,
    uploadInlineImage: mockApi.uploadInlineImage,
  };
});

const BASE_DETAIL: ResourceDetail = {
  id: "res-1",
  kind: "ASSESSMENT",
  schoolId: "school-1",
  academicLevelId: "level-1",
  trackId: null,
  subjectId: "subject-1",
  examType: "SEQUENCE_TEST",
  sequence: "SEQ_1",
  academicYearLabel: "2025-2026",
  title: "Contrôle chapitre 3",
  authorUserId: "teacher-1",
  statementContent: null,
  statementStatus: "PENDING",
  correctionContent: null,
  correctionStatus: "PENDING",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
  school: { id: "school-1", name: "École Test" },
  academicLevel: { id: "level-1", code: "6EME", label: "6ème" },
  track: null,
  subject: { id: "subject-1", name: "Mathématiques" },
  authorUser: { id: "teacher-1", firstName: "Paul", lastName: "Martin" },
  attachments: [],
  isFavorite: false,
};

function makeSubmission(
  overrides: Partial<ResourceSubmission> = {},
): ResourceSubmission {
  return {
    id: "sub-1",
    resourceId: "res-1",
    part: "STATEMENT",
    status: "DRAFT",
    content: "<p>Brouillon</p>",
    reason: null,
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
    reviewedAt: null,
    authorUser: { id: "teacher-1", firstName: "Paul", lastName: "Martin" },
    attachments: [],
    ...overrides,
  };
}

describe("ResourceContributionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listSubmissions.mockResolvedValue([]);
  });

  it("RÉGRESSION : le bouton Soumettre reste actif sans brouillon préalable et soumet directement un contenu valide", async () => {
    mockApi.getResource.mockResolvedValue(BASE_DETAIL);
    const created = makeSubmission({ content: "<p>Contenu</p>" });
    mockApi.saveSubmissionDraft.mockResolvedValue(created);
    mockApi.submitSubmission.mockResolvedValue({
      ...created,
      status: "AWAITING",
    });

    render(<ResourceContributionPanel resourceId="res-1" onClose={() => {}} />);

    await waitFor(() =>
      expect(
        screen.getByTestId("resources-mine-contribution-statement-editor"),
      ).toBeTruthy(),
    );

    const submitBtn = screen.getByTestId(
      "resources-mine-contribution-statement-submit",
    );
    expect(submitBtn).not.toBeDisabled();

    fireEvent.change(
      screen.getByTestId("resources-mine-contribution-statement-editor"),
      { target: { value: "<p>Contenu saisi directement</p>" } },
    );
    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(mockApi.saveSubmissionDraft).toHaveBeenCalledWith(
        "res-1",
        "statement",
        expect.objectContaining({ content: expect.any(String) }),
      ),
    );
    await waitFor(() =>
      expect(mockApi.submitSubmission).toHaveBeenCalledWith(
        "res-1",
        created.id,
      ),
    );
  });

  it("affiche une erreur sous l'éditeur et bloque l'appel API si le contenu est vide à la soumission", async () => {
    mockApi.getResource.mockResolvedValue(BASE_DETAIL);

    render(<ResourceContributionPanel resourceId="res-1" onClose={() => {}} />);

    await waitFor(() =>
      expect(
        screen.getByTestId("resources-mine-contribution-statement-editor"),
      ).toBeTruthy(),
    );

    fireEvent.click(
      screen.getByTestId("resources-mine-contribution-statement-submit"),
    );

    await waitFor(() =>
      expect(
        screen.getByTestId(
          "resources-mine-contribution-statement-editor-error",
        ),
      ).toBeTruthy(),
    );
    expect(mockApi.saveSubmissionDraft).not.toHaveBeenCalled();
    expect(mockApi.submitSubmission).not.toHaveBeenCalled();
  });
});
