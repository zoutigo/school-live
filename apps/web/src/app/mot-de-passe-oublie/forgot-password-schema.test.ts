import { describe, expect, it } from "vitest";
import {
  buildVerifyResetSchema,
  completeResetSchema,
  requestResetSchema,
} from "./forgot-password-schema";

describe("forgot password schema", () => {
  it("validates email request step", () => {
    expect(
      requestResetSchema.safeParse({ email: "parent@example.test" }).success,
    ).toBe(true);
    expect(requestResetSchema.safeParse({ email: "bad-email" }).success).toBe(
      false,
    );
  });

  it("requires all recovery answers for verification", () => {
    const schema = buildVerifyResetSchema([
      { key: "BIRTH_CITY", label: "Ville de naissance" },
      { key: "FAVORITE_SPORT", label: "Sport prefere" },
      { key: "FATHER_FIRST_NAME", label: "Prenom du pere" },
    ]);

    const parsed = schema.safeParse({
      token: "0123456789abcdef",
      birthDate: "1990-01-01",
      answers: {
        BIRTH_CITY: "Douala",
        FAVORITE_SPORT: "",
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("validates final password step", () => {
    expect(
      completeResetSchema.safeParse({
        token: "0123456789abcdef",
        newPassword: "ValidPass9",
        confirmPassword: "ValidPass9",
      }).success,
    ).toBe(true);

    expect(
      completeResetSchema.safeParse({
        token: "0123456789abcdef",
        newPassword: "weak",
        confirmPassword: "weak",
      }).success,
    ).toBe(false);
  });
});
