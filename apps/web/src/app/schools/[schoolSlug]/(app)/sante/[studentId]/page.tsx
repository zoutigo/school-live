"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../../components/ui/card";
import { Button } from "../../../../../../components/ui/button";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../../../../../../components/ui/form-controls";
import { FormField } from "../../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../../lib/auth-cookies";
import { useTranslation } from "../../../../../../i18n/useTranslation";
import { OnboardingTarget } from "../../../../../../components/onboarding/onboarding-target";
import { HEALTH_SCHOOL_TOUR_TARGETS } from "../../../../../../components/health/health-school-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";

type CareEventRow = {
  id: string;
  summary: string;
  description: string | null;
  occurredAt: string;
  alertLevel: AlertLevel;
  authorUser: { firstName: string; lastName: string } | null;
};

type ReportRow = {
  id: string;
  type: string;
  alertLevel: AlertLevel;
  description: string;
  createdAt: string;
  acknowledgedAt: string | null;
  reportedByUser: { firstName: string; lastName: string } | null;
};

type HistoryItem =
  | { kind: "CARE_EVENT"; at: string; payload: CareEventRow }
  | { kind: "REPORT"; at: string; payload: ReportRow };

type ConditionRow = {
  id: string;
  type: string;
  alertLevel: AlertLevel;
  label: string;
  description: string | null;
  active: boolean;
};

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

function careEventSchema() {
  return z.object({
    summary: z.string().trim().min(1),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    description: z.string().trim().optional(),
  });
}

type CareEventFormValues = z.infer<ReturnType<typeof careEventSchema>>;

