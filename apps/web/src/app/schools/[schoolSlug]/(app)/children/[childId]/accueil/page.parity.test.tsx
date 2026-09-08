import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildAccueilPage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
}));

const mockChildRef = vi.hoisted(() => ({
  current: {
    id: "child-1",
    firstName: "Lisa",
    lastName: "MBELE",
    classId: "class-1" as string | null,
    className: "6e A",
  },
}));

function setMockChildClassId(classId: string | null) {
  mockChildRef.current = { ...mockChildRef.current, classId };
}

vi.mock("../../../../../../../components/family/child-module-page", () => ({
  ChildModulePage: ({
    content,
    onReady,
  }: {
    content:
      | ReactNode
      | ((ctx: {
          child: {
            id: string;
            firstName: string;
            lastName: string;
            classId?: string | null;
            className?: string | null;
          } | null;
          loading: boolean;
          onboardingHelpEnabled: boolean;
        }) => ReactNode);
    onReady?: (ctx: {
      child: { id: string; firstName: string; lastName: string } | null;
      onboardingHelpEnabled: boolean;
    }) => void;
  }) => {
    const child = mockChildRef.current;
    onReady?.({ child, onboardingHelpEnabled: false });
    return (
      <div>
        {typeof content === "function"
          ? content({ child, loading: false, onboardingHelpEnabled: false })
          : content}
      </div>
    );
  },
}));

type MockPayloads = {
  notes?: unknown;
  events?: unknown;
  timetable?: unknown;
  unreadCount?: number;
  messages?: unknown[];
  supplyList?: unknown;
  homework?: unknown[];
  feed?: unknown[];
};

function mockFetch(payloads: MockPayloads) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const json = (body: unknown, ok = true) =>
      new Response(JSON.stringify(body), {
        status: ok ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });

    if (url.includes("/life-events")) return json(payloads.events ?? []);
    if (url.includes("/notes")) return json(payloads.notes ?? []);
    if (url.includes("/timetable/me"))
      return json(
        payloads.timetable ?? {
          student: { firstName: "Lisa", lastName: "MBELE" },
          class: { name: "6e A" },
          occurrences: [],
        },
      );
    if (url.includes("/messages/unread-count"))
      return json({ unread: payloads.unreadCount ?? 0 });
    if (url.includes("/messages?folder=inbox"))
      return json({ items: payloads.messages ?? [] });
    if (url.includes("/me/supply-lists/students/"))
      return json(
        payloads.supplyList ?? { targetSchoolYearId: null, items: [] },
      );
    if (url.includes("/classes/class-1/homework"))
      return json(payloads.homework ?? []);
    if (url.includes("/feed?viewScope=GENERAL"))
      return json({ items: payloads.feed ?? [] });
    return json({});
  });
}

describe("ChildAccueilPage — parité de contenu avec le mobile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockChildClassId("class-1");
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("affiche le nombre de devoirs non faits comme 3e indicateur (au lieu de Discipline)", async () => {
    mockFetch({
      homework: [
        { id: "hw-1", myDoneAt: null },
        { id: "hw-2", myDoneAt: "2026-02-01T10:00:00.000Z" },
        { id: "hw-3", myDoneAt: null },
      ],
    });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getByText("Devoirs non faits")).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("non faits")).toBeInTheDocument();
  });

  it("affiche « Classe inconnue » quand la classe de l'enfant n'est pas résolue", async () => {
    setMockChildClassId(null);
    mockFetch({});
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getByText("Classe inconnue")).toBeInTheDocument();
    });
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("affiche les dernières évaluations (liste, pas seulement une moyenne)", async () => {
    mockFetch({
      notes: [
        {
          label: "Trimestre 2",
          generatedAtLabel: "01/02/2026",
          generalAverage: { student: 14.5 },
          subjects: [
            {
              id: "math",
              subjectLabel: "Mathématiques",
              studentAverage: 15,
              evaluations: [
                {
                  score: 16,
                  maxScore: 20,
                  recordedAt: "2026-02-05T08:00:00.000Z",
                },
              ],
            },
            {
              id: "fr",
              subjectLabel: "Français",
              studentAverage: 13,
              evaluations: [
                {
                  score: 12,
                  maxScore: 20,
                  recordedAt: "2026-02-03T08:00:00.000Z",
                },
              ],
            },
          ],
        },
      ],
    });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("child-accueil-latest-evaluations"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("child-accueil-eval-row-0")).toHaveTextContent(
      "Mathématiques",
    );
    expect(screen.getByTestId("child-accueil-eval-row-0")).toHaveTextContent(
      "16/20",
    );
    expect(screen.getByTestId("child-accueil-eval-row-1")).toHaveTextContent(
      "Français",
    );
  });

  it("liste jusqu'à 3 messages non lus (pas seulement le dernier message)", async () => {
    mockFetch({
      messages: [
        {
          id: "m1",
          subject: "Sortie scolaire",
          createdAt: "2026-02-10T09:00:00.000Z",
          unread: true,
          sender: { firstName: "Anne", lastName: "Rousselot" },
        },
        {
          id: "m2",
          subject: "Réunion parents",
          createdAt: "2026-02-09T09:00:00.000Z",
          unread: false,
          sender: { firstName: "Jean", lastName: "Dupont" },
        },
        {
          id: "m3",
          subject: "Photo de classe",
          createdAt: "2026-02-08T09:00:00.000Z",
          unread: true,
          sender: null,
        },
      ],
    });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("child-accueil-unread-list"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("child-accueil-unread-row-0")).toHaveTextContent(
      "Sortie scolaire",
    );
    expect(screen.getByTestId("child-accueil-unread-row-1")).toHaveTextContent(
      "Photo de classe",
    );
    expect(screen.queryByText("Réunion parents")).not.toBeInTheDocument();
  });

  it("affiche un état vide quand aucun message n'est non lu", async () => {
    mockFetch({ messages: [] });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("child-accueil-unread-empty"),
      ).toBeInTheDocument();
    });
  });

  it("affiche les dernières publications réelles du fil de classe (pas un texte statique)", async () => {
    mockFetch({
      feed: [
        {
          id: "post-1",
          title: "Sortie au musée",
          createdAt: "2026-02-06T09:00:00.000Z",
          author: { fullName: "Anne Rousselot" },
        },
      ],
    });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getByTestId("child-accueil-feed-list")).toBeInTheDocument();
    });
    expect(screen.getByTestId("child-accueil-feed-row-0")).toHaveTextContent(
      "Sortie au musée",
    );
    expect(screen.getByTestId("child-accueil-feed-row-0")).toHaveTextContent(
      "AR",
    );
  });

  it("affiche un état vide quand le fil de classe est vide", async () => {
    mockFetch({ feed: [] });
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("child-accueil-feed-empty"),
      ).toBeInTheDocument();
    });
  });
});
