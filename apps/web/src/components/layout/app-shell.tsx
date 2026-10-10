"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppHeader, APP_HEADER_MENU_TOUR_TARGET } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { SchoolReadOnlyContext } from "./school-read-only-context";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { HelpDialog } from "../ui/help-dialog";
import { OnboardingTarget } from "../onboarding/onboarding-target";
import { OnboardingTourOverlay } from "../onboarding/onboarding-tour-overlay";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelpStore } from "../../store/page-help";
import {
  extractAvailableRoles,
  isPlatformRole,
  type Role,
} from "../../lib/role-view";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation } from "../../i18n/useTranslation";
import { useLocaleStore } from "../../i18n/locale-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// Account preference wins over the device locale, mirrors
// scolive-mobile's src/store/auth.store.ts#applyAccountLocale — kept in
// sync on every /me load, not just from the account settings screen.
function applyAccountLocale(preferredLocale?: "FR" | "EN" | null): void {
  if (!preferredLocale) return;
  useLocaleStore.getState().setLocale(preferredLocale === "EN" ? "en" : "fr");
}

type MeResponse = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role | null;
  activeRole?: Role | null;
  activeSchoolId?: string | null;
  isTester?: boolean;
  preferredLocale?: "FR" | "EN" | null;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  memberships: Array<{
    schoolId: string;
    role:
      | "SCHOOL_ADMIN"
      | "SCHOOL_MANAGER"
      | "SUPERVISOR"
      | "SCHOOL_ACCOUNTANT"
      | "SCHOOL_STAFF"
      | "SCHOOL_HEALTH_OFFICER"
      | "TEACHER"
      | "PARENT"
      | "STUDENT";
  }>;
  schools?: Array<{ schoolId: string }>;
};

type Props = {
  schoolSlug?: string | null;
  schoolName: string;
  children: ReactNode;
};

