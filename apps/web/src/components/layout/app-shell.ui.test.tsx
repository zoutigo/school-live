import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { useSchoolReadOnly } from "./school-read-only-context";
import { usePageHelpStore } from "../../store/page-help";
import { useLocaleStore } from "../../i18n/locale-store";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("./app-sidebar", () => ({
  AppSidebar: ({ onLogoutClick }: { onLogoutClick?: () => void }) => (
    <nav aria-label="Sidebar">
      <button type="button" onClick={onLogoutClick}>
        Sidebar logout
      </button>
    </nav>
  ),
  SIDEBAR_HELP_TOUR_TARGET: "sidebar-help-target",
}));

describe("AppShell header scroll behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/schools/college-vogt/public")) {
        return new Response(
          JSON.stringify({
            name: "college vogt",
            logoUrl: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/api/auth/logout")) {
        return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  it("hides the header on downward scroll and reveals it on slight upward scroll", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div style={{ height: "2400px" }}>Long content</div>
      </AppShell>,
    );

    const header = screen.getByTestId("app-header-shell");
    const main = screen.getByTestId("app-shell-main");

    expect(header).toHaveAttribute("data-state", "visible");

    await act(async () => {
      Object.defineProperty(main, "scrollTop", {
        configurable: true,
        value: 64,
      });
      fireEvent.scroll(main);
      await Promise.resolve();
    });

    await waitFor(() => expect(header).toHaveAttribute("data-state", "hidden"));

    await act(async () => {
      Object.defineProperty(main, "scrollTop", {
        configurable: true,
        value: 60,
      });
      fireEvent.scroll(main);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(header).toHaveAttribute("data-state", "visible"),
    );
  });

  it("confirms logout from the desktop header before redirecting to the home page", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Se deconnecter" }));

    const confirmDialog = screen.getByRole("dialog", {
      name: "Confirmer la deconnexion",
    });

    expect(confirmDialog).toBeInTheDocument();

    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Se deconnecter" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("confirms logout from the mobile sidebar before redirecting to the home page", async () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    const mobileMenu = screen.getByRole("dialog");
    fireEvent.click(
      within(mobileMenu).getByRole("button", { name: "Sidebar logout" }),
    );

    const confirmDialog = screen.getByRole("dialog", {
      name: "Confirmer la deconnexion",
    });

    expect(confirmDialog).toBeInTheDocument();

    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Se deconnecter" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});

describe("AppShell — synchro locale compte -> appareil", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocale("fr");
  });

  it("aligne la locale de l'appareil sur celle du compte à chaque chargement de /me", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
            preferredLocale: "EN",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(useLocaleStore.getState().locale).toBe("en");
    });
  });

  it("laisse la locale de l'appareil inchangée quand le compte n'a pas de préférence", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
    expect(useLocaleStore.getState().locale).toBe("fr");
  });
});

describe("AppShell — modale d'aide globale", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    usePageHelpStore.setState({ entry: null, open: false });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: "PARENT",
            activeRole: "PARENT",
            platformRoles: [],
            memberships: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  it("ne rend aucune modale quand aucune page n'a enregistré d'aide", () => {
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();
  });

  it("affiche la modale enregistrée par la page une fois ouverte via le store", async () => {
    usePageHelpStore.setState({
      entry: {
        title: "Emploi du temps",
        sections: [{ title: "Vue", body: ["Changez de vue ici."] }],
      },
      open: false,
    });

    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();

    act(() => {
      usePageHelpStore.getState().openHelp();
    });

    await waitFor(() => {
      expect(screen.getByTestId("help-dialog")).toHaveTextContent(
        "Emploi du temps",
      );
    });
    expect(screen.getByTestId("help-dialog")).toHaveTextContent(
      "Changez de vue ici.",
    );

    fireEvent.click(screen.getByTestId("help-dialog-close"));
    expect(usePageHelpStore.getState().open).toBe(false);
  });
});

