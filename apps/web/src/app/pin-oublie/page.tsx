"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { RecoveryShell } from "../../components/layout/recovery-shell";
import { Card } from "../../components/ui/card";
import { DateInput } from "../../components/ui/date-input";
import { EmailInput } from "../../components/ui/email-input";
import { SubmitButton } from "../../components/ui/form-buttons";
import { FormField } from "../../components/ui/form-field";
import { PinInput } from "../../components/ui/pin-input";
import {
  buildVerifyPinRecoverySchema,
  completePinRecoverySchema,
  requestPinRecoverySchema,
  type RecoveryQuestion,
} from "./pin-recovery-schema";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

type PinRecoveryOptionsResponse = {
  success: boolean;
  schoolSlug: string | null;
  principalHint: string;
  questions: RecoveryQuestion[];
};

type PinRecoveryVerifyResponse = {
  success: boolean;
  schoolSlug: string | null;
  recoveryToken: string;
};

function PinRecoveryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [phone, setPhone] = useState(() => searchParams.get("phone") ?? "");
  const [schoolSlug, setSchoolSlug] = useState(
    () => searchParams.get("schoolSlug") ?? "",
  );

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [options, setOptions] = useState<PinRecoveryOptionsResponse | null>(
    null,
  );
  const [birthDate, setBirthDate] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recoveryToken, setRecoveryToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [pinTouched, setPinTouched] = useState(false);
  const [confirmPinTouched, setConfirmPinTouched] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const querySchoolSlug = searchParams.get("schoolSlug") ?? "";
    if (querySchoolSlug) {
      setSchoolSlug(querySchoolSlug);
    }
  }, [searchParams]);

  const requestValidation = useMemo(
    () => requestPinRecoverySchema.safeParse({ email, phone }),
    [email, phone],
  );
  const requestDirty = email.length > 0 || phone.length > 0;
  const requestErrors = useMemo(() => {
    if (requestValidation.success) {
      return {} as Partial<Record<"email" | "phone", string>>;
    }
    return requestValidation.error.issues.reduce(
      (accumulator, issue) => {
        const key = issue.path[0];
        if ((key === "email" || key === "phone") && !accumulator[key]) {
          accumulator[key] = issue.message;
        }
        return accumulator;
      },
      {} as Partial<Record<"email" | "phone", string>>,
    );
  }, [requestValidation]);

  const verifySchema = useMemo(
    () => buildVerifyPinRecoverySchema(options?.questions ?? []),
    [options?.questions],
  );
  const verifyDirty =
    birthDate.length > 0 ||
    Object.values(answers).some((answer) => answer.length > 0);
  const verifyValidation = useMemo(
    () => verifySchema.safeParse({ birthDate, answers }),
    [answers, birthDate, verifySchema],
  );
  const completeValidation = useMemo(
    () =>
      completePinRecoverySchema.safeParse({
        recoveryToken,
        newPin,
        confirmPin,
      }),
    [confirmPin, newPin, recoveryToken],
  );
  const completeDirty = newPin.length > 0 || confirmPin.length > 0;
  const completeErrors = useMemo(() => {
    if (completeValidation.success) {
      return {} as Partial<Record<"newPin" | "confirmPin", string>>;
    }
    return completeValidation.error.issues.reduce(
      (accumulator, issue) => {
        const key = issue.path[0];
        if ((key === "newPin" || key === "confirmPin") && !accumulator[key]) {
          accumulator[key] = issue.message;
        }
        return accumulator;
      },
      {} as Partial<Record<"newPin" | "confirmPin", string>>,
    );
  }, [completeValidation]);

  const loginHref = useMemo(() => {
    const targetSchoolSlug = options?.schoolSlug ?? schoolSlug;
    return targetSchoolSlug ? `/schools/${targetSchoolSlug}/login` : "/";
  }, [options?.schoolSlug, schoolSlug]);

  async function onLoadOptions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = requestPinRecoverySchema.safeParse({ email, phone });
    if (!parsed.success) {
      setEmailTouched(true);
      setPhoneTouched(true);
      return;
    }

    setLoadingOptions(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email || undefined,
          phone: parsed.data.phone || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | PinRecoveryOptionsResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Impossible de charger les questions de recuperation.";
        setError(
          message ?? "Impossible de charger les questions de recuperation.",
        );
        return;
      }

      const validPayload = payload as PinRecoveryOptionsResponse;
      setOptions(validPayload);
      setSchoolSlug(validPayload.schoolSlug ?? schoolSlug);
      const nextAnswers: Record<string, string> = {};
      for (const question of validPayload.questions) {
        nextAnswers[question.key] = "";
      }
      setAnswers(nextAnswers);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!options) {
      setError("Chargez d abord les questions de recuperation.");
      return;
    }

    const parsed = verifySchema.safeParse({ birthDate, answers });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verification invalide.");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          birthDate,
          answers: options.questions.map((question) => ({
            questionKey: question.key,
            answer: answers[question.key] ?? "",
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | PinRecoveryVerifyResponse
        | { message?: string | string[] }
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Informations de recuperation invalides.";
        setError(message ?? "Informations de recuperation invalides.");
        return;
      }

      const validPayload = payload as PinRecoveryVerifyResponse;
      setRecoveryToken(validPayload.recoveryToken);
      setSchoolSlug(validPayload.schoolSlug ?? schoolSlug);
      setSuccess("Verification reussie. Vous pouvez definir un nouveau PIN.");
    } catch {
      setError("Erreur reseau.");
    } finally {
      setVerifying(false);
    }
  }

  async function onComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = completePinRecoverySchema.safeParse({
      recoveryToken,
      newPin,
      confirmPin,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setCompleting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-pin/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryToken: parsed.data.recoveryToken,
          newPin: parsed.data.newPin,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        schoolSlug?: string | null;
        message?: string | string[];
      } | null;

      if (!response.ok) {
        const message =
          payload && typeof payload.message !== "undefined"
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message
            : "Reinitialisation du PIN impossible.";
        setError(message ?? "Reinitialisation du PIN impossible.");
        return;
      }

      router.replace("/");
      return;
    } catch {
      setError("Erreur reseau.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <RecoveryShell title="Recuperation de PIN">
      <div className="mx-auto w-full max-w-2xl">
        <Card
          title="PIN perdu"
          subtitle="Recuperez l acces avec vos questions de securite"
        >
          <div className="grid gap-5">
            {!options ? (
              <form className="grid gap-3" onSubmit={onLoadOptions} noValidate>
                <FormField
                  label="Email (optionnel)"
                  error={emailTouched ? requestErrors.email : null}
                >
                  <EmailInput
                    value={email}
                    onChange={(event) => {
                      setEmailTouched(true);
                      setEmail(event.target.value);
                    }}
                    placeholder="prenom.nom@gmail.com"
                  />
                </FormField>

                <FormField
                  label="Telephone (optionnel)"
                  error={
                    phoneTouched || emailTouched ? requestErrors.phone : null
                  }
                >
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => {
                      setPhoneTouched(true);
                      setPhone(normalizePhoneInput(event.target.value));
                    }}
                    placeholder="6XXXXXXXX"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>

                <SubmitButton
                  disabled={
                    loadingOptions ||
                    !requestDirty ||
                    !requestValidation.success
                  }
                >
                  {loadingOptions
                    ? "Chargement..."
                    : "Continuer vers les questions de recuperation"}
                </SubmitButton>
              </form>
            ) : null}

            {options && !recoveryToken ? (
              <form className="grid gap-3" onSubmit={onVerify} noValidate>
                <p className="text-sm text-text-secondary">
                  Compte detecte:{" "}
                  <span className="font-medium text-text-primary">
                    {options.principalHint}
                  </span>
                </p>
                <FormField label="Date de naissance">
                  <DateInput
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                  />
                </FormField>
                {options.questions.map((question) => (
                  <label key={question.key} className="grid gap-1 text-sm">
                    <span className="text-text-secondary">
                      {question.label}
                    </span>
                    <input
                      type="text"
                      value={answers[question.key] ?? ""}
                      onChange={(event) =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.key]: event.target.value,
                        }))
                      }
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                ))}
                <SubmitButton
                  disabled={
                    verifying || !verifyDirty || !verifyValidation.success
                  }
                >
                  {verifying ? "Verification..." : "Verifier mes reponses"}
                </SubmitButton>
              </form>
            ) : null}

            {recoveryToken ? (
              <form className="grid gap-3" onSubmit={onComplete} noValidate>
                <FormField
                  label="Nouveau PIN (6 chiffres)"
                  error={pinTouched ? completeErrors.newPin : null}
                >
                  <PinInput
                    value={newPin}
                    onChange={(event) => {
                      setPinTouched(true);
                      setNewPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    placeholder="123456"
                  />
                </FormField>
                <FormField
                  label="Confirmer le PIN"
                  error={confirmPinTouched ? completeErrors.confirmPin : null}
                >
                  <PinInput
                    value={confirmPin}
                    onChange={(event) => {
                      setConfirmPinTouched(true);
                      setConfirmPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    placeholder="123456"
                  />
                </FormField>
                <SubmitButton
                  disabled={
                    completing || !completeDirty || !completeValidation.success
                  }
                >
                  {completing
                    ? "Reinitialisation..."
                    : "Definir mon nouveau PIN"}
                </SubmitButton>
              </form>
            ) : null}

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <BackLinkButton href={loginHref}>
              Retour a la connexion
            </BackLinkButton>
          </div>
        </Card>
      </div>
    </RecoveryShell>
  );
}

export default function PinRecoveryPage() {
  return (
    <Suspense
      fallback={
        <RecoveryShell title="Recuperation de PIN">
          <div className="mx-auto w-full max-w-2xl">
            <Card title="PIN perdu" subtitle="Chargement...">
              <p className="text-sm text-text-secondary">Chargement...</p>
            </Card>
          </div>
        </RecoveryShell>
      }
    >
      <PinRecoveryPageContent />
    </Suspense>
  );
}
