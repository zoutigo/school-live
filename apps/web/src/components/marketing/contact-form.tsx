"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Tag,
  User,
} from "lucide-react";
import { FormField } from "../ui/form-field";
import {
  FormTextInput,
  FormTextarea,
  FormSubmitHint,
} from "../ui/form-controls";
import { Button } from "../ui/button";
import {
  useFixedTranslation,
  type TranslateFn,
} from "../../i18n/useTranslation";
import type { MarketingLocale } from "../../lib/seo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const MESSAGE_MAX_LENGTH = 5000;

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

function buildSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(2, t("contactPage.form.error.name")),
    email: z.string().email(t("contactPage.form.error.email")),
    phone: z.string().regex(/^\d{9}$/, t("contactPage.form.error.phone")),
    subject: z.string().min(3, t("contactPage.form.error.subject")),
    message: z
      .string()
      .min(10, t("contactPage.form.error.message"))
      .max(MESSAGE_MAX_LENGTH, t("contactPage.form.error.message")),
    website: z.string().max(0).optional(),
  });
}

type ContactValues = z.infer<ReturnType<typeof buildSchema>>;

export function ContactForm({ locale = "fr" }: { locale?: MarketingLocale }) {
  const { t } = useFixedTranslation(locale);
  const [submitted, setSubmitted] = useState(false);
  const [showRequiredHint, setShowRequiredHint] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(buildSchema(t)),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  const messageLength = form.watch("message")?.length ?? 0;

  async function onValid(values: ContactValues) {
    setShowRequiredHint(false);
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/public/site-content/contact-submissions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      if (!response.ok) {
        setServerError(
          response.status === 429
            ? t("contactPage.form.error.rateLimited")
            : t("contactPage.form.error.server"),
        );
        return;
      }
      setSubmitted(true);
      form.reset();
    } catch {
      setServerError(t("contactPage.form.error.server"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function onInvalid(errors: FieldErrors<ContactValues>) {
    setShowRequiredHint(true);
    if (errors.name) {
      form.setFocus("name");
    } else if (errors.email) {
      form.setFocus("email");
    } else if (errors.phone) {
      form.setFocus("phone");
    } else if (errors.subject) {
      form.setFocus("subject");
    } else if (errors.message) {
      form.setFocus("message");
    }
  }

  if (submitted) {
    return (
      <div className="animate-in fade-in zoom-in-95 flex flex-col items-center rounded-[20px] border border-teal-border bg-teal-surface p-10 text-center duration-300">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10">
          <CheckCircle2 className="h-9 w-9 text-accent-teal-dark" />
        </span>
        <h3 className="mt-4 font-heading text-lg font-bold text-text-primary">
          {t("contactPage.form.success.title")}
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          {t("contactPage.form.success.body")}
        </p>
        <Button className="mt-6" onClick={() => setSubmitted(false)}>
          {t("contactPage.form.success.again")}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onValid, onInvalid)}
      className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-card"
    >
      <div
        aria-hidden="true"
        className="h-1.5 bg-gradient-to-r from-primary via-accent-teal to-warm-accent"
      />

      <div className="relative flex flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">
              {t("contactPage.form.title")}
            </h2>
            <p className="text-sm text-text-secondary">
              {t("contactPage.form.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label={t("contactPage.form.name")}
            htmlFor="contact-name"
            error={form.formState.errors.name?.message}
          >
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <FormTextInput
                id="contact-name"
                className="pl-10"
                invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
            </div>
          </FormField>

          <FormField
            label={t("contactPage.form.email")}
            htmlFor="contact-email"
            error={form.formState.errors.email?.message}
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <FormTextInput
                id="contact-email"
                type="email"
                className="pl-10"
                invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
            </div>
          </FormField>

          <FormField
            label={t("contactPage.form.phone")}
            htmlFor="contact-phone"
            error={form.formState.errors.phone?.message}
          >
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormTextInput
                    id="contact-phone"
                    className="pl-10"
                    invalid={!!form.formState.errors.phone}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      form.setValue(
                        "phone",
                        normalizePhoneInput(event.target.value),
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                    placeholder="6XXXXXXXX"
                    inputMode="numeric"
                  />
                )}
              />
            </div>
          </FormField>

          <FormField
            label={t("contactPage.form.subject")}
            htmlFor="contact-subject"
            error={form.formState.errors.subject?.message}
          >
            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <FormTextInput
                id="contact-subject"
                className="pl-10"
                invalid={!!form.formState.errors.subject}
                {...form.register("subject")}
              />
            </div>
          </FormField>
        </div>

        <div>
          <FormField
            label={t("contactPage.form.message")}
            htmlFor="contact-message"
            error={form.formState.errors.message?.message}
          >
            <FormTextarea
              id="contact-message"
              rows={5}
              maxLength={MESSAGE_MAX_LENGTH}
              invalid={!!form.formState.errors.message}
              {...form.register("message")}
            />
          </FormField>
          <span className="mt-1 block text-right text-xs text-text-secondary">
            {messageLength}/{MESSAGE_MAX_LENGTH}
          </span>
        </div>

        {/* Honeypot anti-spam : invisible et non atteignable au clavier pour
            un visiteur humain, seuls les bots le remplissent. */}
        <div
          aria-hidden="true"
          className="absolute h-0 w-0 overflow-hidden opacity-0"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
          />
        </div>

        {serverError ? (
          <p
            role="alert"
            className="rounded-2xl border border-notification/30 bg-notification/5 px-4 py-3 text-sm text-notification"
          >
            {serverError}
          </p>
        ) : null}

        <FormSubmitHint visible={showRequiredHint} />

        <Button
          type="submit"
          disabled={isSubmitting}
          iconLeft={<Send className="h-4 w-4" />}
          className="mt-1 w-full"
        >
          {isSubmitting
            ? t("contactPage.form.sending")
            : t("contactPage.form.submit")}
        </Button>
      </div>
    </form>
  );
}
