"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";
import { PasswordField } from "../../../../../components/ui/password-field";
import { SsoButtons } from "../../../../../components/auth/sso-buttons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const phonePinSchema = z.object({
  phone: z.string().regex(/^\d{9}$/, "Numero invalide (9 chiffres attendus)."),
  pin: z.string().regex(/^\d{6}$/, "PIN invalide (6 chiffres attendus)."),
});
const credentialsSchema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

type ApiErrorPayload = {
  code?: string;
  email?: string | null;
  schoolSlug?: string | null;
  setupToken?: string;
  missingFields?: string[];
  message?:
    | string
    | {
        code?: string;
        email?: string | null;
        schoolSlug?: string | null;
        message?: string;
        setupToken?: string;
        missingFields?: string[];
      };
};

type MeResponse = {
  role:
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
  schoolSlug: string | null;
};

function parseApiError(payload: ApiErrorPayload) {
  const messageObject =
    typeof payload.message === "object" && payload.message
      ? payload.message
      : null;
  return {
    code: payload.code ?? messageObject?.code ?? null,
    email: payload.email ?? messageObject?.email ?? null,
    schoolSlug: payload.schoolSlug ?? messageObject?.schoolSlug ?? null,
    setupToken: payload.setupToken ?? messageObject?.setupToken ?? null,
    missingFields: payload.missingFields ?? messageObject?.missingFields ?? [],
    message:
      typeof payload.message === "string"
        ? payload.message
        : (messageObject?.message ?? null),
  };
}

function getZodFieldError(
  result:
    | ReturnType<typeof phonePinSchema.safeParse>
    | ReturnType<typeof credentialsSchema.safeParse>,
  field: string,
) {
  if (result.success) {
    return null;
  }
  const issue = result.error.issues.find((entry) => entry.path[0] === field);
  return issue?.message ?? null;
}

