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

    const submitButton = screen.getByRole("button", {
      name: "Activer mon compte",
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url).includes("/auth/activation/complete") &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/activation/complete"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "sso.user@example.test",
            phone: undefined,
            schoolSlug: "college-vogt",
            confirmedPhone: "612345678",
            newPin: "123456",
            activationCode: "A1B2C3D4",
            initialPin: undefined,
          }),
        }),
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
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(
        screen.getByText("Le nouveau PIN doit contenir exactement 6 chiffres."),
      ).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/auth/activation/complete"),
      expect.anything(),
    );
  });

  it("shows inline activation method error until activation code or initial PIN is provided", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
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
    const initialPinInput = await screen.findByLabelText(
      "PIN initial (optionnel)",
    );
    const newPinInput = await screen.findByLabelText(
      "Nouveau PIN (6 chiffres)",
    );
    const submitButton = screen.getByRole("button", {
      name: "Activer mon compte",
    });

    fireEvent.change(confirmedPhoneInput, {
      target: { value: "+237612345678" },
    });
    fireEvent.change(newPinInput, {
      target: { value: "123456" },
    });
    fireEvent.change(activationCodeInput, {
      target: { value: "A" },
    });
    fireEvent.change(activationCodeInput, {
      target: { value: "" },
    });
    fireEvent.blur(activationCodeInput);

    await waitFor(() => {
      expect(
        screen.getAllByText(
          "Saisissez un code d activation ou votre PIN initial.",
        ).length,
      ).toBeGreaterThanOrEqual(1);
      expect(submitButton).toBeDisabled();
    });

    fireEvent.change(initialPinInput, {
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Saisissez un code d activation ou votre PIN initial.",
        ),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });
});
