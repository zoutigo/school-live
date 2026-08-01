"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/ui/form-field";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { FormRichTextEditor } from "../../components/ui/form-rich-text-editor";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { OnboardingTarget } from "../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  LEGAL_DOCUMENT_LOCALES,
  LEGAL_DOCUMENT_SLUGS,
  siteContentApi,
  type LegalDocumentItem,
  type LegalDocumentLocale,
  type LegalDocumentSlug,
} from "./site-content-api";
import {
  SITE_CONTENT_TOUR_ID,
  SITE_CONTENT_TOUR_STEPS,
  SITE_CONTENT_TOUR_TARGETS,
} from "./site-content-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Tab = "contact" | "legal";

function buildContactSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t("siteContent.contact.error.email")),
    phone: z.string().min(1, t("siteContent.contact.error.phone")),
    address: z.string().min(1, t("siteContent.contact.error.address")),
  });
}

type ContactFormValues = z.infer<ReturnType<typeof buildContactSchema>>;

function buildLegalDraftSchema(t: TranslateFn) {
  return z.object({
    title: z.string().min(1, t("siteContent.legal.error.title")),
    contentHtml: z
      .string()
      .refine(
        (value) => value.replace(/<[^>]*>/g, "").trim().length > 0,
        t("siteContent.legal.error.content"),
      ),
  });
}

type LegalDraftFormValues = z.infer<ReturnType<typeof buildLegalDraftSchema>>;