export function AppShell({ schoolSlug, schoolName, children }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [schoolReadOnly, setSchoolReadOnly] = useState(false);
  const [readOnlyBlocked, setReadOnlyBlocked] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [schoolBranding, setSchoolBranding] = useState<{
    name: string;
    logoUrl?: string | null;
  } | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const pageHelpEntry = usePageHelpStore((state) => state.entry);
  const pageHelpOpen = usePageHelpStore((state) => state.open);
  const closePageHelp = usePageHelpStore((state) => state.closeHelp);

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

      const payload = (await response.json()) as MeResponse;
      setMe(payload);
      applyAccountLocale(payload.preferredLocale);
    } catch {
      // Keep shell usable even when API is temporarily unreachable.
    }
  }

  const activeAppRole = me?.activeRole ?? me?.role ?? null;
  const mayBeReadOnly =
    activeAppRole === "STUDENT" || activeAppRole === "PARENT";

  useEffect(() => {
    // Seuls un élève exclu (ou un parent dont tous les enfants le sont) passent
    // en lecture seule : on évite l'appel pour tous les autres rôles.
    if (!schoolSlug || !mayBeReadOnly) {
      setSchoolReadOnly(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
          credentials: "include",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          schoolReadOnly?: boolean;
        };
        if (!cancelled) setSchoolReadOnly(payload.schoolReadOnly === true);
      } catch {
        // Bannière purement informative : on ignore les erreurs réseau.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolSlug, mayBeReadOnly]);

  useEffect(() => {
    // Filet de sécurité : si une écriture est tout de même tentée en lecture
    // seule (le serveur la refuse en 403 SCHOOL_MEMBER_READ_ONLY), on l'explique
    // clairement plutôt que de laisser la page afficher une erreur générique.
    if (!schoolReadOnly || typeof window === "undefined") return;
    const originalFetch = window.fetch;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      try {
        const method = (
          args[1]?.method ??
          (args[0] instanceof Request ? args[0].method : "GET")
        ).toUpperCase();
        if (
          response.status === 403 &&
          method !== "GET" &&
          method !== "HEAD" &&
          method !== "OPTIONS"
        ) {
          const payload = (await response.clone().json()) as {
            code?: string;
          };
          if (payload.code === "SCHOOL_MEMBER_READ_ONLY") {
            setReadOnlyBlocked(true);
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => setReadOnlyBlocked(false), 5000);
          }
        }
      } catch {
        // Réponse non JSON : rien à signaler.
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [schoolReadOnly]);

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
    const frame = mainRef.current;
    if (!frame) {
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      requestAnimationFrame(() => {
        const nextScrollTop = frame.scrollTop;
        const previousScrollTop = lastScrollTopRef.current;
        const delta = nextScrollTop - previousScrollTop;

        if (nextScrollTop <= 8) {
          setHeaderHidden(false);
        } else if (delta >= 16) {
          setHeaderHidden(true);
        } else if (delta <= -4) {
          setHeaderHidden(false);
        }

        lastScrollTopRef.current = nextScrollTop;
        ticking = false;
      });
    };

    frame.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      frame.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
  const userDisplayName =
    `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim() ||
    t("header.userFallback");

  async function onLogout() {
    setLogoutLoading(true);
    try {
      const csrfToken = getCsrfTokenCookie();

      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
      });
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
      setMobileOpen(false);
      router.push("/");
    }
  }

  return (
    <>
      <div className="flex h-screen flex-col bg-background">
        <AppHeader
          schoolName={schoolContextName}
          schoolLogoUrl={schoolContextLogoUrl}
          isSchoolContext={Boolean(activeSchoolSlug)}
          role={role}
          userInitials={userInitials}
          userDisplayName={userDisplayName}
          onToggleMenu={() => setMobileOpen((prev) => !prev)}
          onLogoutClick={() => setLogoutConfirmOpen(true)}
          hidden={headerHidden && !mobileOpen}
        />

        <div className="relative flex min-h-0 flex-1">
          <div
            className="hidden md:block"
            onClick={() =>
              useOnboardingTourStore
                .getState()
                .advanceIfTarget(APP_HEADER_MENU_TOUR_TARGET)
            }
          >
            <OnboardingTarget id={APP_HEADER_MENU_TOUR_TARGET}>
              <AppSidebar
                schoolSlug={activeSchoolSlug}
                role={role}
                userId={me?.id}
                isTester={me?.isTester}
                onLogoutClick={() => setLogoutConfirmOpen(true)}
              />
            </OnboardingTarget>
          </div>

          {mobileOpen ? (
            <div
              className="absolute inset-0 z-20 flex md:hidden"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                aria-label={t("header.closeMenu")}
                className="h-full flex-1 bg-text-primary/20"
                onClick={() => setMobileOpen(false)}
              />
              <AppSidebar
                schoolSlug={activeSchoolSlug}
                role={role}
                userId={me?.id}
                isTester={me?.isTester}
                onNavigate={() => setMobileOpen(false)}
                onLogoutClick={() => setLogoutConfirmOpen(true)}
              />
            </div>
          ) : null}

          <main
            ref={mainRef}
            data-testid="app-shell-main"
            className="site-main-gutter site-scroll-frame min-w-0 flex-1 overflow-y-auto bg-background"
          >
            {schoolReadOnly ? (
              <div
                role="status"
                data-testid="read-only-banner"
                className="mb-4 rounded-xl border border-[#F4C7A1] bg-[#FFF3E4] px-4 py-3 text-sm text-[#7A4A12]"
              >
                <p className="font-semibold">{t("readOnly.title")}</p>
                <p className="mt-0.5">
                  {t(
                    role === "PARENT"
                      ? "readOnly.messageParent"
                      : "readOnly.message",
                  )}
                </p>
              </div>
            ) : null}
            <SchoolReadOnlyContext.Provider value={schoolReadOnly}>
              {children}
            </SchoolReadOnlyContext.Provider>
          </main>
        </div>
      </div>

      {readOnlyBlocked ? (
        <div
          role="alert"
          data-testid="read-only-blocked-toast"
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-[#F4C7A1] bg-[#FFF3E4] px-4 py-3 text-sm font-medium text-[#7A4A12] shadow-lg"
        >
          {t("readOnly.actionBlocked")}
        </div>
      ) : null}

      <OnboardingTourOverlay />

      {pageHelpEntry ? (
        <HelpDialog
          open={pageHelpOpen}
          title={pageHelpEntry.title}
          sections={pageHelpEntry.sections}
          onClose={closePageHelp}
        />
      ) : null}

      <ConfirmDialog
        open={logoutConfirmOpen}
        title={t("header.logoutConfirmTitle")}
        message={t("header.logoutConfirmMessage")}
        confirmLabel={t("header.logout")}
        cancelLabel={t("common.cancel")}
        loading={logoutLoading}
        onCancel={() => {
          if (!logoutLoading) {
            setLogoutConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void onLogout();
        }}
      />
    </>
  );
}
