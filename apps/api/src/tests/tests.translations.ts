import type { AuthenticatedUser } from "../auth/auth.types.js";

export type TestsLocale = "fr" | "en";

const fr = {
  "tests.errors.testerOnly":
    "Ce module est reserve aux utilisateurs marques comme testeurs.",
  "tests.errors.campaignNotFound": "Campagne de tests introuvable.",
  "tests.errors.testCaseNotFound": "Test introuvable.",
  "tests.errors.executionResultRequired":
    "Le resultat du test est obligatoire.",
  "tests.errors.executionStatusInvalid": "Le statut du test est invalide.",
  "tests.errors.stepsInvalid":
    "Les etapes du test doivent etre une liste de textes.",
  "tests.errors.rolesInvalid":
    "Les roles cibles doivent etre une liste de roles valides.",
  "tests.errors.attachmentsMissing":
    "Aucune capture n'a ete recue pour ce resultat de test.",
};

const en = {
  "tests.errors.testerOnly":
    "This module is restricted to users marked as testers.",
  "tests.errors.campaignNotFound": "Test campaign not found.",
  "tests.errors.testCaseNotFound": "Test case not found.",
  "tests.errors.executionResultRequired": "Test result is required.",
  "tests.errors.executionStatusInvalid": "Invalid test status.",
  "tests.errors.stepsInvalid": "Test steps must be a list of text values.",
  "tests.errors.rolesInvalid": "Target roles must be a list of valid roles.",
  "tests.errors.attachmentsMissing":
    "No screenshot was received for this test result.",
};

export function testsLocaleFromUser(
  user?: AuthenticatedUser | null,
): TestsLocale {
  return user?.preferredLocale === "EN" ? "en" : "fr";
}

export function translateTestsError(locale: TestsLocale, key: keyof typeof fr) {
  return (locale === "en" ? en : fr)[key];
}
