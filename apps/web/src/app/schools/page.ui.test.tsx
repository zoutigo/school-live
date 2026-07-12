import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolsPage from "./page";

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

function schoolsListPage(items: unknown[]) {
  return {
    items,
    meta: { page: 1, limit: 100, total: items.length, totalPages: 1 },
  };
}

type OverviewSourceItem = {
  cycle?: "PRIMARY" | "SECONDARY" | null;
  studentsCount: number;
  classesCount: number;
};

function schoolsOverview(items: OverviewSourceItem[]) {
  const byCycle: Record<
    "PRIMARY" | "SECONDARY" | "UNSET",
    { schools: number; students: number; classes: number }
  > = {
    PRIMARY: { schools: 0, students: 0, classes: 0 },
    SECONDARY: { schools: 0, students: 0, classes: 0 },
    UNSET: { schools: 0, students: 0, classes: 0 },
  };
  let totalStudents = 0;
  let totalClasses = 0;
  for (const item of items) {
    const key = item.cycle ?? "UNSET";
    byCycle[key].schools += 1;
    byCycle[key].students += item.studentsCount;
    byCycle[key].classes += item.classesCount;
    totalStudents += item.studentsCount;
    totalClasses += item.classesCount;
  }
  return {
    totals: {
      schools: items.length,
      students: totalStudents,
      classes: totalClasses,
    },
    byCycle,
  };
}

