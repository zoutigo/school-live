"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MailOpen, Pencil, Phone, User, X } from "lucide-react";
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
import { usePageHelp } from "../../store/page-help";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  LEGAL_DOCUMENT_LOCALES,
  LEGAL_DOCUMENT_SLUGS,
  siteContentApi,
  type ContactSubmission,
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

type Tab = "contact" | "legal" | "messages";

function buildContactSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t("siteContent.contact.error.email")),
    phone: z.string().min(1, t("siteContent.contact.error.phone")),
    addressStreet: z
      .string()
      .min(1, t("siteContent.contact.error.addressStreet")),
    addressDistrict: z.string(),
    addressCity: z.string().min(1, t("siteContent.contact.error.addressCity")),
    addressCountry: z
      .string()
      .min(1, t("siteContent.contact.error.addressCountry")),
    legalRepresentativeFirstName: z.string(),
    legalRepresentativeLastName: z.string(),
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

  usePageHelp({
    title: t(`siteContent.help.${tab}.title`),
    sections: (tab === "legal"
      ? [1, 2, 3]
      : tab === "contact"
        ? [1, 2]
        : [1]
    ).map((n) => ({
      title: t(`siteContent.help.${tab}.section${n}Title`),
      body: [t(`siteContent.help.${tab}.section${n}Body`)],
    })),
  });

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
              <button
                type="button"
                onClick={() => setTab("messages")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "messages"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("siteContent.tabs.messages")}
              </button>
            </div>
          </OnboardingTarget>

          {tab === "contact" ? (
            <ContactTab t={t} />
          ) : tab === "legal" ? (
            <LegalDocumentsTab t={t} locale={locale} />
          ) : (
            <MessagesTab t={t} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

const EMPTY_CONTACT_FORM: ContactFormValues = {
  email: "",
  phone: "",
  addressStreet: "",
  addressDistrict: "",
  addressCity: "",
  addressCountry: "",
  legalRepresentativeFirstName: "",
  legalRepresentativeLastName: "",
};

function ContactTab({ t }: { t: TranslateFn }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [contact, setContact] = useState<ContactFormValues | null>(null);
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
    defaultValues: EMPTY_CONTACT_FORM,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const info = await siteContentApi.getContactInfo();
      setContact(info);
      form.reset(info);
    } catch {
      setLoadError(t("siteContent.contact.loadError"));
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (contact) {
      form.reset(contact);
    }
    setFeedback(null);
    setShowRequiredHint(false);
    setMode("edit");
  }

  function cancelEdit() {
    if (contact) {
      form.reset(contact);
    }
    setShowRequiredHint(false);
    setMode("view");
  }

  async function onValid(values: ContactFormValues) {
    setShowRequiredHint(false);
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await siteContentApi.updateContactInfo(values);
      setContact(updated);
      form.reset(updated);
      setMode("view");
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
    } else if (errors.addressStreet) {
      form.setFocus("addressStreet");
    } else if (errors.addressCity) {
      form.setFocus("addressCity");
    } else if (errors.addressCountry) {
      form.setFocus("addressCountry");
    }
  }

  if (loading) {
    return <p className="text-sm text-text-secondary">…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-notification">{loadError}</p>;
  }

  if (mode === "view" && contact) {
    const legalRepresentativeName = [
      contact.legalRepresentativeFirstName,
      contact.legalRepresentativeLastName,
    ]
      .filter(Boolean)
      .join(" ");
    const addressLine = [
      contact.addressStreet,
      contact.addressDistrict,
      contact.addressCity,
      contact.addressCountry,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div className="grid max-w-lg gap-4">
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

        <div className="grid gap-3 rounded-[14px] border border-border bg-warm-surface p-4">
          <ViewRow label={t("siteContent.contact.emailLabel")}>
            {contact.email}
          </ViewRow>
          <ViewRow label={t("siteContent.contact.phoneLabel")}>
            {contact.phone}
          </ViewRow>
          <ViewRow label={t("siteContent.contact.addressGroupLabel")}>
            {addressLine || t("siteContent.contact.notProvided")}
          </ViewRow>
          <ViewRow
            label={t("siteContent.contact.legalRepresentativeFirstNameLabel")}
          >
            {legalRepresentativeName || t("siteContent.contact.notProvided")}
          </ViewRow>
        </div>

        <OnboardingTarget id={SITE_CONTENT_TOUR_TARGETS.contactEdit}>
          <Button
            type="button"
            onClick={startEdit}
            className="flex w-fit items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            {t("siteContent.contact.edit")}
          </Button>
        </OnboardingTarget>
      </div>
    );
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
        label={t("siteContent.contact.addressStreetLabel")}
        htmlFor="site-contact-address-street"
        error={form.formState.errors.addressStreet?.message}
      >
        <FormTextInput
          id="site-contact-address-street"
          invalid={!!form.formState.errors.addressStreet}
          {...form.register("addressStreet")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.addressDistrictLabel")}
        htmlFor="site-contact-address-district"
        error={form.formState.errors.addressDistrict?.message}
      >
        <FormTextInput
          id="site-contact-address-district"
          invalid={!!form.formState.errors.addressDistrict}
          {...form.register("addressDistrict")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.addressCityLabel")}
        htmlFor="site-contact-address-city"
        error={form.formState.errors.addressCity?.message}
      >
        <FormTextInput
          id="site-contact-address-city"
          invalid={!!form.formState.errors.addressCity}
          {...form.register("addressCity")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.addressCountryLabel")}
        htmlFor="site-contact-address-country"
        error={form.formState.errors.addressCountry?.message}
      >
        <FormTextInput
          id="site-contact-address-country"
          invalid={!!form.formState.errors.addressCountry}
          {...form.register("addressCountry")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.legalRepresentativeFirstNameLabel")}
        htmlFor="site-contact-legal-rep-first-name"
      >
        <FormTextInput
          id="site-contact-legal-rep-first-name"
          {...form.register("legalRepresentativeFirstName")}
        />
      </FormField>

      <FormField
        label={t("siteContent.contact.legalRepresentativeLastNameLabel")}
        htmlFor="site-contact-legal-rep-last-name"
      >
        <FormTextInput
          id="site-contact-legal-rep-last-name"
          {...form.register("legalRepresentativeLastName")}
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

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="w-fit">
          {t("siteContent.contact.save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={cancelEdit}
          className="w-fit"
        >
          {t("siteContent.contact.cancel")}
        </Button>
      </div>
    </form>
  );
}

function ViewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="text-sm text-text-primary">{children}</p>
    </div>
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

const MESSAGES_PAGE_SIZE = 20;

function formatSubmissionDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessagesTab({ t }: { t: TranslateFn }) {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void load();
  }, [page]);

  async function load() {
    setLoading(true);
    setListError(null);
    try {
      const result = await siteContentApi.listContactSubmissions({
        page,
        limit: MESSAGES_PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setListError(t("siteContent.messages.listError"));
    } finally {
      setLoading(false);
    }
  }

  async function openSubmission(item: ContactSubmission) {
    setDetailLoading(true);
    setSelected(item);
    try {
      const detail = await siteContentApi.getContactSubmission(item.id);
      setSelected(detail);
      if (!item.readAt) {
        setItems((prev) =>
          prev.map((current) => (current.id === detail.id ? detail : current)),
        );
      }
    } finally {
      setDetailLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE));

  return (
    <div className="grid gap-5">
      {loading ? (
        <p className="text-sm text-text-secondary">
          {t("siteContent.messages.loading")}
        </p>
      ) : listError ? (
        <p className="text-sm text-notification">{listError}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border py-12 text-center text-sm text-text-secondary">
          <Mail className="h-8 w-8 opacity-30" />
          <p className="font-medium">{t("siteContent.messages.empty.title")}</p>
          <p className="text-xs">{t("siteContent.messages.empty.hint")}</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="messages-list">
            {items.map((item) => {
              const unread = !item.readAt;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-testid={`message-item-${item.id}`}
                    onClick={() => void openSubmission(item)}
                    className={`w-full rounded-[16px] border px-4 py-3 text-left transition ${
                      unread
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-surface hover:bg-warm-highlight/40"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                        {unread ? (
                          <span
                            aria-label={t("siteContent.messages.unread")}
                            className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          />
                        ) : null}
                        {item.name}
                      </p>
                      <span className="shrink-0 text-[11px] text-text-secondary">
                        {formatSubmissionDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="mb-1 line-clamp-1 text-sm font-medium text-text-secondary">
                      {item.subject}
                    </p>
                    <p className="line-clamp-2 text-xs text-text-secondary">
                      {item.message}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("siteContent.messages.pagination.prev")}
              </Button>
              <span className="text-sm text-text-secondary">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("siteContent.messages.pagination.next")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("siteContent.messages.detail.close")}
            className="absolute inset-0 bg-[#2f2418]/40 backdrop-blur-[3px]"
            onClick={() => setSelected(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-detail-title"
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-[0_24px_60px_rgba(47,36,24,0.18)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-6 pb-4">
              <div>
                <h2
                  id="message-detail-title"
                  className="font-heading text-lg font-semibold text-text-primary"
                >
                  {selected.subject}
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {formatSubmissionDate(selected.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("siteContent.messages.detail.close")}
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-text-secondary hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-6">
              <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-background p-4 text-sm">
                <div className="flex items-center gap-2 text-text-primary">
                  <User className="h-4 w-4 text-text-secondary" />
                  <span className="font-medium">{selected.name}</span>
                </div>
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {selected.email}
                </a>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Phone className="h-4 w-4" />
                  {selected.phone}
                </div>
              </div>

              <p className="whitespace-pre-line text-sm text-text-primary">
                {selected.message}
              </p>

              {detailLoading ? (
                <p className="text-xs text-text-secondary">
                  {t("siteContent.messages.loading")}
                </p>
              ) : selected.readAt ? (
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <MailOpen className="h-3.5 w-3.5" />
                  {t("siteContent.messages.detail.read")}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <a
                href={`mailto:${selected.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-card border border-warm-border bg-warm-surface px-4 py-2 text-sm font-heading font-semibold text-primary transition-all duration-200 hover:bg-warm-highlight"
              >
                {t("siteContent.messages.detail.reply")}
              </a>
              <Button type="button" onClick={() => setSelected(null)}>
                {t("siteContent.messages.detail.close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
