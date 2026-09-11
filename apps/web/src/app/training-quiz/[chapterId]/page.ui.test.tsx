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
  stage: "DISCOVERY" | "PRACTICE" | "MASTERY";
  totalQuestions: number;
  solvedQuestions: number;
  unlocked: boolean;
  objective: string;
  introSeen: boolean;
};

function makeLevels(
  overrides: Partial<Record<Level["stage"], Partial<Level>>>,
) {
  const base: Record<Level["stage"], Level> = {
    DISCOVERY: {
      stage: "DISCOVERY",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: true,
      objective: "Objectif découverte",
      introSeen: true,
    },
    PRACTICE: {
      stage: "PRACTICE",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: false,
      objective: "Objectif pratique",
      introSeen: true,
    },
    MASTERY: {
      stage: "MASTERY",
      totalQuestions: 0,
      solvedQuestions: 0,
      unlocked: false,
      objective: "Objectif maîtrise",
      introSeen: true,
    },
  };
  return ["DISCOVERY", "PRACTICE", "MASTERY"].map((s) => ({
    ...base[s as Level["stage"]],
    ...overrides[s as Level["stage"]],
  }));
}

// Chapter made only of a DISCOVERY stage (2 questions) — used to exercise
// the pure-recall flow: no hint, no answer reveal, free retry.
const DISCOVERY_CHAPTER = {
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
    DISCOVERY: {
      stage: "DISCOVERY",
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
      stage: "DISCOVERY",
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
      stage: "DISCOVERY",
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

// Chapter with DISCOVERY already cleared and one PRACTICE question — used
// to exercise the action-incitation flow: hint available, no answer
// reveal, retry gated on visiting the real app screen.
const PRACTICE_CHAPTER = {
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
    DISCOVERY: {
      stage: "DISCOVERY",
      totalQuestions: 1,
      solvedQuestions: 1,
      unlocked: true,
    },
    PRACTICE: {
      stage: "PRACTICE",
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
      stage: "DISCOVERY",
      text: "Question de découverte déjà résolue",
      hint: null,
      imageUrl: null,
      deepLinkRoute: null,
      solved: true,
      attemptsCount: 1,
      options: [{ id: "qe-correct", order: 1, text: "Réponse" }],
    },
    {
      id: "q2",
      order: 2,
      type: "MCQ_SINGLE",
      stage: "PRACTICE",
      text: "Allez consulter la fiche de l'enfant, puis répondez.",
      hint: "Ouvrez la fiche de l'enfant depuis la liste.",
      imageUrl: null,
      deepLinkRoute: "/children/{childId}/discipline",
      solved: false,
      attemptsCount: 0,
      options: [
        { id: "q2-correct", order: 1, text: "Bonne réponse" },
        { id: "q2-wrong", order: 2, text: "Mauvaise réponse" },
      ],
    },
  ],
};

// Chapter with DISCOVERY and PRACTICE already cleared and one MASTERY
// question — used to exercise the advanced flow: hint available, answer
// reveal, retry gated only by the cooldown.
const MASTERY_CHAPTER = {
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
    DISCOVERY: {
      stage: "DISCOVERY",
      totalQuestions: 1,
      solvedQuestions: 1,
      unlocked: true,
    },
    PRACTICE: {
      stage: "PRACTICE",
      totalQuestions: 1,
      solvedQuestions: 1,
      unlocked: true,
    },
    MASTERY: {
      stage: "MASTERY",
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
      stage: "DISCOVERY",
      text: "Question de découverte déjà résolue",
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
      stage: "PRACTICE",
      text: "Question de pratique déjà résolue",
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
      stage: "MASTERY",
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
  chapter = DISCOVERY_CHAPTER,
  chapterAfterAnswer,
  answerResult,
  linkedStudents = [{ id: "child-1" }],
}: {
  chapter?: unknown;
  chapterAfterAnswer?: unknown;
  answerResult?: unknown;
  linkedStudents?: Array<{ id: string }>;
} = {}) {
  let answered = false;
  global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/schools/ecole-test/me")) {
      return jsonResponse({ linkedStudents });
    }
    if (url.endsWith("/me")) return jsonResponse({ schoolSlug: "ecole-test" });
    if (url.endsWith("/training-quiz/chapters/chapter-1")) {
      return jsonResponse(
        answered && chapterAfterAnswer ? chapterAfterAnswer : chapter,
      );
    }
    if (url.includes("/training-quiz/questions/") && init?.method === "POST") {
      answered = true;
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

  describe("discovery stage", () => {
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

    it("allows an immediate retry without requiring a visit to the app", async () => {
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
      expect(
        screen.getByText("Repensez à la question et retentez votre chance."),
      ).toBeInTheDocument();

      const retryButton = screen.getByText("Réessayer").closest("button");
      expect(retryButton).not.toBeDisabled();

      fireEvent.click(screen.getByText("Réessayer"));
      expect(screen.queryByText("Pas tout à fait")).not.toBeInTheDocument();
    });
  });

  describe("practice stage", () => {
    it("shows a hint and keeps retry locked until both the deep link is visited and the cooldown ends", async () => {
      mockFetch({
        chapter: PRACTICE_CHAPTER,
        answerResult: {
          correct: false,
          alreadySolved: false,
          explanation: "Pas exactement.",
          correctOptionIds: [],
          attemptsCount: 1,
        },
      });
      render(<TrainingQuizChapterPage />);

      await screen.findByText(
        "Allez consulter la fiche de l'enfant, puis répondez.",
      );
      expect(screen.getByText("Afficher un indice")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Mauvaise réponse"));
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
      expect(pushMock).toHaveBeenCalled();

      const retryButtonAfterVisit = screen
        .getByText("Réessayer")
        .closest("button");
      expect(retryButtonAfterVisit).not.toBeDisabled();

      fireEvent.click(screen.getByText("Réessayer"));
      expect(screen.queryByText("Pas tout à fait")).not.toBeInTheDocument();
    });
  });

  describe("mastery stage", () => {
    it("shows a hint and reveals the correct option, with retry gated only by the cooldown", async () => {
      mockFetch({
        chapter: MASTERY_CHAPTER,
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

  it("navigates to the deep link in the same tab", async () => {
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

    await screen.findByText("Voir dans l'application");
    fireEvent.click(screen.getByText("Voir dans l'application"));

    expect(pushMock).toHaveBeenCalledWith(
      "/schools/ecole-test/children/child-1/discipline",
    );
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

  it("unlocks and switches to the next stage once the current one is cleared", async () => {
    const chapter = {
      ...DISCOVERY_CHAPTER,
      totalQuestions: 2,
      levels: makeLevels({
        DISCOVERY: {
          stage: "DISCOVERY",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: true,
        },
        PRACTICE: {
          stage: "PRACTICE",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: false,
        },
      }),
      questions: [
        DISCOVERY_CHAPTER.questions[0],
        {
          id: "qm",
          order: 2,
          type: "MCQ_SINGLE",
          stage: "PRACTICE",
          text: "Question de niveau pratique",
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
    // PRACTICE tab is locked before DISCOVERY is cleared.
    expect(screen.getByRole("tab", { name: /Pratique/ })).toBeDisabled();

    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Bonne réponse !");
    fireEvent.click(screen.getByText("Mission suivante"));

    await screen.findByText("Passer au niveau Pratique");
    fireEvent.click(screen.getByText("Passer au niveau Pratique"));

    await screen.findByText("Question de niveau pratique");
    expect(
      screen.queryByText("Où consultez-vous le comportement disciplinaire ?"),
    ).not.toBeInTheDocument();
  });

  it("refetches the chapter on a correct answer so a newly-unlocked stage shows real options, not the empty list from the initial fetch", async () => {
    // At fetch time PRACTICE is still locked, so the API withholds its real
    // options (`options: []`) exactly like the live backend does for a
    // not-yet-unlocked stage.
    const chapterBeforeUnlock = {
      ...DISCOVERY_CHAPTER,
      totalQuestions: 2,
      levels: makeLevels({
        DISCOVERY: {
          stage: "DISCOVERY",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: true,
        },
        PRACTICE: {
          stage: "PRACTICE",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: false,
        },
      }),
      questions: [
        DISCOVERY_CHAPTER.questions[0],
        {
          id: "qm",
          order: 2,
          type: "MCQ_SINGLE",
          stage: "PRACTICE",
          text: "Question de niveau pratique",
          hint: null,
          imageUrl: null,
          deepLinkRoute: null,
          solved: false,
          attemptsCount: 0,
          options: [],
        },
      ],
    };
    const chapterAfterUnlock = {
      ...chapterBeforeUnlock,
      levels: makeLevels({
        DISCOVERY: {
          stage: "DISCOVERY",
          totalQuestions: 1,
          solvedQuestions: 1,
          unlocked: true,
        },
        PRACTICE: {
          stage: "PRACTICE",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: true,
        },
      }),
      questions: [
        { ...chapterBeforeUnlock.questions[0], solved: true },
        {
          ...chapterBeforeUnlock.questions[1],
          options: [{ id: "qm-correct", order: 1, text: "Réponse moyenne" }],
        },
      ],
    };
    mockFetch({
      chapter: chapterBeforeUnlock,
      chapterAfterAnswer: chapterAfterUnlock,
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText(
      "Où consultez-vous le comportement disciplinaire ?",
    );
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Bonne réponse !");
    fireEvent.click(screen.getByText("Mission suivante"));

    await screen.findByText("Passer au niveau Pratique");
    fireEvent.click(screen.getByText("Passer au niveau Pratique"));

    await screen.findByText("Question de niveau pratique");
    expect(screen.getByText("Réponse moyenne")).toBeInTheDocument();
  });

  it("shows the completion screen after the last mission of a single-stage chapter", async () => {
    mockFetch({
      chapter: {
        ...DISCOVERY_CHAPTER,
        totalQuestions: 1,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: true,
          },
        }),
        questions: [DISCOVERY_CHAPTER.questions[0]],
      },
    });
    render(<TrainingQuizChapterPage />);

    await screen.findByText("Onglet Discipline");
    fireEvent.click(screen.getByText("Onglet Discipline"));
    fireEvent.click(screen.getByText("Valider"));

    await screen.findByText("Terminer");
    fireEvent.click(screen.getByText("Terminer"));

    await screen.findByText("Terminer le chapitre");
    fireEvent.click(screen.getByText("Terminer le chapitre"));

    await waitFor(() =>
      expect(screen.getByText("Chapitre terminé !")).toBeInTheDocument(),
    );
  });

  describe("level intro page", () => {
    it("shows the intro page before the first question when the level's intro has not been seen yet, and marking it seen reveals the question", async () => {
      const chapter = {
        ...DISCOVERY_CHAPTER,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 2,
            solvedQuestions: 0,
            unlocked: true,
            objective: "Découvrez où consulter le comportement disciplinaire.",
            introSeen: false,
          },
        }),
      };
      let introSeenCalled = false;
      global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/me")) {
          return jsonResponse({ schoolSlug: "ecole-test" });
        }
        if (url.endsWith("/schools/ecole-test/me")) {
          return jsonResponse({ linkedStudents: [] });
        }
        if (url.endsWith("/training-quiz/chapters/chapter-1")) {
          return jsonResponse(chapter);
        }
        if (url.includes("/intro-seen") && init?.method === "POST") {
          introSeenCalled = true;
          return jsonResponse({ ok: true });
        }
        return jsonResponse({});
      }) as unknown as typeof fetch;

      render(<TrainingQuizChapterPage />);

      await screen.findByText("Objectif de ce niveau");
      expect(
        screen.getByText(
          "Découvrez où consulter le comportement disciplinaire.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Règles du niveau")).toBeInTheDocument();
      expect(
        screen.queryByText("Où consultez-vous le comportement disciplinaire ?"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Commencer ce niveau"));

      await screen.findByText(
        "Où consultez-vous le comportement disciplinaire ?",
      );
      expect(introSeenCalled).toBe(true);
    });

    it("offers a way back to the quiz home from the intro page", async () => {
      const chapter = {
        ...DISCOVERY_CHAPTER,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 2,
            solvedQuestions: 0,
            unlocked: true,
            introSeen: false,
          },
        }),
      };
      mockFetch({ chapter });
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Objectif de ce niveau");
      fireEvent.click(screen.getByText("Retour aux chapitres"));

      expect(pushMock).toHaveBeenCalledWith("/training-quiz");
      // Clicking back must not have marked the intro as seen.
      expect(
        screen.queryByText("Où consultez-vous le comportement disciplinaire ?"),
      ).not.toBeInTheDocument();
    });
  });

  describe("level completion celebration", () => {
    it("shows the level score and an encouragement before offering to move to the next level", async () => {
      const chapter = {
        ...DISCOVERY_CHAPTER,
        totalQuestions: 2,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: true,
            objective: "Objectif découverte",
            introSeen: true,
          },
          PRACTICE: {
            stage: "PRACTICE",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: false,
            objective: "Objectif pratique",
            introSeen: true,
          },
        }),
        questions: [
          DISCOVERY_CHAPTER.questions[0],
          {
            id: "qm",
            order: 2,
            type: "MCQ_SINGLE",
            stage: "PRACTICE",
            text: "Question de niveau pratique",
            hint: null,
            imageUrl: null,
            deepLinkRoute: null,
            solved: false,
            attemptsCount: 0,
            options: [{ id: "qm-correct", order: 1, text: "Réponse moyenne" }],
          },
        ],
      };
      const chapterAfterAnswer = {
        ...chapter,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 1,
            solvedQuestions: 1,
            unlocked: true,
            objective: "Objectif découverte",
            introSeen: true,
          },
          PRACTICE: {
            stage: "PRACTICE",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: true,
            objective: "Objectif pratique",
            introSeen: true,
          },
        }),
        questions: [
          { ...chapter.questions[0], solved: true },
          chapter.questions[1],
        ],
      };
      mockFetch({ chapter, chapterAfterAnswer });
      render(<TrainingQuizChapterPage />);

      await screen.findByText(
        "Où consultez-vous le comportement disciplinaire ?",
      );
      fireEvent.click(screen.getByText("Onglet Discipline"));
      fireEvent.click(screen.getByText("Valider"));

      await screen.findByText("Bonne réponse !");
      fireEvent.click(screen.getByText("Mission suivante"));

      await screen.findByText("Niveau Découverte terminé !");
      expect(screen.getByText("1/1 missions réussies")).toBeInTheDocument();
      expect(
        screen.getByText("Prochaine étape : le niveau Pratique."),
      ).toBeInTheDocument();
      expect(screen.getByText("Passer au niveau Pratique")).toBeInTheDocument();
    });

    it("offers a way back to the quiz home from the level completion screen", async () => {
      const chapter = {
        ...DISCOVERY_CHAPTER,
        totalQuestions: 1,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 1,
            solvedQuestions: 0,
            unlocked: true,
          },
        }),
        questions: [DISCOVERY_CHAPTER.questions[0]],
      };
      mockFetch({ chapter });
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Onglet Discipline");
      fireEvent.click(screen.getByText("Onglet Discipline"));
      fireEvent.click(screen.getByText("Valider"));

      await screen.findByText("Terminer");
      fireEvent.click(screen.getByText("Terminer"));

      await screen.findByText("Terminer le chapitre");
      fireEvent.click(screen.getByText("Retour aux chapitres"));

      expect(pushMock).toHaveBeenCalledWith("/training-quiz");
    });
  });

  describe("resuming a chapter in progress", () => {
    it("lands back on the exact question left off, in the right level, skipping completed levels and the intro", async () => {
      const chapter = {
        ...MASTERY_CHAPTER,
        totalQuestions: 3,
        levels: makeLevels({
          DISCOVERY: {
            stage: "DISCOVERY",
            totalQuestions: 1,
            solvedQuestions: 1,
            unlocked: true,
          },
          PRACTICE: {
            stage: "PRACTICE",
            totalQuestions: 1,
            solvedQuestions: 1,
            unlocked: true,
          },
          MASTERY: {
            stage: "MASTERY",
            totalQuestions: 2,
            solvedQuestions: 1,
            unlocked: true,
          },
        }),
        questions: [
          MASTERY_CHAPTER.questions[0],
          MASTERY_CHAPTER.questions[1],
          { ...MASTERY_CHAPTER.questions[2], solved: true },
          {
            id: "q3",
            order: 4,
            type: "MCQ_SINGLE",
            stage: "MASTERY",
            text: "Troisième mission de maîtrise, non résolue",
            hint: null,
            imageUrl: null,
            deepLinkRoute: null,
            solved: false,
            attemptsCount: 0,
            options: [
              { id: "q3-correct", order: 1, text: "Bonne réponse" },
              { id: "q3-wrong", order: 2, text: "Mauvaise réponse" },
            ],
          },
        ],
      };
      mockFetch({ chapter });
      render(<TrainingQuizChapterPage />);

      await screen.findByText("Troisième mission de maîtrise, non résolue");
      expect(screen.getByText("Mission 2 sur 2")).toBeInTheDocument();
      expect(
        screen.queryByText("Objectif de ce niveau"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Maîtrise/ })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });
});
