import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoomsPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfTokenCookieMock(),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("Rooms page forms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps room creation disabled until valid and submits with defaults", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/rooms")) {
          if (method === "POST") {
            return jsonResponse({ id: "room-1" }, 201);
          }
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<RoomsPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nom de la salle"), {
      target: { value: "Gymnase" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/rooms"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Gymnase",
            description: undefined,
            capacity: undefined,
            maxConcurrentSlots: 1,
            status: "AVAILABLE",
          }),
        }),
      );
    });
  });

  it("rejects a non-numeric capacity with an inline error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/rooms")) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<RoomsPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    fireEvent.change(screen.getByLabelText("Nom de la salle"), {
      target: { value: "Gymnase" },
    });
    fireEvent.change(screen.getByLabelText("Capacite (nombre de personnes)"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByText("La capacite doit etre un nombre entier positif."),
      ).toBeInTheDocument();
    });
  });

  it("lists existing rooms and allows editing the status", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/rooms/room-1")) {
          if (method === "PATCH") {
            return jsonResponse({ id: "room-1" });
          }
        }
        if (url.includes("/admin/rooms")) {
          if (method === "GET") {
            return jsonResponse([
              {
                id: "room-1",
                schoolId: "school-1",
                name: "Gymnase",
                description: null,
                capacity: 60,
                maxConcurrentSlots: 3,
                status: "AVAILABLE",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ]);
          }
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<RoomsPage />);

    expect(await screen.findByText("Gymnase")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Modifier" })[0]);

    const statusSelects = screen.getAllByLabelText(
      "Statut",
    ) as HTMLSelectElement[];
    const statusSelect = statusSelects[statusSelects.length - 1];
    fireEvent.change(statusSelect, { target: { value: "MAINTENANCE" } });

    const saveButton = await screen.findByRole("button", {
      name: "Enregistrer",
    });
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/rooms/room-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("loads and displays the room calendar for the selected room", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/rooms/room-1/calendar")) {
        return jsonResponse([
          {
            id: "rec-slot-1-2026-01-05",
            occurrenceDate: "2026-01-05",
            startMinute: 480,
            endMinute: 570,
            className: "6eme A",
            subjectName: "Maths",
            teacherName: "Alice Martin",
          },
        ]);
      }
      if (url.includes("/admin/rooms")) {
        return jsonResponse([
          {
            id: "room-1",
            schoolId: "school-1",
            name: "Gymnase",
            description: null,
            capacity: 60,
            maxConcurrentSlots: 3,
            status: "AVAILABLE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ]);
      }

      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<RoomsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Calendrier" }));

    expect(await screen.findByText("6eme A")).toBeInTheDocument();
    expect(screen.getByText("Maths")).toBeInTheDocument();
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
  });
});
