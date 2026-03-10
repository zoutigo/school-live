"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
import { SubmitButton } from "../../components/ui/form-buttons";
import { FormField } from "../../components/ui/form-field";
import { PasswordInput } from "../../components/ui/password-input";
import { PasswordRequirementsHint } from "../../components/ui/password-requirements-hint";
import {
  buildVerifyResetSchema,
  completeResetSchema,
  requestResetSchema,
  type RecoveryQuestion,
} from "./forgot-password-schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type RequestResetResponse = {
  success: boolean;
  message: string;
  resetToken?: string;
};

type ResetOptionsResponse = {
  success: boolean;
  emailHint: string;
  schoolSlug: string | null;
  questions: RecoveryQuestion[];
};

function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestRedirectTimeoutRef = useRef<number | null>(null);

  const [activeToken, setActiveToken] = useState(() => {
    return searchParams.get("token") ?? "";
  });
  const [schoolSlugFromQuery, setSchoolSlugFromQuery] = useState(() => {
    return searchParams.get("schoolSlug") ?? "";
  });
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");

  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const [options, setOptions] = useState<ResetOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [birthDate, setBirthDate] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    const schoolSlug = searchParams.get("schoolSlug") ?? "";
    const initialEmail = searchParams.get("email") ?? "";
    setActiveToken(token);
    setSchoolSlugFromQuery(schoolSlug);
    if (!email && initialEmail) {
      setEmail(initialEmail);
    }
  }, [searchParams, email]);

  const verifySchema = useMemo(
    () => buildVerifyResetSchema(options?.questions ?? []),
    [options?.questions],
  );
  const requestValidation = useMemo(
    () => requestResetSchema.safeParse({ email }),
    [email],
  );
  const canSubmitRequest = requestValidation.success && !requesting;

  const loginHref = useMemo(() => {
    const schoolSlug = options?.schoolSlug ?? schoolSlugFromQuery;
    return schoolSlug ? `/schools/${schoolSlug}/login` : "/";
  }, [options?.schoolSlug, schoolSlugFromQuery]);

  useEffect(() => {
    return () => {
      if (requestRedirectTimeoutRef.current) {
        window.clearTimeout(requestRedirectTimeoutRef.current);
      }
    };
  }, []);

  const loadResetOptions = useCallback(async (token: string) => {
    setLoadingOptions(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              "Lien de reinitialisation invalide ou expire.");
        setError(String(message));
        setOptions(null);
        return;
      }

      const payload = (await response.json()) as ResetOptionsResponse;
      setOptions(payload);
      const initialAnswers: Record<string, string> = {};
      for (const question of payload.questions) {
        initialAnswers[question.key] = "";
      }
      setAnswers(initialAnswers);
      setVerified(false);
      setRequestSent(false);
      setRequestMessage(null);
    } catch {
      setError("Erreur reseau.");
      setOptions(null);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!activeToken) {
      return;
    }
    void loadResetOptions(activeToken);
  }, [activeToken, loadResetOptions]);

  async function onRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = requestResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Email invalide.");
      return;
    }

    setRequesting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as RequestResetResponse | null;

      if (!response.ok) {
        setError("Demande impossible. Veuillez reessayer.");
        return;
      }

      setRequestSent(true);
      setRequestMessage(
        payload?.message ??
          "Si ce compte existe, un lien de reinitialisation a ete envoye.",
      );
      setEmail("");

      if (payload?.resetToken) {
        const params = new URLSearchParams({ token: payload.resetToken });
        if (schoolSlugFromQuery) {
          params.set("schoolSlug", schoolSlugFromQuery);
        }
        router.replace(`/mot-de-passe-oublie?${params.toString()}`);
        return;
      }

      if (requestRedirectTimeoutRef.current) {
        window.clearTimeout(requestRedirectTimeoutRef.current);
      }
      requestRedirectTimeoutRef.current = window.setTimeout(() => {
        router.replace("/");
      }, 5000);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setRequesting(false);
    }
  }

  async function onVerifyIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = verifySchema.safeParse({
      token: activeToken,
      birthDate,
      answers,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verification invalide.");
      return;
    }

    setVerifying(true);
    try {
      const payload = {
        token: activeToken,
        birthDate,
        answers: (options?.questions ?? []).map((question) => ({
          questionKey: question.key,
          answer: answers[question.key] ?? "",
        })),
      };

      const response = await fetch(`${API_URL}/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          errorPayload?.message && Array.isArray(errorPayload.message)
            ? errorPayload.message.join(", ")
            : (errorPayload?.message ??
              "Informations de recuperation invalides.");
        setError(String(message));
        return;
      }

      setVerified(true);
      setSuccess(
        "Verification validee. Definissez votre nouveau mot de passe.",
      );
    } catch {
      setError("Erreur reseau.");
    } finally {
      setVerifying(false);
    }
  }

  async function onCompleteReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = completeResetSchema.safeParse({
      token: activeToken,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setCompleting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: activeToken,
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
            : (payload?.message ?? "Reinitialisation impossible.");
        setError(String(message));
        return;
      }

      router.replace(loginHref);
      return;
    } catch {
      setError("Erreur reseau.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title="Recuperation de mot de passe">
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title="Mot de passe oublie"
          subtitle={
            options
              ? verified
                ? "Etape 3/3: nouveau mot de passe"
                : "Etape 2/3: verification"
              : "Etape 1/3: demande de lien"
          }
          className="lg:mt-2"
        >
          {!activeToken ? (
            <form className="grid gap-3" onSubmit={onRequestReset}>
              <FormField label="Email du compte">
                <EmailInput
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="prenom.nom@gmail.com"
                />
              </FormField>

              <SubmitButton disabled={!canSubmitRequest}>
                {requesting ? "Envoi en cours..." : "Envoyer le lien"}
              </SubmitButton>

              {!canSubmitRequest && email.trim().length > 0 ? (
                <p className="text-xs text-notification">
                  Saisissez un email valide pour continuer.
                </p>
              ) : null}

              {requestSent && requestMessage ? (
                <p
                  role="status"
                  className="rounded-card border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                >
                  {requestMessage}
                </p>
              ) : null}
            </form>
          ) : loadingOptions ? (
            <p className="text-sm text-text-secondary">Chargement du lien...</p>
          ) : options && !verified ? (
            <form className="grid gap-3" onSubmit={onVerifyIdentity}>
              <div className="rounded-card border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                Compte detecte:{" "}
                <span className="font-semibold">{options.emailHint}</span>
              </div>

              <FormField label="Date de naissance">
                <DateInput
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </FormField>

              <div className="grid gap-3">
                {options.questions.map((question) => (
                  <label key={question.key} className="grid gap-1 text-sm">
                    <span className="text-text-secondary">
                      {question.label}
                    </span>
                    <input
                      value={answers[question.key] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.key]: event.target.value,
                        }))
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                ))}
              </div>

              <SubmitButton disabled={verifying}>
                {verifying ? "Verification..." : "Verifier mon identite"}
              </SubmitButton>
            </form>
          ) : options && verified ? (
            <form className="grid gap-3" onSubmit={onCompleteReset}>
              <FormField label="Nouveau mot de passe">
                <PasswordInput
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </FormField>

              <PasswordRequirementsHint password={newPassword} />

              <FormField label="Confirmation">
                <PasswordInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </FormField>

              <SubmitButton disabled={completing}>
                {completing
                  ? "Reinitialisation..."
                  : "Reinitialiser mon mot de passe"}
              </SubmitButton>
            </form>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-text-secondary">
                Ce lien n&apos;est plus valide. Demandez un nouveau lien de
                reinitialisation.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setActiveToken("");
                  setOptions(null);
                  setVerified(false);
                  setSuccess(null);
                }}
              >
                Nouvelle demande
              </Button>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}

          <BackLinkButton href={loginHref} className="mt-4">
            Retour a la connexion
          </BackLinkButton>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <RecoveryShell title="Recuperation de mot de passe">
          <div className="mx-auto w-full max-w-2xl">
            <Card
              title="Mot de passe oublie"
              subtitle="Chargement..."
              className="lg:mt-2"
            >
              <p className="text-sm text-text-secondary">Chargement...</p>
            </Card>
          </div>
        </RecoveryShell>
      }
    >
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
