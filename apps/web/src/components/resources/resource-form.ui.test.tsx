import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceForm } from "./resource-form";
import type {
  CreateResourcePayload,
  ResourceCatalog,
  ResourceRow,
  SchoolSearchOption,
} from "./resources-api";

const mockApi = vi.hoisted(() => ({
  searchSchools: vi.fn(),
}));

vi.mock("./resources-api", async () => {
  const actual =
    await vi.importActual<typeof import("./resources-api")>("./resources-api");
  return {
    ...actual,
    searchSchools: mockApi.searchSchools,
  };
});

const SCHOOLS: SchoolSearchOption[] = [
  {
    id: "school-secondaire",
    name: "Lycée Bilingue de Manjo",
    cycle: "SEC",
    languageSystem: null,
  },
  {
    id: "school-primaire",
    name: "École Primaire Fotsing",
    cycle: "PRIM",
    languageSystem: null,
  },
  {
    id: "school-en",
    name: "GSB Anglophone",
    cycle: "SEC",
    languageSystem: "ENGLISH",
  },
];

const CATALOG: ResourceCatalog = {
  cycles: [
    { id: "cycle-sec", code: "SEC", label: "Secondaire" },
    { id: "cycle-prim", code: "PRIM", label: "Primaire" },
  ],
  academicLevels: [
    {
      id: "level-6eme",
      code: "6EME",
      label: "6ème",
      cycleId: "cycle-sec",
      languageSystem: null,
    },
    {
      id: "level-1ere",
      code: "1ERE",
      label: "1ère",
      cycleId: "cycle-sec",
      languageSystem: null,
    },
    {
      id: "level-cp",
      code: "CP",
      label: "CP",
      cycleId: "cycle-prim",
      languageSystem: null,
    },
    {
      id: "level-en-only",
      code: "EN6",
      label: "Grade 6",
      cycleId: "cycle-sec",
      languageSystem: "ENGLISH",
    },
    {
      id: "level-fr-only",
      code: "FR6",
      label: "6ème (filière FR)",
      cycleId: "cycle-sec",
      languageSystem: "FRENCH",
    },
  ],
  tracks: [{ id: "track-a", code: "A", label: "Série A" }],
  curriculums: [
    { id: "curr-6eme", academicLevelId: "level-6eme", trackId: null },
    { id: "curr-1ere-a", academicLevelId: "level-1ere", trackId: "track-a" },
  ],
  curriculumSubjects: [
    { curriculumId: "curr-6eme", subjectId: "subj-math" },
    { curriculumId: "curr-6eme", subjectId: "subj-fr" },
    { curriculumId: "curr-1ere-a", subjectId: "subj-math" },
  ],
  subjects: [
    { id: "subj-math", code: "MATH", name: "Mathématiques" },
    { id: "subj-fr", code: "FR", name: "Français" },
  ],
};

function renderForm(
  overrides: Partial<React.ComponentProps<typeof ResourceForm>> = {},
) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ResourceForm
      kind="ASSESSMENT"
      catalog={CATALOG}
      schools={[]}
      editingResource={null}
      saving={false}
      errorMessage={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel, ...utils };
}

async function selectViaCombobox(testId: string, optionTestId: string) {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.click(await screen.findByTestId(optionTestId));
}