describe("AppShell — bannière lecture seule (élève/parent exclu)", () => {
  function mockFetch(opts: {
    role: string;
    schoolMe: () => Response | Promise<Response>;
  }) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return new Response(
          JSON.stringify({
            firstName: "Robert",
            lastName: "Ntamack",
            role: opts.role,
            activeRole: opts.role,
            platformRoles: [],
            memberships: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/schools/college-vogt/me")) return opts.schoolMe();
      return new Response(JSON.stringify({}), { status: 404 });
    });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const renderShell = () =>
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        <div>Content</div>
      </AppShell>,
    );

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche la bannière quand l'API signale schoolReadOnly", async () => {
    mockFetch({
      role: "PARENT",
      schoolMe: () => json({ schoolReadOnly: true }),
    });
    renderShell();
    expect(await screen.findByTestId("read-only-banner")).toHaveTextContent(
      "Accès en lecture seule",
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("n'affiche rien quand l'accès est normal", async () => {
    const fetchMock = mockFetch({
      role: "STUDENT",
      schoolMe: () => json({ schoolReadOnly: false }),
    });
    renderShell();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) =>
          String(c[0]).endsWith("/schools/college-vogt/me"),
        ),
      ).toBe(true),
    );
    expect(screen.queryByTestId("read-only-banner")).toBeNull();
  });

  it("n'interroge pas /schools/:slug/me pour un rôle de gestion", async () => {
    const fetchMock = mockFetch({
      role: "TEACHER",
      schoolMe: () => json({ schoolReadOnly: true }),
    });
    renderShell();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/api/me")),
      ).toBe(true),
    );
    expect(
      fetchMock.mock.calls.some((c) =>
        String(c[0]).endsWith("/schools/college-vogt/me"),
      ),
    ).toBe(false);
    expect(screen.queryByTestId("read-only-banner")).toBeNull();
  });

  it("ignore silencieusement une erreur API ou réseau", async () => {
    mockFetch({ role: "PARENT", schoolMe: () => json({}, 500) });
    renderShell();
    await screen.findByText("Content");
    await waitFor(() =>
      expect(screen.queryByTestId("read-only-banner")).toBeNull(),
    );

    vi.restoreAllMocks();
    mockFetch({
      role: "PARENT",
      schoolMe: () => Promise.reject(new Error("network")),
    });
    renderShell();
    await waitFor(() => expect(screen.getAllByText("Content").length).toBe(2));
    expect(screen.queryByTestId("read-only-banner")).toBeNull();
  });
});

