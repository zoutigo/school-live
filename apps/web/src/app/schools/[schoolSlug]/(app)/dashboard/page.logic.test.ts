import { describe, expect, it } from "vitest";
import { STUDENT_NOTES_DEMO_DATA } from "../../../../../components/student-notes/student-notes-demo-data";
import {
  buildAccountSummary,
  buildDisciplineSummary,
  buildNotesSummary,
  buildTeacherDashboard,
  formatShortDate,
  minuteToTimeLabel,
  type ParentChild,
  type ParentDashboardSummaryResponse,
  type StudentLifeEventRow,
  type TeacherContextPayload,
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

// ─── Teacher dashboard logic ─────────────────────────────────────────────────

describe("minuteToTimeLabel", () => {
  it("converts minutes to HH:MM string", () => {
    expect(minuteToTimeLabel(0)).toBe("00:00");
    expect(minuteToTimeLabel(480)).toBe("08:00");
    expect(minuteToTimeLabel(570)).toBe("09:30");
    expect(minuteToTimeLabel(750)).toBe("12:30");
    expect(minuteToTimeLabel(1020)).toBe("17:00");
  });

  it("pads single-digit hours and minutes", () => {
    expect(minuteToTimeLabel(65)).toBe("01:05");
  });
});

describe("formatShortDate", () => {
  it("formats an ISO date string as a short French date", () => {
    const result = formatShortDate("2026-05-15");
    expect(result).toMatch(/15/);
    expect(result.toLowerCase()).toMatch(/mai/);
  });

  it("returns the original string when the date is invalid", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
  });
});

