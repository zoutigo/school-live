"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function FirstPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const schoolSlug = params.get("schoolSlug");

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Lien invalide: email manquant.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
      );
      return;
    }
    if (!PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      setError(
        "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/first-password-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          temporaryPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        setError("Impossible de changer le mot de passe provisoire.");
        return;
      }

      const payload = (await response.json()) as {
        schoolSlug: string | null;
        profileSetupRequired?: boolean;
      };
      setSuccess(
        "Mot de passe modifie avec succes. Completez maintenant votre profil de securite.",
      );
      setTemporaryPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const query = new URLSearchParams({ email });
      if (payload.schoolSlug ?? schoolSlug) {
        query.set("schoolSlug", payload.schoolSlug ?? schoolSlug ?? "");
      }
      router.push(`/profile-setup?${query.toString()}`);
      return;
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = schoolSlug ? `/schools/${schoolSlug}/login` : "/";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-xl">
        <Card
          title="Premiere connexion"
          subtitle="Changez votre mot de passe provisoire pour activer votre compte"
        >
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-1 text-sm">
              <span className="text-text-secondary">Compte concerne</span>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-text-primary">
                {email || "Email manquant"}
              </div>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">
                Mot de passe provisoire
              </span>
              <PasswordInput
                value={temporaryPassword}
                onChange={setTemporaryPassword}
                visible={showTemporaryPassword}
                onToggleVisibility={() =>
                  setShowTemporaryPassword((value) => !value)
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Nouveau mot de passe</span>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisibility={() => setShowNewPassword((value) => !value)}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">
                Confirmer le mot de passe
              </span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggleVisibility={() =>
                  setShowConfirmPassword((value) => !value)
                }
              />
            </label>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-primary">{success}</p> : null}

            <Button type="submit" disabled={loading}>
              {loading ? "Validation..." : "Valider"}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                router.push(loginHref);
              }}
            >
              Aller a la connexion
            </Button>
            <div className="mt-2">
              <Link href={loginHref} className="text-sm text-text-secondary">
                Retour a la connexion
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggleVisibility,
  minLength = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-card border border-border bg-surface px-3 py-2 pr-10 text-text-primary outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary hover:text-text-primary"
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function FirstPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 text-text-secondary">
          Chargement...
        </div>
      }
    >
      <FirstPasswordContent />
    </Suspense>
  );
}
