import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassSantePage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    classId: "class-1",
  }),
  useRouter: () => ({ push: pushMock }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const ROSTER = {
  class: { id: "class-1", name: "6e B" },
  items: [
    {
      id: "student-1",
      firstName: "Romuald",
      lastName: "Mboutman",
      age: 11,
      activeConditionsCount: 1,
      highestActiveAlertLevel: "URGENT",
    },
    {
      id: "student-2",
      firstName: "Aline",
      lastName: "Talla",
      age: 12,
      activeConditionsCount: 0,
      highestActiveAlertLevel: null,
    },
  ],
};

describe("Teacher class Santé page (référent)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("charge et affiche la liste des élèves de la classe avec leur niveau d'alerte", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/classes/class-1/health/students")) {
        return jsonResponse(ROSTER);
      }
      return jsonResponse({}, 404);
    });

    render(<TeacherClassSantePage />);

    await screen.findByText("Mboutman Romuald");
    expect(screen.getByText("Talla Aline")).toBeInTheDocument();
    expect(screen.getByText("6e B")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("navigue vers la fiche santé complète de l'élève sélectionné", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/classes/class-1/health/students")) {
        return jsonResponse(ROSTER);
      }
      return jsonResponse({}, 404);
    });

    render(<TeacherClassSantePage />);
    fireEvent.click(
      await screen.findByTestId("teacher-class-sante-student-student-1"),
    );

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/schools/college-vogt/sante/student-1?"),
    );
    const calledUrl = pushMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("firstName=Romuald");
    expect(calledUrl).toContain("lastName=Mboutman");
    expect(calledUrl).toContain("className=6e+B");
    expect(calledUrl).toContain("age=11");
  });

  it("affiche un message d'erreur si le chargement échoue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({}, 403),
    );

    render(<TeacherClassSantePage />);

    await screen.findByTestId("teacher-class-sante-error");
  });

  it("affiche un état vide quand la classe n'a aucun élève", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/classes/class-1/health/students")) {
        return jsonResponse({
          class: { id: "class-1", name: "6e B" },
          items: [],
        });
      }
      return jsonResponse({}, 404);
    });

    render(<TeacherClassSantePage />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Aucun élève inscrit dans cette classe pour le moment.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
