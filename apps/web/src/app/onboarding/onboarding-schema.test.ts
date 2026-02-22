import { describe, expect, it } from "vitest";
import {
  buildRecoveryRows,
  step1Schema,
  step2Schema,
  step3Schema,
} from "./onboarding-schema";

describe("onboarding-schema", () => {
  it("validates step 1 with valid passwords", () => {
    const parsed = step1Schema.safeParse({
      email: "parent@example.test",
      temporaryPassword: "TempPass11",
      newPassword: "StrongPass9",
      confirmPassword: "StrongPass9",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects step 1 when confirmation does not match", () => {
    const parsed = step1Schema.safeParse({
      email: "parent@example.test",
      temporaryPassword: "TempPass11",
      newPassword: "StrongPass9",
      confirmPassword: "OtherPass9",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("confirmation");
    }
  });

  it("validates step 2 profile fields including gender", () => {
    const parsed = step2Schema.safeParse({
      firstName: "Lisa",
      lastName: "Mbele",
      gender: "F",
      birthDate: "1990-01-10",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects step 2 when gender is missing", () => {
    const parsed = step2Schema.safeParse({
      firstName: "Lisa",
      lastName: "Mbele",
      gender: "",
      birthDate: "1990-01-10",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects step 3 when parent misses class/student", () => {
    const parsed = step3Schema.safeParse({
      selectedQuestions: ["FAVORITE_BOOK", "BIRTH_CITY", "FAVORITE_SPORT"],
      answers: {
        FAVORITE_BOOK: "Livre",
        BIRTH_CITY: "Yaounde",
        FAVORITE_SPORT: "Volley",
      },
      isParent: true,
      parentClassId: "",
      parentStudentId: "",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      expect(messages.join(" ")).toContain("classe");
      expect(messages.join(" ")).toContain("enfant");
    }
  });

  it("builds recovery rows from selected questions", () => {
    const rows = buildRecoveryRows(
      ["FAVORITE_BOOK", "BIRTH_CITY", "FAVORITE_SPORT"],
      {
        FAVORITE_BOOK: "Le lion",
        BIRTH_CITY: "Douala",
        FAVORITE_SPORT: "Football",
      },
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      questionKey: "FAVORITE_BOOK",
      answer: "Le lion",
    });
  });
});
