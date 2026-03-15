"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BackLinkButton } from "../../components/ui/back-link-button";
import { Card } from "../../components/ui/card";
import { EmailInput } from "../../components/ui/email-input";
import { FormField } from "../../components/ui/form-field";
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
const ACTIVATION_METHOD_ERROR_MESSAGE =
  "Saisissez un code d activation ou votre PIN initial.";
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
        message: ACTIVATION_METHOD_ERROR_MESSAGE,
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
  const [context, setContext] = useState<ActivationStartResponse | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const form = useForm<
    z.input<typeof activationFormSchema>,
    unknown,
    z.output<typeof activationFormSchema>
  >({
    resolver: zodResolver(activationFormSchema),
    mode: "onChange",
    defaultValues: {
      email: initialEmail ?? "",
      phone: initialPhone ?? "",
      schoolSlug: initialSchoolSlug ?? "",
      confirmedPhone: initialPhone ?? "",
      newPin: "",
      activationCode: "",
      initialPin: "",
    },
  });
  const email = form.watch("email");
  const phone = form.watch("phone");
  const schoolSlug = form.watch("schoolSlug");
  const activationCode = form.watch("activationCode");
  const initialPin = form.watch("initialPin");

  const canLoadContext = useMemo(
    () => (email ?? "").trim().length > 0 || (phone ?? "").trim().length > 0,
    [email, phone],
  );
  const { errors, isValid, touchedFields, submitCount } = form.formState;
  const activationMethodError =
    touchedFields.activationCode || touchedFields.initialPin || submitCount > 0
      ? (errors.activationCode?.message ??
        (!activationCode && !initialPin
          ? ACTIVATION_METHOD_ERROR_MESSAGE
          : null))
      : null;
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
            form.setValue("schoolSlug", payload.schoolSlug, {
              shouldValidate: true,
            });
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
  }, [canLoadContext, email, form, phone, schoolSlug]);

  async function onSubmit(values: z.infer<typeof activationFormSchema>) {
    setError(null);
    setSuccess(null);

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/activation/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email || undefined,
          phone: values.phone || undefined,
          schoolSlug: values.schoolSlug || undefined,
          confirmedPhone: values.confirmedPhone,
          newPin: values.newPin,
          activationCode: values.activationCode || undefined,
          initialPin: values.initialPin || undefined,
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
            <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                label="Email"
                error={
                  touchedFields.email || submitCount > 0
                    ? (errors.email?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <EmailInput
                      name={field.name}
                      value={field.value}
                      onChange={(event) =>
                        form.setValue("email", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      onBlur={field.onBlur}
                      placeholder="prenom.nom@gmail.com"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Telephone du compte"
                error={
                  touchedFields.phone || submitCount > 0
                    ? (errors.phone?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <input
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onChange={(event) =>
                        form.setValue(
                          "phone",
                          normalizePhoneInput(event.target.value),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                      onBlur={field.onBlur}
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      placeholder="6XXXXXXXX"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Telephone confirme"
                error={
                  touchedFields.confirmedPhone || submitCount > 0
                    ? (errors.confirmedPhone?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="confirmedPhone"
                  render={({ field }) => (
                    <input
                      name={field.name}
                      ref={field.ref}
                      required
                      value={field.value}
                      onChange={(event) =>
                        form.setValue(
                          "confirmedPhone",
                          normalizePhoneInput(event.target.value),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                      onBlur={field.onBlur}
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      placeholder="6XXXXXXXX"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Code d activation (optionnel)"
                error={activationMethodError}
              >
                <Controller
                  control={form.control}
                  name="activationCode"
                  render={({ field }) => (
                    <input
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onChange={(event) => {
                        form.setValue("activationCode", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        void form.trigger();
                      }}
                      onBlur={field.onBlur}
                      className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: A1B2C3D4"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="PIN initial (optionnel)"
                error={activationMethodError}
              >
                <Controller
                  control={form.control}
                  name="initialPin"
                  render={({ field }) => (
                    <PinInput
                      aria-label="PIN initial (optionnel)"
                      name={field.name}
                      value={field.value}
                      onChange={(event) => {
                        form.setValue(
                          "initialPin",
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                        void form.trigger();
                      }}
                      onBlur={field.onBlur}
                      placeholder="PIN temporaire fourni"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Nouveau PIN (6 chiffres)"
                error={
                  touchedFields.newPin || submitCount > 0
                    ? (errors.newPin?.message ?? null)
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="newPin"
                  render={({ field }) => (
                    <PinInput
                      aria-label="Nouveau PIN (6 chiffres)"
                      name={field.name}
                      required
                      value={field.value}
                      onChange={(event) =>
                        form.setValue(
                          "newPin",
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        )
                      }
                      onBlur={field.onBlur}
                      placeholder="123456"
                    />
                  )}
                />
              </FormField>

              <Button type="submit" disabled={submitting || !isValid}>
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
