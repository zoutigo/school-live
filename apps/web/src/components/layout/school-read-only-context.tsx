"use client";

import { createContext, useContext } from "react";

/**
 * Vrai quand l'utilisateur connecté est en lecture seule dans l'école (élève
 * exclu, ou parent dont tous les enfants sont exclus). Les modules s'en servent
 * pour désactiver leurs actions d'écriture ; le serveur reste l'autorité.
 */
export const SchoolReadOnlyContext = createContext(false);

export function useSchoolReadOnly(): boolean {
  return useContext(SchoolReadOnlyContext);
}
