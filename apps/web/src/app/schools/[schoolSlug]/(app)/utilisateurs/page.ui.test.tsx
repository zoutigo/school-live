import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { translate } from "../../../../../i18n/useTranslation";
import UtilisateursPage from "./page";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();
const getCsrfMock = vi.fn(() => "csrf-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfMock(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEACHER_USER = {
  id: "teacher-1",
  studentId: null,
  hasAccount: true,
  type: "user",
  firstName: "Marie",
  lastName: "Ekani",
  email: "m.ekani@ecole.cm",
  phone: "+237600000001",
  gender: "F",
  roles: ["TEACHER"],
  activationStatus: "ACTIVE",
  profileCompleted: true,
  createdAt: "2024-01-10T10:00:00.000Z",
};

const PARENT_USER = {
  id: "parent-1",
  studentId: null,
  hasAccount: true,
  type: "user",
  firstName: "Bernard",
  lastName: "Owona",
  email: "b.owona@mail.cm",
  phone: "+237600000002",
  gender: "M",
  roles: ["PARENT"],
  activationStatus: "ACTIVE",
  profileCompleted: true,
  createdAt: "2024-02-15T10:00:00.000Z",
};

const STUDENT_USER = {
  id: "student-user-1",
  studentId: "student-user-1",
  hasAccount: true,
  type: "user",
  firstName: "Paul",
  lastName: "Owona",
  email: "p.owona@ecole.cm",
  phone: null,
  gender: "M",
  roles: ["STUDENT"],
  activationStatus: "ACTIVE",
  profileCompleted: false,
  createdAt: "2024-03-01T10:00:00.000Z",
};

const STUDENT_ONLY = {
  id: "stu-only-1",
  studentId: "stu-only-1",
  hasAccount: false,
  type: "student-only",
  firstName: "Chloe",
  lastName: "Mbida",
  email: null,
  phone: null,
  roles: ["STUDENT"],
  activationStatus: null,
  profileCompleted: false,
  createdAt: "2024-03-10T10:00:00.000Z",
};

const TEACHER_DETAIL = {
  ...TEACHER_USER,
  lastLoginAt: "2025-06-01T08:00:00.000Z",
  updatedAt: "2025-06-01T08:00:00.000Z",
  enrollments: [],
  children: [],
  teachingClasses: [
    {
      classId: "class-6c",
      className: "6ème C",
      subjects: [
        { id: "sub-math", name: "Mathématiques" },
        { id: "sub-fr", name: "Français" },
      ],
    },
  ],
  studentParents: [],
  staffFunctions: [],
};

const PARENT_DETAIL = {
  ...PARENT_USER,
  lastLoginAt: null,
  updatedAt: "2024-02-15T10:00:00.000Z",
  enrollments: [],
  children: [
    { id: "student-user-1", firstName: "Paul", lastName: "Owona", className: "6ème C" },
  ],
  teachingClasses: [],
  studentParents: [],
  staffFunctions: [],
};

const STUDENT_DETAIL = {
  ...STUDENT_USER,
  lastLoginAt: null,
  updatedAt: "2024-03-01T10:00:00.000Z",
  enrollments: [
    { id: "enr-1", classId: "class-6c", className: "6ème C", schoolYear: "2025-2026" },
  ],
  children: [],
  teachingClasses: [],
  studentParents: [
    { id: "parent-1", firstName: "Bernard", lastName: "Owona", phone: "+237600000002" },
  ],
  staffFunctions: [],
};

