import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

const unreadCountMock = vi.fn();
const pushMock = vi.fn();
let pathnameMock = "/schools/college-vogt/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../messaging/messaging-api", () => ({
  getSchoolMessagesUnreadCount: (...args: unknown[]) =>
    unreadCountMock(...args),
}));

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => null,
}));

describe("AppSidebar parent accordion", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    unreadCountMock.mockReset();
    unreadCountMock.mockResolvedValue(0);
    pushMock.mockReset();
    pathnameMock = "/schools/college-vogt/dashboard";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          role: "PARENT",
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
      ),
    );
  });

  it("keeps only one parent submenu open at a time", async () => {
    render(<AppSidebar schoolSlug="college-vogt" role="PARENT" />);

    const childToggle = await screen.findByRole("button", {
      name: /MBELE Lisa/i,
    });

    expect(screen.getByLabelText("Menu parent")).toBeInTheDocument();
    expect(screen.queryByLabelText("Menu MBELE Lisa")).not.toBeInTheDocument();

    fireEvent.click(childToggle);

    await waitFor(() => {
      expect(screen.queryByLabelText("Menu parent")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Menu MBELE Lisa")).toBeInTheDocument();
  });

  it("shows child timetable link in student submenu", async () => {
    render(<AppSidebar schoolSlug="college-vogt" role="PARENT" />);

    const childToggle = await screen.findByRole("button", {
      name: /MBELE Lisa/i,
    });
    fireEvent.click(childToggle);

    const childMenu = await screen.findByLabelText("Menu MBELE Lisa");
    const timetableLink = within(childMenu).getByRole("link", {
      name: "Emploi du temps",
    });

    expect(timetableLink).toHaveAttribute(
      "href",
      "/schools/college-vogt/emploi-du-temps?childId=child-1",
    );
  });
});
