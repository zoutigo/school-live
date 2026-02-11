"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

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

type Props = {
  schoolName: string;
  role: Role;
  userInitials: string;
  onToggleMenu: () => void;
};

function getPageTitle(pathname: string, role: Role): string {
  if (pathname.startsWith("/account")) {
    return "Mon compte";
  }

  if (pathname === "/schools") {
    return "Ecoles";
  }

  if (pathname.startsWith("/users")) {
    return "Utilisateurs";
  }

  if (pathname.startsWith("/indicators")) {
    return "Indicateurs";
  }

  if (pathname.startsWith("/acceuil")) {
    return "Pilotage plateforme";
  }

  if (pathname.endsWith("/dashboard")) {
    return "Tableau de bord";
  }

  if (pathname.endsWith("/grades")) {
    return "Notes & Devoirs";
  }

  if (role === "PARENT" || role === "STUDENT") {
    return "Mon espace";
  }

  return "Espace School-Live";
}

function getPortalLabel(role: Role): string {
  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return "Portail administration";
  }

  if (role === "SCHOOL_ADMIN") {
    return "Portail etablissement";
  }

  if (role === "TEACHER") {
    return "Portail enseignant";
  }

  return "Portail famille";
}

export function AppHeader({
  schoolName,
  role,
  userInitials,
  onToggleMenu,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
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
              {schoolName}
            </p>
            <p className="text-xs text-text-secondary">
              {getPortalLabel(role)}
            </p>
          </div>
        </div>
      </div>

      <h1 className="hidden font-heading text-base font-semibold text-text-primary md:block">
        {getPageTitle(pathname, role)}
      </h1>

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
          onClick={() => {
            void onLogout();
          }}
        >
          <LogOut className="h-4 w-4" />
        </button>

        <Button
          variant="ghost"
          className="hidden sm:inline-flex"
          onClick={() => router.push("/account")}
        >
          Mon compte
        </Button>
      </div>
    </header>
  );
}