describe("Schools page create form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps submit disabled until the form is valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools/overview")) {
        return jsonResponse(schoolsOverview([]));
      }
      if (url.includes("/api/system/schools?page=")) {
        return jsonResponse(schoolsListPage([]));
      }
      if (url.includes("/api/system/schools/slug-preview?")) {
        return jsonResponse({
          baseSlug: "college-vogt",
          suggestedSlug: "college-vogt",
          baseExists: false,
        });
      }
      if (url.includes("/api/system/users/exists?")) {
        return jsonResponse({ exists: false });
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    const submitButton = screen.getByRole("button", { name: "Creer l ecole" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de l ecole").className).toContain(
      "border-notification",
    );

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "College Vogt" },
    });
    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "bad-email" },
    });

    expect(
      await screen.findByText("L'email du school admin est invalide."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "admin@vogt.cm" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(
        screen.queryByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  it("submits the validated create form", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(schoolsListPage([]));
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "college-vogt",
            suggestedSlug: "college-vogt",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }
        if (url.endsWith("/api/system/schools") && method === "POST") {
          return jsonResponse(
            { userExisted: false, setupCompleted: false },
            201,
          );
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "College Vogt" },
    });
    fireEvent.change(screen.getByLabelText("Pays"), {
      target: { value: "Cameroun" },
    });
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Centre" },
    });
    fireEvent.change(screen.getByLabelText("Ville"), {
      target: { value: "Yaounde" },
    });
    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "admin@vogt.cm" },
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creer l ecole" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l ecole" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/system/schools") &&
          init?.method === "POST" &&
          init?.body ===
            JSON.stringify({
              name: "College Vogt",
              country: "Cameroun",
              region: "Centre",
              city: "Yaounde",
              schoolAdminEmail: "admin@vogt.cm",
            }),
      );
      expect(postCall).toBeDefined();
    });
  });

  it("submits the create form with cycle and languageSystem selected", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(schoolsListPage([]));
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "greenwich-college",
            suggestedSlug: "greenwich-college",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }
        if (url.endsWith("/api/system/schools") && method === "POST") {
          return jsonResponse(
            { userExisted: false, setupCompleted: false },
            201,
          );
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "Greenwich College" },
    });
    fireEvent.change(screen.getByLabelText("Cycle (optionnel)"), {
      target: { value: "SECONDARY" },
    });
    fireEvent.change(
      screen.getByLabelText("Systeme linguistique (optionnel)"),
      {
        target: { value: "ANGLOPHONE" },
      },
    );
    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "admin@greenwich.cm" },
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creer l ecole" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l ecole" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/system/schools") &&
          init?.method === "POST" &&
          init?.body ===
            JSON.stringify({
              name: "Greenwich College",
              cycle: "SECONDARY",
              languageSystem: "ANGLOPHONE",
              schoolAdminEmail: "admin@greenwich.cm",
            }),
      );
      expect(postCall).toBeDefined();
    });
  });

  it("uses inline validation for school edition and submits the patch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(
            schoolsListPage([
              {
                id: "school-1",
                slug: "college-vogt",
                name: "College Vogt",
                country: "Cameroun",
                region: "Centre",
                city: "Yaounde",
                logoUrl: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                usersCount: 10,
                classesCount: 4,
                studentsCount: 120,
              },
            ]),
          );
        }
        if (
          url.endsWith("/api/system/schools/school-1") &&
          method === "PATCH"
        ) {
          return jsonResponse({ id: "school-1" });
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "college-vogt",
            suggestedSlug: "college-vogt",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "" },
    });
    expect(
      await screen.findByText("Le nom de l ecole est obligatoire."),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "College Vogt Premium" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
      expect(
        screen.queryByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/schools/school-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "College Vogt Premium",
            country: "Cameroun",
            region: "Centre",
            city: "Yaounde",
            cycle: null,
            languageSystem: null,
            logoUrl: null,
          }),
        }),
      );
    });
  });

  it("patches cycle and languageSystem when changed via the edit form selects", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(
            schoolsListPage([
              {
                id: "school-1",
                slug: "college-vogt",
                name: "College Vogt",
                country: "Cameroun",
                region: "Centre",
                city: "Yaounde",
                cycle: "SECONDARY",
                languageSystem: "FRANCOPHONE",
                logoUrl: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                usersCount: 10,
                classesCount: 4,
                studentsCount: 120,
              },
            ]),
          );
        }
        if (
          url.endsWith("/api/system/schools/school-1") &&
          method === "PATCH"
        ) {
          return jsonResponse({ id: "school-1" });
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "college-vogt",
            suggestedSlug: "college-vogt",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const cycleSelect = screen.getByLabelText("Cycle (optionnel)");
    expect(cycleSelect).toHaveValue("SECONDARY");
    const languageSelect = screen.getByLabelText(
      "Systeme linguistique (optionnel)",
    );
    expect(languageSelect).toHaveValue("FRANCOPHONE");

    fireEvent.change(languageSelect, { target: { value: "BILINGUAL" } });

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });
    await waitFor(() => {
      expect(languageSelect).toHaveValue("BILINGUAL");
      expect(saveButton).toBeEnabled();
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/schools/school-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "College Vogt",
            country: "Cameroun",
            region: "Centre",
            city: "Yaounde",
            cycle: "SECONDARY",
            languageSystem: "BILINGUAL",
            logoUrl: null,
          }),
        }),
      );
    });
  });

  it("renders schools as cards with edit/delete at the bottom, filters via the header search, and adds a school admin", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          const allSchools = [
            {
              id: "school-1",
              slug: "college-vogt",
              name: "College Vogt",
              country: "Cameroun",
              region: "Centre",
              city: "Yaounde",
              cycle: "SECONDARY",
              languageSystem: "FRANCOPHONE",
              logoUrl: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              usersCount: 10,
              classesCount: 4,
              studentsCount: 120,
            },
            {
              id: "school-2",
              slug: "greenwich-college",
              name: "Greenwich College",
              country: "Cameroun",
              region: "Nord-Ouest",
              city: "Bamenda",
              cycle: "SECONDARY",
              languageSystem: "ANGLOPHONE",
              logoUrl: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              usersCount: 5,
              classesCount: 2,
              studentsCount: 60,
            },
          ];
          const search = new URL(url, "http://localhost").searchParams.get(
            "search",
          );
          const filtered = search
            ? allSchools.filter((school) =>
                school.name.toLowerCase().includes(search.toLowerCase()),
              )
            : allSchools;
          return jsonResponse(schoolsListPage(filtered));
        }
        if (
          url.endsWith("/api/system/schools/school-1/admins") &&
          method === "POST"
        ) {
          return jsonResponse({
            schoolAdmin: { id: "admin-2", email: "new.admin@vogt.cm" },
            userExisted: false,
            setupCompleted: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );

    const vogtCard = await screen.findByTestId("school-card-school-1");
    expect(vogtCard).toHaveTextContent("College Vogt");
    within(vogtCard).getByRole("button", { name: "Voir" });
    within(vogtCard).getByRole("button", { name: "Modifier" });
    within(vogtCard).getByRole("button", { name: "Supprimer" });

    fireEvent.click(screen.getByTestId("schools-search-toggle"));
    fireEvent.change(screen.getByTestId("schools-filter-search-input"), {
      target: { value: "greenwich" },
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("school-card-school-1"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("school-card-school-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("schools-filter-reset"));
    await screen.findByTestId("school-card-school-1");

    fireEvent.click(
      within(await screen.findByTestId("school-card-school-1")).getByRole(
        "button",
        { name: "Modifier" },
      ),
    );

    fireEvent.change(screen.getByLabelText("Email du school admin"), {
      target: { value: "new.admin@vogt.cm" },
    });

    const addAdminButton = screen.getByRole("button", { name: "Ajouter" });
    await waitFor(() => expect(addAdminButton).toBeEnabled());
    fireEvent.click(addAdminButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/schools/school-1/admins"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "new.admin@vogt.cm" }),
        }),
      );
    });

    expect(await screen.findByText("School admin ajoute.")).toBeInTheDocument();
  });

  it("shows the overview tab by default with totals and a per-cycle breakdown", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      const overviewSourceSchools = [
        {
          id: "school-1",
          slug: "college-vogt",
          name: "College Vogt",
          country: "Cameroun",
          region: "Centre",
          city: "Yaounde",
          cycle: "SECONDARY" as const,
          languageSystem: "FRANCOPHONE",
          logoUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          academicYear: { id: "year-1", label: "2025-2026" },
          usersCount: 10,
          classesCount: 4,
          studentsCount: 120,
        },
        {
          id: "school-2",
          slug: "ecole-primaire",
          name: "Ecole primaire du lac",
          country: "Cameroun",
          region: "Centre",
          city: "Yaounde",
          cycle: "PRIMARY" as const,
          languageSystem: null,
          logoUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          academicYear: null,
          usersCount: 3,
          classesCount: 1,
          studentsCount: 30,
        },
      ];
      if (url.endsWith("/api/system/schools/overview")) {
        return jsonResponse(schoolsOverview(overviewSourceSchools));
      }
      if (url.includes("/api/system/schools?page=")) {
        return jsonResponse(schoolsListPage(overviewSourceSchools));
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SchoolsPage />);

    expect(await screen.findByRole("button", { name: "Synthese" })).toHaveClass(
      "text-primary",
    );
    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    const primaryRow = screen.getByTestId("schools-overview-cycle-PRIMARY");
    expect(primaryRow).toHaveTextContent("1 ecoles");
    const secondaryRow = screen.getByTestId("schools-overview-cycle-SECONDARY");
    expect(secondaryRow).toHaveTextContent("1 ecoles");

    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );
    const card = await screen.findByTestId("school-card-school-1");
    expect(card).toHaveTextContent("2025-2026");
  });

  it("opens the details tab from the card Voir button and shows the current-year role breakdown", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools/overview")) {
        return jsonResponse(schoolsOverview([]));
      }
      if (url.includes("/api/system/schools?page=")) {
        return jsonResponse(
          schoolsListPage([
            {
              id: "school-1",
              slug: "college-vogt",
              name: "College Vogt",
              country: "Cameroun",
              region: "Centre",
              city: "Yaounde",
              cycle: "SECONDARY",
              languageSystem: "FRANCOPHONE",
              logoUrl: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              academicYear: { id: "year-1", label: "2025-2026" },
              usersCount: 10,
              classesCount: 4,
              studentsCount: 120,
            },
          ]),
        );
      }
      if (url.endsWith("/api/system/schools/school-1")) {
        return jsonResponse({
          id: "school-1",
          slug: "college-vogt",
          name: "College Vogt",
          country: "Cameroun",
          region: "Centre",
          city: "Yaounde",
          cycle: "SECONDARY",
          languageSystem: "FRANCOPHONE",
          logoUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          academicYear: { id: "year-1", label: "2025-2026" },
          stats: {
            usersCount: 10,
            classesCount: 4,
            studentsCount: 120,
            teachersCount: 8,
            gradesCount: 300,
          },
          roleBreakdown: { staff: 3, teachers: 8, parents: 90, students: 100 },
          schoolAdmins: [],
        });
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );

    fireEvent.click(
      within(await screen.findByTestId("school-card-school-1")).getByRole(
        "button",
        { name: "Voir" },
      ),
    );

    expect(await screen.findByText("Annee academique")).toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(
      screen.getByText("Utilisateurs (annee en cours)"),
    ).toBeInTheDocument();
    const roleBreakdown = screen.getByTestId("schools-details-role-breakdown");
    expect(roleBreakdown).toHaveTextContent("Staff3");
    expect(roleBreakdown).toHaveTextContent("Enseignants8");
    expect(roleBreakdown).toHaveTextContent("Parents90");
    expect(roleBreakdown).toHaveTextContent("Eleves100");
  });

  it("requests page/limit server-side and paginates the school list beyond page 1", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=")) {
          const params = new URL(url, "http://localhost").searchParams;
          return jsonResponse({
            items: [
              {
                id: "school-1",
                slug: "college-vogt",
                name: "College Vogt",
                country: "Cameroun",
                region: "Centre",
                city: "Yaounde",
                cycle: "SECONDARY",
                languageSystem: "FRANCOPHONE",
                logoUrl: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                usersCount: 10,
                classesCount: 4,
                studentsCount: 120,
              },
            ],
            meta: {
              page: Number(params.get("page") ?? "1"),
              limit: 20,
              total: 45,
              totalPages: 3,
            },
          });
        }

        return jsonResponse({ message: `Unhandled ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Liste des ecoles" }),
    );
    await screen.findByTestId("school-card-school-1");

    const firstCall = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/api/system/schools?page="),
    );
    expect(String(firstCall?.[0])).toContain("page=1");
    expect(String(firstCall?.[0])).toContain("limit=20");

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls
        .filter(([u]) => String(u).includes("/api/system/schools?page="))
        .at(-1);
      expect(String(call?.[0])).toContain("page=2");
    });
  });
});
