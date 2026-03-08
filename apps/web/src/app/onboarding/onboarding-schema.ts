import { z } from "zod";
import type { QuestionKey } from "./onboarding-store";

const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PHONE_PIN_REGEX = /^\d{6}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12
  ) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export const step1Schema = z
  .object({
    email: z.string().trim().email("Lien invalide: email manquant."),
    temporaryPassword: z
      .string()
      .trim()
      .min(8, "Le mot de passe provisoire est obligatoire."),
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

export const step1PhoneSchema = z.object({
  email: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.length === 0 ||
        z.string().email("Adresse email invalide.").safeParse(value).success,
      "Adresse email invalide.",
    ),
  setupToken: z.string().trim().min(1, "Jeton d onboarding manquant."),
});

export const step2Schema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
  gender: z.enum(["M", "F", "OTHER"], {
    message: "Le genre est obligatoire.",
  }),
  birthDate: z
    .string()
    .min(1, "La date de naissance est obligatoire.")
    .refine((value) => isValidIsoDate(value), {
      message: "Format de date invalide (aaaa-mm-jj).",
    })
    .refine((value) => {
      if (!isValidIsoDate(value)) {
        return false;
      }
      const [yearText, monthText, dayText] = value.split("-");
      const date = new Date(
        Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)),
      );
      const today = new Date();
      const endOfTodayUtc = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
      return date <= endOfTodayUtc;
    }, "La date de naissance ne peut pas etre dans le futur."),
});

export const step3PinSchema = z
  .object({
    newPin: z
      .string()
      .trim()
      .regex(PHONE_PIN_REGEX, "Le nouveau PIN doit contenir 6 chiffres."),
    confirmPin: z.string().trim().min(1, "Confirmez le nouveau PIN."),
  })
  .superRefine((value, ctx) => {
    if (value.newPin !== value.confirmPin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPin"],
        message: "La confirmation ne correspond pas au nouveau PIN.",
      });
    }
  });

export const step4Schema = z
  .object({
    selectedQuestions: z
      .array(
        z.enum([
          "MOTHER_MAIDEN_NAME",
          "FATHER_FIRST_NAME",
          "FAVORITE_SPORT",
          "FAVORITE_TEACHER",
          "BIRTH_CITY",
          "CHILDHOOD_NICKNAME",
          "FAVORITE_BOOK",
        ]),
      )
      .length(3, "Choisissez exactement 3 questions.")
      .refine((rows) => new Set(rows).size === 3, {
        message: "Les 3 questions doivent etre differentes.",
      }),
    answers: z.record(z.string(), z.string().trim().min(2)),
    isParent: z.boolean(),
    parentClassId: z.string().optional(),
    parentStudentId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    for (const questionKey of value.selectedQuestions) {
      const answer = value.answers[questionKey];
      if (!answer || answer.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers", questionKey],
          message: "Chaque reponse doit contenir au moins 2 caracteres.",
        });
      }
    }

    if (value.isParent && !value.parentClassId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentClassId"],
        message: "La classe de votre enfant est obligatoire.",
      });
    }

    if (value.isParent && !value.parentStudentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentStudentId"],
        message: "Le nom de votre enfant est obligatoire.",
      });
    }
  });

export function buildRecoveryRows(
  selectedQuestions: QuestionKey[],
  answers: Record<string, string>,
) {
  return selectedQuestions.map((questionKey) => ({
    questionKey,
    answer: answers[questionKey] ?? "",
  }));
}
