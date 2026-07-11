import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurriculumsPage from "./page";

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

describe("Curriculums page — catalogue national", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  function mockBaseRoutes(options?: {
    nationalLevels?: unknown[];
    nationalCurriculums?: unknown[];
    nationalSubjects?: unknown[];
    nationalCurriculumSubjects?: unknown[];
  }) {
    const nationalLevels = options?.nationalLevels ?? [];
    const nationalCurriculums = options?.nationalCurriculums ?? [];
    const nationalSubjects = options?.nationalSubjects ?? [];
    const nationalCurriculumSubjects =
      options?.nationalCurriculumSubjects ?? [];

    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools")) {
        return jsonResponse([
          { id: "school-1", slug: "lycee-du-poisson-d-avril", name: "LPA" },
        ]);
      }
      if (/\/api\/system\/academic-levels\/[^/]+$/.test(url)) {
        if (method === "PATCH" || method === "DELETE") {
          return jsonResponse({ id: "level-national-1" });
        }
      }
      if (url.endsWith("/api/system/academic-levels")) {
        if (method === "POST") {
          return jsonResponse({ id: "level-national-1" }, 201);
        }
        return jsonResponse(nationalLevels);
      }
      if (/\/api\/system\/curriculums\/[^/]+\/subjects\/[^/]+$/.test(url)) {
        if (method === "DELETE") {
          return jsonResponse({ success: true });
        }
      }
      if (/\/api\/system\/curriculums\/[^/]+\/subjects$/.test(url)) {
        if (method === "POST") {
          return jsonResponse({ id: "national-curriculum-subject-1" }, 201);
        }
        return jsonResponse(nationalCurriculumSubjects);
      }
      if (/\/api\/system\/curriculums\/[^/]+$/.test(url)) {
        if (method === "PATCH" || method === "DELETE") {
          return jsonResponse({ id: "curriculum-national-1" });
        }
      }
      if (url.endsWith("/api/system/curriculums")) {
        if (method === "POST") {
          return jsonResponse({ id: "curriculum-national-1" }, 201);
        }
        return jsonResponse(nationalCurriculums);
      }
      if (/\/api\/system\/subjects\/[^/]+$/.test(url)) {
        if (method === "PATCH" || method === "DELETE") {
          return jsonResponse({ id: "subject-national-1" });
        }
      }
      if (url.endsWith("/api/system/subjects")) {
        if (method === "POST") {
          return jsonResponse({ id: "subject-national-1" }, 201);
        }
        return jsonResponse(nationalSubjects);
      }
      if (url.includes("/admin/academic-levels")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/tracks")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/subjects")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/curriculums")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("shows the national catalog tab for SUPER_ADMIN and lists national levels and curriculums", async () => {
    mockBaseRoutes({
      nationalLevels: [{ id: "level-1", code: "6EME", label: "6eme" }],
      nationalCurriculums: [
        {
          id: "curriculum-1",
          name: "6EME - TRONC_COMMUN",
          academicLevelId: "level-1",
          academicLevel: { id: "level-1", code: "6EME", label: "6eme" },
          _count: { classes: 0, subjects: 0 },
        },
      ],
    });

    render(<CurriculumsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    expect((await screen.findAllByText("6eme")).length).toBeGreaterThan(0);
    expect(await screen.findByText("6EME - TRONC_COMMUN")).toBeInTheDocument();
  });

  it("creates a national academic level with always-enabled submit and inline validation", async () => {
    const fetchMock = mockBaseRoutes();

    render(<CurriculumsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    const submitButtons = await screen.findAllByRole("button", {
      name: "Ajouter",
    });
    const addLevelButton = submitButtons[0];
    expect(addLevelButton).toBeEnabled();

    fireEvent.click(addLevelButton);
    await waitFor(() => {
      expect(screen.getByText("Le code est obligatoire.")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "6EME" },
    });
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "6eme" },
    });

    fireEvent.click(addLevelButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/academic-levels"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "6EME", label: "6eme" }),
        }),
      );
    });
  });

  it("creates a national academic level with cycle and languageSystem selected", async () => {
    const fetchMock = mockBaseRoutes();

    render(<CurriculumsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    const submitButtons = await screen.findAllByRole("button", {
      name: "Ajouter",
    });
    const addLevelButton = submitButtons[0];

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "FORM1" },
    });
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "Form 1" },
    });
    fireEvent.change(screen.getByLabelText("Cycle (optionnel)"), {
      target: { value: "SECONDARY" },
    });
    fireEvent.change(
      screen.getByLabelText("Systeme linguistique (optionnel)"),
      { target: { value: "ANGLOPHONE" } },
    );

    fireEvent.click(addLevelButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/academic-levels"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            code: "FORM1",
            label: "Form 1",
            cycle: "SECONDARY",
            languageSystem: "ANGLOPHONE",
          }),
        }),
      );
    });
  });

  it("displays cycle and languageSystem classification on national level rows", async () => {
    mockBaseRoutes({
      nationalLevels: [
        {
          id: "level-1",
          code: "FORM1",
          label: "Form 1",
          cycle: "SECONDARY",
          languageSystem: "ANGLOPHONE",
        },
      ],
    });

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Catalogue national" }),
    );

    const row = (await screen.findByText("FORM1")).closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent("Secondaire");
    expect(row).toHaveTextContent("Anglophone");
  });

  it("edits an existing national academic level", async () => {
    const fetchMock = mockBaseRoutes({
      nationalLevels: [{ id: "level-1", code: "6EME", label: "6eme" }],
    });

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Catalogue national" }),
    );

    await screen.findByText("6EME");
    const editButtons = await screen.findAllByRole("button", {
      name: "Modifier",
    });
    fireEvent.click(editButtons[0]);

    const codeInput = await screen.findByLabelText("Code niveau national");
    fireEvent.change(codeInput, { target: { value: "6EME-BIS" } });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/academic-levels/level-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("edits an existing national curriculum's academic level", async () => {
    const fetchMock = mockBaseRoutes({
      nationalLevels: [
        { id: "level-1", code: "6EME", label: "6eme" },
        { id: "level-2", code: "5EME", label: "5eme" },
      ],
      nationalCurriculums: [
        {
          id: "curriculum-1",
          name: "6EME - TRONC_COMMUN",
          academicLevelId: "level-1",
          academicLevel: { id: "level-1", code: "6EME", label: "6eme" },
          _count: { classes: 0, subjects: 0 },
        },
      ],
    });

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Catalogue national" }),
    );

    await screen.findByText("6EME - TRONC_COMMUN");
    const editButtons = await screen.findAllByRole("button", {
      name: "Modifier",
    });
    fireEvent.click(editButtons[editButtons.length - 1]);

    fireEvent.change(
      screen.getByLabelText("Niveau academique du curriculum national"),
      { target: { value: "level-2" } },
    );

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/curriculums/curriculum-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ academicLevelId: "level-2" }),
        }),
      );
    });
  });

  it("shows level counts per cycle on the Cycles tab", async () => {
    mockBaseRoutes({
      nationalLevels: [
        {
          id: "level-1",
          code: "6EME",
          label: "6eme",
          cycle: "SECONDARY",
          languageSystem: "FRANCOPHONE",
        },
        {
          id: "level-2",
          code: "CP",
          label: "CP",
          cycle: "PRIMARY",
          languageSystem: "FRANCOPHONE",
        },
      ],
    });

    render(<CurriculumsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Cycles" }));

    const secondaryCard = await screen.findByTestId(
      "curriculums-cycle-card-SECONDARY",
    );
    expect(secondaryCard).toHaveTextContent("1");
    const primaryCard = await screen.findByTestId(
      "curriculums-cycle-card-PRIMARY",
    );
    expect(primaryCard).toHaveTextContent("1");
  });

  it("creates, edits and lists national subjects, then attaches one with a coefficient", async () => {
    const fetchMock = mockBaseRoutes({
      nationalCurriculums: [
        {
          id: "curriculum-1",
          name: "6EME - TRONC_COMMUN",
          academicLevelId: "level-1",
          academicLevel: { id: "level-1", code: "6EME", label: "6eme" },
          _count: { classes: 0, subjects: 0 },
        },
      ],
      nationalSubjects: [{ id: "subject-1", code: "MATH", name: "Maths" }],
    });

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Matieres nationales" }),
    );

    await screen.findByText("Maths");

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "PHYS" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Physique" },
    });
    const addSubjectButton = screen.getByRole("button", { name: "Ajouter" });
    await waitFor(() => expect(addSubjectButton).toBeEnabled());
    fireEvent.click(addSubjectButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/subjects"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "PHYS", name: "Physique" }),
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.change(screen.getByLabelText("Nom (modification)"), {
      target: { value: "Mathematiques" },
    });
    const saveSubjectButton = screen.getByRole("button", {
      name: "Enregistrer",
    });
    await waitFor(() => expect(saveSubjectButton).toBeEnabled());
    fireEvent.click(saveSubjectButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/subjects/subject-1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    fireEvent.change(screen.getByLabelText("Niveau academique"), {
      target: { value: "curriculum-1" },
    });

    fireEvent.change(screen.getByLabelText("Matiere"), {
      target: { value: "subject-1" },
    });
    fireEvent.change(screen.getByLabelText("Coefficient"), {
      target: { value: "4" },
    });
    const attachButton = screen.getByRole("button", { name: "Enregistrer" });
    await waitFor(() => expect(attachButton).toBeEnabled());
    fireEvent.click(attachButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/system/curriculums/curriculum-1/subjects",
        ),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            subjectId: "subject-1",
            isMandatory: true,
            coefficient: 4,
            weeklyHours: undefined,
          }),
        }),
      );
    });
  });

  it("does not show the national catalog tab for a SCHOOL_ADMIN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "lycee-du-poisson-d-avril",
        });
      }
      if (url.includes("/admin/")) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<CurriculumsPage />);

    await screen.findByRole("button", { name: "Curriculums" });
    expect(
      screen.queryByRole("button", { name: "Catalogue national" }),
    ).not.toBeInTheDocument();
  });
});
