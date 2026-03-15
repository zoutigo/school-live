import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";
import { useOnboardingStore } from "./onboarding-store";

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
    useOnboardingStore.getState().reset();
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
    await screen.findByText("Votre prenom");

    fireEvent.change(screen.getByLabelText("Votre prenom"), {
      target: { value: "Paul" },
    });
    fireEvent.change(screen.getByLabelText("Votre nom"), {
      target: { value: "MBELE" },
    });
    fireEvent.change(screen.getByLabelText("Votre genre"), {
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

  it("shows inline email validation on step 1 token flow before enabling continue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/onboarding/options")) {
        return new Response(
          JSON.stringify({
            schoolSlug: "college-vogt",
            schoolRoles: ["TEACHER"],
            questions: [],
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

    const continueButton = await screen.findByRole("button", {
      name: "Continuer",
    });
    expect(continueButton).toBeEnabled();

    const emailInput = screen.getByLabelText("Email (optionnel)");

    fireEvent.change(emailInput, {
      target: { value: "bad-email" },
    });

    await waitFor(() => {
      expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
      expect(continueButton).toBeDisabled();
    });

    fireEvent.change(emailInput, {
      target: { value: "teacher@example.test" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Adresse email invalide."),
      ).not.toBeInTheDocument();
      expect(continueButton).toBeEnabled();
    });
  });

  it("shows a success toast after successful onboarding completion", async () => {
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
      if (url.includes("/auth/onboarding/complete")) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<OnboardingPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Continuer" }));
    await screen.findByText("Votre prenom");

    fireEvent.change(screen.getByLabelText("Votre prenom"), {
      target: { value: "Paul" },
    });
    fireEvent.change(screen.getByLabelText("Votre nom"), {
      target: { value: "MBELE" },
    });
    fireEvent.change(screen.getByLabelText("Votre genre"), {
      target: { value: "M" },
    });
    fireEvent.change(
      screen.getByLabelText("Votre date de naissance") as HTMLInputElement,
      {
        target: { value: "1990-01-10" },
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Etape 3 / 4");

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
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Choisissez 3 questions de recuperation");

    fireEvent.click(screen.getByText("Livre prefere"));
    fireEvent.click(screen.getByText("Ville de naissance"));
    fireEvent.click(screen.getByText("Sport prefere"));

    fireEvent.change(screen.getByLabelText("Livre prefere"), {
      target: { value: "Le Petit Prince" },
    });
    fireEvent.change(screen.getByLabelText("Ville de naissance"), {
      target: { value: "Douala" },
    });
    fireEvent.change(screen.getByLabelText("Sport prefere"), {
      target: { value: "Football" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Finaliser l'activation",
    });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("success-redirect-toast")).toHaveTextContent(
        "Enregistrement termine",
      );
    });
  });

  it("clears stale recovery answers from a previous onboarding session", async () => {
    useOnboardingStore.setState({
      selectedQuestions: [
        "MOTHER_MAIDEN_NAME",
        "FATHER_FIRST_NAME",
        "BIRTH_CITY",
      ],
      answers: {
        MOTHER_MAIDEN_NAME: "minfoumou",
        FATHER_FIRST_NAME: "roger",
        BIRTH_CITY: "yaounde",
      },
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/onboarding/options")) {
        return new Response(
          JSON.stringify({
            schoolSlug: "college-vogt",
            schoolRoles: ["TEACHER"],
            questions: [
              {
                key: "MOTHER_MAIDEN_NAME",
                label: "Nom de jeune fille de votre mere",
              },
              { key: "FATHER_FIRST_NAME", label: "Prenom de votre pere" },
              { key: "BIRTH_CITY", label: "Votre ville de naissance" },
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
    await screen.findByText("Votre prenom");

    fireEvent.change(screen.getByLabelText("Votre prenom"), {
      target: { value: "Paul" },
    });
    fireEvent.change(screen.getByLabelText("Votre nom"), {
      target: { value: "MBELE" },
    });
    fireEvent.change(screen.getByLabelText("Votre genre"), {
      target: { value: "M" },
    });
    fireEvent.change(screen.getByLabelText("Votre date de naissance"), {
      target: { value: "1990-01-10" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Etape 3 / 4");

    const newPinInput = screen
      .getByText("Nouveau PIN")
      .closest("label")
      ?.querySelector("input");
    const confirmPinInput = screen
      .getByText("Confirmer PIN")
      .closest("label")
      ?.querySelector("input");

    expect(newPinInput).not.toBeNull();
    expect(confirmPinInput).not.toBeNull();

    fireEvent.change(newPinInput as HTMLInputElement, {
      target: { value: "654321" },
    });
    fireEvent.change(confirmPinInput as HTMLInputElement, {
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Choisissez 3 questions de recuperation");

    expect(screen.queryByDisplayValue("minfoumou")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("roger")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("yaounde")).not.toBeInTheDocument();
  });
});
