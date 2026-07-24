import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotesAdminEntryPage from "./page";
import { useLocaleStore } from "../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../i18n/translations";

const replaceMock = vi.fn();
let paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useParams: () => paramsMock,
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NotesAdminEntryPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("redirects to the first classroom's evaluations page for a school admin", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          { id: "class-9", name: "6e A" },
          { id: "class-10", name: "6e B" },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/classes/class-9/notes",
      ),
    );
  });

  it("redirects away non-admin roles without calling the classrooms endpoint", async () => {
    const classroomsFetch = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "PARENT" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        classroomsFetch();
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
    expect(classroomsFetch).not.toHaveBeenCalled();
  });

  it("shows an empty state when the school has no classroom", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-empty"),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/classes/"),
    );
  });

  it("redirects to login when the session is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ message: "Unauthorized" }, 401);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/schools/college-vogt/login"),
    );
  });
});
