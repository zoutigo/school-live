"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "../ui/button";
import { EmailInput } from "../ui/email-input";
import { FormField } from "../ui/form-field";
import { PasswordInput } from "../ui/password-input";
import { PinInput } from "../ui/pin-input";
import { SsoButtons } from "../auth/sso-buttons";

type LoginResponse = {
  schoolSlug: string | null;
  csrfToken?: string;
};

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

export function LandingLoginForm() {
  const router = useRouter();
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

  async function redirectAfterLogin() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      throw new Error("Session invalide apres connexion");
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
      throw new Error("Aucune ecole associee a ce compte");
    }

    router.push(`/schools/${me.schoolSlug}/dashboard`);
  }

  function redirectToPendingAccount(params: {
    email?: string | null;
    phone?: string | null;
    schoolSlug?: string | null;
  }) {
    const query = new URLSearchParams();
    if (params.email) {
      query.set("email", params.email);
    }
    if (params.phone) {
      query.set("phone", params.phone);
    }
    if (params.schoolSlug) {
      query.set("schoolSlug", params.schoolSlug);
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
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);

          if (
            parsed.code === "PASSWORD_CHANGE_REQUIRED" ||
            parsed.code === "PROFILE_SETUP_REQUIRED"
          ) {
            const params = new URLSearchParams({ email });
            if (parsed.schoolSlug) {
              params.set("schoolSlug", parsed.schoolSlug);
            }
            router.push(`/onboarding?${params.toString()}`);
            return;
          }

          if (parsed.code === "ACCOUNT_VALIDATION_REQUIRED") {
            redirectToPendingAccount({
              email,
              schoolSlug: parsed.schoolSlug,
            });
            return;
          }

          if (parsed.code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
            const params = new URLSearchParams();
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            if (email) {
              params.set("email", email);
            }
            if (parsed.schoolSlug) {
              params.set("schoolSlug", parsed.schoolSlug);
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

        throw new Error("Email ou mot de passe invalide");
      }

      (await response.json()) as LoginResponse;
      await redirectAfterLogin();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Erreur de connexion",
      );
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
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoadingPhone(true);

    try {
      const response = await fetch(`${API_URL}/auth/login-phone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: parsed.data.phone,
          pin: parsed.data.pin,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);
          if (parsed.code === "ACCOUNT_VALIDATION_REQUIRED") {
            redirectToPendingAccount({
              phone,
              schoolSlug: parsed.schoolSlug,
            });
            return;
          }

          if (parsed.code === "PROFILE_SETUP_REQUIRED") {
            const params = new URLSearchParams();
            if (parsed.email) {
              params.set("email", parsed.email);
            }
            if (phone) {
              params.set("phone", phone);
            }
            if (parsed.schoolSlug) {
              params.set("schoolSlug", parsed.schoolSlug);
            }
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            router.push(`/onboarding?${params.toString()}`);
            return;
          }

          if (parsed.code === "PLATFORM_CREDENTIAL_SETUP_REQUIRED") {
            const params = new URLSearchParams();
            if (parsed.setupToken) {
              params.set("token", parsed.setupToken);
            }
            if (phone) {
              params.set("phone", phone);
            }
            if (parsed.schoolSlug) {
              params.set("schoolSlug", parsed.schoolSlug);
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

        throw new Error("Telephone ou PIN invalide");
      }

      await redirectAfterLogin();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Erreur de connexion",
      );
    } finally {
      setLoadingPhone(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-card border border-notification/30 bg-notification/10 px-3 py-2 text-sm text-notification">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            Telephone + PIN
          </h3>
          <p className="mb-3 text-xs text-text-secondary">Connexion rapide</p>
          <form className="grid gap-3" onSubmit={onPhoneSubmit} noValidate>
            <FormField label="Telephone" error={touchedPhone ? phoneError : null}>
              <input
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                type="text"
                value={phone}
                onChange={(event) => {
                  setTouchedPhone(true);
                  setPhone(normalizePhoneInput(event.target.value));
                }}
                onBlur={() => setTouchedPhone(true)}
                placeholder="6XXXXXXXX"
              />
            </FormField>

            <FormField label="PIN" error={touchedPin ? pinError : null}>
              <PinInput
                value={pin}
                onChange={(event) => {
                  setTouchedPin(true);
                  setPin(event.target.value);
                }}
                onBlur={() => setTouchedPin(true)}
                placeholder="123456"
              />
            </FormField>

            <Button
              type="submit"
              disabled={
                loadingPhone || !phonePinDirty || !phonePinValidation.success
              }
            >
              {loadingPhone ? "Connexion PIN..." : "Connexion telephone + PIN"}
            </Button>
            <Link
              href={`/pin-oublie${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`}
              className="justify-self-start text-xs font-medium text-primary hover:underline"
            >
              PIN perdu ?
            </Link>
          </form>
        </section>

        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            Email + Mot de passe
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            Connexion classique
          </p>
          <form className="grid gap-3" onSubmit={onSubmit} noValidate>
            <FormField label="Email" error={touchedEmail ? emailError : null}>
              <EmailInput
                value={email}
                onChange={(event) => {
                  setTouchedEmail(true);
                  setEmail(event.target.value);
                }}
                onBlur={() => setTouchedEmail(true)}
                placeholder="prenom.nom@gmail.com"
              />
            </FormField>

            <FormField
              label="Mot de passe"
              error={touchedPassword ? passwordError : null}
            >
              <PasswordInput
                value={password}
                onChange={(event) => {
                  setTouchedPassword(true);
                  setPassword(event.target.value);
                }}
                onBlur={() => setTouchedPassword(true)}
              />
            </FormField>
            <Button
              type="submit"
              disabled={
                loading || !credentialsDirty || !credentialsValidation.success
              }
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            <Link
              href={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="justify-self-start text-xs font-medium text-primary hover:underline"
            >
              Mot de passe oublie ?
            </Link>
          </form>
        </section>

        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            Google / Apple
          </h3>
          <p className="mb-3 text-xs text-text-secondary">SSO ecole</p>
          <SsoButtons />
        </section>
      </div>
    </div>
  );
}
