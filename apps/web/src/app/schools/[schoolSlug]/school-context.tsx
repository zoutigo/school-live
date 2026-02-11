"use client";

import { createContext, useContext, type ReactNode } from "react";

type SchoolBranding = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

const SchoolContext = createContext<SchoolBranding | null>(null);

export function SchoolProvider({
  branding,
  children,
}: {
  branding: SchoolBranding;
  children: ReactNode;
}) {
  return (
    <SchoolContext.Provider value={branding}>{children}</SchoolContext.Provider>
  );
}

export function useSchool() {
  const value = useContext(SchoolContext);

  if (!value) {
    throw new Error("useSchool must be used inside SchoolProvider");
  }

  return value;
}