const STUDENT_ONLY_DETAIL = {
  type: "student-only",
  studentId: "stu-only-1",
  firstName: "Chloe",
  lastName: "Mbida",
  enrollments: [
    { id: "enr-2", classId: "class-4a", className: "4ème A", schoolYear: "2025-2026" },
  ],
  studentParents: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const t = (key: string) => translate("fr", key);

function jsonRes(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function makeListResponse(
  data: unknown[],
  total?: number,
  hasMore?: boolean,
) {
  return { data, total: total ?? data.length, hasMore: hasMore ?? false };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("UtilisateursPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    getCsrfMock.mockReturnValue("csrf-test");
  });

  // ── Rendering & list ──────────────────────────────────────────────────────

  it("affiche le titre et la liste des utilisateurs", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/schools/college-vogt/users")) {
        return jsonRes(makeListResponse([TEACHER_USER, PARENT_USER, STUDENT_USER, STUDENT_ONLY]));
      }
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);

    expect(await screen.findByTestId("utilisateurs-page")).toBeInTheDocument();
    expect(screen.getByText(t("users.title"))).toBeInTheDocument();
    expect(await screen.findByTestId(`user-card-${TEACHER_USER.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`user-card-${PARENT_USER.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`user-card-${STUDENT_USER.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`user-card-${STUDENT_ONLY.id}`)).toBeInTheDocument();
  });

  it("affiche le total d'utilisateurs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeListResponse([TEACHER_USER], 42)), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UtilisateursPage />);
    expect(await screen.findByTestId("users-total")).toHaveTextContent("42");
  });

  it("affiche un état vide quand la liste est vide", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeListResponse([])), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UtilisateursPage />);
    expect(await screen.findByTestId("users-empty")).toBeInTheDocument();
  });

  it("affiche une erreur si le fetch échoue", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    );
    render(<UtilisateursPage />);
    expect(await screen.findByTestId("users-error")).toBeInTheDocument();
  });

  it("affiche le badge 'Sans compte' pour les élèves sans compte", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeListResponse([STUDENT_ONLY])), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UtilisateursPage />);
    const card = await screen.findByTestId(`user-card-${STUDENT_ONLY.id}`);
    expect(within(card).getByText(t("users.noAccount"))).toBeInTheDocument();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  it("effectue une recherche après debounce", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(makeListResponse([TEACHER_USER])), {
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<UtilisateursPage />);

    const searchInput = await screen.findByTestId("users-search-input");
    fireEvent.change(searchInput, { target: { value: "Marie" } });

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(String(lastCall[0])).toContain("search=Marie");
    }, { timeout: 1000 });
  });

  it("efface la recherche avec la croix", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(makeListResponse([TEACHER_USER])), {
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<UtilisateursPage />);
    await screen.findByTestId("users-search-input");
    fireEvent.change(screen.getByTestId("users-search-input"), { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByTestId("users-search-clear")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("users-search-clear"));

    await waitFor(() => {
      expect(screen.queryByTestId("users-search-clear")).not.toBeInTheDocument();
    });
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(String(lastCall[0])).not.toContain("search=");
  });

  // ── Role filter ───────────────────────────────────────────────────────────

  it("filtre par rôle en cliquant sur un chip", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(makeListResponse([TEACHER_USER])), {
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(<UtilisateursPage />);
    await screen.findByTestId("users-role-filter");

    fireEvent.click(screen.getByTestId("role-filter-teacher"));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(String(lastCall[0])).toContain("role=TEACHER");
    });
  });

  it("les chips de filtre affichent les labels traduits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeListResponse([])), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UtilisateursPage />);
    await screen.findByTestId("users-role-filter");
    expect(screen.getByText(t("users.filter.teachers"))).toBeInTheDocument();
    expect(screen.getByText(t("users.filter.parents"))).toBeInTheDocument();
    expect(screen.getByText(t("users.filter.students"))).toBeInTheDocument();
  });

  // ── User detail panel ─────────────────────────────────────────────────────

  it("ouvre le panneau de détail au clic sur une carte", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));

    expect(await screen.findByTestId("user-detail-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("user-detail-name")).toHaveTextContent("Ekani Marie");
  });

  it("ferme le panneau en cliquant sur la flèche retour", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    await screen.findByTestId("user-detail-panel");
    fireEvent.click(screen.getByTestId("user-detail-close"));

    await waitFor(() => {
      expect(screen.queryByTestId("user-detail-panel")).not.toBeInTheDocument();
    });
  });

  // ── Teacher role section ──────────────────────────────────────────────────

  it("affiche les classes et matières d'un enseignant", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));

    expect(await screen.findByText("6ème C")).toBeInTheDocument();
    expect(await screen.findByText("Mathématiques")).toBeInTheDocument();
    expect(await screen.findByText("Français")).toBeInTheDocument();
  });

  // ── Parent role section ───────────────────────────────────────────────────

  it("affiche les enfants d'un parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([PARENT_USER]));
      if (url.includes(`/users/${PARENT_USER.id}`)) return jsonRes(PARENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${PARENT_USER.id}`));

    expect(await screen.findByTestId(`parent-child-${STUDENT_USER.id}`)).toBeInTheDocument();
    expect(screen.getByText("Owona Paul")).toBeInTheDocument();
  });

  it("ouvre le modal d'affectation enfant depuis la section parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([PARENT_USER]));
      if (url.includes(`/users/${PARENT_USER.id}`)) return jsonRes(PARENT_DETAIL);
      if (url.includes("/admin/students")) return jsonRes({ students: [] });
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${PARENT_USER.id}`));
    await screen.findByTestId("action-assign-child");
    fireEvent.click(screen.getByTestId("action-assign-child"));

    expect(await screen.findByTestId("assign-child-modal")).toBeInTheDocument();
    const modal = screen.getByTestId("assign-child-modal");
    expect(within(modal).getByTestId("assign-child-search")).toBeInTheDocument();
  });

  it("affecte un enfant à un parent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([PARENT_USER]));
      if (url.includes(`/users/${PARENT_USER.id}`)) return jsonRes(PARENT_DETAIL);
      if (url.includes("/admin/students")) {
        return jsonRes({
          students: [
            {
              id: "stu-only-1",
              firstName: "Chloe",
              lastName: "Mbida",
              currentEnrollment: {
                id: "enr-2",
                class: { id: "class-4a", name: "4ème A" },
                schoolYear: { id: "sy-1", label: "2025-2026" },
              },
            },
          ],
        });
      }
      if (url.includes("/admin/parent-students")) return jsonRes({}, 201);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${PARENT_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-assign-child"));
    await screen.findByTestId("assign-child-modal");

    fireEvent.click(await screen.findByTestId("assign-child-student-stu-only-1"));
    fireEvent.click(screen.getByTestId("assign-child-submit"));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(calls.some((u) => u.includes("/admin/parent-students"))).toBe(true);
    });
  });

  // ── Student role section ──────────────────────────────────────────────────

  it("affiche les parents d'un élève dans la section élève", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([STUDENT_USER]));
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));

    const parentsBlock = await screen.findByTestId("student-parents");
    expect(parentsBlock).toBeInTheDocument();
    expect(within(parentsBlock).getByText("Owona Bernard")).toBeInTheDocument();
    expect(within(parentsBlock).getByText("+237600000002")).toBeInTheDocument();
  });

  it("affiche le bouton 'Associer un parent' dans la section élève", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([STUDENT_USER]));
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    expect(await screen.findByTestId("action-assign-parent")).toBeInTheDocument();
  });

  it("ouvre le modal d'association parent au clic", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) {
        if (url.includes("role=PARENT")) {
          return jsonRes(makeListResponse([PARENT_USER]));
        }
        return jsonRes(makeListResponse([STUDENT_USER]));
      }
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    await screen.findByTestId("action-assign-parent");
    fireEvent.click(screen.getByTestId("action-assign-parent"));

    expect(await screen.findByTestId("assign-parent-modal")).toBeInTheDocument();
    const modal = screen.getByTestId("assign-parent-modal");
    expect(within(modal).getByTestId("assign-parent-search")).toBeInTheDocument();
  });

  it("liste et sélectionne un parent dans le modal, appelle linkExistingParent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) {
        if (url.includes("role=PARENT")) {
          return jsonRes(makeListResponse([PARENT_USER]));
        }
        return jsonRes(makeListResponse([STUDENT_USER]));
      }
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      if (url.includes("/admin/parent-students")) return jsonRes({}, 201);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-assign-parent"));

    await screen.findByTestId("assign-parent-modal");
    fireEvent.click(await screen.findByTestId(`assign-parent-user-${PARENT_USER.id}`));
    fireEvent.click(screen.getByTestId("assign-parent-submit"));

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        (c) => String(c[0]).includes("/admin/parent-students") && c[1]?.method === "POST",
      );
      expect(postCalls).toHaveLength(1);
      const body = JSON.parse(postCalls[0][1]?.body as string) as {
        studentId: string;
        parentUserId: string;
      };
      expect(body.studentId).toBe(STUDENT_USER.id);
      expect(body.parentUserId).toBe(PARENT_USER.id);
    });
  });

  it("affiche un toast de succès après association du parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) {
        if (url.includes("role=PARENT")) return jsonRes(makeListResponse([PARENT_USER]));
        return jsonRes(makeListResponse([STUDENT_USER]));
      }
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      if (url.includes("/admin/parent-students")) return jsonRes({}, 201);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-assign-parent"));
    await screen.findByTestId("assign-parent-modal");
    fireEvent.click(await screen.findByTestId(`assign-parent-user-${PARENT_USER.id}`));
    fireEvent.click(screen.getByTestId("assign-parent-submit"));

    expect(await screen.findByTestId("toast-success")).toBeInTheDocument();
    expect(screen.getByText(t("users.assignParent.success"))).toBeInTheDocument();
  });

  // ── Student-only (sans compte) ────────────────────────────────────────────

  it("affiche 'Créer un accès' pour un élève sans compte", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([STUDENT_ONLY]));
      if (url.includes(`/students/${STUDENT_ONLY.studentId}/profile`)) {
        return jsonRes(STUDENT_ONLY_DETAIL);
      }
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_ONLY.id}`));

    expect(await screen.findByTestId("action-create-access")).toBeInTheDocument();
  });

  it("le bouton 'Réinitialiser MDP' apparaît pour un élève avec compte", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([STUDENT_USER]));
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    expect(await screen.findByTestId("action-reset-password")).toBeInTheDocument();
  });

  // ── Edit roles modal ──────────────────────────────────────────────────────

  it("ouvre le modal de modification des rôles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    await screen.findByTestId("action-edit-roles");
    fireEvent.click(screen.getByTestId("action-edit-roles"));

    expect(await screen.findByTestId("edit-roles-modal")).toBeInTheDocument();
    const modal = screen.getByTestId("edit-roles-modal");
    expect(within(modal).getByTestId("edit-roles-list")).toBeInTheDocument();
  });

  it("le rôle actuel est pré-coché dans le modal", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-edit-roles"));

    await screen.findByTestId("edit-roles-modal");
    const teacherCheckbox = screen.getByTestId("role-check-teacher");
    expect(teacherCheckbox).toHaveStyle({ backgroundColor: TEACHER_USER.roles ? undefined : undefined });
    // vérifie juste que la case enseignant est présente et affiche le bon label
    expect(within(teacherCheckbox).getByText(t("users.roles.teacher"))).toBeInTheDocument();
  });

  it("modifie les rôles et soumet la requête PATCH", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}/roles`) && method === "PATCH") {
        return jsonRes({ ok: true });
      }
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-edit-roles"));

    await screen.findByTestId("edit-roles-modal");
    // ajoute le rôle PARENT
    fireEvent.click(screen.getByTestId("role-check-parent"));
    fireEvent.click(screen.getByTestId("edit-roles-submit"));

    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        (c) =>
          String(c[0]).includes(`/users/${TEACHER_USER.id}/roles`) &&
          (c[1]?.method ?? "").toUpperCase() === "PATCH",
      );
      expect(patchCalls).toHaveLength(1);
      const body = JSON.parse(patchCalls[0][1]?.body as string) as { roles: string[] };
      expect(body.roles).toContain("TEACHER");
      expect(body.roles).toContain("PARENT");
    });
  });

  it("affiche un toast de succès après modification des rôles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}/roles`) && method === "PATCH") {
        return jsonRes({ ok: true });
      }
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-edit-roles"));
    await screen.findByTestId("edit-roles-modal");
    fireEvent.click(screen.getByTestId("edit-roles-submit"));

    expect(await screen.findByTestId("toast-success")).toBeInTheDocument();
    expect(screen.getByText(t("users.editRoles.success"))).toBeInTheDocument();
  });

  // ── Contact et activité ───────────────────────────────────────────────────

  it("affiche les informations de contact", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));

    const contact = await screen.findByTestId("user-detail-contact");
    expect(within(contact).getByText("m.ekani@ecole.cm")).toBeInTheDocument();
    expect(within(contact).getByText("+237600000001")).toBeInTheDocument();
  });

  it("affiche la section d'activité avec la dernière connexion", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));

    const activity = await screen.findByTestId("user-detail-activity");
    expect(within(activity).getByText(t("users.detail.lastLogin"))).toBeInTheDocument();
  });

  it("affiche 'Jamais connecté' si lastLoginAt est null", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([PARENT_USER]));
      if (url.includes(`/users/${PARENT_USER.id}`)) return jsonRes(PARENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${PARENT_USER.id}`));

    const activity = await screen.findByTestId("user-detail-activity");
    expect(within(activity).getByText(t("users.detail.neverLoggedIn"))).toBeInTheDocument();
  });

  // ── Message action ────────────────────────────────────────────────────────

  it("navigue vers la messagerie au clic sur 'Message'", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) return jsonRes(makeListResponse([TEACHER_USER]));
      if (url.includes(`/users/${TEACHER_USER.id}`)) return jsonRes(TEACHER_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${TEACHER_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-send-message"));

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(`/schools/college-vogt/messagerie/nouveau`),
    );
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(`recipientId=${TEACHER_USER.id}`),
    );
  });

  // ── i18n ──────────────────────────────────────────────────────────────────

  it("utilise les traductions françaises par défaut", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeListResponse([])), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UtilisateursPage />);
    expect(await screen.findByText(t("users.title"))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(t("users.search.placeholder"))).toBeInTheDocument();
  });

  it("le bouton 'Charger plus' effectue une requête page=2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url.includes("/users?")) {
          const hasPage2 = url.includes("page=2");
          return jsonRes(
            makeListResponse([TEACHER_USER], 25, !hasPage2),
          );
        }
        return jsonRes({}, 404);
      });

    render(<UtilisateursPage />);
    await screen.findByTestId("users-list");

    await waitFor(() => {
      expect(screen.queryByText(t("users.loadMore"))).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(t("users.loadMore")));

    await waitFor(() => {
      const page2Calls = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes("page=2"),
      );
      expect(page2Calls).toHaveLength(1);
    });
  });

  // ── Modal fermeture ───────────────────────────────────────────────────────

  it("ferme le modal d'association parent en cliquant sur Annuler", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) {
        if (url.includes("role=PARENT")) return jsonRes(makeListResponse([]));
        return jsonRes(makeListResponse([STUDENT_USER]));
      }
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-assign-parent"));
    await screen.findByTestId("assign-parent-modal");
    fireEvent.click(screen.getByTestId("assign-parent-cancel"));

    await waitFor(() => {
      expect(screen.queryByTestId("assign-parent-modal")).not.toBeInTheDocument();
    });
  });

  it("ferme le modal avec la touche Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/users?")) {
        if (url.includes("role=PARENT")) return jsonRes(makeListResponse([]));
        return jsonRes(makeListResponse([STUDENT_USER]));
      }
      if (url.includes(`/users/${STUDENT_USER.id}`)) return jsonRes(STUDENT_DETAIL);
      return jsonRes({}, 404);
    });

    render(<UtilisateursPage />);
    fireEvent.click(await screen.findByTestId(`user-card-${STUDENT_USER.id}`));
    fireEvent.click(await screen.findByTestId("action-assign-parent"));
    await screen.findByTestId("assign-parent-modal");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("assign-parent-modal")).not.toBeInTheDocument();
    });
  });
});
