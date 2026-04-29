import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

let mockPathname = "/schools/college-vogt/dashboard";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("../messaging/messaging-api", () => ({
  getSchoolMessagesUnreadCount: vi.fn(async () => 0),
}));

describe("AppSidebar teacher class links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
    mockPathname = "/schools/college-vogt/dashboard";
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
  });

  it("shows an emploi du temps link in child menu for parent", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
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

      if (url.includes("/schools/college-vogt/me")) {
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

      if (url.includes("/schools/college-vogt/me")) {
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

      if (url.includes("/schools/college-vogt/me")) {
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

      if (url.includes("/schools/college-vogt/me")) {
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
