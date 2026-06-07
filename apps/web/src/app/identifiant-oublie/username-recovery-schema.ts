import { z } from "zod";

export type RecoveryQuestion = {
  key: string;
  label: string;
};

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const step1Schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Identifiant invalide (3 caracteres minimum)."),
});

export function buildStep2Schema(questions: RecoveryQuestion[]) {
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

export const step3Schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit faire au moins 8 caracteres.")
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "La confirmation ne correspond pas au nouveau mot de passe.",
  });
