import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PasswordRequirementsHint,
  getPasswordChecks,
} from "./password-requirements-hint";

describe("PasswordRequirementsHint", () => {
  it("shows all rules and marks them as unmet for an empty password", () => {
    render(<PasswordRequirementsHint password="" />);

    expect(
      screen.getByText(
        "8 caracteres minimum, dont au moins 1 Maj, 1 Min, 1 Chiffre",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("• 8 caracteres minimum")).toBeInTheDocument();
    expect(screen.getByText("• Au moins 1 majuscule")).toBeInTheDocument();
    expect(screen.getByText("• Au moins 1 minuscule")).toBeInTheDocument();
    expect(screen.getByText("• Au moins 1 chiffre")).toBeInTheDocument();
  });

  it("marks all rules as met for a compliant password", () => {
    render(<PasswordRequirementsHint password="ValidPass1" />);

    expect(screen.getByText("✓ 8 caracteres minimum")).toBeInTheDocument();
    expect(screen.getByText("✓ Au moins 1 majuscule")).toBeInTheDocument();
    expect(screen.getByText("✓ Au moins 1 minuscule")).toBeInTheDocument();
    expect(screen.getByText("✓ Au moins 1 chiffre")).toBeInTheDocument();
  });
});

describe("getPasswordChecks", () => {
  it("returns a complete status map for partial passwords", () => {
    const checks = getPasswordChecks("abcdefg1");
    expect(checks).toEqual([
      { label: "8 caracteres minimum", ok: true },
      { label: "Au moins 1 majuscule", ok: false },
      { label: "Au moins 1 minuscule", ok: true },
      { label: "Au moins 1 chiffre", ok: true },
    ]);
  });
});
