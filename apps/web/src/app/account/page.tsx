"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Le mot de passe actuel est obligatoire."),
    newPassword: z
      .string()
      .regex(
        PASSWORD_COMPLEXITY_REGEX,
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      ),
    confirmNewPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "La confirmation du nouveau mot de passe ne correspond pas.",
    path: ["confirmNewPassword"],
  });

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";
type Tab = "personal" | "security" | "help";

type MeResponse = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  schoolSlug: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("personal");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const response = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace("/");
      return;
    }

    setMe((await response.json()) as MeResponse);
    setLoading(false);
  }

  const schoolName = useMemo(() => {
    if (!me) {
      return "School-Live";
    }

    if (me.role === "SUPER_ADMIN" || me.role === "ADMIN") {
      return "School-Live Platform";
    }

    return me.schoolSlug
      ? `Etablissement (${me.schoolSlug})`
      : "Espace School-Live";
  }, [me]);

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!parsed.success) {
      setPasswordError(
        parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      );
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setPasswordError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          currentPassword: parsed.data.currentPassword,
          newPassword: parsed.data.newPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Changement de mot de passe impossible.");
        setPasswordError(String(message));
        return;
      }

      setPasswordSuccess("Mot de passe mis a jour avec succes.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError("Erreur reseau.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  return (
    <AppShell schoolSlug={me?.schoolSlug ?? null} schoolName={schoolName}>
      <div className="grid gap-4">
        <Card title="Mon compte" subtitle="Gestion de votre profil utilisateur">
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("personal")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "personal"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Informations personnelles
            </button>
            <button
              type="button"
              onClick={() => setTab("security")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "security"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Securite
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "help"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Aide
            </button>
          </div>

          {tab === "personal" ? (
            loading ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBlock label="Prenom" value={me?.firstName ?? "-"} />
                <InfoBlock label="Nom" value={me?.lastName ?? "-"} />
                <InfoBlock label="Email" value={me?.email ?? "-"} />
                <InfoBlock label="Telephone" value={me?.phone ?? "-"} />
                <InfoBlock label="Role" value={me?.role ?? "-"} />
                <InfoBlock
                  label="Ecole"
                  value={me?.schoolSlug ?? "Plateforme"}
                />
              </div>
            )
          ) : tab === "security" ? (
            <form className="grid max-w-xl gap-3" onSubmit={onChangePassword}>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Ancien mot de passe</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  Nouveau mot de passe
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
                  title="8 caracteres minimum avec au moins une majuscule, une minuscule et un chiffre."
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  Confirmer le nouveau mot de passe
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
                  title="8 caracteres minimum avec au moins une majuscule, une minuscule et un chiffre."
                  value={confirmNewPassword}
                  onChange={(event) =>
                    setConfirmNewPassword(event.target.value)
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              {passwordError ? (
                <p className="text-sm text-notification">{passwordError}</p>
              ) : null}
              {passwordSuccess ? (
                <p className="text-sm text-primary">{passwordSuccess}</p>
              ) : null}

              <Button type="submit" disabled={updatingPassword}>
                {updatingPassword
                  ? "Mise a jour..."
                  : "Changer le mot de passe"}
              </Button>
            </form>
          ) : (
            <ModuleHelpTab
              moduleName="Mon compte"
              moduleSummary="ce module centralise vos informations personnelles et la securite de votre acces."
              actions={[
                {
                  name: "Consulter",
                  purpose:
                    "verifier rapidement vos informations de profil et votre role actif.",
                  howTo: "utiliser l'onglet Informations personnelles.",
                  moduleImpact: "aucune modification, simple verification.",
                  crossModuleImpact:
                    "permet de confirmer votre perimetre d'action dans les autres modules.",
                },
                {
                  name: "Modifier mot de passe",
                  purpose:
                    "renforcer la securite de votre compte ou repondre a une politique interne.",
                  howTo:
                    "renseigner l'ancien mot de passe puis le nouveau dans l'onglet Securite.",
                  moduleImpact:
                    "votre secret d'authentification est remplace immediatement.",
                  crossModuleImpact:
                    "les futures connexions sur tous les modules utilisent ce nouveau mot de passe.",
                },
              ]}
              tips={[
                "Quand vous reprenez le projet, cet onglet aide a verifier tout de suite votre contexte utilisateur.",
              ]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
