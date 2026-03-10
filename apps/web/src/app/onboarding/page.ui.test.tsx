import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

const pushMock = vi.fn();
let searchParamsMock = new URLSearchParams(
  "token=setup-token&phone=610101034&schoolSlug=college-vogt",
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => searchParamsMock,
}));

describe("OnboardingPage phone PIN step", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    searchParamsMock = new URLSearchParams(
      "token=setup-token&phone=610101034&schoolSlug=college-vogt",
    );
  });

  it("uses new/confirm pin only with inline validation and disabled continue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/onboarding/options")) {
        return new Response(
          JSON.stringify({
            schoolSlug: "college-vogt",
            schoolRoles: ["TEACHER"],
            questions: [
              { key: "FAVORITE_BOOK", label: "Livre prefere" },
              { key: "BIRTH_CITY", label: "Ville de naissance" },
              { key: "FAVORITE_SPORT", label: "Sport prefere" },
            ],
            classes: [],
            students: [],
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

    render(<OnboardingPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Continuer" }));
    await screen.findByText("Prenom");

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Paul" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "MBELE" },
    });
    fireEvent.change(screen.getByLabelText("Genre"), {
      target: { value: "M" },
    });
    const birthDateInput = document.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement | null;
    expect(birthDateInput).toBeTruthy();
    fireEvent.change(birthDateInput!, {
      target: { value: "2999-01-10" },
    });
    fireEvent.blur(birthDateInput!);
    expect(
      await screen.findByText(
        "La date de naissance ne peut pas etre dans le futur.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();

    fireEvent.change(birthDateInput!, {
      target: { value: "1990-01-10" },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(await screen.findByText("Etape 3 / 4")).toBeInTheDocument();
    expect(screen.queryByText("PIN actuel")).not.toBeInTheDocument();

    const continueButton = screen.getByRole("button", { name: "Continuer" });
    expect(continueButton).toBeDisabled();

    const newPinInput = screen
      .getByText("Nouveau PIN")
      .closest("label")
      ?.querySelector("input");
    const confirmPinInput = screen
      .getByText("Confirmer PIN")
      .closest("label")
      ?.querySelector("input");
    expect(newPinInput).toBeTruthy();
    expect(confirmPinInput).toBeTruthy();

    fireEvent.change(newPinInput!, {
      target: { value: "654321" },
    });
    fireEvent.change(confirmPinInput!, {
      target: { value: "111111" },
    });
    fireEvent.blur(confirmPinInput!);

    expect(
      await screen.findByText(
        "La confirmation ne correspond pas au nouveau PIN.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(confirmPinInput!, {
      target: { value: "654321" },
    });
    fireEvent.blur(confirmPinInput!);

    await waitFor(() => {
      expect(
        screen.queryByText("La confirmation ne correspond pas au nouveau PIN."),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
  });
});
