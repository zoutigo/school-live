"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { EmailInput } from "../ui/email-input";
import { FormSubmitHint, FormTextInput } from "../ui/form-controls";
import { FormField } from "../ui/form-field";
import { PasswordInput } from "../ui/password-input";
import { PinInput } from "../ui/pin-input";
import { SsoButtons } from "../auth/sso-buttons";
import { SUPPORTED_LOCALES } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";

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

const PREFERRED_METHOD_KEY = "preferred_auth_method";
type AuthMethod = "phone" | "email" | "username" | "sso";

function loadPreferredMethod(): AuthMethod {
  if (typeof localStorage === "undefined") return "phone";
  const stored = localStorage.getItem(PREFERRED_METHOD_KEY);
  if (
    stored === "phone" ||
    stored === "email" ||
    stored === "username" ||
    stored === "sso"
  ) {
    return stored;
  }
  return "phone";
}

function savePreferredMethod(method: AuthMethod) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PREFERRED_METHOD_KEY, method);
  }
}

type PhonePinValues = { phone: string; pin: string };
type CredentialsValues = { email: string; password: string };
type UsernameLoginValues = { username: string; password: string };

function createSchemas(t: (key: string) => string) {
  const phonePinSchema = z.object({
    phone: z.string().regex(/^\d{9}$/, t("login.errors.invalidPhone")),
    pin: z.string().regex(/^\d{6}$/, t("login.errors.invalidPin")),
  });
  const credentialsSchema = z.object({
    email: z.string().trim().email(t("login.errors.invalidEmail")),
    password: z.string().min(1, t("login.errors.passwordRequired")),
  });
  const usernameLoginSchema = z.object({
    username: z.string().trim().min(3, t("login.errors.invalidUsername")),
    password: z.string().min(1, t("login.errors.passwordRequired")),
  });
  return { phonePinSchema, credentialsSchema, usernameLoginSchema };
}

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
  result: z.ZodSafeParseResult<unknown>,
  field: string,
) {
  if (result.success) {
    return null;
  }
  const issue = result.error.issues.find(
    (entry: { path: PropertyKey[] }) => entry.path[0] === field,
  );
  return issue?.message ?? null;
}

