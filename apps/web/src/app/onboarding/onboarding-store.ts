"use client";

import { create } from "zustand";

export type QuestionKey =
  | "MOTHER_MAIDEN_NAME"
  | "FATHER_FIRST_NAME"
  | "FAVORITE_SPORT"
  | "FAVORITE_TEACHER"
  | "BIRTH_CITY"
  | "CHILDHOOD_NICKNAME"
  | "FAVORITE_BOOK";

type OnboardingState = {
  email: string;
  schoolSlug: string;
  temporaryPassword: string;
  newPassword: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F" | "OTHER" | "";
  birthDate: string;
  parentClassId: string;
  parentStudentId: string;
  selectedQuestions: QuestionKey[];
  answers: Record<string, string>;
  setField: <K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K],
  ) => void;
  toggleQuestion: (question: QuestionKey) => void;
  setAnswer: (question: QuestionKey, value: string) => void;
  reset: () => void;
};

const initialState = {
  email: "",
  schoolSlug: "",
  temporaryPassword: "",
  newPassword: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  gender: "" as const,
  birthDate: "",
  parentClassId: "",
  parentStudentId: "",
  selectedQuestions: [] as QuestionKey[],
  answers: {} as Record<string, string>,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setField: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),
  toggleQuestion: (question) =>
    set((state) => {
      const checked = state.selectedQuestions.includes(question);
      if (checked) {
        return {
          ...state,
          selectedQuestions: state.selectedQuestions.filter(
            (entry) => entry !== question,
          ),
        };
      }

      if (state.selectedQuestions.length >= 3) {
        return state;
      }

      return {
        ...state,
        selectedQuestions: [...state.selectedQuestions, question],
      };
    }),
  setAnswer: (question, value) =>
    set((state) => ({
      ...state,
      answers: {
        ...state.answers,
        [question]: value,
      },
    })),
  reset: () =>
    set(() => ({
      ...initialState,
    })),
}));
