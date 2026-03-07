import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingAccountClient } from "./pending-account-client";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("PendingAccountClient UI", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("activates account with activation code and redirects to school login", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            activationRequired: true,
            schoolSlug: "college-vogt",
            maskedEmail: "s***r@example.test",
            missingFields: [],
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            schoolSlug: "college-vogt",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(
      <PendingAccountClient
        initialEmail="sso.user@example.test"
        initialSchoolSlug="college-vogt"
      />,
    );

    const confirmedPhoneInput =
      await screen.findByLabelText("Telephone confirme");
    const activationCodeInput = await screen.findByLabelText(
      "Code d activation (optionnel)",
    );
    const newPinInput = await screen.findByLabelText(
      "Nouveau PIN (6 chiffres)",
    );

    fireEvent.change(confirmedPhoneInput, {
      target: { value: "+237612345678" },
    });
    fireEvent.change(activationCodeInput, {
      target: { value: "A1B2C3D4" },
    });
    fireEvent.change(newPinInput, {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Activer mon compte" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/activation/complete"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(
      () => {
        expect(replaceMock).toHaveBeenCalledWith("/schools/college-vogt/login");
      },
      { timeout: 2500 },
    );
  });

  it("shows validation error when PIN is not 6 digits", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          activationRequired: true,
          schoolSlug: "college-vogt",
          maskedEmail: "s***r@example.test",
          missingFields: [],
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <PendingAccountClient
        initialEmail="sso.user@example.test"
        initialSchoolSlug="college-vogt"
      />,
    );

    const confirmedPhoneInput =
      await screen.findByLabelText("Telephone confirme");
    const activationCodeInput = await screen.findByLabelText(
      "Code d activation (optionnel)",
    );
    const newPinInput = await screen.findByLabelText(
      "Nouveau PIN (6 chiffres)",
    );

    fireEvent.change(confirmedPhoneInput, {
      target: { value: "+237612345678" },
    });
    fireEvent.change(activationCodeInput, {
      target: { value: "A1B2C3D4" },
    });
    fireEvent.change(newPinInput, {
      target: { value: "12345" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Activer mon compte",
    });
    expect(submitButton).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/auth/activation/complete"),
      expect.anything(),
    );
  });
});
