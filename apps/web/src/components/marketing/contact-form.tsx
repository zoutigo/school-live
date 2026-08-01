"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
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

function buildSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(2, t("contactPage.form.error.name")),
    email: z.string().email(t("contactPage.form.error.email")),
    subject: z.string().min(3, t("contactPage.form.error.subject")),
    message: z.string().min(10, t("contactPage.form.error.message")),
  });
}

type ContactValues = z.infer<ReturnType<typeof buildSchema>>;

export function ContactForm({ locale = "fr" }: { locale?: MarketingLocale }) {
  const { t } = useFixedTranslation(locale);
  const [submitted, setSubmitted] = useState(false);
  const [showRequiredHint, setShowRequiredHint] = useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(buildSchema(t)),
    mode: "onChange",
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  function onValid() {
    setShowRequiredHint(false);
    setSubmitted(true);
    form.reset();
  }

  function onInvalid(errors: FieldErrors<ContactValues>) {
    setShowRequiredHint(true);
    if (errors.name) {
      form.setFocus("name");
    } else if (errors.email) {
      form.setFocus("email");
    } else if (errors.subject) {
      form.setFocus("subject");
    } else if (errors.message) {
      form.setFocus("message");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-[20px] border border-teal-border bg-teal-surface p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-accent-teal-dark" />
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
      className="flex flex-col gap-5 rounded-[20px] border border-border bg-surface p-8 shadow-card"
    >
      <FormField
        label={t("contactPage.form.name")}
        htmlFor="contact-name"
        error={form.formState.errors.name?.message}
      >
        <FormTextInput
          id="contact-name"
          invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
      </FormField>

      <FormField
        label={t("contactPage.form.email")}
        htmlFor="contact-email"
        error={form.formState.errors.email?.message}
      >
        <FormTextInput
          id="contact-email"
          type="email"
          invalid={!!form.formState.errors.email}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        label={t("contactPage.form.subject")}
        htmlFor="contact-subject"
        error={form.formState.errors.subject?.message}
      >
        <FormTextInput
          id="contact-subject"
          invalid={!!form.formState.errors.subject}
          {...form.register("subject")}
        />
      </FormField>

      <FormField
        label={t("contactPage.form.message")}
        htmlFor="contact-message"
        error={form.formState.errors.message?.message}
      >
        <FormTextarea
          id="contact-message"
          rows={5}
          invalid={!!form.formState.errors.message}
          {...form.register("message")}
        />
      </FormField>

      <FormSubmitHint visible={showRequiredHint} />

      <Button type="submit" className="mt-1 w-full">
        {t("contactPage.form.submit")}
      </Button>
    </form>
  );
}
