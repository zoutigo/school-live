import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceuilPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({
    children,
  }: {
    children: React.ReactNode;
    schoolName?: string;
    schoolSlug?: string | null;
  }) => <div>{children}</div>,
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AcceuilPage platform dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("renders hero and platform cards for admin roles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/me")) {
        return createJsonResponse({
          firstName: "Lionel",
          lastName: "Ateba",
          role: "ADMIN",
          schoolSlug: null,
        });
      }

      if (url.endsWith("/system/indicators")) {
        return createJsonResponse({
          schoolsCount: 24,
          usersCount: 4182,
          studentsCount: 3500,
          teachersCount: 210,
          gradesCount: 12840,
          adminsCount: 8,
          schoolAdminsCount: 24,
        });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<AcceuilPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Lionel Ateba" }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("platform-dashboard-root").className,
    ).not.toContain("max-w-[");
    expect(screen.getByText("Accueil plateforme")).toBeInTheDocument();
    expect(screen.getByText("Reseau")).toBeInTheDocument();
    expect(screen.getByText("Comptes")).toBeInTheDocument();
    expect(screen.getByText("Activite")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ecoles\s+24/i })).toHaveAttribute(
      "href",
      "/schools",
    );
    expect(
      screen.getByRole("link", { name: /Utilisateurs.*4.*182/i }),
    ).toHaveAttribute("href", "/users");
    expect(
      screen.getByRole("link", { name: /Indicateurs.*12.*840/i }),
    ).toHaveAttribute("href", "/indicators");
  });

  it("keeps support role on platform home without indicators", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/me")) {
        return createJsonResponse({
          firstName: "Ryme",
          lastName: "Bakkali",
          role: "SUPPORT",
          schoolSlug: null,
        });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<AcceuilPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Ryme Bakkali" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ecoles\s+Ouvrir/i }),
    ).toHaveAttribute("href", "/schools");
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
