import { z } from "zod";

export type RecoveryQuestion = {
  key: string;
  label: string;
};

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function createUsernameRecoverySchemas(t: (key: string) => string) {
  const step1Schema = z.object({
    username: z
      .string()
      .trim()
      .min(3, t("recovery.username.errors.usernameInvalid")),
  });

  function buildStep2Schema(questions: RecoveryQuestion[]) {
    return z
      .object({
        birthDate: z
          .string()
          .min(1, t("recovery.password.errors.birthDateRequired")),
        answers: z.record(z.string(), z.string().trim().min(2)),
      })
      .superRefine((value, ctx) => {
        for (const question of questions) {
          const answer = value.answers[question.key] ?? "";
          if (answer.trim().length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["answers", question.key],
              message: `${t("recovery.password.errors.answerRequiredPrefix")}: ${question.label}`,
            });
          }
        }
      });
  }

  const step3Schema = z
    .object({
      newPassword: z
        .string()
        .min(8, t("recovery.password.errors.passwordMinLength"))
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          t("recovery.password.errors.passwordComplexity"),
        ),
      confirmPassword: z
        .string()
        .min(1, t("recovery.password.errors.confirmPasswordRequired")),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: t("recovery.password.errors.passwordConfirmMismatch"),
    });

  return { step1Schema, buildStep2Schema, step3Schema };
}