describe("ResourceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockApi.searchSchools.mockResolvedValue(SCHOOLS);
  });

  it.each(["ASSESSMENT", "EXAM"] as const)(
    "RÉGRESSION (%s) : le champ Titre occupe toute la largeur du formulaire, comme les autres champs",
    (kind) => {
      renderForm({ kind });
      expect(screen.getByTestId("resources-mine-form-title")).toHaveClass(
        "w-full",
      );
    },
  );

  describe("champ École (kind ASSESSMENT)", () => {
    it("RÉGRESSION : n'affiche qu'un seul contrôle pour l'école (plus de double input texte + liste)", async () => {
      renderForm();

      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      expect(
        screen.queryByTestId("resources-mine-form-school-search"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("resources-mine-form-school")).toBeInTheDocument();
    });

    it("charge la liste des écoles au montage et les propose dans le menu déroulant", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalledWith());

      fireEvent.click(screen.getByTestId("resources-mine-form-school"));

      expect(
        await screen.findByText("Lycée Bilingue de Manjo"),
      ).toBeInTheDocument();
      expect(screen.getByText("École Primaire Fotsing")).toBeInTheDocument();
    });

    it("relance la recherche serveur (debounce 300ms) quand on tape dans le champ de recherche intégré", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderForm();

      await act(async () => {
        await Promise.resolve();
      });
      mockApi.searchSchools.mockClear();

      fireEvent.click(screen.getByTestId("resources-mine-form-school"));
      fireEvent.change(
        screen.getByTestId("resources-mine-form-school-search"),
        { target: { value: "Manjo" } },
      );

      expect(mockApi.searchSchools).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(mockApi.searchSchools).toHaveBeenCalledWith("Manjo");
      vi.useRealTimers();
    });

    it("sélectionner une école résout automatiquement le cycle et réinitialise niveau/série/matière", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-6eme",
      );

      await selectViaCombobox(
        "resources-mine-form-school",
        "resources-mine-form-school-option-school-secondaire",
      );

      // Le cycle "Secondaire" doit être sélectionné automatiquement.
      fireEvent.click(screen.getByTestId("resources-mine-form-cycle"));
      expect(
        screen.getByTestId("resources-mine-form-cycle-option-cycle-sec"),
      ).toHaveAttribute("aria-selected", "true");

      // Le niveau précédemment choisi doit avoir été réinitialisé.
      expect(
        screen.getByTestId("resources-mine-form-level"),
      ).toHaveTextContent("Choisir un niveau");
    });

    it("filtre les niveaux compatibles avec le systeme linguistique de l'école sélectionnée (les niveaux neutres restent visibles, ceux d'un autre systeme sont masqués)", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      await selectViaCombobox(
        "resources-mine-form-school",
        "resources-mine-form-school-option-school-en",
      );

      fireEvent.click(screen.getByTestId("resources-mine-form-level"));
      expect(screen.getByText("Grade 6")).toBeInTheDocument();
      expect(screen.getByText("6ème")).toBeInTheDocument();
      expect(
        screen.queryByText("6ème (filière FR)"),
      ).not.toBeInTheDocument();
    });

    it("affiche l'erreur 'École requise' si le formulaire ASSESSMENT est soumis sans école", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() =>
        expect(
          screen.getByTestId("resources-mine-form-school"),
        ).toHaveAttribute("aria-invalid", "true"),
      );
    });

    it("ne rend pas le champ École pour le kind EXAM", async () => {
      renderForm({ kind: "EXAM" });

      expect(
        screen.queryByTestId("resources-mine-form-school"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("resources-mine-form-sequence"),
      ).not.toBeInTheDocument();
    });
  });

  describe("cascade cycle -> niveau -> série -> matière", () => {
    it("propose une série uniquement pour les niveaux qui en ont un curriculum", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-6eme",
      );
      expect(
        screen.queryByTestId("resources-mine-form-track"),
      ).not.toBeInTheDocument();

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-1ere",
      );
      expect(screen.getByTestId("resources-mine-form-track")).toBeInTheDocument();
    });

    it("les options de matière dépendent du curriculum résolu (niveau + série)", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-6eme",
      );
      fireEvent.click(screen.getByTestId("resources-mine-form-subject"));
      expect(screen.getByText("Mathématiques")).toBeInTheDocument();
      expect(screen.getByText("Français")).toBeInTheDocument();

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-1ere",
      );
      await selectViaCombobox(
        "resources-mine-form-track",
        "resources-mine-form-track-option-track-a",
      );
      // Le panneau matière est déjà ouvert depuis plus haut : ses options se
      // mettent à jour en direct avec le nouveau curriculum résolu.
      expect(screen.getByText("Mathématiques")).toBeInTheDocument();
      expect(screen.queryByText("Français")).not.toBeInTheDocument();
    });

    it("réinitialise la matière quand on change de niveau", async () => {
      renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-6eme",
      );
      await selectViaCombobox(
        "resources-mine-form-subject",
        "resources-mine-form-subject-option-subj-fr",
      );
      expect(screen.getByTestId("resources-mine-form-subject")).toHaveTextContent(
        "Français",
      );

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-1ere",
      );
      expect(screen.getByTestId("resources-mine-form-subject")).toHaveTextContent(
        "Choisir une matiere",
      );
    });
  });

  describe("validation", () => {
    it("affiche les erreurs requises (titre, niveau, matière) à la soumission d'un formulaire vide", async () => {
      renderForm({ kind: "EXAM" });

      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() => {
        expect(
          screen.getByTestId("resources-mine-form-level"),
        ).toHaveAttribute("aria-invalid", "true");
      });
      expect(
        screen.getByTestId("resources-mine-form-subject"),
      ).toHaveAttribute("aria-invalid", "true");
    });

    it("exige la série quand le niveau sélectionné en a une", async () => {
      renderForm({ kind: "EXAM" });

      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-1ere",
      );
      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() =>
        expect(
          screen.getByTestId("resources-mine-form-track"),
        ).toHaveAttribute("aria-invalid", "true"),
      );
    });

    it("présélectionne 'Séquence 1' pour une nouvelle ressource ASSESSMENT (le champ n'est jamais vide via l'UI)", () => {
      renderForm();
      expect(
        screen.getByTestId("resources-mine-form-sequence"),
      ).toHaveTextContent("Sequence 1");
    });
  });

  describe("soumission", () => {
    it("golden path ASSESSMENT : construit le bon payload avec école + série", async () => {
      const { onSubmit } = renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      fireEvent.change(screen.getByTestId("resources-mine-form-title"), {
        target: { value: "Distance entre deux points" },
      });

      await selectViaCombobox(
        "resources-mine-form-school",
        "resources-mine-form-school-option-school-secondaire",
      );
      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-6eme",
      );
      await selectViaCombobox(
        "resources-mine-form-subject",
        "resources-mine-form-subject-option-subj-math",
      );
      await selectViaCombobox(
        "resources-mine-form-sequence",
        "resources-mine-form-sequence-option-SEQ_2",
      );

      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<CreateResourcePayload>>({
          kind: "ASSESSMENT",
          schoolId: "school-secondaire",
          academicLevelId: "level-6eme",
          subjectId: "subj-math",
          sequence: "SEQ_2",
          title: "Distance entre deux points",
          trackId: undefined,
        }),
      );
    });

    it("golden path EXAM : pas de schoolId ni de sequence dans le payload", async () => {
      const { onSubmit } = renderForm({ kind: "EXAM" });

      fireEvent.change(screen.getByTestId("resources-mine-form-title"), {
        target: { value: "Examen blanc" },
      });
      await selectViaCombobox(
        "resources-mine-form-level",
        "resources-mine-form-level-option-level-1ere",
      );
      await selectViaCombobox(
        "resources-mine-form-track",
        "resources-mine-form-track-option-track-a",
      );
      await selectViaCombobox(
        "resources-mine-form-subject",
        "resources-mine-form-subject-option-subj-math",
      );

      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<CreateResourcePayload>>({
          kind: "EXAM",
          schoolId: undefined,
          sequence: undefined,
          trackId: "track-a",
        }),
      );
    });

    it("n'appelle jamais onSubmit si la validation échoue", async () => {
      const { onSubmit } = renderForm();
      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      fireEvent.click(screen.getByTestId("resources-mine-form-submit"));

      await waitFor(() =>
        expect(
          screen.getByTestId("resources-mine-form-school"),
        ).toHaveAttribute("aria-invalid", "true"),
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("désactive le bouton de sauvegarde et affiche le libellé 'saving' pendant l'envoi", () => {
      renderForm({ saving: true });
      const submitBtn = screen.getByTestId("resources-mine-form-submit");
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent("Enregistrement...");
    });

    it("affiche le message d'erreur serveur transmis en prop", () => {
      renderForm({ errorMessage: "Une erreur inattendue est survenue." });
      expect(
        screen.getByText("Une erreur inattendue est survenue."),
      ).toBeInTheDocument();
    });

    it("appelle onCancel au clic sur Annuler", () => {
      const { onCancel } = renderForm();
      fireEvent.click(screen.getByTestId("resources-mine-form-cancel"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("édition d'une ressource existante", () => {
    const EDITING: ResourceRow = {
      id: "res-1",
      kind: "ASSESSMENT",
      schoolId: "school-legacy",
      academicLevelId: "level-6eme",
      trackId: null,
      subjectId: "subj-math",
      examType: "SEQUENCE_TEST",
      sequence: "SEQ_1",
      academicYearLabel: "2025-2026",
      title: "Contrôle existant",
      authorUserId: "teacher-1",
      statementStatus: "PENDING",
      correctionContent: null,
      correctionStatus: "PENDING",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      school: { id: "school-legacy", name: "École fermée depuis" },
      academicLevel: { id: "level-6eme", code: "6EME", label: "6ème" },
      track: null,
      subject: { id: "subj-math", name: "Mathématiques" },
      authorUser: { id: "teacher-1", firstName: "Paul", lastName: "Martin" },
      isFavorite: false,
    };

    it("pré-remplit et garde sélectionnable une école qui n'apparaît plus dans les résultats de recherche", async () => {
      mockApi.searchSchools.mockResolvedValue(SCHOOLS);
      renderForm({ editingResource: EDITING, kind: "ASSESSMENT" });

      await waitFor(() => expect(mockApi.searchSchools).toHaveBeenCalled());

      expect(screen.getByTestId("resources-mine-form-school")).toHaveTextContent(
        "École fermée depuis",
      );

      fireEvent.click(screen.getByTestId("resources-mine-form-school"));
      expect(
        screen.getByTestId("resources-mine-form-school-option-school-legacy"),
      ).toHaveTextContent("École fermée depuis");
    });

    it("pré-remplit le titre et la matière depuis la ressource éditée", () => {
      renderForm({ editingResource: EDITING, kind: "ASSESSMENT" });
      expect(screen.getByTestId("resources-mine-form-title")).toHaveValue(
        "Contrôle existant",
      );
    });
  });
});
