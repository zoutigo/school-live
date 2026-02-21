"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import {
  extractAvailableRoles,
  isPlatformRole,
  type Role,
} from "../../lib/role-view";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type MeResponse = {
  firstName: string;
  lastName: string;
  role: Role | null;
  activeRole?: Role | null;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  memberships: Array<{
    schoolId: string;
    role:
      | "SCHOOL_ADMIN"
      | "SCHOOL_MANAGER"
      | "SUPERVISOR"
      | "SCHOOL_ACCOUNTANT"
      | "SCHOOL_STAFF"
      | "TEACHER"
      | "PARENT"
      | "STUDENT";
  }>;
};

type Props = {
  schoolSlug?: string | null;
  schoolName: string;
  children: ReactNode;
};

export function AppShell({ schoolSlug, schoolName, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [schoolBranding, setSchoolBranding] = useState<{
    name: string;
    logoUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      setSchoolBranding(null);
      return;
    }

    void loadSchoolBranding(schoolSlug);
  }, [schoolSlug]);

  async function loadMe() {
    try {
      const response = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      setMe((await response.json()) as MeResponse);
    } catch {
      // Keep shell usable even when API is temporarily unreachable.
    }
  }

  async function loadSchoolBranding(slug: string) {
    try {
      const response = await fetch(`${API_URL}/schools/${slug}/public`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setSchoolBranding({
          name: schoolName,
          logoUrl: null,
        });
        return;
      }

      const payload = (await response.json()) as {
        name?: string;
        logoUrl?: string | null;
      };

      setSchoolBranding({
        name: payload.name?.trim() || schoolName,
        logoUrl: payload.logoUrl ?? null,
      });
    } catch {
      setSchoolBranding({
        name: schoolName,
        logoUrl: null,
      });
    }
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function refreshSession() {
      try {
        const csrfToken = getCsrfTokenCookie();
        const endpoint = schoolSlug
          ? `${API_URL}/schools/${schoolSlug}/auth/refresh`
          : `${API_URL}/auth/refresh`;

        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
        });

        if (!response.ok) {
          return;
        }

        if (!cancelled) {
          await loadMe();
        }
      } catch {
        // Keep navigation usable if refresh fails transiently.
      }
    }

    intervalId = setInterval(
      () => {
        void refreshSession();
      },
      10 * 60 * 1000,
    );

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    }

    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [schoolSlug]);

  const availableRoles = useMemo(() => extractAvailableRoles(me), [me]);
  const roleFromMe: Role = (me?.activeRole ??
    me?.role ??
    "SCHOOL_ADMIN") as Role;
  const role: Role =
    me?.activeRole && availableRoles.includes(me.activeRole)
      ? me.activeRole
      : roleFromMe;

  const activeSchoolSlug = isPlatformRole(role) ? null : schoolSlug;
  const schoolContextName = schoolBranding?.name ?? schoolName;
  const schoolContextLogoUrl = schoolBranding?.logoUrl ?? null;
  const userInitials = useMemo(() => {
    const first = me?.firstName?.[0] ?? "S";
    const last = me?.lastName?.[0] ?? "L";
    return `${first}${last}`.toUpperCase();
  }, [me?.firstName, me?.lastName]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        schoolName={schoolContextName}
        schoolLogoUrl={schoolContextLogoUrl}
        isSchoolContext={Boolean(activeSchoolSlug)}
        role={role}
        userInitials={userInitials}
        onToggleMenu={() => setMobileOpen((prev) => !prev)}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden md:block">
          <AppSidebar schoolSlug={activeSchoolSlug} role={role} />
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
              schoolSlug={activeSchoolSlug}
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