describe("AppShell — lecture seule : libellés, filet de sécurité 403, contexte", () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  function mockApi(opts: {
    role: "STUDENT" | "PARENT" | "TEACHER";
    readOnly: boolean;
    write?: () => Response;
  }) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return json({
          firstName: "Robert",
          lastName: "Ntamack",
          role: opts.role,
          activeRole: opts.role,
          platformRoles: [],
          memberships: [],
        });
      }
      if (url.endsWith("/schools/college-vogt/me")) {
        return json({ schoolReadOnly: opts.readOnly });
      }
      if (url.includes("/schools/college-vogt/homework/done")) {
        return opts.write ? opts.write() : json({});
      }
      return json({}, 404);
    });
  }

  function ReadOnlyProbe() {
    return <span data-testid="probe">{String(useSchoolReadOnly())}</span>;
  }

  const renderShell = (child: React.ReactNode = <div>Content</div>) =>
    render(
      <AppShell schoolSlug="college-vogt" schoolName="college vogt">
        {child}
      </AppShell>,
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocale("fr");
  });

  it("adresse l'élève exclu à la deuxième personne", async () => {
    mockApi({ role: "STUDENT", readOnly: true });
    renderShell();
    const banner = await screen.findByTestId("read-only-banner");
    expect(banner).toHaveTextContent("Vous n'êtes plus inscrit(e)");
    expect(banner).not.toHaveTextContent("Votre enfant");
  });

  it("parle de l'enfant au parent dont tous les enfants sont exclus", async () => {
    mockApi({ role: "PARENT", readOnly: true });
    renderShell();
    expect(await screen.findByTestId("read-only-banner")).toHaveTextContent(
      "Votre enfant n'est plus inscrit(e)",
    );
  });

  it("affiche les libellés en anglais", async () => {
    useLocaleStore.getState().setLocale("en");
    mockApi({ role: "PARENT", readOnly: true });
    renderShell();
    const banner = await screen.findByTestId("read-only-banner");
    expect(banner).toHaveTextContent("Read-only access");
    expect(banner).toHaveTextContent("Your child is no longer enrolled");
  });

  it("expose le mode lecture seule aux modules via le contexte", async () => {
    mockApi({ role: "STUDENT", readOnly: true });
    renderShell(<ReadOnlyProbe />);
    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("true"),
    );
  });

  it("le contexte vaut false pour un accès normal", async () => {
    mockApi({ role: "STUDENT", readOnly: false });
    renderShell(<ReadOnlyProbe />);
    await screen.findByTestId("probe");
    expect(screen.getByTestId("probe")).toHaveTextContent("false");
  });

  it("explique clairement un refus 403 SCHOOL_MEMBER_READ_ONLY sur une écriture", async () => {
    mockApi({
      role: "STUDENT",
      readOnly: true,
      write: () =>
        json(
          { code: "SCHOOL_MEMBER_READ_ONLY", message: "Lecture seule" },
          403,
        ),
    });
    renderShell();
    await screen.findByTestId("read-only-banner");

    const response = await window.fetch(
      "http://localhost:3001/api/schools/college-vogt/homework/done",
      { method: "POST" },
    );
    // La réponse reste lisible par l'appelant (clone interne).
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "SCHOOL_MEMBER_READ_ONLY",
    });
    expect(
      await screen.findByTestId("read-only-blocked-toast"),
    ).toHaveTextContent(
      "Action impossible : votre accès est en lecture seule.",
    );
  });

  it("n'affiche aucun toast pour un autre 403 ou pour une lecture", async () => {
    mockApi({
      role: "STUDENT",
      readOnly: true,
      write: () => json({ code: "FORBIDDEN_OTHER" }, 403),
    });
    renderShell();
    await screen.findByTestId("read-only-banner");

    await window.fetch(
      "http://localhost:3001/api/schools/college-vogt/homework/done",
      { method: "POST" },
    );
    await window.fetch(
      "http://localhost:3001/api/schools/college-vogt/homework/done",
    );
    expect(screen.queryByTestId("read-only-blocked-toast")).toBeNull();
  });

  it("ignore une réponse 403 non JSON sans planter", async () => {
    mockApi({
      role: "STUDENT",
      readOnly: true,
      write: () => new Response("Forbidden", { status: 403 }),
    });
    renderShell();
    await screen.findByTestId("read-only-banner");
    const response = await window.fetch(
      "http://localhost:3001/api/schools/college-vogt/homework/done",
      { method: "DELETE" },
    );
    expect(response.status).toBe(403);
    expect(screen.queryByTestId("read-only-blocked-toast")).toBeNull();
  });

  it("n'intercepte pas fetch pour un utilisateur qui n'est pas en lecture seule", async () => {
    const spy = mockApi({
      role: "TEACHER",
      readOnly: false,
      write: () => json({ code: "SCHOOL_MEMBER_READ_ONLY" }, 403),
    });
    const before = window.fetch;
    renderShell();
    await waitFor(() =>
      expect(spy.mock.calls.some((c) => String(c[0]).endsWith("/api/me"))).toBe(
        true,
      ),
    );
    expect(window.fetch).toBe(before);
    await window.fetch(
      "http://localhost:3001/api/schools/college-vogt/homework/done",
      { method: "POST" },
    );
    expect(screen.queryByTestId("read-only-blocked-toast")).toBeNull();
  });

  it("restaure fetch au démontage", async () => {
    mockApi({ role: "STUDENT", readOnly: true });
    const before = window.fetch;
    const { unmount } = renderShell();
    await screen.findByTestId("read-only-banner");
    expect(window.fetch).not.toBe(before);
    unmount();
    expect(window.fetch).toBe(before);
  });
});