export default function SiteContentPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("contact");

  const activeTourId = useOnboardingTourStore((state) => state.activeTourId);
  const tourSteps = useOnboardingTourStore((state) => state.steps);
  const tourStepIndex = useOnboardingTourStore((state) => state.stepIndex);

  useEffect(() => {
    void boot();
  }, []);

  // Steps 2 and 3 of the tour target controls that only exist in the
  // "legal" tab — force that tab while the tour is on one of them so the
  // target actually mounts (see create-help skill, §2ter-c).
  useEffect(() => {
    if (activeTourId !== SITE_CONTENT_TOUR_ID) return;
    const currentTargetKey = tourSteps[tourStepIndex]?.targetKey;
    if (
      currentTargetKey === SITE_CONTENT_TOUR_TARGETS.selectors ||
      currentTargetKey === SITE_CONTENT_TOUR_TARGETS.newDraft
    ) {
      setTab("legal");
    }
  }, [activeTourId, tourSteps, tourStepIndex]);

  async function boot() {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as {
        activeRole?: string | null;
        onboardingHelpEnabled?: boolean;
      };
      if (me.activeRole !== "SUPER_ADMIN" && me.activeRole !== "ADMIN") {
        router.replace("/acceuil");
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        me.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("platform", SITE_CONTENT_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          SITE_CONTENT_TOUR_ID,
          "platform",
          SITE_CONTENT_TOUR_STEPS,
        );
      }
    } catch {
      router.replace("/");
      return;
    } finally {
      setReady(true);
    }
  }

  if (!ready) {
    return null;
  }

  return (
    <AppShell schoolName="Scolive Platform">
      <div className="grid gap-4">
        <Card
          title={t("siteContent.title")}
          subtitle={t("siteContent.subtitle")}
        >
          <OnboardingTarget id={SITE_CONTENT_TOUR_TARGETS.tabs}>
            <div className="mb-4 flex items-end gap-2 border-b border-border">
              <button
                type="button"
                onClick={() => setTab("contact")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "contact"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("siteContent.tabs.contact")}
              </button>
              <button
                type="button"
                onClick={() => setTab("legal")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "legal"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("siteContent.tabs.legal")}
              </button>
            </div>
          </OnboardingTarget>

          {tab === "contact" ? (
            <ContactTab t={t} />
          ) : (
            <LegalDocumentsTab t={t} locale={locale} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function ContactTab({ t }: { t: TranslateFn }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showRequiredHint, setShowRequiredHint] = useState(false);

  const schema = useMemo(() => buildContactSchema(t), [t]);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "", phone: "", address: "" },
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const info = await siteContentApi.getContactInfo();
      form.reset(info);
    } catch {
      setLoadError(t("siteContent.contact.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function onValid(values: ContactFormValues) {
    setShowRequiredHint(false);
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await siteContentApi.updateContactInfo(values);
      form.reset(updated);
      setFeedback({
        type: "success",
        message: t("siteContent.contact.saveSuccess"),
      });
    } catch {
      setFeedback({
        type: "error",
        message: t("siteContent.contact.saveError"),
      });
    } finally {
      setSaving(false);
    }
  }

  function onInvalid(errors: FieldErrors<ContactFormValues>) {
    setShowRequiredHint(true);
    if (errors.email) {
      form.setFocus("email");
    } else if (errors.phone) {
      form.setFocus("phone");
    } else if (errors.address) {
      form.setFocus("address");
    }
  }

  if (loading) {
    return <p className="text-sm text-text-secondary">…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-notification">{loadError}</p>;
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onValid, onInvalid)}
      className="grid max-w-lg gap-4"
    >
      <FormField
        label={t("siteContent.contact.emailLabel")}
        htmlFor="site-contact-email"
        error={form.formState.errors.email?.message}
      >
        <FormTextInput
          id="site-contact-email"
          type="email"
          invalid={!!form.formState.errors.email}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.phoneLabel")}
        htmlFor="site-contact-phone"
        error={form.formState.errors.phone?.message}
      >
        <FormTextInput
          id="site-contact-phone"
          invalid={!!form.formState.errors.phone}
          {...form.register("phone")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.addressLabel")}
        htmlFor="site-contact-address"
        error={form.formState.errors.address?.message}
      >
        <FormTextInput
          id="site-contact-address"
          invalid={!!form.formState.errors.address}
          {...form.register("address")}
        />
      </FormField>

      <FormSubmitHint visible={showRequiredHint} />

      {feedback ? (
        <p
          className={`text-sm ${
            feedback.type === "success"
              ? "text-accent-teal-dark"
              : "text-notification"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="w-fit">
        {t("siteContent.contact.save")}
      </Button>
    </form>
  );
}

function LegalDocumentsTab({ t, locale }: { t: TranslateFn; locale: string }) {
  const [slug, setSlug] = useState<LegalDocumentSlug>("cgu");
  const [docLocale, setDocLocale] = useState<LegalDocumentLocale>(
    locale === "en" ? "en" : "fr",
  );
  const [items, setItems] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "publish" | "delete";
    id: string;
  } | null>(null);

  const schema = useMemo(() => buildLegalDraftSchema(t), [t]);
  const form = useForm<LegalDraftFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { title: "", contentHtml: "" },
  });

  useEffect(() => {
    void load();
    setEditingId(null);
    form.reset({ title: "", contentHtml: "" });
  }, [slug, docLocale]);

  async function load() {
    setLoading(true);
    setListError(null);
    try {
      const list = await siteContentApi.listLegalDocuments({
        slug,
        locale: docLocale,
      });
      setItems(list);
    } catch {
      setListError(t("siteContent.legal.listError"));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: LegalDocumentItem) {
    setEditingId(item.id);
    form.reset({ title: item.title, contentHtml: item.contentHtml });
    setFeedback(null);
  }

  function startNewDraft() {
    setEditingId("new");
    form.reset({ title: "", contentHtml: "" });
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    form.reset({ title: "", contentHtml: "" });
  }

  async function onValid(values: LegalDraftFormValues) {
    setFeedback(null);
    try {
      if (editingId === "new") {
        await siteContentApi.createLegalDocument({
          slug,
          locale: docLocale,
          ...values,
        });
        setFeedback({
          type: "success",
          message: t("siteContent.legal.createSuccess"),
        });
      } else if (editingId) {
        await siteContentApi.updateLegalDocument(editingId, values);
        setFeedback({
          type: "success",
          message: t("siteContent.legal.saveDraftSuccess"),
        });
      }
      setEditingId(null);
      form.reset({ title: "", contentHtml: "" });
      await load();
    } catch {
      setFeedback({
        type: "error",
        message:
          editingId === "new"
            ? t("siteContent.legal.createError")
            : t("siteContent.legal.saveDraftError"),
      });
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    setFeedback(null);
    try {
      if (pendingAction.type === "publish") {
        await siteContentApi.publishLegalDocument(pendingAction.id);
        setFeedback({
          type: "success",
          message: t("siteContent.legal.publishSuccess"),
        });
      } else {
        await siteContentApi.deleteLegalDocument(pendingAction.id);
        setFeedback({
          type: "success",
          message: t("siteContent.legal.deleteSuccess"),
        });
      }
      await load();
    } catch {
      setFeedback({
        type: "error",
        message:
          pendingAction.type === "publish"
            ? t("siteContent.legal.publishError")
            : t("siteContent.legal.deleteError"),
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-5">
      <OnboardingTarget id={SITE_CONTENT_TOUR_TARGETS.selectors}>
        <div className="flex flex-wrap gap-4">
          <FormField
            label={t("siteContent.legal.slugLabel")}
            htmlFor="legal-slug"
          >
            <FormSelect
              id="legal-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value as LegalDocumentSlug)}
            >
              {LEGAL_DOCUMENT_SLUGS.map((value) => (
                <option key={value} value={value}>
                  {t(`siteContent.legal.slug.${value}`)}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField
            label={t("siteContent.legal.localeLabel")}
            htmlFor="legal-locale"
          >
            <FormSelect
              id="legal-locale"
              value={docLocale}
              onChange={(e) =>
                setDocLocale(e.target.value as LegalDocumentLocale)
              }
            >
              {LEGAL_DOCUMENT_LOCALES.map((value) => (
                <option key={value} value={value}>
                  {t(`siteContent.legal.locale.${value}`)}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
      </OnboardingTarget>

      {feedback ? (
        <p
          className={`text-sm ${
            feedback.type === "success"
              ? "text-accent-teal-dark"
              : "text-notification"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-secondary">…</p>
      ) : listError ? (
        <p className="text-sm text-notification">{listError}</p>
      ) : (
        <div className="grid gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t("siteContent.legal.empty")}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-warm-surface p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {item.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("siteContent.legal.version")} {item.version} —{" "}
                    {t(`siteContent.legal.status.${item.status}`)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {item.status === "DRAFT" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => startEdit(item)}
                      >
                        {t("siteContent.legal.edit")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          setPendingAction({ type: "publish", id: item.id })
                        }
                      >
                        {t("siteContent.legal.publish")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setPendingAction({ type: "delete", id: item.id })
                        }
                      >
                        {t("siteContent.legal.delete")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {editingId === null ? (
            <OnboardingTarget id={SITE_CONTENT_TOUR_TARGETS.newDraft}>
              <Button type="button" variant="secondary" onClick={startNewDraft}>
                {t("siteContent.legal.newDraftTitle")}
              </Button>
            </OnboardingTarget>
          ) : (
            <form
              noValidate
              onSubmit={form.handleSubmit(onValid)}
              className="grid gap-4 rounded-[14px] border border-border p-4"
            >
              <FormField
                label={t("siteContent.legal.titleLabel")}
                htmlFor="legal-draft-title"
                error={form.formState.errors.title?.message}
              >
                <FormTextInput
                  id="legal-draft-title"
                  invalid={!!form.formState.errors.title}
                  {...form.register("title")}
                />
              </FormField>

              <Controller
                control={form.control}
                name="contentHtml"
                render={({ field }) => (
                  <FormRichTextEditor
                    label={t("siteContent.legal.contentLabel")}
                    value={field.value}
                    onChange={field.onChange}
                    allowInlineImages={false}
                    error={form.formState.errors.contentHtml?.message}
                    invalid={!!form.formState.errors.contentHtml}
                  />
                )}
              />

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId === "new"
                    ? t("siteContent.legal.createDraft")
                    : t("siteContent.legal.saveDraft")}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  {t("siteContent.legal.cancel")}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "publish"
            ? t("siteContent.legal.publish")
            : t("siteContent.legal.delete")
        }
        message={
          pendingAction?.type === "publish"
            ? t("siteContent.legal.publishConfirm")
            : t("siteContent.legal.deleteConfirm")
        }
        confirmLabel={
          pendingAction?.type === "publish"
            ? t("siteContent.legal.publish")
            : t("siteContent.legal.delete")
        }
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
