import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/schools/college-vogt/dashboard",
}));

vi.mock("../messaging/messaging-api", () => ({
  getSchoolMessagesUnreadCount: vi.fn(async () => 0),
}));

describe("AppSidebar teacher class links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an emploi du temps link per class section for teacher", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/grades/context")) {
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
});

describe("AppSidebar parent child links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
