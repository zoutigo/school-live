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

const PLATFORM_USERS = [
  {
    id: "platform-1",
    firstName: "Paul",
    lastName: "Support",
    email: "paul@scolive.cm",
    platformRoles: ["SUPPORT"],
  },
  {
    id: "platform-2",
    firstName: "Alice",
    lastName: "Admin",
    email: "alice@scolive.cm",
    platformRoles: ["ADMIN"],
  },
];

async function pickPrimaryAdmin(label = "Paul Support - paul@scolive.cm") {
  fireEvent.click(screen.getByTestId("create-primary-admin"));
  fireEvent.click(await screen.findByRole("option", { name: label }));
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

      if (url.includes("/api/system/platform-users")) {
        return jsonResponse(PLATFORM_USERS);
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
    // Sans administrateur principal choisi, la creation reste impossible.
    expect(submitButton).toBeDisabled();

    await pickPrimaryAdmin();

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

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
          return jsonResponse({ school: { id: "school-new" } }, 201);
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
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Centre" },
    });
    fireEvent.change(screen.getByLabelText("Ville"), {
      target: { value: "Yaoundé" },
    });
    await pickPrimaryAdmin();
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
              city: "Yaoundé",
              primaryAdminUserId: "platform-1",
            }),
      );
      expect(postCall).toBeDefined();
    });
  });

  it("locks the country to Cameroun and cascades region to city selection", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.includes("/api/system/platform-users")) {
        return jsonResponse(PLATFORM_USERS);
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
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    const countrySelect = screen.getByLabelText("Pays");
    expect(countrySelect).toBeDisabled();
    expect(countrySelect).toHaveValue("Cameroun");

    const citySelect = screen.getByLabelText("Ville");
    expect(citySelect).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Littoral" },
    });

    expect(citySelect).toBeEnabled();
    fireEvent.change(citySelect, { target: { value: "Douala" } });
    expect(citySelect).toHaveValue("Douala");

    // Changer de region reinitialise la ville selectionnee.
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Centre" },
    });
    expect(citySelect).toHaveValue("");
  });

  it("n'expose plus de saisie email/telephone/PIN pour l'admin principal et envoie uniquement l'id choisi", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(schoolsListPage([]));
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "ecole-plateforme",
            suggestedSlug: "ecole-plateforme",
            baseExists: false,
          });
        }
        if (url.endsWith("/api/system/schools") && method === "POST") {
          return jsonResponse({ school: { id: "school-pf-1" } }, 201);
        }
        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    expect(
      screen.queryByRole("button", { name: "Telephone + PIN" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Email School Admin"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("PIN initial")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "École plateforme" },
    });
    await pickPrimaryAdmin("Alice Admin - alice@scolive.cm");

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
          init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(String(postCall?.[1]?.body ?? "{}"));
      expect(body.primaryAdminUserId).toBe("platform-2");
      expect(body.schoolAdminEmail).toBeUndefined();
      expect(body.schoolAdminPhone).toBeUndefined();
      expect(body.schoolAdminPin).toBeUndefined();
    });
  });

  it("affiche l'erreur serveur si la creation echoue (admin principal refuse)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.includes("/api/system/platform-users")) {
        return jsonResponse(PLATFORM_USERS);
      }
      if (url.endsWith("/api/system/schools/overview")) {
        return jsonResponse(schoolsOverview([]));
      }
      if (url.includes("/api/system/schools?page=") && method === "GET") {
        return jsonResponse(schoolsListPage([]));
      }
      if (url.includes("/api/system/schools/slug-preview?")) {
        return jsonResponse({
          baseSlug: "x",
          suggestedSlug: "x",
          baseExists: false,
        });
      }
      if (url.endsWith("/api/system/schools") && method === "POST") {
        return jsonResponse(
          {
            message:
              "L'administrateur principal doit etre un utilisateur de la plateforme",
          },
          400,
        );
      }
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );
    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "École KO" },
    });
    await pickPrimaryAdmin();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creer l ecole" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l ecole" }));

    expect(
      await screen.findByText(/doit etre un utilisateur de la plateforme/),
    ).toBeInTheDocument();
  });

  it("ajoute et retire des administrateurs supplementaires a la creation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
        }
        if (url.endsWith("/api/system/schools/overview")) {
          return jsonResponse(schoolsOverview([]));
        }
        if (url.includes("/api/system/schools?page=") && method === "GET") {
          return jsonResponse(schoolsListPage([]));
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "ecole-multi-admins",
            suggestedSlug: "ecole-multi-admins",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }
        if (url.endsWith("/api/system/schools") && method === "POST") {
          return jsonResponse(
            {
              school: { id: "school-multi-1" },
              userExisted: false,
              setupCompleted: false,
            },
            201,
          );
        }
        if (
          url.endsWith("/api/system/schools/school-multi-1/admins") &&
          method === "POST"
        ) {
          return jsonResponse({
            schoolAdmin: { id: "admin-extra", email: null },
            userExisted: false,
            setupCompleted: false,
            activationRequired: true,
            activationCode: "WXYZ9999",
          });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nouvelle ecole" }),
    );

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "École multi-admins" },
    });
    await pickPrimaryAdmin();

    fireEvent.click(
      screen.getByRole("button", { name: "+ Ajouter un administrateur" }),
    );

    const modePhoneButtons = screen.getAllByRole("button", {
      name: "Telephone + PIN",
    });
    fireEvent.click(modePhoneButtons[modePhoneButtons.length - 1]);
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "677889900" },
    });
    fireEvent.change(screen.getByLabelText("PIN initial"), {
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creer l ecole" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l ecole" }));

    await waitFor(() => {
      const addAdminCall = fetchMock.mock.calls.find(([url, init]) =>
        String(url).endsWith("/api/system/schools/school-multi-1/admins")
          ? init?.method === "POST"
          : false,
      );
      expect(addAdminCall).toBeDefined();
      const body = JSON.parse(String(addAdminCall?.[1]?.body ?? "{}"));
      expect(body).toEqual({ phone: "677889900", pin: "654321" });
    });

    expect(await screen.findByText(/WXYZ9999/)).toBeInTheDocument();
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

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
          return jsonResponse({ school: { id: "school-new" } }, 201);
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
    await pickPrimaryAdmin("Alice Admin - alice@scolive.cm");
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
              country: "Cameroun",
              cycle: "SECONDARY",
              languageSystem: "ANGLOPHONE",
              primaryAdminUserId: "platform-2",
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

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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

  it("ajoute un school admin par telephone + PIN depuis la carte en edition", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
          url.endsWith("/api/system/schools/school-1/admins") &&
          method === "POST"
        ) {
          return jsonResponse({
            schoolAdmin: { id: "admin-phone-1", email: null },
            userExisted: false,
            setupCompleted: false,
            activationRequired: true,
            activationCode: "PHONE9999",
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

    fireEvent.click(screen.getByRole("button", { name: "Telephone + PIN" }));
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "699445566" },
    });
    fireEvent.change(screen.getByLabelText("PIN initial"), {
      target: { value: "112233" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/schools/school-1/admins"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ phone: "699445566", pin: "112233" }),
        }),
      );
    });

    expect(await screen.findByText(/PHONE9999/)).toBeInTheDocument();
  });

  it("shows the overview tab by default with totals and a per-cycle breakdown", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }

      if (url.includes("/api/system/platform-users")) {
        return jsonResponse(PLATFORM_USERS);
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

      if (url.includes("/api/system/platform-users")) {
        return jsonResponse(PLATFORM_USERS);
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
          tracks: [{ id: "track-1", code: "SCI", label: "Scientifique" }],
          curriculums: [
            {
              id: "curriculum-1",
              name: "Programme Terminale C",
              academicLevelLabel: "Terminale",
              trackLabel: "Scientifique",
            },
          ],
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

    expect(await screen.findByText("Systeme scolaire")).toBeInTheDocument();
    expect(screen.getByText("Scientifique")).toBeInTheDocument();
    expect(screen.getByText(/Programme Terminale C/)).toBeInTheDocument();
    expect(
      screen.getByText("Utilisateurs (annee en cours)"),
    ).toBeInTheDocument();
    const roleBreakdown = screen.getByTestId("schools-details-role-breakdown");
    expect(roleBreakdown).toHaveTextContent("Staff3");
    expect(roleBreakdown).toHaveTextContent("Enseignants8");
    expect(roleBreakdown).toHaveTextContent("Parents90");
    expect(roleBreakdown).toHaveTextContent("Eleves100");
  });

  it("retire un administrateur depuis l'onglet details apres confirmation", async () => {
    let admins = [
      {
        id: "admin-1",
        firstName: "Sarah",
        lastName: "Moukouri",
        email: "sarah@vogt.cm",
        phone: null,
        mustChangePassword: false,
        profileCompleted: true,
        activationRequired: false,
        canResendInvite: false,
      },
      {
        id: "admin-2",
        firstName: "Paul",
        lastName: "Etoa",
        email: "paul@vogt.cm",
        phone: null,
        mustChangePassword: false,
        profileCompleted: true,
        activationRequired: false,
        canResendInvite: false,
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
          url.endsWith("/api/system/schools/school-1/admins/admin-2") &&
          method === "DELETE"
        ) {
          admins = admins.filter((admin) => admin.id !== "admin-2");
          return jsonResponse({ success: true });
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
            academicYear: null,
            tracks: [],
            curriculums: [],
            stats: {
              usersCount: 10,
              classesCount: 4,
              studentsCount: 120,
              teachersCount: 8,
              gradesCount: 300,
            },
            roleBreakdown: {
              staff: 3,
              teachers: 8,
              parents: 90,
              students: 100,
            },
            schoolAdmins: admins,
          });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
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

    expect(await screen.findByText(/Paul Etoa/)).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Retirer" });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[1]);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retirer" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/schools/school-1/admins/admin-2"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(/Paul Etoa/)).not.toBeInTheDocument();
    });

    // Un seul administrateur restant : le retrait doit maintenant etre
    // desactive.
    const lastRemoveButton = screen.getByRole("button", { name: "Retirer" });
    expect(lastRemoveButton).toBeDisabled();
  });

  function mockDetailsFetch(options: {
    primaryAdminUserId: string | null;
    onPatch?: (body: unknown) => Response | Promise<Response>;
  }) {
    let primary = options.primaryAdminUserId;
    const admin = (id: string, firstName: string, lastName: string) => ({
      id,
      isPrimary: id === primary,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}@vogt.cm`,
      phone: null,
      mustChangePassword: false,
      profileCompleted: true,
      activationRequired: false,
      canResendInvite: false,
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
          url.endsWith("/api/system/schools/school-1/primary-admin") &&
          method === "PATCH"
        ) {
          const body = JSON.parse(String(init?.body ?? "{}"));
          if (options.onPatch) {
            return Promise.resolve(options.onPatch(body));
          }
          primary = body.userId;
          return jsonResponse({ success: true });
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
            academicYear: null,
            tracks: [],
            curriculums: [],
            stats: {
              usersCount: 10,
              classesCount: 4,
              studentsCount: 120,
              teachersCount: 8,
              gradesCount: 300,
            },
            roleBreakdown: {
              staff: 3,
              teachers: 8,
              parents: 90,
              students: 100,
            },
            primaryAdminUserId: primary,
            schoolAdmins: [
              admin("platform-1", "Paul", "Support"),
              admin("admin-2", "Sarah", "Moukouri"),
            ],
          });
        }
        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });
    return fetchMock;
  }

  async function openDetails() {
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
    await screen.findByText(/Sarah Moukouri/);
  }

  it("details : badge Principal, pas de bouton Retirer pour l'admin principal, retrait possible pour les autres", async () => {
    mockDetailsFetch({ primaryAdminUserId: "platform-1" });
    await openDetails();

    expect(screen.getAllByTestId("primary-admin-badge")).toHaveLength(1);
    const removeButtons = screen.getAllByRole("button", { name: "Retirer" });
    // L'admin principal n'a aucun bouton (cache), l'autre admin oui.
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]).toBeEnabled();
    expect(
      screen.getByText("Remplacer l'administrateur principal"),
    ).toBeInTheDocument();
  });

  it("details : remplace l'admin principal via la liste des platform users (l'actuel est exclu de la liste)", async () => {
    const fetchMock = mockDetailsFetch({ primaryAdminUserId: "platform-1" });
    await openDetails();

    const replaceButton = screen.getByRole("button", { name: "Remplacer" });
    expect(replaceButton).toBeDisabled();

    fireEvent.click(screen.getByTestId("replace-primary-admin"));
    expect(
      screen.queryByRole("option", { name: "Paul Support - paul@scolive.cm" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("option", {
        name: "Alice Admin - alice@scolive.cm",
      }),
    );
    expect(replaceButton).toBeEnabled();
    fireEvent.click(replaceButton);

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/system/schools/school-1/primary-admin") &&
          init?.method === "PATCH",
      );
      expect(patch).toBeDefined();
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        userId: "platform-2",
      });
      expect(
        (patch?.[1]?.headers as Record<string, string>)["X-CSRF-Token"],
      ).toBe("csrf-token-test");
    });
    expect(
      await screen.findByText("Administrateur principal mis à jour."),
    ).toBeInTheDocument();
  });

  it("details : affiche l'erreur serveur si le remplacement est refuse", async () => {
    mockDetailsFetch({
      primaryAdminUserId: "platform-1",
      onPatch: () =>
        new Response(
          JSON.stringify({
            message: "Cet utilisateur est deja l'administrateur principal",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        ),
    });
    await openDetails();
    fireEvent.click(screen.getByTestId("replace-primary-admin"));
    fireEvent.click(
      await screen.findByRole("option", {
        name: "Alice Admin - alice@scolive.cm",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remplacer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "deja l'administrateur principal",
    );
  });

  it("details : ecole legacy sans admin principal -> invite a en designer un, sans bloquer le retrait", async () => {
    mockDetailsFetch({ primaryAdminUserId: null });
    await openDetails();

    expect(screen.queryByTestId("primary-admin-badge")).not.toBeInTheDocument();
    expect(
      screen.getByText("Désigner l'administrateur principal"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Désigner" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Retirer" })).toHaveLength(2);
  });

  it("requests page/limit server-side and paginates the school list beyond page 1", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);

        if (url.endsWith("/api/me")) {
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }

        if (url.includes("/api/system/platform-users")) {
          return jsonResponse(PLATFORM_USERS);
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
