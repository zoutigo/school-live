"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Card } from "../../components/ui/card";
import { EmailInput } from "../../components/ui/email-input";
import { PinInput } from "../../components/ui/pin-input";
import { Button } from "../../components/ui/button";

type ActivationStartResponse = {
  success: boolean;
  activationRequired?: boolean;
  schoolSlug?: string | null;
  maskedEmail?: string;
  hasPhoneCredential?: boolean;
  methods?: string[];
  hasPendingActivationCode?: boolean;
};

type Props = {
  initialEmail?: string;
  initialPhone?: string;
  initialSchoolSlug?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const activationFormSchema = z
  .object({
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    schoolSlug: z.string().trim().optional().default(""),
    confirmedPhone: z
      .string()
      .regex(/^\d{9}$/, "Numero invalide (9 chiffres attendus)."),
    newPin: z
      .string()
      .regex(/^\d{6}$/, "Le nouveau PIN doit contenir exactement 6 chiffres."),
    activationCode: z.string().trim().optional().default(""),
    initialPin: z.string().trim().optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.activationCode && !value.initialPin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activationCode"],
        message: "Saisissez un code d activation ou votre PIN initial.",
      });
    }
    if (value.email && !z.string().email().safeParse(value.email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Adresse email invalide.",
      });
    }
    if (value.phone && !/^\d{9}$/.test(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Numero invalide (9 chiffres attendus).",
      });
    }
  });

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export function PendingAccountClient({
  initialEmail,
  initialPhone,
  initialSchoolSlug,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [schoolSlug, setSchoolSlug] = useState(initialSchoolSlug ?? "");

  const [context, setContext] = useState<ActivationStartResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [confirmedPhone, setConfirmedPhone] = useState(initialPhone ?? "");
  const [newPin, setNewPin] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [initialPin, setInitialPin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canLoadContext = useMemo(
    () => email.trim().length > 0 || phone.trim().length > 0,
    [email, phone],
  );
  const submitValidation = useMemo(
    () =>
      activationFormSchema.safeParse({
        email,
        phone,
        schoolSlug,
        confirmedPhone,
        newPin,
        activationCode,
        initialPin,
      }),
    [
      activationCode,
      confirmedPhone,
      email,
      initialPin,
      newPin,
      phone,
      schoolSlug,
    ],
  );
  const submitDirty =
    confirmedPhone.length > 0 ||
    newPin.length > 0 ||
    activationCode.length > 0 ||
    initialPin.length > 0;

  useEffect(() => {
    if (!canLoadContext) {
      setLoadingContext(false);
      return;
    }

    let cancelled = false;

    async function loadContext() {
      setLoadingContext(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/auth/activation/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email || undefined,
            phone: phone || undefined,
            schoolSlug: schoolSlug || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les options d activation");
        }

        const payload = (await response.json()) as ActivationStartResponse;
        if (!cancelled) {
          setContext(payload);
          if (payload.schoolSlug && !schoolSlug) {
            setSchoolSlug(payload.schoolSlug);
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Erreur lors du chargement",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [canLoadContext, email, phone, schoolSlug]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = activationFormSchema.safeParse({
      email,
      phone,
      schoolSlug,
      confirmedPhone,
      newPin,
      activationCode,
      initialPin,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/activation/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email || undefined,
          phone: parsed.data.phone || undefined,
          schoolSlug: parsed.data.schoolSlug || undefined,
          confirmedPhone: parsed.data.confirmedPhone,
          newPin: parsed.data.newPin,
          activationCode: parsed.data.activationCode || undefined,
          initialPin: parsed.data.initialPin || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        schoolSlug?: string | null;
        message?: string;
      } | null;

      if (!response.ok) {
        const fallbackMessage =
          "Activation impossible. Verifiez vos informations.";
        setError(payload?.message ?? fallbackMessage);
        return;
      }

      setSuccess("Compte active avec succes.");
      const targetSchoolSlug = payload?.schoolSlug ?? (schoolSlug || null);
      const target = targetSchoolSlug
        ? `/schools/${targetSchoolSlug}/login`
        : "/";
      window.setTimeout(() => {
        router.replace(target);
      }, 1200);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 -top-12 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card
          title="Compte en attente"
          subtitle="Finalisez l'activation pour acceder aux donnees de votre ecole"
        >
          <p className="text-sm text-text-secondary">
            Votre compte a bien ete cree, mais il doit etre valide avant de
            pouvoir consulter vos donnees scolaires.
          </p>

          <div className="mt-4 grid gap-2 rounded-card border border-border bg-background p-3 text-sm">
            <p>
              <span className="text-text-secondary">Compte:</span>{" "}
              <span className="font-semibold">
                {context?.maskedEmail ?? (email || "-")}
              </span>
            </p>
            <p>
              <span className="text-text-secondary">Ecole:</span>{" "}
              <span className="font-semibold">
                {schoolSlug || context?.schoolSlug || "-"}
              </span>
            </p>
            <p>
              <span className="text-text-secondary">Methodes:</span>{" "}
              <span className="font-semibold">
                Code activation ou PIN initial
              </span>
            </p>
          </div>

          <BackLinkButton
            href={schoolSlug ? `/schools/${schoolSlug}/login` : "/"}
            className="mt-4"
          >
            Retour a la connexion
          </BackLinkButton>
        </Card>

        <Card
          title="Activer le compte"
          subtitle="Telephone confirme + nouveau PIN"
        >
          {loadingContext ? (
            <p className="text-sm text-text-secondary">Chargement...</p>
          ) : (
            <form className="grid gap-3" onSubmit={onSubmit}>
              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Email</span>
                <EmailInput
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="prenom.nom@gmail.com"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Telephone du compte</span>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(normalizePhoneInput(event.target.value))
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  placeholder="6XXXXXXXX"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">Telephone confirme</span>
                <input
                  required
                  value={confirmedPhone}
                  onChange={(event) =>
                    setConfirmedPhone(normalizePhoneInput(event.target.value))
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  placeholder="6XXXXXXXX"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  Code d activation (optionnel)
                </span>
                <input
                  value={activationCode}
                  onChange={(event) => setActivationCode(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: A1B2C3D4"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  PIN initial (optionnel)
                </span>
                <PinInput
                  value={initialPin}
                  onChange={(event) =>
                    setInitialPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="PIN temporaire fourni"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-text-secondary">
                  Nouveau PIN (6 chiffres)
                </span>
                <PinInput
                  required
                  value={newPin}
                  onChange={(event) =>
                    setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                />
              </label>

              <Button
                type="submit"
                disabled={
                  submitting || !submitDirty || !submitValidation.success
                }
              >
                {submitting ? "Activation..." : "Activer mon compte"}
              </Button>
            </form>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
