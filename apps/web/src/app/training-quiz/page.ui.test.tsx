import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrainingQuizPage from "./page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
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

const CHAPTER = {
  id: "chapter-1",
  moduleKey: "discipline",
  order: 1,
  icon: "ShieldCheck",
  colorFrom: "#3DA5F5",
  colorTo: "#207FD5",
  title: "Discipline",
  description: "Découvrez le suivi disciplinaire.",
  totalQuestions: 6,
  solvedQuestions: 2,
};

const SCORE = {
  globalPercent: 33,
  totalQuestions: 6,
  solvedQuestions: 2,
  chapters: [
    {
      chapterId: "chapter-1",
      moduleKey: "discipline",
      title: "Discipline",
      percent: 33,
      totalQuestions: 6,
      solvedQuestions: 2,
    },
  ],
};

function mockFetch({
  chapters = [CHAPTER],
  score = SCORE,
}: { chapters?: unknown[]; score?: unknown } = {}) {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/me")) {
      return jsonResponse({ schoolSlug: "ecole-test" });
    }
    if (url.endsWith("/training-quiz/chapters")) {
      return jsonResponse(chapters);
    }
    if (url.endsWith("/training-quiz/score")) {
      return jsonResponse(score);
    }
    return jsonResponse({});
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  pushMock.mockClear();
  replaceMock.mockClear();
});

describe("TrainingQuizPage", () => {
  it("redirects unauthenticated users", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 401 })),
    ) as unknown as typeof fetch;

    render(<TrainingQuizPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("lists chapters with progress and navigates on click", async () => {
    mockFetch();
    render(<TrainingQuizPage />);

    await screen.findByText("Discipline");
    expect(screen.getAllByText("33%").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Discipline").closest("button")!);
    expect(pushMock).toHaveBeenCalledWith("/training-quiz/chapter-1");
  });

  it("shows an empty state when the role has no chapters", async () => {
    mockFetch({
      chapters: [],
      score: {
        ...SCORE,
        chapters: [],
        totalQuestions: 0,
        solvedQuestions: 0,
        globalPercent: 0,
      },
    });
    render(<TrainingQuizPage />);

    await screen.findByText(
      "Aucun chapitre de formation n'est disponible pour votre rôle pour le moment.",
    );
  });

  it("surfaces a load error without crashing", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/me")) return jsonResponse({ schoolSlug: null });
      return Promise.resolve(new Response(null, { status: 500 }));
    }) as unknown as typeof fetch;

    render(<TrainingQuizPage />);

    await screen.findByText(
      "Impossible de charger le quiz de formation pour le moment.",
    );
  });
});
