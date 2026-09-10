import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrainingQuizChapterPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

const routerMock = { push: pushMock, replace: replaceMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
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

type Level = {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalQuestions: number;
  solvedQuestions: number;
  unlocked: boolean;
};

function makeLevels(overrides: Partial<Record<Level["difficulty"], Level>>) {
  const base: Record<Level["difficulty"], Level> = {
    EASY: {
      difficulty: "EASY",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: true,
    },
    MEDIUM: {
      difficulty: "MEDIUM",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: false,
    },
    HARD: {
      difficulty: "HARD",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: false,
    },
  };
  return ["EASY", "MEDIUM", "HARD"].map((d) => ({
    ...base[d as Level["difficulty"]],
    ...overrides[d as Level["difficulty"]],
  }));
}

// Chapter made only of an EASY level (2 questions) — used to exercise the
// easy/medium flow: no hint, no answer reveal, dual-condition retry gate.
const EASY_CHAPTER = {
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
  levels: makeLevels({
    EASY: {
      difficulty: "EASY",
      totalQuestions: 2,
      solvedQuestions: 0,
      unlocked: true,
    },
  }),
  questions: [
    {
      id: "q1",
      order: 1,
      type: "MCQ_SINGLE",
      difficulty: "EASY",
      text: "Où consultez-vous le comportement disciplinaire ?",
      hint: null,
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
      difficulty: "EASY",
      text: "Deuxième mission facile ?",
      hint: null,
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

// Chapter with EASY already cleared and one HARD question — used to
// exercise the "advanced" flow: hint available, answer reveal, retry gated
// only by the cooldown.
const HARD_CHAPTER = {
  id: "chapter-1",
  moduleKey: "discipline",
  order: 1,
  icon: "ShieldCheck",
  colorFrom: "#3DA5F5",
  colorTo: "#207FD5",
  title: "Discipline",
  description: "desc",
  totalQuestions: 1,
  solvedQuestions: 0,
  levels: makeLevels({
    EASY: {
      difficulty: "EASY",
      totalQuestions: 1,
      solvedQuestions: 1,
      unlocked: true,
    },
    MEDIUM: {
      difficulty: "MEDIUM",
      totalQuestions: 1,
      solvedQuestions: 1,
      unlocked: true,
    },
    HARD: {
      difficulty: "HARD",
      totalQuestions: 1,
      solvedQuestions: 0,
      unlocked: true,
    },
  }),
  questions: [
    {
      id: "qe",
      order: 1,
      type: "MCQ_SINGLE",
      difficulty: "EASY",
      text: "Question facile déjà résolue",
      hint: null,
      imageUrl: null,
      deepLinkRoute: null,
      solved: true,
      attemptsCount: 1,
      options: [{ id: "qe-correct", order: 1, text: "Réponse" }],
    },
    {
      id: "qm",
      order: 2,
      type: "MCQ_SINGLE",
      difficulty: "MEDIUM",
      text: "Question moyenne déjà résolue",
      hint: null,
      imageUrl: null,
      deepLinkRoute: null,
      solved: true,
      attemptsCount: 1,
      options: [{ id: "qm-correct", order: 1, text: "Réponse" }],
    },
    {
      id: "q2",
      order: 3,
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
  chapter = EASY_CHAPTER,
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

  describe("easy/medium level", () => {
    it("shows the explanation but never reveals which option was correct on a miss", async () => {
      mockFetch({
        answerResult: {
          correct: false,
          alreadySolved: false,
          explanation: "Pas exactement.",
          correctOptionIds: [],
          attemptsCount: 1,
        },
      });
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Onglet Discipline");
      fireEvent.click(screen.getByText("Messagerie"));
      fireEvent.click(screen.getByText("Valider"));

      await screen.findByText("Pas tout à fait");
      expect(screen.getByText("Pas exactement.")).toBeInTheDocument();
      // The correct option never gets the "correct" green styling class.
      const correctOptionButton = screen
        .getByText("Onglet Discipline")
        .closest("button");
      expect(correctOptionButton?.className).not.toContain("bg-teal-surface");
    });

    it("never shows a hint button", async () => {
      mockFetch();
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Onglet Discipline");
      expect(screen.queryByText("Afficher un indice")).not.toBeInTheDocument();
    });

    it("keeps retry locked until both the deep link is visited and the cooldown ends", async () => {
      mockFetch({
        answerResult: {
          correct: false,
          alreadySolved: false,
          explanation: "Pas exactement.",
          correctOptionIds: [],
          attemptsCount: 1,
        },
      });
      const openMock = vi.fn();
      vi.stubGlobal("open", openMock);
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Onglet Discipline");
      fireEvent.click(screen.getByText("Messagerie"));
      fireEvent.click(screen.getByText("Valider"));

      await screen.findByText("Pas tout à fait");
      expect(
        screen.getByText(
          "Repérez la réponse dans l'application, puis revenez retenter une fois le compte à rebours terminé.",
        ),
      ).toBeInTheDocument();

      const retryButton = screen.getByText("Réessayer").closest("button");
      expect(retryButton).toBeDisabled();

      // Retrying while locked must not clear the result panel.
      fireEvent.click(screen.getByText("Réessayer"));
      expect(screen.getByText("Pas tout à fait")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Voir dans l'application"));
      expect(openMock).toHaveBeenCalled();

      const retryButtonAfterVisit = screen
        .getByText("Réessayer")
        .closest("button");
      expect(retryButtonAfterVisit).not.toBeDisabled();

      fireEvent.click(screen.getByText("Réessayer"));
      expect(screen.queryByText("Pas tout à fait")).not.toBeInTheDocument();
    });
  });

  describe("hard level", () => {
    it("shows a hint and reveals the correct option, with retry gated only by the cooldown", async () => {
      mockFetch({
        chapter: HARD_CHAPTER,
        answerResult: {
          correct: false,
          alreadySolved: false,
          explanation: "Pas exactement.",
          correctOptionIds: ["q2-correct"],
          attemptsCount: 1,
        },
      });
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Deuxième mission ?");
      expect(screen.getByText("Afficher un indice")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Mauvaise réponse"));
      fireEvent.click(screen.getByText("Valider"));

      await screen.findByText("Pas tout à fait");
      const retryButton = screen.getByText("Réessayer").closest("button");
      expect(retryButton).not.toBeDisabled();
    });
  });

  it("opens the deep link in a new tab, keeping the quiz in place", async () => {
    mockFetch({
      answerResult: {
        correct: false,
        alreadySolved: false,
        explanation: "Pas exactement.",
        correctOptionIds: [],
        attemptsCount: 1,
      },
    });
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Messagerie"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Voir dans l'application");
    fireEvent.click(screen.getByText("Voir dans l'application"));

    expect(openMock).toHaveBeenCalledWith(
      "/schools/ecole-test/children/child-1/discipline",
      "_blank",
      "noopener,noreferrer",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("hides the deep-link CTA when the parent has no linked child yet", async () => {
    mockFetch({
      linkedStudents: [],
      answerResult: {
        correct: false,
        alreadySolved: false,
        explanation: "Pas exactement.",
        correctOptionIds: [],
        attemptsCount: 1,
      },
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Messagerie"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Pas tout à fait");
    expect(
      screen.queryByText("Voir dans l'application"),
    ).not.toBeInTheDocument();
  });

  it("unlocks and switches to the next level once the current one is cleared", async () => {
    const chapter = {
      ...EASY_CHAPTER,
      totalQuestions: 2,
      levels: makeLevels({
        EASY: {
          difficulty: "EASY",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: true,
        },
        MEDIUM: {
          difficulty: "MEDIUM",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: false,
        },
      }),
      questions: [
        EASY_CHAPTER.questions[0],
        {
          id: "qm",
          order: 2,
          type: "MCQ_SINGLE",
          difficulty: "MEDIUM",
          text: "Question de niveau moyen",
          hint: null,
          imageUrl: null,
          deepLinkRoute: null,
          solved: false,
          attemptsCount: 0,
          options: [{ id: "qm-correct", order: 1, text: "Réponse moyenne" }],
        },
      ],
    };
    mockFetch({ chapter });
    render(<TrainingQuizChapterPage />);

    await screen.findByText(
      "Où consultez-vous le comportement disciplinaire ?",
    );
    // MEDIUM tab is locked before EASY is cleared.
    expect(screen.getByRole("tab", { name: /Moyen/ })).toBeDisabled();

    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Bonne réponse !");
    fireEvent.click(screen.getByText("Mission suivante"));

    await screen.findByText("Question de niveau moyen");
    expect(
      screen.queryByText("Où consultez-vous le comportement disciplinaire ?"),
    ).not.toBeInTheDocument();
  });

  it("shows the completion screen after the last mission of a single-level chapter", async () => {
    mockFetch({
      chapter: {
        ...EASY_CHAPTER,
        totalQuestions: 1,
        levels: makeLevels({
          EASY: {
            difficulty: "EASY",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: true,
          },
        }),
        questions: [EASY_CHAPTER.questions[0]],
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
