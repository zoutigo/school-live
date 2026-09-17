import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildCursusPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
  useRouter: () => ({ replace: replaceMock }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const mePayload = {
  role: "PARENT",
  linkedStudents: [{ id: "child-1", firstName: "Lisa", lastName: "Mbele" }],
};

const LIFE_EVENTS = [
  {
    id: "evt-1",
    type: "ABSENCE",
    occurredAt: "2026-03-10T08:00:00.000Z",
    reason: "Absence non justifiée",
    comment: "Voir le parent",
    class: { id: "class-1", name: "6eC" },
    schoolYear: { id: "sy-1", label: "2025-2026" },
  },
  {
    id: "evt-2",
    type: "RETARD",
    occurredAt: "2026-03-12T08:00:00.000Z",
    reason: "Retard de 10 minutes",
    comment: null,
    class: { id: "class-1", name: "6eC" },
    schoolYear: { id: "sy-1", label: "2025-2026" },
  },
];

function mockFetchDefault() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/schools/college-vogt/me"))
      return jsonResponse(mePayload);
    if (url.includes("/life-events")) return jsonResponse(LIFE_EVENTS);
    return jsonResponse({}, 404);
  });
}

describe("Child cursus page (vue parent) - onglet Discipline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("liste les événements de discipline en cartes (mobile) et en tableau (desktop) avec le même contenu", async () => {
    mockFetchDefault();

    render(<ChildCursusPage />);

    await waitFor(() => {
      expect(screen.getByText("Discipline")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Discipline"));

    const cards = await screen.findByTestId(
      "cursus-events-cards-2025-2026::6eC",
    );
    expect(
      within(cards).getByText("Absence non justifiée"),
    ).toBeInTheDocument();
    expect(within(cards).getByText("Retard de 10 minutes")).toBeInTheDocument();
    expect(within(cards).getByText("Voir le parent")).toBeInTheDocument();
  });
});
