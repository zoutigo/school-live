"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type MeResponse = {
  firstName: string;
  lastName: string;
  role: Role;
};

type Props = {
  schoolSlug?: string | null;
  schoolName: string;
  children: ReactNode;
};

export function AppShell({ schoolSlug, schoolName, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    setMe((await response.json()) as MeResponse);
  }

  const role: Role = me?.role ?? "SCHOOL_ADMIN";
  const userInitials = useMemo(() => {
    const first = me?.firstName?.[0] ?? "S";
    const last = me?.lastName?.[0] ?? "L";
    return `${first}${last}`.toUpperCase();
  }, [me?.firstName, me?.lastName]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        schoolName={schoolName}
        role={role}
        userInitials={userInitials}
        onToggleMenu={() => setMobileOpen((prev) => !prev)}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden md:block">
          <AppSidebar schoolSlug={schoolSlug} role={role} />
        </div>

        {mobileOpen ? (
          <div
            className="absolute inset-0 z-20 flex md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label="Fermer le menu"
              className="h-full flex-1 bg-text-primary/20"
              onClick={() => setMobileOpen(false)}
            />
            <AppSidebar
              schoolSlug={schoolSlug}
              role={role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
