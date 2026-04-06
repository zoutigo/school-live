"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Badge } from "../ui/badge";
import type { Role } from "../../lib/role-view";
import { useAppShellUiStore } from "./app-shell-ui-store";

type Props = {
  schoolName: string;
  schoolLogoUrl?: string | null;
  isSchoolContext: boolean;
  role: Role;
  userInitials: string;
  userDisplayName: string;
  onToggleMenu: () => void;
  onLogoutClick: () => void;
  hidden?: boolean;
};

function roleLabel(role: Role): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "ADMIN") return "Admin";
  if (role === "SALES") return "Commercial";
  if (role === "SUPPORT") return "Support";
  if (role === "SCHOOL_ADMIN") return "Admin ecole";
  if (role === "SCHOOL_MANAGER") return "Gestionnaire ecole";
  if (role === "SUPERVISOR") return "Superviseur";
  if (role === "SCHOOL_ACCOUNTANT") return "Comptable";
  if (role === "SCHOOL_STAFF") return "Staff";
  if (role === "TEACHER") return "Enseignant";
  if (role === "PARENT") return "Parent";
  return "Eleve";
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
  userDisplayName,
  onToggleMenu,
  onLogoutClick,
  hidden = false,
}: Props) {
  const router = useRouter();
  const [menuHintActive, setMenuHintActive] = useState(false);
  const hasOpenedMobileMenu = useAppShellUiStore(
    (state) => state.hasOpenedMobileMenu,
  );
  const markMobileMenuOpened = useAppShellUiStore(
    (state) => state.markMobileMenuOpened,
  );
  useEffect(() => {
    if (hasOpenedMobileMenu) {
      return;
    }

    let hintTimeout: ReturnType<typeof setTimeout> | null = null;
    const intervalId = setInterval(() => {
      setMenuHintActive(true);
      if (hintTimeout) {
        clearTimeout(hintTimeout);
      }
      hintTimeout = setTimeout(() => {
        setMenuHintActive(false);
      }, 1600);
    }, 15_000);

    return () => {
      clearInterval(intervalId);
      if (hintTimeout) {
        clearTimeout(hintTimeout);
      }
    };
  }, [hasOpenedMobileMenu]);

  return (
    <div
      data-testid="app-header-shell"
      data-state={hidden ? "hidden" : "visible"}
      className={`overflow-hidden border-b border-border bg-surface transition-[height,border-color] duration-200 ${
        hidden ? "h-0 border-transparent" : "h-16"
      }`}
    >
      <header className="flex h-16 items-center justify-between bg-surface px-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-primary-dark font-heading text-sm font-bold text-surface shadow-[0_10px_20px_rgba(12,95,168,0.2)]">
            SL
          </span>
          <div className="hidden md:block">
            <p className="font-heading text-sm font-semibold text-text-primary">
              scolive
            </p>
            <p className="text-xs text-text-secondary">
              {getPortalLabel(role)}
            </p>
          </div>
        </div>

        <p className="flex-1 text-center font-heading text-base font-semibold text-text-primary md:hidden">
          Scolive
        </p>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          {isSchoolContext ? (
            <>
              {schoolLogoUrl ? (
                <img
                  src={schoolLogoUrl}
                  alt={`Logo ${schoolName}`}
                  className="h-9 w-9 rounded-full border border-warm-border bg-warm-surface object-cover shadow-sm"
                />
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-xs font-semibold text-text-secondary">
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

        <div className="hidden items-center gap-3 md:flex">
          <div className="hidden text-right sm:block md:block">
            <p className="text-sm font-semibold text-text-primary">
              {userDisplayName}
            </p>
            <p className="text-xs text-text-secondary">{roleLabel(role)}</p>
          </div>

          <button
            aria-label="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-warm-border bg-warm-surface text-text-primary shadow-sm transition-colors hover:bg-warm-highlight"
            type="button"
          >
            🔔
            <span className="absolute -right-1 -top-1">
              <Badge variant="notification">2</Badge>
            </span>
          </button>

          <button
            aria-label="Compte utilisateur"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-heading text-sm font-semibold text-surface shadow-[0_10px_20px_rgba(12,95,168,0.2)]"
            type="button"
            onClick={() => router.push("/account")}
          >
            {userInitials}
          </button>

          <button
            aria-label="Se deconnecter"
            title="Se deconnecter"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-warm-border bg-warm-surface text-text-primary transition-colors hover:bg-warm-highlight"
            type="button"
            onClick={onLogoutClick}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <button
          aria-label="Ouvrir le menu"
          data-attention={
            hasOpenedMobileMenu
              ? "dismissed"
              : menuHintActive
                ? "active"
                : "idle"
          }
          className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-warm-border bg-warm-surface text-text-primary md:hidden ${
            menuHintActive ? "menu-attention-active" : ""
          }`}
          onClick={() => {
            markMobileMenuOpened();
            setMenuHintActive(false);
            onToggleMenu();
          }}
          type="button"
        >
          <Menu className="h-[18px] w-[18px] stroke-[2.25]" />
        </button>
      </header>
    </div>
  );
}
