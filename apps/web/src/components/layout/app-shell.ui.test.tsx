import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./app-sidebar", () => ({
  AppSidebar: () => <nav aria-label="Sidebar">Sidebar</nav>,
}));

describe("AppShell header scroll behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
