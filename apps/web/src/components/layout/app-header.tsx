"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Badge } from "../ui/badge";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import type { Role } from "../../lib/role-view";

type Props = {
  schoolName: string;
  schoolLogoUrl?: string | null;
  isSchoolContext: boolean;
  role: Role;
  userInitials: string;
  onToggleMenu: () => void;
};

function getPortalLabel(role: Role): string {
  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return "Portail administration";
  }

  if (
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER" ||
    role === "SUPERVISOR" ||
    role === "SCHOOL_ACCOUNTANT" ||
    role === "SCHOOL_STAFF"
  ) {
    return "Portail etablissement";
  }

  if (role === "TEACHER") {
    return "Portail enseignant";
  }

  return "Portail famille";
}

export function AppHeader({
  schoolName,
  schoolLogoUrl,
  isSchoolContext,
  role,
  userInitials,
  onToggleMenu,
}: Props) {
  const router = useRouter();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  async function onLogout() {
    const csrfToken = getCsrfTokenCookie();

    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
    });

    router.push("/");
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <button
            aria-label="Ouvrir le menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-surface text-text-primary md:hidden"
            onClick={onToggleMenu}
            type="button"
          >
            ≡
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-card bg-primary font-heading text-sm font-bold text-surface">
              SL
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">
                scolive
              </p>
              <p className="text-xs text-text-secondary">
                {getPortalLabel(role)}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isSchoolContext ? (
            <>
              {schoolLogoUrl ? (
                <img
                  src={schoolLogoUrl}
                  alt={`Logo ${schoolName}`}
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-text-secondary">
                  {schoolName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <h1 className="font-heading text-base font-semibold text-text-primary">
                {schoolName}
              </h1>
            </>
          ) : (
            <h1 className="font-heading text-base font-semibold text-text-primary">
              Dashboard d'administration de la plateforme
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-surface text-text-primary"
            type="button"
          >
            🔔
            <span className="absolute -right-1 -top-1">
              <Badge variant="notification">2</Badge>
            </span>
          </button>

          <button
            aria-label="Compte utilisateur"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary font-heading text-sm font-semibold text-surface"
            type="button"
            onClick={() => router.push("/account")}
          >
            {userInitials}
          </button>

          <button
            aria-label="Se deconnecter"
            title="Se deconnecter"
            className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-border bg-surface text-text-primary transition-colors hover:bg-background"
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirmer la deconnexion"
        message="Voulez-vous vraiment vous deconnecter ?"
        confirmLabel="Se deconnecter"
        cancelLabel="Annuler"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          void onLogout();
        }}
      />
    </>
  );
}