export default function SchoolLoginPage() {
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedPin, setTouchedPin] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const phonePinValidation = useMemo(
    () => phonePinSchema.safeParse({ phone, pin }),
    [phone, pin],
  );
  const credentialsValidation = useMemo(
    () => credentialsSchema.safeParse({ email, password }),
    [email, password],
  );
  const phonePinDirty = phone.length > 0 || pin.length > 0;
  const credentialsDirty = email.length > 0 || password.length > 0;
  const phoneError = getZodFieldError(phonePinValidation, "phone");
  const pinError = getZodFieldError(phonePinValidation, "pin");
  const emailError = getZodFieldError(credentialsValidation, "email");
  const passwordError = getZodFieldError(credentialsValidation, "password");

  const forgotPasswordHref = `/mot-de-passe-oublie?${new URLSearchParams({
    schoolSlug,
    ...(email ? { email } : {}),
  }).toString()}`;
  const forgotPinHref = `/pin-oublie?${new URLSearchParams({
    schoolSlug,
    ...(phone ? { phone } : {}),
  }).toString()}`;

  async function redirectAfterLogin() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      setError("Session invalide apres connexion");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;

    if (
      me.role === "SUPER_ADMIN" ||
      me.role === "ADMIN" ||
      me.role === "SALES" ||
      me.role === "SUPPORT"
    ) {
      router.push("/acceuil");
      return;
    }

    if (!me.schoolSlug) {
      setError("Aucune ecole associee a ce compte");
      return;
    }

    router.push(`/schools/${me.schoolSlug}/dashboard`);
  }

  function redirectToPendingAccount(params: {
    email?: string;
    phone?: string;
  }) {
    const query = new URLSearchParams({ schoolSlug });
    if (params.email) {
      query.set("email", params.email);
    }
    if (params.phone) {
      query.set("phone", params.phone);
    }
    router.push(`/compte-en-attente?${query.toString()}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setTouchedEmail(true);
      setTouchedPassword(true);
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: parsed.data.email,
            password: parsed.data.password,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);

          if (
            parsed.code === "PASSWORD_CHANGE_REQUIRED" ||
            parsed.code === "PROFILE_SETUP_REQUIRED"
          ) {
            const params = new URLSearchParams({ email });
            params.set("schoolSlug", parsed.schoolSlug ?? schoolSlug);
            router.push(`/onboarding?${params.toString()}`);
            return;
          }

          if (parsed.code === "ACCOUNT_VALIDATION_REQUIRED") {
            redirectToPendingAccount({ email });
            return;
          }

          if (parsed.code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
            const params = new URLSearchParams({ schoolSlug });
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            if (email) {
              params.set("email", email);
            }
            if (parsed.missingFields.length > 0) {
              params.set("missing", parsed.missingFields.join(","));
            }
            router.push(
              `/auth/completer-identifiants-platform?${params.toString()}`,
            );
            return;
          }
        }

        setError("Identifiants invalides");
        return;
      }

      await redirectAfterLogin();
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = phonePinSchema.safeParse({ phone, pin });
    if (!parsed.success) {
      setTouchedPhone(true);
      setTouchedPin(true);
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoadingPhone(true);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/auth/login-phone`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: parsed.data.phone,
            pin: parsed.data.pin,
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);
          if (parsed.code === "ACCOUNT_VALIDATION_REQUIRED") {
            redirectToPendingAccount({ phone });
            return;
          }

          if (parsed.code === "PROFILE_SETUP_REQUIRED") {
            const params = new URLSearchParams({ schoolSlug });
            if (parsed.email) {
              params.set("email", parsed.email);
            }
            if (phone) {
              params.set("phone", phone);
            }
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            router.push(`/onboarding?${params.toString()}`);
            return;
          }

          if (parsed.code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
            const params = new URLSearchParams({ schoolSlug });
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            if (phone) {
              params.set("phone", phone);
            }
            if (parsed.missingFields.length > 0) {
              params.set("missing", parsed.missingFields.join(","));
            }
            router.push(
              `/auth/completer-identifiants-platform?${params.toString()}`,
            );
            return;
          }
        }

        setError("Telephone ou PIN invalide");
        return;
      }

      await redirectAfterLogin();
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoadingPhone(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card title="Connexion" subtitle="Accedez a votre espace Scolive">
          <div className="grid gap-4">
            <SsoButtons schoolSlug={schoolSlug} />

            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="h-px flex-1 bg-border" />
              <span>ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="grid gap-3" onSubmit={onPhoneSubmit} noValidate>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Telephone</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(event) => {
                    setTouchedPhone(true);
                    setPhone(normalizePhoneInput(event.target.value));
                  }}
                  onBlur={() => setTouchedPhone(true)}
                  placeholder="6XXXXXXXX"
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              {touchedPhone && phoneError ? (
                <p className="-mt-2 text-xs text-notification">{phoneError}</p>
              ) : null}

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">PIN</span>
                <PasswordField
                  value={pin}
                  onChange={(event) => {
                    setTouchedPin(true);
                    setPin(event.target.value);
                  }}
                  onBlur={() => setTouchedPin(true)}
                  placeholder="123456"
                  maxLength={6}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              {touchedPin && pinError ? (
                <p className="-mt-2 text-xs text-notification">{pinError}</p>
              ) : null}

              <Button
                type="submit"
                disabled={
                  loadingPhone || !phonePinDirty || !phonePinValidation.success
                }
              >
                {loadingPhone
                  ? "Connexion PIN..."
                  : "Connexion telephone + PIN"}
              </Button>
              <Link
                href={forgotPinHref}
                className="justify-self-start text-xs font-medium text-primary hover:underline"
              >
                PIN perdu ?
              </Link>
            </form>

            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="h-px flex-1 bg-border" />
              <span>ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="grid gap-3" onSubmit={onSubmit} noValidate>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Adresse email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setTouchedEmail(true);
                    setEmail(event.target.value);
                  }}
                  onBlur={() => setTouchedEmail(true)}
                  placeholder="prenom.nom@gmail.com"
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              {touchedEmail && emailError ? (
                <p className="-mt-2 text-xs text-notification">{emailError}</p>
              ) : null}

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Mot de passe</span>
                <PasswordField
                  value={password}
                  onChange={(event) => {
                    setTouchedPassword(true);
                    setPassword(event.target.value);
                  }}
                  onBlur={() => setTouchedPassword(true)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              {touchedPassword && passwordError ? (
                <p className="-mt-2 text-xs text-notification">
                  {passwordError}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={
                  loading || !credentialsDirty || !credentialsValidation.success
                }
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
              <Link
                href={forgotPasswordHref}
                className="justify-self-start text-xs font-medium text-primary hover:underline"
              >
                Mot de passe oublie ?
              </Link>
              <Link
                href={`/schools/${schoolSlug}`}
                className="text-sm text-text-secondary"
              >
                Retour au portail
              </Link>
            </form>

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
          </div>
        </Card>

        <Card title="Une ecole moderne, connectee et inclusive">
          <img
            src="/images/camer-school2.png"
            alt="Eleves dans une classe africaine moderne"
            className="h-[420px] w-full rounded-card border border-border object-cover object-center"
          />
        </Card>
      </div>
    </div>
  );
}
