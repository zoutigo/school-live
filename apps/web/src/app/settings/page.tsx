"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { extractAvailableRoles, type Role } from "../../lib/role-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Tab = "navigation" | "help";

type MeResponse = {
  role: Role | null;
  activeRole?: Role | null;
  schoolSlug: string | null;
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">;
  memberships: Array<{
    schoolId: string;
    role:
      | "SCHOOL_ADMIN"
      | "SCHOOL_MANAGER"
      | "SCHOOL_ACCOUNTANT"
      | "TEACHER"
      | "PARENT"
      | "STUDENT";
  }>;
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super administrateur plateforme",
  ADMIN: "Administrateur plateforme",
  SALES: "Commercial plateforme",
  SUPPORT: "Support plateforme",
  SCHOOL_ADMIN: "Administrateur d'etablissement",
  SCHOOL_MANAGER: "Gestionnaire d'etablissement",
  SCHOOL_ACCOUNTANT: "Comptable d'etablissement",
  TEACHER: "Enseignant",
  PARENT: "Parent",
  STUDENT: "Eleve",
};

function getHomeRoute(role: Role, schoolSlug: string | null): string {
  if (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SALES" ||
    role === "SUPPORT"
  ) {
    return "/acceuil";
  }

  if (schoolSlug) {
    return `/schools/${schoolSlug}/dashboard`;
  }

  return "/account";
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("navigation");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        router.replace("/");
        return;
      }

      const payload = (await response.json()) as MeResponse;
      const availableRoles = extractAvailableRoles(payload);
      const nextSelected =
        payload.activeRole && availableRoles.includes(payload.activeRole)
          ? payload.activeRole
          : (payload.role ?? availableRoles[0] ?? null);

      setMe(payload);
      setSelectedRole(nextSelected);
    } catch {
      setError("Impossible de charger vos parametres.");
    } finally {
      setLoading(false);
    }
  }

  const availableRoles = useMemo(() => extractAvailableRoles(me), [me]);
  const schoolSlug = me?.schoolSlug ?? null;

  async function onSaveNavigation() {
    if (!selectedRole) {
      setError("Selectionnez un role.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const csrfToken = getCsrfTokenCookie();
      if (!csrfToken) {
        setError("Session CSRF invalide. Reconnectez-vous.");
        router.replace("/");
        return;
      }

      const response = await fetch(`${API_URL}/me/active-role`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Impossible d'enregistrer le role actif.");
        setError(String(message));
        return;
      }

      setSuccess("Role actif enregistre.");
      router.push(getHomeRoute(selectedRole, schoolSlug));
    } catch {
      setError("Impossible d'enregistrer le role actif.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      schoolSlug={schoolSlug}
      schoolName={schoolSlug ? `Etablissement (${schoolSlug})` : "Plateforme"}
    >
      <div className="grid gap-4">
        <Card title="Parametres" subtitle="Preferences de navigation">
          <div className="mb-4 flex items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("navigation")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "navigation"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              Navigation
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

          {tab === "navigation" ? (
            loading ? (
              <p className="text-sm text-text-secondary">Chargement...</p>
            ) : (
              <div className="grid gap-4">
                <p className="text-sm text-text-secondary">
                  Choisissez le role actif pour afficher une seule vue a la fois
                  dans le menu.
                </p>

                {availableRoles.length === 0 ? (
                  <p className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                    Aucun role disponible.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {availableRoles.map((role) => (
                      <label
                        key={role}
                        className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-2 text-sm ${
                          selectedRole === role
                            ? "border-primary bg-primary/5"
                            : "border-border bg-surface"
                        }`}
                      >
                        <span className="font-medium text-text-primary">
                          {ROLE_LABEL[role]}
                        </span>
                        <input
                          type="radio"
                          name="activeRole"
                          value={role}
                          checked={selectedRole === role}
                          onChange={() => setSelectedRole(role)}
                        />
                      </label>
                    ))}
                  </div>
                )}

                {error ? (
                  <p className="text-sm text-notification">{error}</p>
                ) : null}
                {success ? (
                  <p className="text-sm text-primary-dark">{success}</p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      void onSaveNavigation();
                    }}
                    disabled={
                      saving ||
                      !selectedRole ||
                      selectedRole === (me?.activeRole ?? me?.role ?? null)
                    }
                  >
                    {saving ? "Enregistrement..." : "Appliquer ce role"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/account")}
                  >
                    Retour compte
                  </Button>
                </div>
              </div>
            )
          ) : (
            <ModuleHelpTab
              moduleName="Parametres de navigation"
              moduleSummary="Ce module permet de definir votre role actif pour n'afficher qu'une seule vue a la fois dans l'application."
              actions={[
                {
                  name: "Choisir un role actif",
                  purpose:
                    "Afficher une navigation coherente avec votre contexte de travail actuel.",
                  howTo:
                    "Selectionnez un role dans la liste puis cliquez sur Appliquer ce role.",
                  moduleImpact:
                    "Le menu lateral et le portail dans le header se mettent a jour sur ce role.",
                  crossModuleImpact:
                    "Le changement simplifie vos deplacements vers les modules associes a ce role.",
                },
              ]}
              tips={[
                "La preference est enregistree localement sur ce navigateur.",
                "Vous pouvez modifier ce role a tout moment depuis Parametres.",
              ]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