export function LandingLoginForm() {
  const router = useRouter();
  const { locale, setLocale, t } = useTranslation();
  const { phonePinSchema, credentialsSchema, usernameLoginSchema } = useMemo(
    () => createSchemas(t),
    [locale],
  );

  const ALL_METHODS: Array<{ key: AuthMethod; label: string }> = [
    { key: "phone", label: t("login.method.phone") },
    { key: "email", label: t("login.method.email") },
    { key: "username", label: t("login.method.username") },
    { key: "sso", label: t("login.method.sso") },
  ];
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [activeMethod, setActiveMethod] = useState<AuthMethod>("phone");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setActiveMethod(loadPreferredMethod());
    }
  }, []);

  useEffect(() => {
    if (!showMethodDropdown) return;
    function onClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMethodDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showMethodDropdown]);

  function switchMethod(method: AuthMethod) {
    setActiveMethod(method);
    savePreferredMethod(method);
    setShowMethodDropdown(false);
    setError(null);
  }

  const phoneForm = useForm<PhonePinValues>({
    resolver: zodResolver(phonePinSchema),
    mode: "onChange",
    defaultValues: {
      phone: "",
      pin: "",
    },
  });
  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const usernameForm = useForm<UsernameLoginValues>({
    resolver: zodResolver(usernameLoginSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const phone = phoneForm.watch("phone");
  const email = credentialsForm.watch("email");
  const password = credentialsForm.watch("password");
  const phoneValidation = phonePinSchema.safeParse({
    phone: phone ?? "",
    pin: phoneForm.watch("pin") ?? "",
  });
  const credentialsValidation = credentialsSchema.safeParse({
    email: email ?? "",
    password: password ?? "",
  });
  const showPhoneErrors =
    phone.length > 0 ||
    (phoneForm.watch("pin")?.length ?? 0) > 0 ||
    phoneForm.formState.submitCount > 0;
  const showCredentialErrors =
    email.length > 0 ||
    password.length > 0 ||
    credentialsForm.formState.submitCount > 0;
  const usernameValue = usernameForm.watch("username");
  const usernamePassword = usernameForm.watch("password");
  const usernameValidation = usernameLoginSchema.safeParse({
    username: usernameValue ?? "",
    password: usernamePassword ?? "",
  });
  const showUsernameErrors =
    usernameValue.length > 0 ||
    (usernamePassword?.length ?? 0) > 0 ||
    usernameForm.formState.submitCount > 0;

  async function redirectAfterLogin() {
    const meResponse = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!meResponse.ok) {
      throw new Error(t("login.errors.invalidSession"));
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
      throw new Error(t("login.errors.noSchool"));
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

  async function onSubmit(values: CredentialsValues) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
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

        throw new Error(t("login.errors.invalidEmailPassword"));
      }

      (await response.json()) as LoginResponse;
      await redirectAfterLogin();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("login.errors.connectionError"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneSubmit(values: PhonePinValues) {
    setError(null);
    setLoadingPhone(true);

    try {
      const response = await fetch(`${API_URL}/auth/login-phone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: values.phone,
          pin: values.pin,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);
          if (parsed.code === "ACCOUNT_VALIDATION_REQUIRED") {
            redirectToPendingAccount({
              phone: values.phone,
              schoolSlug: parsed.schoolSlug,
            });
            return;
          }

          if (parsed.code === "PROFILE_SETUP_REQUIRED") {
            const params = new URLSearchParams();
            if (parsed.email) {
              params.set("email", parsed.email);
            }
            if (values.phone) {
              params.set("phone", values.phone);
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
            if (values.phone) {
              params.set("phone", values.phone);
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

        throw new Error(t("login.errors.invalidPhonePin"));
      }

      await redirectAfterLogin();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("login.errors.connectionError"),
      );
    } finally {
      setLoadingPhone(false);
    }
  }

  async function onUsernameSubmit(values: UsernameLoginValues) {
    setError(null);
    setLoadingUsername(true);
    try {
      const response = await fetch(`${API_URL}/auth/login/username`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const payload = (await response.json()) as ApiErrorPayload;
          const parsed = parseApiError(payload);

          if (parsed.code === "PASSWORD_CHANGE_REQUIRED") {
            const params = new URLSearchParams({
              username: values.username,
            });
            if (parsed.schoolSlug) {
              params.set("schoolSlug", parsed.schoolSlug);
            }
            router.push(`/first-password?${params.toString()}`);
            return;
          }
        }
        throw new Error(t("login.errors.invalidUsernamePassword"));
      }

      savePreferredMethod("username");
      await redirectAfterLogin();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("login.errors.connectionError"),
      );
    } finally {
      setLoadingUsername(false);
    }
  }

  const otherMethods = ALL_METHODS.filter((m) => m.key !== activeMethod);
  const activeMethodLabel =
    ALL_METHODS.find((m) => m.key === activeMethod)?.label ?? "";

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-card border border-notification/30 bg-notification/10 px-3 py-2 text-sm text-notification">
          {error}
        </div>
      ) : null}

      {/* Language switcher (device setting) */}
      <div
        className="flex items-center justify-end gap-2"
        role="group"
        aria-label={t("login.languageSwitcher.ariaLabel")}
        data-testid="login-language-switcher"
      >
        {SUPPORTED_LOCALES.map((option) => {
          const selected = locale === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              aria-pressed={selected}
              data-testid={`login-language-${option}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-text-secondary"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Method switcher */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">
          {activeMethodLabel}
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-label={t("login.switchMethod")}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setShowMethodDropdown((v) => !v)}
          >
            {t("login.switchMethod")}
          </button>
          {showMethodDropdown ? (
            <div className="absolute right-0 z-10 mt-1 min-w-[220px] rounded-card border border-border bg-surface py-1 shadow-card">
              {otherMethods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => switchMethod(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            {t("login.method.phone")}
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            {t("login.phone.subtitle")}
          </p>
          <form
            className="grid gap-3"
            onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
            noValidate
          >
            <FormField
              label={t("login.phone.fieldPhone")}
              error={
                showPhoneErrors
                  ? getZodFieldError(phoneValidation, "phone")
                  : null
              }
            >
              <Controller
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormTextInput
                    name={field.name}
                    ref={field.ref}
                    invalid={
                      showPhoneErrors
                        ? !!getZodFieldError(phoneValidation, "phone")
                        : false
                    }
                    value={field.value}
                    onChange={(event) =>
                      phoneForm.setValue(
                        "phone",
                        normalizePhoneInput(event.target.value),
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                    onBlur={field.onBlur}
                    placeholder="6XXXXXXXX"
                  />
                )}
              />
            </FormField>

            <FormField
              label={t("login.phone.fieldPin")}
              error={
                showPhoneErrors
                  ? getZodFieldError(phoneValidation, "pin")
                  : null
              }
            >
              <Controller
                control={phoneForm.control}
                name="pin"
                render={({ field }) => (
                  <PinInput
                    aria-label={t("login.phone.fieldPin")}
                    name={field.name}
                    aria-invalid={
                      showPhoneErrors
                        ? getZodFieldError(phoneValidation, "pin")
                          ? "true"
                          : "false"
                        : "false"
                    }
                    value={field.value}
                    onChange={(event) =>
                      phoneForm.setValue("pin", event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onBlur={field.onBlur}
                    placeholder="123456"
                  />
                )}
              />
            </FormField>
            <FormSubmitHint visible={!phoneValidation.success} />

            <Button
              type="submit"
              disabled={loadingPhone || !phoneValidation.success}
            >
              {loadingPhone
                ? t("login.phone.submitLoading")
                : t("login.phone.submit")}
            </Button>
            <Link
              href={`/pin-oublie${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`}
              className="justify-self-start text-xs font-medium text-primary hover:underline"
            >
              {t("login.phone.forgotPin")}
            </Link>
          </form>
        </section>

        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            {t("login.method.email")}
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            {t("login.email.subtitle")}
          </p>
          <form
            className="grid gap-3"
            onSubmit={credentialsForm.handleSubmit(onSubmit)}
            noValidate
          >
            <FormField
              label={t("login.email.fieldEmail")}
              error={
                showCredentialErrors
                  ? getZodFieldError(credentialsValidation, "email")
                  : null
              }
            >
              <Controller
                control={credentialsForm.control}
                name="email"
                render={({ field }) => (
                  <EmailInput
                    name={field.name}
                    invalid={
                      showCredentialErrors
                        ? !!getZodFieldError(credentialsValidation, "email")
                        : false
                    }
                    value={field.value}
                    onChange={(event) =>
                      credentialsForm.setValue("email", event.target.value, {
                        shouldDirty: true,
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
              label={t("login.common.password")}
              error={
                showCredentialErrors
                  ? getZodFieldError(credentialsValidation, "password")
                  : null
              }
            >
              <Controller
                control={credentialsForm.control}
                name="password"
                render={({ field }) => (
                  <PasswordInput
                    aria-label={t("login.common.password")}
                    name={field.name}
                    aria-invalid={
                      showCredentialErrors
                        ? getZodFieldError(credentialsValidation, "password")
                          ? "true"
                          : "false"
                        : "false"
                    }
                    value={field.value}
                    onChange={(event) =>
                      credentialsForm.setValue("password", event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>
            <FormSubmitHint visible={!credentialsValidation.success} />
            <Button
              type="submit"
              disabled={loading || !credentialsValidation.success}
            >
              {loading
                ? t("login.email.submitLoading")
                : t("login.email.submit")}
            </Button>
            <Link
              href={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="justify-self-start text-xs font-medium text-primary hover:underline"
            >
              {t("login.common.forgotPassword")}
            </Link>
          </form>
        </section>

        {activeMethod === "username" ? (
          <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
            <h3 className="font-heading text-base font-semibold">
              {t("login.method.username")}
            </h3>
            <p className="mb-3 text-xs text-text-secondary">
              {t("login.username.subtitle")}
            </p>
            <form
              className="grid gap-3"
              onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}
              noValidate
            >
              <FormField
                label={t("login.username.fieldUsername")}
                error={
                  showUsernameErrors
                    ? getZodFieldError(usernameValidation, "username")
                    : null
                }
              >
                <Controller
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormTextInput
                      name={field.name}
                      ref={field.ref}
                      invalid={
                        showUsernameErrors
                          ? !!getZodFieldError(usernameValidation, "username")
                          : false
                      }
                      value={field.value}
                      onChange={(event) =>
                        usernameForm.setValue("username", event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      onBlur={field.onBlur}
                      placeholder="PrenomNOM"
                    />
                  )}
                />
              </FormField>

              <FormField
                label={t("login.common.password")}
                error={
                  showUsernameErrors
                    ? getZodFieldError(usernameValidation, "password")
                    : null
                }
              >
                <Controller
                  control={usernameForm.control}
                  name="password"
                  render={({ field }) => (
                    <PasswordInput
                      aria-label={t("login.username.passwordAriaLabel")}
                      name={field.name}
                      aria-invalid={
                        showUsernameErrors
                          ? getZodFieldError(usernameValidation, "password")
                            ? "true"
                            : "false"
                          : "false"
                      }
                      value={field.value}
                      onChange={(event) =>
                        usernameForm.setValue("password", event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </FormField>
              <FormSubmitHint visible={!usernameValidation.success} />
              <Button
                type="submit"
                disabled={loadingUsername || !usernameValidation.success}
              >
                {loadingUsername
                  ? t("login.username.submitLoading")
                  : t("login.username.submit")}
              </Button>
              <Link
                href="/identifiant-oublie"
                className="justify-self-start text-xs font-medium text-primary hover:underline"
              >
                {t("login.common.forgotPassword")}
              </Link>
            </form>
          </section>
        ) : null}

        <section className="min-w-[260px] flex-1 rounded-card border border-border bg-surface p-4">
          <h3 className="font-heading text-base font-semibold">
            {t("login.method.sso")}
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            {t("login.sso.subtitle")}
          </p>
          <SsoButtons />
        </section>
      </div>
    </div>
  );
}
