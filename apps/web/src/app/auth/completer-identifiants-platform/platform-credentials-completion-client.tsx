"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../components/ui/card";
import { SubmitButton } from "../../../components/ui/form-buttons";
import { PasswordInput } from "../../../components/ui/password-input";
import { PinInput } from "../../../components/ui/pin-input";

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

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type Props = {
  token?: string;
  email?: string;
  phone?: string;
  schoolSlug?: string;
  missing?: string;
};

type SetupField =
  | "newPassword"
  | "confirmPassword"
  | "phone"
  | "confirmPhone"
  | "newPin"
  | "confirmPin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const setupSchema = z
  .object({
    token: z.string().min(16, "Session invalide."),
    requiresPassword: z.boolean(),
    requiresPhonePin: z.boolean(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
    phone: z.string().optional(),
    confirmPhone: z.string().optional(),
    newPin: z.string().optional(),
    confirmPin: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.requiresPassword) {
      if (
        !value.newPassword ||
        !PASSWORD_COMPLEXITY_REGEX.test(value.newPassword)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPassword"],
          message:
            "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        });
      }
      if (
        !value.confirmPassword ||
        value.confirmPassword !== value.newPassword
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "La confirmation du mot de passe ne correspond pas.",
        });
      }
    }

    if (value.requiresPhonePin) {
      if (!value.phone || !/^\d{9}$/.test(value.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Numero invalide (9 chiffres attendus).",
        });
      }
      if (!value.confirmPhone || value.confirmPhone !== value.phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPhone"],
          message: "La confirmation du telephone ne correspond pas.",
        });
      }
      if (!value.newPin || !/^\d{6}$/.test(value.newPin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPin"],
          message: "Le PIN doit contenir exactement 6 chiffres.",
        });
      }
      if (!value.confirmPin || value.confirmPin !== value.newPin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPin"],
          message: "La confirmation du PIN ne correspond pas.",
        });
      }
    }
  });

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export function PlatformCredentialsCompletionClient({
  token,
  email,
  phone,
  schoolSlug,
  missing,
}: Props) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneValue, setPhoneValue] = useState(
    normalizePhoneInput(phone ?? ""),
  );
  const [confirmPhone, setConfirmPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<SetupField, boolean>>({
    newPassword: false,
    confirmPassword: false,
    phone: false,
    confirmPhone: false,
    newPin: false,
    confirmPin: false,
  });

  const missingFields = useMemo(
    () =>
      (missing ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [missing],
  );
  const requiresPassword = missingFields.includes("PASSWORD");
  const requiresPhonePin = missingFields.includes("PHONE_PIN");
  const formValidation = useMemo(
    () =>
      setupSchema.safeParse({
        token: token ?? "",
        requiresPassword,
        requiresPhonePin,
        newPassword,
        confirmPassword,
        phone: phoneValue,
        confirmPhone,
        newPin,
        confirmPin,
      }),
    [
      confirmPassword,
      confirmPhone,
      confirmPin,
      newPassword,
      newPin,
      phoneValue,
      requiresPassword,
      requiresPhonePin,
      token,
    ],
  );
  const fieldErrors = useMemo(() => {
    if (formValidation.success) {
      return {} as Partial<Record<SetupField, string>>;
    }
    const entries = formValidation.error.issues.map((issue) => {
      const key = issue.path[0] as SetupField | undefined;
      return [key, issue.message] as const;
    });
    return entries.reduce(
      (accumulator, [key, message]) => {
        if (key && !accumulator[key]) {
          accumulator[key] = message;
        }
        return accumulator;
      },
      {} as Partial<Record<SetupField, string>>,
    );
  }, [formValidation]);
  const isFormValid = formValidation.success;

  function markTouched(field: SetupField) {
    setTouched((previous) =>
      previous[field] ? previous : { ...previous, [field]: true },
    );
  }

  async function redirectAfterCompletion() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });
    if (!meResponse.ok) {
      router.replace("/");
      return;
    }

    const me = (await meResponse.json()) as MeResponse;
    if (
      me.role === "SUPER_ADMIN" ||
      me.role === "ADMIN" ||
      me.role === "SALES" ||
      me.role === "SUPPORT"
    ) {
      router.replace("/acceuil");
      return;
    }

    if (me.schoolSlug) {
      router.replace(`/schools/${me.schoolSlug}/dashboard`);
      return;
    }

    router.replace(schoolSlug ? `/schools/${schoolSlug}/dashboard` : "/");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = formValidation;

    if (!parsed.success) {
      setTouched((previous) => ({
        ...previous,
        ...(requiresPassword
          ? { newPassword: true, confirmPassword: true }
          : {}),
        ...(requiresPhonePin
          ? { phone: true, confirmPhone: true, newPin: true, confirmPin: true }
          : {}),
      }));
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/auth/platform-credentials/complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: parsed.data.token,
            newPassword: requiresPassword ? parsed.data.newPassword : undefined,
            phone: requiresPhonePin ? parsed.data.phone : undefined,
            newPin: requiresPhonePin ? parsed.data.newPin : undefined,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Configuration impossible.");
        setError(String(message));
        return;
      }

      await redirectAfterCompletion();
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <Card
          title="Completer vos identifiants"
          subtitle="Pour securiser votre acces, renseignez les informations manquantes."
        >
          <form className="grid gap-3" onSubmit={onSubmit} noValidate>
            {email ? (
              <p className="text-xs text-text-secondary">Compte: {email}</p>
            ) : null}

            {requiresPassword ? (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Nouveau mot de passe
                  </span>
                  <PasswordInput
                    value={newPassword}
                    onChange={(event) => {
                      markTouched("newPassword");
                      setNewPassword(event.target.value);
                    }}
                  />
                  {touched.newPassword && fieldErrors.newPassword ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.newPassword}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Confirmer le mot de passe
                  </span>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(event) => {
                      markTouched("confirmPassword");
                      setConfirmPassword(event.target.value);
                    }}
                  />
                  {touched.confirmPassword && fieldErrors.confirmPassword ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.confirmPassword}
                    </span>
                  ) : null}
                </label>
              </>
            ) : null}

            {requiresPhonePin ? (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Telephone</span>
                  <input
                    type="text"
                    value={phoneValue}
                    onChange={(event) => {
                      markTouched("phone");
                      setPhoneValue(normalizePhoneInput(event.target.value));
                    }}
                    placeholder="6XXXXXXXX"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                  {touched.phone && fieldErrors.phone ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.phone}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Confirmer le telephone
                  </span>
                  <input
                    type="text"
                    value={confirmPhone}
                    onChange={(event) => {
                      markTouched("confirmPhone");
                      setConfirmPhone(normalizePhoneInput(event.target.value));
                    }}
                    placeholder="6XXXXXXXX"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                  {touched.confirmPhone && fieldErrors.confirmPhone ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.confirmPhone}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Nouveau PIN (6 chiffres)
                  </span>
                  <PinInput
                    value={newPin}
                    onChange={(event) => {
                      markTouched("newPin");
                      setNewPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    maxLength={6}
                  />
                  {touched.newPin && fieldErrors.newPin ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.newPin}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Confirmer le PIN</span>
                  <PinInput
                    value={confirmPin}
                    onChange={(event) => {
                      markTouched("confirmPin");
                      setConfirmPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    maxLength={6}
                  />
                  {touched.confirmPin && fieldErrors.confirmPin ? (
                    <span className="text-xs text-notification">
                      {fieldErrors.confirmPin}
                    </span>
                  ) : null}
                </label>
              </>
            ) : null}

            {error ? (
              <p className="text-sm text-notification">{error}</p>
            ) : null}

            <SubmitButton disabled={saving || !isFormValid}>
              {saving ? "Validation..." : "Valider"}
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
