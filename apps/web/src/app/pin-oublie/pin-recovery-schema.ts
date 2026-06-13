import { z } from "zod";

export type RecoveryQuestion = {
  key:
    | "MOTHER_MAIDEN_NAME"
    | "FATHER_FIRST_NAME"
    | "FAVORITE_SPORT"
    | "FAVORITE_TEACHER"
    | "BIRTH_CITY"
    | "CHILDHOOD_NICKNAME"
    | "FAVORITE_BOOK";
  label: string;
};

export const requestPinRecoverySchema = z
  .object({
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Renseignez un email ou un telephone.",
      });
    }
    if (value.email && !z.string().email().safeParse(value.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Adresse email invalide.",
      });
    }
    if (value.phone && !/^\d{9}$/.test(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Numero invalide (9 chiffres attendus).",
      });
    }
  });

export function buildVerifyPinRecoverySchema(questions: RecoveryQuestion[]) {
  return z
    .object({
      birthDate: z.string().min(1, "La date de naissance est obligatoire."),
      answers: z.record(z.string(), z.string().trim().min(2)),
    })
    .superRefine((value, ctx) => {
      for (const question of questions) {
        const answer = value.answers[question.key] ?? "";
        if (answer.trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["answers", question.key],
            message: `Reponse obligatoire: ${question.label}`,
          });
        }
      }
    });
}

export const completePinRecoverySchema = z
  .object({
    recoveryToken: z
      .string()
      .trim()
      .min(16, "Session de recuperation invalide."),
    newPin: z
      .string()
      .regex(/^\d{6}$/, "Le PIN doit contenir exactement 6 chiffres."),
    confirmPin: z.string().min(1, "Confirmez le PIN."),
  })
  .refine((value) => value.newPin === value.confirmPin, {
    path: ["confirmPin"],
    message: "La confirmation ne correspond pas au PIN.",
  });

export function createPinRecoverySchemas(t: (key: string) => string) {
  const requestPinRecoverySchema = z
    .object({
      email: z.string().trim().optional().default(""),
      phone: z.string().trim().optional().default(""),
    })
    .superRefine((value, ctx) => {
      if (!value.email && !value.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: t("recovery.pin.errors.emailOrPhoneRequired"),
        });
      }
      if (value.email && !z.string().email().safeParse(value.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: t("recovery.password.errors.invalidEmail"),
        });
      }
      if (value.phone && !/^\d{9}$/.test(value.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: t("recovery.pin.errors.invalidPhone"),
        });
      }
    });

  function buildVerifyPinRecoverySchema(questions: RecoveryQuestion[]) {
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

  const completePinRecoverySchema = z
    .object({
      recoveryToken: z
        .string()
        .trim()
        .min(16, t("recovery.pin.errors.invalidSession")),
      newPin: z.string().regex(/^\d{6}$/, t("recovery.pin.errors.pinFormat")),
      confirmPin: z
        .string()
        .min(1, t("recovery.pin.errors.confirmPinRequired")),
    })
    .refine((value) => value.newPin === value.confirmPin, {
      path: ["confirmPin"],
      message: t("recovery.pin.errors.pinConfirmMismatch"),
    });

  return {
    requestPinRecoverySchema,
    buildVerifyPinRecoverySchema,
    completePinRecoverySchema,
  };
}