export default function SchoolSanteStudentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug, studentId } = useParams<{
    schoolSlug: string;
    studentId: string;
  }>();
  const searchParams = useSearchParams();

  const firstName = searchParams.get("firstName") ?? "";
  const lastName = searchParams.get("lastName") ?? "";
  const className = searchParams.get("className") ?? "";
  const ageParam = searchParams.get("age");
  const age = ageParam ? Number(ageParam) : null;

  const [tab, setTab] = useState<"cares" | "conditions">("cares");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CareEventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => careEventSchema(), []);
  const form = useForm<CareEventFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { summary: "", alertLevel: "INFO", description: "" },
  });
  const values = form.watch();

  const loadHistory = useCallback(() => {
    if (!schoolSlug || !studentId) return;
    fetch(
      `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/history?page=1&limit=20`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((payload: { items: HistoryItem[] }) =>
        setHistory(payload.items ?? []),
      )
      .catch(() => setLoadError(t("health.admin.profile.errors.load")));
  }, [schoolSlug, studentId, t]);

  const loadConditions = useCallback(() => {
    if (!schoolSlug || !studentId) return;
    fetch(
      `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/conditions?page=1&limit=20`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((payload: { items: ConditionRow[] }) =>
        setConditions(payload.items ?? []),
      )
      .catch(() => setLoadError(t("health.admin.profile.errors.load")));
  }, [schoolSlug, studentId, t]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (tab === "conditions") loadConditions();
  }, [tab, loadConditions]);

  function openCreate() {
    setEditing(null);
    form.reset({ summary: "", alertLevel: "INFO", description: "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(event: CareEventRow) {
    setEditing(event);
    form.reset({
      summary: event.summary,
      alertLevel: event.alertLevel,
      description: event.description ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function submitCareEvent(payload: CareEventFormValues) {
    if (!schoolSlug || !studentId) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const url = editing
        ? `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/care-events/${editing.id}`
        : `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/care-events`;
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          summary: payload.summary,
          alertLevel: payload.alertLevel,
          description: payload.description || undefined,
        }),
      });
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      setFormOpen(false);
      setEditing(null);
      loadHistory();
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  const studentName = `${lastName} ${firstName}`.trim();

  return (
    <div className="grid gap-4" data-testid="school-sante-student-page">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              {studentName || t("health.title")}
            </h2>
            <p className="text-sm text-text-secondary">
              {className || t("health.admin.profile.noClass")}
              {" · "}
              {age != null
                ? `${age} ${t("health.admin.eleves.ageUnit")}`
                : t("health.admin.profile.ageUnknown")}
            </p>
          </div>
          <OnboardingTarget id={HEALTH_SCHOOL_TOUR_TARGETS.studentFab}>
            <Button
              type="button"
              onClick={openCreate}
              data-testid="sante-student-add-care"
            >
              {t("health.admin.profile.addCare")}
            </Button>
          </OnboardingTarget>
        </div>
      </Card>

      {formOpen ? (
        <Card
          title={
            editing
              ? t("health.admin.profile.form.editTitle")
              : t("health.admin.profile.form.createTitle")
          }
        >
          {formError ? (
            <p className="mb-2 text-sm text-notification">{formError}</p>
          ) : null}
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={form.handleSubmit(submitCareEvent)}
            noValidate
          >
            <FormField
              label={t("health.form.label")}
              error={form.formState.errors.summary?.message}
              className="md:col-span-2"
            >
              <FormTextInput
                invalid={!!form.formState.errors.summary}
                value={values.summary}
                onChange={(e) =>
                  form.setValue("summary", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                placeholder={t("health.form.careSummaryPlaceholder")}
                data-testid="sante-care-form-summary"
              />
            </FormField>

            <FormField
              label={t("health.form.alertLevel")}
              htmlFor="care-alert-level"
            >
              <FormSelect
                id="care-alert-level"
                value={values.alertLevel}
                onChange={(e) =>
                  form.setValue("alertLevel", e.target.value as AlertLevel, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                data-testid="sante-care-form-alertLevel"
              >
                <option value="INFO">{t("health.alertLevel.INFO")}</option>
                <option value="ATTENTION">
                  {t("health.alertLevel.ATTENTION")}
                </option>
                <option value="URGENT">{t("health.alertLevel.URGENT")}</option>
              </FormSelect>
            </FormField>

            <FormField
              label={t("health.form.description")}
              className="md:col-span-2"
            >
              <FormTextarea
                value={values.description}
                onChange={(e) =>
                  form.setValue("description", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                rows={3}
                data-testid="sante-care-form-description"
              />
            </FormField>

            <div className="flex items-center gap-3 md:col-span-2">
              <SubmitButton
                disabled={saving}
                data-testid="sante-care-form-submit"
              >
                {editing
                  ? t("health.admin.profile.form.submitEdit")
                  : t("health.form.submitCareEvent")}
              </SubmitButton>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
                data-testid="sante-care-form-cancel"
              >
                {t("health.parent.form.cancel")}
              </Button>
              <FormSubmitHint visible={!form.formState.isValid} />
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <div className="flex gap-2 border-b border-warm-border">
            {(
              [
                ["cares", t("health.admin.profile.tabs.cares")],
                ["conditions", t("health.admin.profile.tabs.conditions")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-testid={`sante-student-tab-${key}`}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-semibold ${
                  tab === key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadError ? (
            <p className="mt-3 text-sm text-notification">{loadError}</p>
          ) : null}

          {tab === "cares" ? (
            <div className="mt-3 grid gap-2">
              {history.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("health.admin.profile.empty.cares")}
                </p>
              ) : (
                history.map((item) =>
                  item.kind === "CARE_EVENT" ? (
                    <div
                      key={item.payload.id}
                      className="rounded-card border border-border bg-background p-3"
                      data-testid={`sante-care-item-${item.payload.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.payload.summary}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(item.payload.alertLevel)}`}
                        >
                          {t(`health.alertLevel.${item.payload.alertLevel}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {new Date(item.payload.occurredAt).toLocaleString(
                          "fr-FR",
                        )}
                        {item.payload.authorUser
                          ? ` · ${t("health.admin.profile.byPrefix")} ${item.payload.authorUser.firstName} ${item.payload.authorUser.lastName}`
                          : ""}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-xs font-semibold text-primary underline"
                        onClick={() => openEdit(item.payload)}
                        data-testid={`sante-care-edit-${item.payload.id}`}
                      >
                        {t("health.admin.profile.editCare")}
                      </button>
                    </div>
                  ) : (
                    <div
                      key={item.payload.id}
                      className="rounded-card border border-border bg-background p-3"
                      data-testid={`sante-report-item-${item.payload.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {t(`health.reportType.${item.payload.type}`)}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(item.payload.alertLevel)}`}
                        >
                          {t(`health.alertLevel.${item.payload.alertLevel}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.payload.description}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {item.payload.acknowledgedAt
                          ? t("health.admin.cares.acknowledged")
                          : t("health.admin.cares.pending")}
                      </p>
                    </div>
                  ),
                )
              )}
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {conditions.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("health.admin.profile.empty.conditions")}
                </p>
              ) : (
                conditions.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-card border border-border bg-background p-3"
                    data-testid={`sante-condition-item-${row.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {row.label}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                      >
                        {t(`health.alertLevel.${row.alertLevel}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {t(`health.conditionType.${row.type}`)}
                    </p>
                    {row.description ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        {row.description}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
