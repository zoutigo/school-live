import { describe, expect, it } from "vitest";
import {
  getCampaignDisplayStatus,
  sortCampaignsByDisplayStatus,
} from "./tests.api";

function campaign(overrides: Partial<Parameters<typeof getCampaignDisplayStatus>[0]> & {
  dueAt?: string | null;
  assignedToMe?: boolean;
}) {
  return {
    startsAt: null,
    dueAt: null,
    assignedToMe: false,
    summary: { totalCases: 4, completedCases: 0 },
    ...overrides,
  };
}

describe("getCampaignDisplayStatus", () => {
  it("returns COMPLETED when every case has been completed", () => {
    const status = getCampaignDisplayStatus(
      campaign({ summary: { totalCases: 3, completedCases: 3 } }),
    );
    expect(status).toBe("COMPLETED");
  });

  it("returns UPCOMING for a future start date with nothing completed yet", () => {
    const status = getCampaignDisplayStatus(
      campaign({ startsAt: new Date(Date.now() + 86_400_000).toISOString() }),
    );
    expect(status).toBe("UPCOMING");
  });

  it("returns IN_PROGRESS once at least one case has been completed, even before the start date", () => {
    const status = getCampaignDisplayStatus(
      campaign({
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        summary: { totalCases: 4, completedCases: 1 },
      }),
    );
    expect(status).toBe("IN_PROGRESS");
  });

  it("returns IN_PROGRESS with no start date and partial completion", () => {
    const status = getCampaignDisplayStatus(
      campaign({ summary: { totalCases: 4, completedCases: 1 } }),
    );
    expect(status).toBe("IN_PROGRESS");
  });
});

describe("sortCampaignsByDisplayStatus", () => {
  it("orders in-progress before upcoming before completed", () => {
    const upcoming = campaign({
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const completed = campaign({
      summary: { totalCases: 2, completedCases: 2 },
    });
    const inProgress = campaign({
      summary: { totalCases: 4, completedCases: 1 },
    });

    const sorted = sortCampaignsByDisplayStatus([
      completed,
      upcoming,
      inProgress,
    ]);

    expect(sorted).toEqual([inProgress, upcoming, completed]);
  });

  it("prioritizes campaigns assigned to me within the same status by default", () => {
    const mine = campaign({
      assignedToMe: true,
      dueAt: "2026-09-10T00:00:00.000Z",
      summary: { totalCases: 4, completedCases: 1 },
    });
    const others = campaign({
      assignedToMe: false,
      dueAt: "2026-09-01T00:00:00.000Z",
      summary: { totalCases: 4, completedCases: 1 },
    });

    const sorted = sortCampaignsByDisplayStatus([others, mine]);
    expect(sorted).toEqual([mine, others]);
  });

  it("ignores assignment priority when prioritizeMine is false, sorting by due date instead", () => {
    const mine = campaign({
      assignedToMe: true,
      dueAt: "2026-09-10T00:00:00.000Z",
      summary: { totalCases: 4, completedCases: 1 },
    });
    const others = campaign({
      assignedToMe: false,
      dueAt: "2026-09-01T00:00:00.000Z",
      summary: { totalCases: 4, completedCases: 1 },
    });

    const sorted = sortCampaignsByDisplayStatus([mine, others], {
      prioritizeMine: false,
    });
    expect(sorted).toEqual([others, mine]);
  });
});
