"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const TEMPORARY_PASSWORD_SCHEMA = z.string().trim().min(1);
const NEW_PASSWORD_SCHEMA = z.string().regex(PASSWORD_COMPLEXITY_REGEX);

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

  const loginHref = schoolSlug ? `/schools/${schoolSlug}/login` : "/";
  const isTemporaryPasswordValid =
    TEMPORARY_PASSWORD_SCHEMA.safeParse(temporaryPassword).success;
  const isNewPasswordValid = NEW_PASSWORD_SCHEMA.safeParse(newPassword).success;
  const isConfirmPasswordValid =
    z
      .object({
        newPassword: z.string(),
        confirmPassword: z.string(),
      })
      .refine((value) => value.newPassword === value.confirmPassword, {
        path: ["confirmPassword"],
      })
      .safeParse({
        newPassword,
        confirmPassword,
      }).success && confirmPassword.length > 0;

  const passwordChecks = useMemo(
    () => [
      {
        label: "Au moins 8 caracteres",
        ok: newPassword.length >= 8,
      },
      {
        label: "Une lettre majuscule",
        ok: /[A-Z]/.test(newPassword),
      },
      {
        label: "Une lettre minuscule",
        ok: /[a-z]/.test(newPassword),
      },
      {
        label: "Un chiffre",
        ok: /\d/.test(newPassword),
      },
    ],
    [newPassword],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Lien invalide: email manquant.");
      return;
    }

    const normalizedTemporaryPassword = temporaryPassword.trim();
    const normalizedNewPassword = newPassword.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (normalizedNewPassword !== normalizedConfirmPassword) {
      setError(
        "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
      );
      return;
    }

    if (!PASSWORD_COMPLEXITY_REGEX.test(normalizedNewPassword)) {
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
          temporaryPassword: normalizedTemporaryPassword,
          newPassword: normalizedNewPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const rawMessage =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              "Impossible de changer le mot de passe provisoire.");
        const message =
          String(rawMessage) === "Invalid credentials"
            ? "Mot de passe provisoire incorrect, ou compte deja active. Verifiez le mot de passe recu par email."
            : String(rawMessage);
        setError(message);
        return;
      }

      const payload = (await response.json()) as {
        schoolSlug: string | null;
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <header className="relative z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-text-primary">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-card bg-primary font-heading text-base font-bold text-surface">
              SL
            </span>
            <span className="font-heading text-lg font-semibold">
              School-Live
            </span>
          </Link>
          <Link
            href={loginHref}
            className="text-sm text-text-secondary hover:text-primary"
          >
            Retour connexion
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <section className="rounded-card border border-border bg-surface p-6 shadow-card lg:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Activation securisee
          </p>

          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight md:text-4xl">
            Premiere connexion a votre espace School-Live
          </h1>

          <p className="mt-4 max-w-xl text-base text-text-secondary">
            Finalisez l'activation de votre compte en remplacant votre mot de
            passe provisoire. Cette etape protege vos acces des la premiere
            utilisation.
          </p>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                Votre nouveau mot de passe devient la cle unique pour vos
                prochaines connexions.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-card border border-border bg-background p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-text-secondary">
                Une fois valide, vous serez redirige vers la configuration du
                profil de securite.
              </p>
            </div>
          </div>

          <img
            src="/images/camer-school2.png"
            alt="Eleves dans un environnement scolaire moderne"
            className="mt-6 h-56 w-full rounded-card border border-border object-cover object-center md:h-64"
          />
        </section>

        <Card
          title="Modifier le mot de passe"
          subtitle="Activez votre compte avec un nouveau mot de passe conforme"
          className="lg:mt-2"
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
                isValid={isTemporaryPasswordValid}
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
                isValid={isNewPasswordValid}
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
                isValid={isConfirmPasswordValid}
                onToggleVisibility={() =>
                  setShowConfirmPassword((value) => !value)
                }
              />
            </label>

            <div className="grid gap-1 rounded-card border border-border bg-background p-3 text-xs">
              {passwordChecks.map((check) => (
                <p
                  key={check.label}
                  className={check.ok ? "text-primary" : "text-text-secondary"}
                >
                  {check.ok ? "OK" : "-"} {check.label}
                </p>
              ))}
            </div>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-primary">{success}</p> : null}

            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? "Validation..." : "Valider et continuer"}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                router.push(loginHref);
              }}
            >
              Aller a la connexion
            </Button>
            <Link
              href={loginHref}
              className="text-sm text-text-secondary hover:text-primary"
            >
              Retour rapide
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  isValid,
  onToggleVisibility,
  minLength = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  isValid?: boolean;
  onToggleVisibility: () => void;
  minLength?: number;
}) {
  const showSuccessBorder = Boolean(value) && Boolean(isValid);

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-card border bg-surface px-3 py-2 pr-28 text-text-primary outline-none focus:ring-2 ${
            showSuccessBorder
              ? "border-[#198754] focus:ring-[#198754]"
              : "border-border focus:ring-primary"
          }`}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded px-1 py-1 text-text-secondary hover:text-text-primary"
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="text-xs font-medium">
            {visible ? "Masquer" : "Afficher"}
          </span>
        </button>
      </div>
      {visible && value ? (
        <p className="mt-1 text-xs text-text-secondary">
          Saisie visible:{" "}
          <span className="font-medium text-text-primary">{value}</span>
        </p>
      ) : null}
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