describe("buildTeacherDashboard", () => {
  const context: TeacherContextPayload = {
    schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
    selectedSchoolYearId: "sy-1",
    assignments: [
      {
        classId: "6e-a",
        subjectId: "math-1",
        className: "6e A",
        subjectName: "Mathematiques",
        schoolYearId: "sy-1",
      },
      {
        classId: "5e-b",
        subjectId: "math-1",
        className: "5e B",
        subjectName: "Mathematiques",
        schoolYearId: "sy-1",
      },
    ],
    students: [
      { studentId: "s1", classId: "6e-a" },
      { studentId: "s2", classId: "6e-a" },
      { studentId: "s3", classId: "5e-b" },
    ],
  };

  const today = "2026-05-09";

  it("builds class list with student counts and derived homework/eval counts", () => {
    const dashboard = buildTeacherDashboard(
      context,
      new Map(),
      [],
      0,
      new Map(),
      new Map(),
      today,
    );

    expect(dashboard.classes).toHaveLength(2);
    const cls6a = dashboard.classes.find((c) => c.classId === "6e-a");
    expect(cls6a?.studentCount).toBe(2);
    expect(cls6a?.openHomeworkCount).toBe(0);
    expect(cls6a?.pendingEvalCount).toBe(0);
  });

  it("filters timetable slots by subjectId and today's date", () => {
    const timetableMap = new Map([
      [
        "6e-a",
        [
          {
            id: "slot-1",
            occurrenceDate: today,
            startMinute: 480,
            endMinute: 570,
            room: "B12",
            status: "PLANNED",
            subject: { id: "math-1", name: "Mathematiques" },
            teacherUser: { id: "t1" },
          },
          {
            // Different subject — should be excluded
            id: "slot-2",
            occurrenceDate: today,
            startMinute: 600,
            endMinute: 660,
            room: null,
            status: "PLANNED",
            subject: { id: "hist-1", name: "Histoire" },
            teacherUser: { id: "t2" },
          },
          {
            // Wrong date — should be excluded
            id: "slot-3",
            occurrenceDate: "2026-05-10",
            startMinute: 480,
            endMinute: 570,
            room: null,
            status: "PLANNED",
            subject: { id: "math-1", name: "Mathematiques" },
            teacherUser: { id: "t1" },
          },
        ],
      ],
    ]);

    const dashboard = buildTeacherDashboard(
      context,
      timetableMap,
      [],
      0,
      new Map(),
      new Map(),
      today,
    );

    expect(dashboard.todaySlots).toHaveLength(1);
    expect(dashboard.todaySlots[0]?.id).toBe("slot-1");
    expect(dashboard.todaySlots[0]?.subjectName).toBe("Mathematiques");
    expect(dashboard.todaySlots[0]?.room).toBe("B12");
  });

  it("identifies pending evaluations where graded count is below student count", () => {
    const evalsByClass = new Map([
      [
        "6e-a",
        [
          { id: "ev-1", title: "Controle", _count: { scores: 1 } }, // 1/2 → pending
          { id: "ev-2", title: "DS", _count: { scores: 2 } }, // 2/2 → complete
        ],
      ],
    ]);

    const dashboard = buildTeacherDashboard(
      context,
      new Map(),
      [],
      0,
      evalsByClass,
      new Map(),
      today,
    );

    expect(dashboard.pendingEvals).toHaveLength(1);
    expect(dashboard.pendingEvals[0]?.id).toBe("ev-1");
    expect(dashboard.pendingEvals[0]?.gradedCount).toBe(1);
    expect(dashboard.pendingEvals[0]?.studentCount).toBe(2);
  });

  it("includes open homework due today or later and excludes past due dates", () => {
    const tomorrow = "2026-05-10";
    const yesterday = "2026-05-08";

    const hwByClass = new Map([
      [
        "6e-a",
        [
          {
            id: "hw-1",
            title: "Exercices futurs",
            expectedAt: tomorrow + "T00:00:00Z",
            summary: { doneStudents: 0 },
          },
          {
            id: "hw-2",
            title: "Exercices passes",
            expectedAt: yesterday + "T00:00:00Z",
            summary: null,
          },
        ],
      ],
    ]);

    const dashboard = buildTeacherDashboard(
      context,
      new Map(),
      [],
      0,
      new Map(),
      hwByClass,
      today,
    );

    expect(dashboard.openHomework).toHaveLength(1);
    expect(dashboard.openHomework[0]?.id).toBe("hw-1");
  });

  it("slices unread messages, pending evals, and open homework to 2 items max", () => {
    const manyMessages = Array.from({ length: 5 }, (_, i) => ({
      id: `msg-${i}`,
      subject: `Subject ${i}`,
      senderName: null,
    }));
    const manyEvals = new Map([
      [
        "6e-a",
        Array.from({ length: 4 }, (_, i) => ({
          id: `ev-${i}`,
          title: `Eval ${i}`,
          _count: { scores: 0 },
        })),
      ],
    ]);

    const dashboard = buildTeacherDashboard(
      context,
      new Map(),
      manyMessages,
      5,
      manyEvals,
      new Map(),
      today,
    );

    expect(dashboard.unreadMessages).toHaveLength(2);
    expect(dashboard.pendingEvals).toHaveLength(2);
  });

  it("updates class stats to reflect derived homework and eval counts", () => {
    const evalsByClass = new Map([
      ["6e-a", [{ id: "ev-1", title: "DS", _count: { scores: 0 } }]],
    ]);
    const hwByClass = new Map([
      [
        "5e-b",
        [
          {
            id: "hw-1",
            title: "Devoir",
            expectedAt: "2026-05-10T00:00:00Z",
            summary: null,
          },
        ],
      ],
    ]);

    const dashboard = buildTeacherDashboard(
      context,
      new Map(),
      [],
      0,
      evalsByClass,
      hwByClass,
      today,
    );

    const cls6a = dashboard.classes.find((c) => c.classId === "6e-a");
    const cls5b = dashboard.classes.find((c) => c.classId === "5e-b");

    expect(cls6a?.pendingEvalCount).toBe(1);
    expect(cls6a?.openHomeworkCount).toBe(0);
    expect(cls5b?.openHomeworkCount).toBe(1);
    expect(cls5b?.pendingEvalCount).toBe(0);
  });
});
