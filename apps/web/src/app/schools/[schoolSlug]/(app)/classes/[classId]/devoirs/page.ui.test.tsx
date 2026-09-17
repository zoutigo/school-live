import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassHomeworkPage from "./page";
import { useLocaleStore } from "../../../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../../../i18n/translations";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";

function resetOnboardingTourStore() {
  useOnboardingTourStore.setState({
    completedTours: {},
    activeTourId: null,
    activeRole: null,
    steps: [],
    stepIndex: 0,
    targetRect: null,
  });
}

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    classId: "class-1",
  }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../../../components/ui/form-rich-text-editor", () => ({
  FormRichTextEditor: ({
    label,
    value,
    onChange,
    editorTestId,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    editorTestId?: string;
  }) => (
    <div>
      <label>{label}</label>
      <textarea
        data-testid={editorTestId ?? "rich-text-editor"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("../../../../../../../components/ui/module-help-tab", () => ({
  ModuleHelpTab: ({ moduleName }: { moduleName: string }) => (
    <div data-testid="module-help-tab">{moduleName}</div>
  ),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const contextPayload = {
  schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
  selectedSchoolYearId: "sy-1",
  assignments: [
    {
      classId: "class-1",
      subjectId: "sub-1",
      className: "6eC",
      subjectName: "Anglais",
      schoolYearId: "sy-1",
    },
  ],
  students: [
    {
      classId: "class-1",
      className: "6eC",
      studentId: "stu-1",
      studentFirstName: "Alice",
      studentLastName: "Dupont",
    },
  ],
};

const pastDate = new Date(Date.now() - 86_400_000).toISOString();
const futureDate = new Date(Date.now() + 86_400_000).toISOString();

const mockHomeworks = [
  {
    id: "hw-1",
    classId: "class-1",
    title: "Conjugaison chapitre 3",
    contentHtml: "<p>Apprendre les verbes irréguliers</p>",
    expectedAt: futureDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorUserId: "teacher-1",
    authorDisplayName: "M. Martin",
    subject: { id: "sub-1", name: "Anglais", colorHex: null },
    attachments: [],
    commentsCount: 0,
    summary: null,
    myDoneAt: null,
  },
  {
    id: "hw-2",
    classId: "class-1",
    title: "Grammaire (en retard)",
    contentHtml: null,
    expectedAt: pastDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorUserId: "teacher-1",
    authorDisplayName: "M. Martin",
    subject: { id: "sub-1", name: "Anglais", colorHex: null },
    attachments: [],
    commentsCount: 0,
    summary: null,
    myDoneAt: null,
  },
];

const mockHomeworkWithDone = [
  {
    ...mockHomeworks[0],
    myDoneAt: new Date().toISOString(),
  },
];

const mockDetail = {
  ...mockHomeworks[0],
  comments: [
    {
      id: "cmt-1",
      authorUserId: "teacher-1",
      authorDisplayName: "M. Martin",
      authorRole: "TEACHER",
      body: "Bonne chance à tous !",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mine: false,
    },
  ],
  completionStatuses: [
    {
      studentId: "stu-1",
      firstName: "Alice",
      lastName: "Dupont",
      doneAt: null,
    },
  ],
};

function mockFetch(
  options: {
    role?: string;
    homeworks?: unknown[];
    detail?: unknown;
    onboardingHelpEnabled?: boolean;
  } = {},
) {
  const {
    role = "TEACHER",
    homeworks = mockHomeworks,
    detail = mockDetail,
    onboardingHelpEnabled,
  } = options;

  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url.includes("/schools/college-vogt/me")) {
      return jsonResponse({ role, onboardingHelpEnabled });
    }
    if (url.includes("/student-grades/context")) {
      return jsonResponse(contextPayload);
    }
    if (url.endsWith("/timetable/me")) {
      return jsonResponse({ class: { id: "class-1", name: "6eC" } });
    }
    if (url.match(/\/homework\/hw-\d+$/) || url.match(/\/homework\/hw-\d+\?/)) {
      return jsonResponse(detail);
    }
    if (url.includes("/classes/class-1/homework")) {
      return jsonResponse(homeworks);
    }

    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("Teacher class homework page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    resetOnboardingTourStore();
  });

  it("affiche les onglets, le tableau et les statuts en francais", async () => {
    mockFetch();

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByText("Devoirs - 6eC")).toBeInTheDocument();
    });

    expect(screen.getByText("Liste")).toBeInTheDocument();
    expect(screen.getByText("Voir")).toBeInTheDocument();
    expect(screen.getByText("Aide")).toBeInTheDocument();

    const table = screen.getByTestId("homework-list-table");
    expect(within(table).getByText("Titre")).toBeInTheDocument();
    expect(within(table).getByText("Matiere")).toBeInTheDocument();
    expect(within(table).getByText("Echeance")).toBeInTheDocument();
    expect(within(table).getByText("Statut")).toBeInTheDocument();

    expect(within(table).getByText("A faire")).toBeInTheDocument();
    expect(within(table).getByText("En retard")).toBeInTheDocument();

    expect(
      within(table).getByText("Conjugaison chapitre 3"),
    ).toBeInTheDocument();
    expect(
      within(table).getByText("Grammaire (en retard)"),
    ).toBeInTheDocument();

    // Vue mobile (cards) : mêmes devoirs, mêmes statuts, accessibles sans
    // scroll horizontal.
    const cards = screen.getByTestId("homework-list-cards");
    expect(within(cards).getByText("A faire")).toBeInTheDocument();
    expect(within(cards).getByText("En retard")).toBeInTheDocument();
    expect(
      within(cards).getByText("Conjugaison chapitre 3"),
    ).toBeInTheDocument();
    expect(
      within(cards).getByText("Grammaire (en retard)"),
    ).toBeInTheDocument();
  });

  it("traduit les onglets, le tableau et les statuts en anglais", async () => {
    useLocaleStore.setState({ locale: "en" });
    mockFetch();

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByText("Homework - 6eC")).toBeInTheDocument();
    });

    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();

    const table = screen.getByTestId("homework-list-table");
    expect(within(table).getByText("Title")).toBeInTheDocument();
    expect(within(table).getByText("Subject")).toBeInTheDocument();
    expect(within(table).getByText("Due date")).toBeInTheDocument();
    expect(within(table).getByText("Status")).toBeInTheDocument();

    expect(within(table).getByText("To do")).toBeInTheDocument();
    expect(within(table).getByText("Late")).toBeInTheDocument();
  });

  it("affiche le bouton Nouveau devoir pour un enseignant", async () => {
    mockFetch({ role: "TEACHER" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-add-button")).toBeInTheDocument();
    });
  });

  it("n'affiche pas le bouton Nouveau devoir pour un parent", async () => {
    mockFetch({ role: "PARENT", homeworks: mockHomeworkWithDone });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(
        screen.queryByTestId("homework-add-button"),
      ).not.toBeInTheDocument();
    });
  });

  it("affiche Aucun devoir quand la liste est vide", async () => {
    mockFetch({ homeworks: [] });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucun devoir pour cette periode."),
      ).toBeInTheDocument();
    });
  });

  it("affiche le statut Valide pour un devoir marque fait par un parent", async () => {
    mockFetch({
      role: "PARENT",
      homeworks: mockHomeworkWithDone,
      onboardingHelpEnabled: false,
    });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByText("Valide")).toBeInTheDocument();
    });
  });

  it("ouvre le detail au clic sur une ligne et affiche les commentaires", async () => {
    mockFetch();

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));

    await waitFor(() => {
      expect(screen.getByText("Bonne chance à tous !")).toBeInTheDocument();
    });

    expect(screen.getByText("M. Martin")).toBeInTheDocument();
  });

  it("affiche le bouton Marquer fait pour un eleve dans le detail", async () => {
    mockFetch({ role: "STUDENT", onboardingHelpEnabled: false });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByText("Conjugaison chapitre 3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));

    await waitFor(() => {
      expect(screen.getByTestId("homework-toggle-done")).toBeInTheDocument();
    });

    expect(screen.getByTestId("homework-toggle-done")).toHaveTextContent(
      "Marquer fait",
    );
  });

  // Régression 2026-09-05 : `/student-grades/context` est un endpoint
  // enseignant/admin qui renvoie 403 à un compte STUDENT sans autre rôle
  // (memberships school-staff/teacher) — avant ce correctif, la page entière
  // restait bloquée sur "Classe non accessible avec vos affectations." pour
  // un vrai élève, alors qu'elle fonctionnait par accident pour un compte de
  // test cumulant STUDENT + des rôles admin. Le nom de classe est maintenant
  // résolu via `/timetable/me` pour ce rôle, sans dépendre de ce contexte
  // enseignant.
  it("un élève sans rôle admin/enseignant voit sa liste malgré un /student-grades/context inaccessible (403)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return jsonResponse({ role: "STUDENT", onboardingHelpEnabled: false });
      }
      if (url.includes("/student-grades/context")) {
        return jsonResponse({ message: "Forbidden" }, 403);
      }
      if (url.endsWith("/timetable/me")) {
        return jsonResponse({ class: { id: "class-1", name: "6eC" } });
      }
      if (url.includes("/classes/class-1/homework")) {
        return jsonResponse(mockHomeworks);
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByText("Devoirs - 6eC")).toBeInTheDocument();
      expect(screen.getByText("Conjugaison chapitre 3")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Classe non accessible avec vos affectations."),
    ).not.toBeInTheDocument();
  });

  it("affiche les boutons modifier/supprimer dans le detail pour un enseignant", async () => {
    mockFetch({ role: "TEACHER" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));

    await waitFor(() => {
      expect(screen.getByTestId("homework-detail-edit")).toBeInTheDocument();
      expect(screen.getByTestId("homework-detail-delete")).toBeInTheDocument();
    });
  });

  it("liste mobile en cartes : ouvre le detail, modifier et supprimer fonctionnent comme sur la table desktop", async () => {
    mockFetch({ role: "TEACHER" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-card-hw-1")).toBeInTheDocument();
    });

    const card = screen.getByTestId("homework-card-hw-1");
    expect(
      within(card).getByText("Conjugaison chapitre 3"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Anglais")).toBeInTheDocument();

    // Ouverture du detail depuis la carte (pas depuis la ligne du tableau).
    fireEvent.click(within(card).getByText("Conjugaison chapitre 3"));
    await waitFor(() => {
      expect(screen.getByTestId("homework-detail-edit")).toBeInTheDocument();
    });

    // Modifier depuis la carte ouvre bien le formulaire d'edition.
    fireEvent.click(screen.getByTestId("homework-card-edit-hw-1"));
    expect(screen.getByTestId("homework-form-title")).toBeInTheDocument();
    expect(screen.getByTestId("homework-form-title")).toHaveValue(
      "Conjugaison chapitre 3",
    );

    // Supprimer depuis la carte ouvre la confirmation de suppression.
    fireEvent.click(screen.getByTestId("homework-card-delete-hw-1"));
    expect(screen.getByTestId("homework-delete-confirm")).toBeInTheDocument();
  });

  it("affiche le formulaire de creation au clic sur Nouveau devoir", async () => {
    mockFetch({ role: "TEACHER" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-add-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-add-button"));

    expect(screen.getByTestId("homework-form-title")).toBeInTheDocument();
    expect(screen.getByTestId("homework-form-subject")).toBeInTheDocument();
    expect(screen.getByTestId("homework-form-expected-at")).toBeInTheDocument();
    expect(screen.getByTestId("homework-form-submit")).toBeInTheDocument();
  });

  it("le formulaire de creation, ajoute apres la liste des devoirs, scrolle vers lui-meme a l'ouverture (evite qu'il reste hors champ)", async () => {
    mockFetch({ role: "TEACHER" });
    const scrollIntoViewMock = vi.fn();
    vi.spyOn(window.Element.prototype, "scrollIntoView").mockImplementation(
      scrollIntoViewMock,
    );

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-add-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-add-button"));

    expect(screen.getByTestId("homework-form-subject")).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" }),
    );
  });

  it("affiche les pièces jointes telechargeable dans le detail", async () => {
    const detailWithAttachments = {
      ...mockDetail,
      attachments: [
        {
          fileName: "cours.pdf",
          fileUrl: "http://minio.local/cours.pdf",
          sizeLabel: "120 Ko",
          mimeType: "application/pdf",
        },
      ],
    };
    mockFetch({ detail: detailWithAttachments });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));

    await waitFor(() => {
      expect(screen.getByText("cours.pdf")).toBeInTheDocument();
      expect(
        screen.getByTestId("homework-attachment-download-0"),
      ).toBeInTheDocument();
    });

    const downloadLink = screen.getByTestId("homework-attachment-download-0");
    expect(downloadLink).toHaveAttribute(
      "href",
      "http://minio.local/cours.pdf",
    );
    expect(downloadLink).toHaveAttribute("download", "cours.pdf");
  });
});

