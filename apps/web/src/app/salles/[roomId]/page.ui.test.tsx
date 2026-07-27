import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomDetailPage from "./page";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ roomId: "room-1" }),
  useSearchParams: () => ({
    get: (key: string) => (key === "schoolSlug" ? "college-vogt" : null),
  }),
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
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

const ROOM = {
  id: "room-1",
  schoolId: "school-1",
  name: "A08",
  description: null,
  capacity: 30,
  maxConcurrentSlots: 1,
  status: "AVAILABLE" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Room detail page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
  });

  it("loads and displays room information", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/calendar")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/rooms/room-1")) {
        return jsonResponse(ROOM);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<RoomDetailPage />);

    expect(
      await screen.findByTestId("room-detail-info-card"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("A08").length).toBeGreaterThan(0);
    expect(screen.getByTestId("room-detail-status-dot")).toBeInTheDocument();
  });

  it("shows an error message when the room fails to load", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/admin/rooms/room-1")) {
        return jsonResponse({ message: "Not found" }, 404);
      }
      return jsonResponse([]);
    });

    render(<RoomDetailPage />);

    expect(await screen.findByTestId("room-detail-error")).toBeInTheDocument();
  });

  it("displays the week grid by default and switches to month view", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/calendar")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/rooms/room-1")) {
        return jsonResponse(ROOM);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<RoomDetailPage />);

    expect(
      await screen.findByTestId("room-detail-week-grid"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("room-detail-view-month"));

    expect(
      await screen.findByTestId("room-detail-month-grid"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("room-detail-week-grid"),
    ).not.toBeInTheDocument();
  });

  it("requests a new calendar range when navigating to the next period", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url.includes("/calendar")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/rooms/room-1")) {
          return jsonResponse(ROOM);
        }
        return jsonResponse({ message: "Unhandled" }, 404);
      });

    render(<RoomDetailPage />);
    await screen.findByTestId("room-detail-week-grid");
    fetchMock.mockClear();

    fireEvent.click(screen.getByTestId("room-detail-nav-next"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/calendar?fromDate="),
        expect.anything(),
      );
    });
  });
});
