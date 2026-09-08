import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrainingQuizChapterPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useParams: () => ({ chapterId: "chapter-1" }),
}));

vi.mock("../../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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

const CHAPTER_DETAIL = {
  id: "chapter-1",
  moduleKey: "discipline",
  order: 1,
  icon: "ShieldCheck",
  colorFrom: "#3DA5F5",
  colorTo: "#207FD5",
  title: "Discipline",
  description: "desc",
  totalQuestions: 2,
  solvedQuestions: 0,
  questions: [
    {
      id: "q1",
      order: 1,
      type: "MCQ_SINGLE",
      difficulty: "EASY",
      text: "Où consultez-vous le comportement disciplinaire ?",
      hint: "Ouvrez la fiche de votre enfant.",
      imageUrl: null,
      deepLinkRoute: "/children/{childId}/discipline",
      solved: false,
      attemptsCount: 0,
      options: [
        { id: "opt-correct", order: 1, text: "Onglet Discipline" },
        { id: "opt-wrong", order: 2, text: "Messagerie" },
      ],
    },
    {
      id: "q2",
      order: 2,
      type: "MCQ_SINGLE",
      difficulty: "HARD",
      text: "Deuxième mission ?",
      hint: "Un indice pour la deuxième mission.",
      imageUrl: null,
      deepLinkRoute: null,
      solved: false,
      attemptsCount: 0,
      options: [
        { id: "q2-correct", order: 1, text: "Bonne réponse" },
        { id: "q2-wrong", order: 2, text: "Mauvaise réponse" },
      ],
    },
  ],
};

function mockFetch({
  chapter = CHAPTER_DETAIL,
  answerResult,
  linkedStudents = [{ id: "child-1" }],
}: {
  chapter?: unknown;
  answerResult?: unknown;
  linkedStudents?: Array<{ id: string }>;
} = {}) {
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/schools/ecole-test/me")) {
      return jsonResponse({ linkedStudents });
    }
    if (url.endsWith("/me")) return jsonResponse({ schoolSlug: "ecole-test" });
    if (url.endsWith("/training-quiz/chapters/chapter-1")) {
      return jsonResponse(chapter);
    }
    if (url.includes("/training-quiz/questions/") && init?.method === "POST") {
      return jsonResponse(
        answerResult ?? {
          correct: true,
          alreadySolved: false,
          explanation: "Bien joué !",
          correctOptionIds: ["opt-correct"],
          attemptsCount: 1,
        },
      );
    }
    return jsonResponse({});
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  pushMock.mockClear();
  replaceMock.mockClear();
});

describe("TrainingQuizChapterPage", () => {
  it("renders the first mission and its options", async () => {
    mockFetch();
    render(<TrainingQuizChapterPage />);

    await screen.findByText(
      "Où consultez-vous le comportement disciplinaire ?",
    );
    expect(screen.getByText("Onglet Discipline")).toBeInTheDocument();
    expect(screen.getByText("Mission 1 sur 2")).toBeInTheDocument();
  });

  it("submits an answer and shows correct feedback", async () => {
    mockFetch();
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Bonne réponse !");
    expect(screen.getByText("Bien joué !")).toBeInTheDocument();
  });

  it("shows incorrect feedback and allows retrying", async () => {
    mockFetch({
      answerResult: {
        correct: false,
        alreadySolved: false,
        explanation: "Pas exactement.",
        correctOptionIds: ["opt-correct"],
        attemptsCount: 1,
      },
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Messagerie"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Pas tout à fait");
    fireEvent.click(screen.getByText("Réessayer"));

    expect(screen.queryByText("Pas tout à fait")).not.toBeInTheDocument();
  });

  it("navigates to the app via the deep link", async () => {
    mockFetch();
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Voir dans l'application");
    fireEvent.click(screen.getByText("Voir dans l'application"));

    expect(pushMock).toHaveBeenCalledWith(
      "/schools/ecole-test/children/child-1/discipline",
    );
  });

  it("hides the deep-link CTA when the parent has no linked child yet", async () => {
    mockFetch({ linkedStudents: [] });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Bonne réponse !");
    expect(
      screen.queryByText("Voir dans l'application"),
    ).not.toBeInTheDocument();
  });

  it("shows a hint and reveals it automatically after a second wrong attempt", async () => {
    mockFetch({
      answerResult: {
        correct: false,
        alreadySolved: false,
        explanation: "Pas exactement.",
        correctOptionIds: ["opt-correct"],
        attemptsCount: 2,
      },
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    expect(screen.getByText("Afficher un indice")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Messagerie"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Pas tout à fait");
    expect(
      screen.getByText("Ouvrez la fiche de votre enfant."),
    ).toBeInTheDocument();
  });

  it("shows the completion screen after the last mission", async () => {
    mockFetch({
      chapter: {
        ...CHAPTER_DETAIL,
        questions: [CHAPTER_DETAIL.questions[0]],
      },
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Terminer");
    fireEvent.click(screen.getByText("Terminer"));

    await waitFor(() =>
      expect(screen.getByText("Chapitre terminé !")).toBeInTheDocument(),
    );
  });
});
