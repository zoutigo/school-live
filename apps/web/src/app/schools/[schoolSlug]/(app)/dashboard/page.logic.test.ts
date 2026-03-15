import { describe, expect, it } from "vitest";
import { STUDENT_NOTES_DEMO_DATA } from "../../../../../components/student-notes/student-notes-demo-data";
import {
  buildAccountSummary,
  buildDisciplineSummary,
  buildNotesSummary,
  type ParentChild,
  type ParentDashboardSummaryResponse,
  type StudentLifeEventRow,
} from "./page-logic";

const child: ParentChild = {
  id: "student-1",
  firstName: "Remi",
  lastName: "Ntamack",
};

describe("parent dashboard card logic", () => {
  it("builds a discipline summary with alert state for unjustified absences", () => {
    const lifeEvents: StudentLifeEventRow[] = [
      {
        id: "evt-1",
        type: "ABSENCE",
        occurredAt: "2026-03-01T08:00:00.000Z",
        durationMinutes: 120,
        justified: false,
        reason: "Absence",
        comment: null,
      },
      {
        id: "evt-2",
        type: "RETARD",
        occurredAt: "2026-03-02T08:10:00.000Z",
        durationMinutes: 10,
        justified: true,
        reason: "Transport",
        comment: null,
      },
    ];

    const summary = buildDisciplineSummary(child, lifeEvents);

    expect(summary.childName).toBe("Remi Ntamack");
    expect(summary.absences).toBe(1);
    expect(summary.retards).toBe(1);
    expect(summary.statusTone).toBe("alert");
    expect(summary.statusLabel).toBe("Priorite parent");
  });

  it("builds a compact notes summary from the latest numeric evaluations only", () => {
    const snapshots = [
      {
        ...STUDENT_NOTES_DEMO_DATA[1],
        subjects: [
          {
            ...STUDENT_NOTES_DEMO_DATA[1].subjects[0],
            evaluations: [
              {
                id: "valid-1",
                label: "Devoir 1",
                score: 14,
                maxScore: 20,
                recordedAt: "2026-03-10T08:00:00.000Z",
              },
              {
                id: "invalid-1",
                label: "Devoir 2",
                score: undefined as unknown as number,
                maxScore: 20,
                recordedAt: "2026-03-11T08:00:00.000Z",
              },
            ],
          },
          {
            ...STUDENT_NOTES_DEMO_DATA[1].subjects[1],
            evaluations: [
              {
                id: "valid-2",
                label: "Devoir 3",
                score: 11.5,
                maxScore: 20,
                recordedAt: "2026-03-12T08:00:00.000Z",
              },
            ],
          },
        ],
      },
    ];

    const summary = buildNotesSummary(child, snapshots);

    expect(summary.averageLabel).toMatch(/\/20$/);
    expect(summary.latestEvaluations).toHaveLength(2);
    expect(summary.latestEvaluations[0]?.subjectLabel).toBeTruthy();
    expect(
      summary.latestEvaluations.every(
        (entry) => typeof entry.score === "number",
      ),
    ).toBe(true);
  });

  it("builds an account summary from backend counts and document metadata", () => {
    const payload: ParentDashboardSummaryResponse = {
      unreadMessages: 3,
      payments: {
        connected: false,
        pendingCount: null,
        overdueCount: null,
        detail:
          "Le module comptable n'est pas encore connecte aux donnees parent.",
      },
      documents: {
        recentCount: 2,
        totalPublishedCount: 5,
        detail: "2 bulletins publies sur les 90 derniers jours.",
        latest: [
          {
            id: "report-1",
            title: "2eme trimestre - Remi Ntamack",
            publishedAt: "2026-03-12T09:00:00.000Z",
          },
        ],
      },
    };

    const summary = buildAccountSummary(payload);

    expect(summary.headline).toBe("2 points a traiter");
    expect(summary.items.find((item) => item.id === "payments")?.value).toBe(
      "--",
    );
    expect(summary.items.find((item) => item.id === "messages")?.value).toBe(
      "3",
    );
    expect(
      summary.items.find((item) => item.id === "documents")?.detail,
    ).toContain("2eme trimestre - Remi Ntamack");
  });

  it("marks the account summary as alert when real payment counts report overdue items", () => {
    const payload: ParentDashboardSummaryResponse = {
      unreadMessages: 1,
      payments: {
        connected: true,
        pendingCount: 3,
        overdueCount: 1,
        detail: "",
      },
      documents: {
        recentCount: 0,
        totalPublishedCount: 4,
        detail: "Aucun bulletin publie recemment.",
        latest: [],
      },
    };

    const summary = buildAccountSummary(payload);
    const paymentsItem = summary.items.find((item) => item.id === "payments");

    expect(summary.headline).toBe("2 points a traiter");
    expect(summary.detail).toContain("reglement");
    expect(paymentsItem?.value).toBe("3");
    expect(paymentsItem?.tone).toBe("alert");
    expect(paymentsItem?.detail).toBe("1 en retard, 2 en attente");
  });
});