describe("Tour + aide guidee - vue eleve", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    resetOnboardingTourStore();
  });

  it("eleve : le tour demarre et affiche une ligne de demonstration, meme avec de vrais devoirs", async () => {
    mockFetch({ role: "STUDENT" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe("homework");
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("homework-row-homework-tour-fallback"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("homework-row-hw-1")).not.toBeInTheDocument();
    expect(screen.getByText("Exemple : Exercices page 42")).toBeInTheDocument();
  });

  it("cliquer la ligne de demonstration ouvre un detail factice et fait avancer le tour", async () => {
    mockFetch({ role: "STUDENT" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("homework-row-homework-tour-fallback"),
      ).toBeInTheDocument();
    });

    // Move past the informative "tabs" step so the active step is "row"
    // (the only step with advanceOnTargetPress), matching what the "Suivant"
    // button in the tooltip would do in the real overlay.
    act(() => {
      useOnboardingTourStore.getState().next();
    });

    fireEvent.click(screen.getByTestId("homework-row-homework-tour-fallback"));

    await waitFor(() => {
      expect(screen.getByTestId("homework-toggle-done")).toBeInTheDocument();
    });

    expect(useOnboardingTourStore.getState().stepIndex).toBe(2);

    fireEvent.click(screen.getByTestId("homework-toggle-done"));
    expect(screen.getByTestId("homework-toggle-done")).toHaveTextContent(
      "Marquer fait",
    );
  });

  it("le tour se termine : la ligne de demonstration disparait, les vrais devoirs reapparaissent", async () => {
    mockFetch({ role: "STUDENT" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("homework-row-homework-tour-fallback"),
      ).toBeInTheDocument();
    });

    act(() => {
      useOnboardingTourStore.getState().finish();
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("homework-row-homework-tour-fallback"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
  });

  it("onboardingHelpEnabled=false : pas de tour, les vrais devoirs s'affichent directement", async () => {
    mockFetch({ role: "STUDENT", onboardingHelpEnabled: false });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
    expect(
      screen.queryByTestId("homework-row-homework-tour-fallback"),
    ).not.toBeInTheDocument();
  });

  it("enregistre le contenu d'aide (3 sections) dans le menu latéral pour un élève", async () => {
    usePageHelpStore.setState({ entry: null, open: false });
    mockFetch({ role: "STUDENT", onboardingHelpEnabled: false });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Devoirs — Liste");
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "La vue Liste",
      "Consulter un devoir",
      "Marquer comme fait",
    ]);
  });

  it("enregistre le contenu d'aide dans le menu latéral pour un parent", async () => {
    usePageHelpStore.setState({ entry: null, open: false });
    mockFetch({
      role: "PARENT",
      homeworks: mockHomeworkWithDone,
      onboardingHelpEnabled: false,
    });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Devoirs — Liste");
    });
  });

  it("n'enregistre aucune aide pour un enseignant", async () => {
    usePageHelpStore.setState({ entry: null, open: false });
    mockFetch({ role: "TEACHER" });

    render(<TeacherClassHomeworkPage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    expect(usePageHelpStore.getState().entry).toBeNull();
  });
});
