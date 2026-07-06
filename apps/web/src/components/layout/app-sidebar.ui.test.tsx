import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";

let mockPathname = "/schools/college-vogt/dashboard";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("AppSidebar teacher class links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockPathname = "/schools/college-vogt/dashboard";
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("shows the timetable link in English for teacher when the locale is set to en", async () => {
    useLocaleStore.setState({ locale: "en" });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return new Response(
          JSON.stringify({
            assignments: [
              {
                classId: "class-1",
                className: "6eC",
                schoolYearId: "sy-1",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="TEACHER" schoolSlug="college-vogt" />);

    const classButton = await screen.findByRole("button", { name: "6eC" });
    fireEvent.click(classButton);

    const timetableLink = await screen.findByRole("link", {
      name: "Timetable",
    });
    expect(timetableLink.getAttribute("href")).toBe(
      "/schools/college-vogt/classes/class-1/emploi-du-temps",
    );
    expect(
      screen.queryByRole("link", { name: "Emploi du temps" }),
    ).not.toBeInTheDocument();
  });

  it("shows an emploi du temps link per class section for teacher", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return new Response(
          JSON.stringify({
            assignments: [
              {
                classId: "class-1",
                className: "6eC",
                schoolYearId: "sy-1",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="TEACHER" schoolSlug="college-vogt" />);

    const classButton = await screen.findByRole("button", { name: "6eC" });
    fireEvent.click(classButton);

    const timetableLink = await screen.findByRole("link", {
      name: "Emploi du temps",
    });
    expect(timetableLink.getAttribute("href")).toBe(
      "/schools/college-vogt/classes/class-1/emploi-du-temps",
    );
  });

  it("renders a logout action and delegates to the shell handler", () => {
    const onLogoutClick = vi.fn();

    render(
      <AppSidebar
        role="TEACHER"
        schoolSlug="college-vogt"
        onLogoutClick={onLogoutClick}
      />,
    );

    fireEvent.click(screen.getByTestId("sidebar-logout-button"));

    expect(onLogoutClick).toHaveBeenCalledTimes(1);
  });

  it("returns to the teacher dashboard when clicking Menu enseignant from a class context", async () => {
    mockPathname = "/schools/college-vogt/classes/class-1/fil";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return new Response(
          JSON.stringify({
            assignments: [
              {
                classId: "class-1",
                className: "6eC",
                schoolYearId: "sy-1",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="TEACHER" schoolSlug="college-vogt" />);

    const menuButton = await screen.findByRole("button", {
      name: "Menu enseignant",
    });
    fireEvent.click(menuButton);

    expect(mockPush).toHaveBeenCalledWith("/schools/college-vogt/dashboard");
  });
});

describe("AppSidebar parent child links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockPathname = "/schools/college-vogt/dashboard";
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("shows the timetable link in English in child menu for parent when the locale is set to en", async () => {
    useLocaleStore.setState({ locale: "en" });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Lisa",
                lastName: "MBELE",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const childButton = await screen.findByRole("button", {
      name: "MBELE Lisa",
    });
    fireEvent.click(childButton);

    const timetableLink = await screen.findByRole("link", {
      name: "Timetable",
    });
    expect(timetableLink.getAttribute("href")).toBe(
      "/schools/college-vogt/emploi-du-temps?childId=child-1",
    );
    expect(
      screen.queryByRole("link", { name: "Emploi du temps" }),
    ).not.toBeInTheDocument();
  });

  it("shows an emploi du temps link in child menu for parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Lisa",
                lastName: "MBELE",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const childButton = await screen.findByRole("button", {
      name: "MBELE Lisa",
    });
    fireEvent.click(childButton);

    const timetableLink = await screen.findByRole("link", {
      name: "Emploi du temps",
    });
    expect(timetableLink.getAttribute("href")).toBe(
      "/schools/college-vogt/emploi-du-temps?childId=child-1",
    );
  });

  it("keeps parent sections in accordion mode", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Lisa",
                lastName: "MBELE",
              },
              {
                id: "child-2",
                firstName: "Paul",
                lastName: "MBELE",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    expect(
      await screen.findByRole("navigation", { name: "Menu parent" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "MBELE Lisa" }));
    expect(
      screen.queryByRole("navigation", { name: "Menu parent" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Menu MBELE Lisa" }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "MBELE Paul" }));
    expect(
      screen.queryByRole("navigation", { name: "Menu MBELE Lisa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Menu MBELE Paul" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "MON ESPACE FAMILLE" }));
    expect(
      screen.getByRole("navigation", { name: "Menu parent" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Menu MBELE Paul" }),
    ).not.toBeInTheDocument();
  });

  it("ouvre directement la navigation de l'enfant actif quand l'URL est dans son contexte", async () => {
    mockPathname = "/schools/college-vogt/children/child-1/vie-scolaire";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Lisa",
                lastName: "MBELE",
                currentEnrollment: {
                  class: {
                    name: "6e C",
                  },
                },
              },
              {
                id: "child-2",
                firstName: "Paul",
                lastName: "MBELE",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    expect(
      await screen.findByRole("navigation", { name: "Menu MBELE Lisa" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Menu parent" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vie scolaire" })).toHaveAttribute(
      "href",
      "/schools/college-vogt/children/child-1/vie-scolaire",
    );
  });

  it("revient au dashboard parent quand on clique sur MON ESPACE FAMILLE depuis le contexte enfant", async () => {
    mockPathname = "/schools/college-vogt/children/child-1/vie-scolaire";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Lisa",
                lastName: "MBELE",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    await screen.findByRole("navigation", { name: "Menu MBELE Lisa" });

    fireEvent.click(screen.getByRole("button", { name: "MON ESPACE FAMILLE" }));

    expect(mockPush).toHaveBeenCalledWith("/schools/college-vogt/dashboard");
  });

  it("keeps the logout action available at the bottom of the mobile family menu", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(
          JSON.stringify({
            linkedStudents: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    const onLogoutClick = vi.fn();

    render(
      <AppSidebar
        role="PARENT"
        schoolSlug="college-vogt"
        onLogoutClick={onLogoutClick}
      />,
    );

    fireEvent.click(await screen.findByTestId("sidebar-logout-button"));

    expect(onLogoutClick).toHaveBeenCalledTimes(1);
  });
});

describe("AppSidebar badges", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockPathname = "/schools/college-vogt/dashboard";
    window.localStorage.clear();
    document.cookie = "";
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  function mockFetchWith(unreadSummary: unknown, meBody: unknown = {}) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/me/unread-summary")) {
        return new Response(JSON.stringify(unreadSummary), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/schools/college-vogt/me")) {
        return new Response(JSON.stringify(meBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  it("shows the feed and messaging badges for a parent with no linked children", async () => {
    mockFetchWith(
      {
        messagesUnread: 5,
        feedUnread: 2,
        ticketsNeedingResponse: 0,
        ticketsUnreadReplies: 0,
        children: [],
        teacherClasses: [],
        total: 7,
      },
      { linkedStudents: [] },
    );

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const feedLink = await screen.findByRole("link", {
      name: /Fil d'actualite/,
    });
    expect(feedLink).toHaveTextContent("2");

    const messagingLink = await screen.findByRole("link", {
      name: /Messagerie/,
    });
    expect(messagingLink).toHaveTextContent("5");
  });

  it("does not render a badge when a count is zero", async () => {
    mockFetchWith(
      {
        messagesUnread: 0,
        feedUnread: 0,
        ticketsNeedingResponse: 0,
        ticketsUnreadReplies: 0,
        children: [],
        teacherClasses: [],
        total: 0,
      },
      { linkedStudents: [] },
    );

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const feedLink = await screen.findByRole("link", {
      name: /Fil d'actualite/,
    });
    expect(feedLink.textContent).toBe("Fil d'actualite");
  });

  it("shows per-child homework, notes and discipline badges for a parent", async () => {
    mockFetchWith(
      {
        messagesUnread: 0,
        feedUnread: 0,
        ticketsNeedingResponse: 0,
        ticketsUnreadReplies: 0,
        children: [
          {
            studentId: "child-1",
            firstName: "Lisa",
            lastName: "MBELE",
            homeworkPending: 3,
            notesUnread: 4,
            disciplineUnread: 1,
          },
        ],
        teacherClasses: [],
        total: 8,
      },
      {
        linkedStudents: [
          { id: "child-1", firstName: "Lisa", lastName: "MBELE" },
        ],
      },
    );

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    fireEvent.click(await screen.findByRole("button", { name: "MBELE Lisa" }));

    const vieScolaireLink = await screen.findByRole("link", {
      name: /Vie scolaire/,
    });
    await waitFor(() => expect(vieScolaireLink).toHaveTextContent("1"));

    const notesLink = screen.getByRole("link", { name: /Notes/ });
    await waitFor(() => expect(notesLink).toHaveTextContent("4"));

    const cahierLink = screen.getByRole("link", { name: /Cahier de texte/ });
    await waitFor(() => expect(cahierLink).toHaveTextContent("3"));
  });

  it("shows the evaluations-to-grade badge per class for a teacher", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/me/unread-summary")) {
        return new Response(
          JSON.stringify({
            messagesUnread: 0,
            feedUnread: 0,
            ticketsNeedingResponse: 0,
            ticketsUnreadReplies: 0,
            children: [],
            teacherClasses: [
              { classId: "class-1", className: "6eC", evaluationsToGrade: 6 },
            ],
            total: 6,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return new Response(
          JSON.stringify({
            assignments: [
              { classId: "class-1", className: "6eC", schoolYearId: "sy-1" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="TEACHER" schoolSlug="college-vogt" />);

    fireEvent.click(await screen.findByRole("button", { name: "6eC" }));

    const notesLink = await screen.findByRole("link", { name: /Notes/ });
    await waitFor(() => expect(notesLink).toHaveTextContent("6"));
  });

  it("shows the combined tickets badge at the bottom of the sidebar", async () => {
    mockFetchWith(
      {
        messagesUnread: 0,
        feedUnread: 0,
        ticketsNeedingResponse: 2,
        ticketsUnreadReplies: 3,
        children: [],
        teacherClasses: [],
        total: 5,
      },
      { linkedStudents: [] },
    );

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const ticketsLink = await screen.findByTestId("sidebar-tickets-link");
    expect(ticketsLink).toHaveTextContent("5");
  });

  it("falls back to the last cached summary when the network request fails", async () => {
    window.localStorage.setItem(
      "scolive:badges:college-vogt",
      JSON.stringify({
        messagesUnread: 9,
        feedUnread: 0,
        ticketsNeedingResponse: 0,
        ticketsUnreadReplies: 0,
        children: [],
        teacherClasses: [],
        total: 9,
      }),
    );

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<AppSidebar role="PARENT" schoolSlug="college-vogt" />);

    const messagingLink = await screen.findByRole("link", {
      name: /Messagerie/,
    });
    expect(messagingLink).toHaveTextContent("9");
  });
});

describe("AppSidebar messaging link for platform roles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockPathname = "/acceuil";
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  function mockUnreadCount(unread: number) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/admin/messages/unread-count")) {
        return new Response(JSON.stringify({ unread }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  it("shows a Messagerie link pointing to /messagerie for SUPER_ADMIN", async () => {
    mockUnreadCount(0);

    render(<AppSidebar role="SUPER_ADMIN" />);

    const link = await screen.findByRole("link", { name: /Messagerie/ });
    expect(link.getAttribute("href")).toBe("/messagerie");
  });

  it("shows a Messagerie link for ADMIN with the aggregated unread badge", async () => {
    mockUnreadCount(4);

    render(<AppSidebar role="ADMIN" />);

    const link = await screen.findByRole("link", { name: /Messagerie/ });
    expect(link).toHaveTextContent("4");
  });

  it("does not show a Messagerie link for SALES", async () => {
    mockUnreadCount(0);

    render(<AppSidebar role="SALES" />);

    await screen.findByRole("link", { name: /Ecoles|Schools/ });
    expect(
      screen.queryByRole("link", { name: /Messagerie/ }),
    ).not.toBeInTheDocument();
  });

  it("does not show a Messagerie link for SUPPORT", async () => {
    mockUnreadCount(0);

    render(<AppSidebar role="SUPPORT" />);

    await screen.findByRole("link", { name: /Ecoles|Schools/ });
    expect(
      screen.queryByRole("link", { name: /Messagerie/ }),
    ).not.toBeInTheDocument();
  });
});
