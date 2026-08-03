"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../../../components/ui/card";
import {
  FormCheckbox,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../../../../../../../components/ui/form-controls";
import { FormField } from "../../../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { OnboardingTarget } from "../../../../../../../components/onboarding/onboarding-target";
import {
  HEALTH_PARENT_TOUR_ID,
  HEALTH_PARENT_TOUR_STEPS,
  HEALTH_PARENT_TOUR_TARGETS,
} from "../../../../../../../components/health/health-parent-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type LocalTab = "conditions" | "care" | "reports" | "history";

type ParentChild = { id: string; firstName: string; lastName: string };

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";
type ConditionType =
  | "ALLERGY"
  | "PATHOLOGY"
  | "TREATMENT"
  | "INSTRUCTION"
  | "OTHER";
type ReportType =
  | "MALADIE"
  | "TRAITEMENT"
  | "ACCIDENT"
  | "CONSULTATION"
  | "HOSPITALISATION"
  | "VACCINATION"
  | "RESTRICTION_SPORT"
  | "AUTRE";

type ConditionRow = {
  id: string;
  type: ConditionType;
  alertLevel: AlertLevel;
  label: string;
  description: string | null;
  active: boolean;
  isVisibleToAllTeachers: boolean;
  publicAlertLabel: string | null;
  createdAt: string;
};

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
  type: ReportType;
  alertLevel: AlertLevel;
  description: string;
  sportRestriction: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
};

function alertLevelLabel(t: TranslateFn, level: AlertLevel) {
  return t(`health.alertLevel.${level}`);
}

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

function conditionTypeLabel(t: TranslateFn, type: ConditionType) {
  return t(`health.conditionType.${type}`);
}

function reportTypeLabel(t: TranslateFn, type: ReportType) {
  return t(`health.reportType.${type}`);
}

function createConditionSchema(t: TranslateFn) {
  return z.object({
    type: z.enum(["ALLERGY", "PATHOLOGY", "TREATMENT", "INSTRUCTION", "OTHER"]),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    label: z.string().trim().min(1, t("health.validation.labelRequired")),
    description: z.string().trim().optional(),
  });
}

function createReportSchema(t: TranslateFn) {
  return z.object({
    type: z.enum([
      "MALADIE",
      "TRAITEMENT",
      "ACCIDENT",
      "CONSULTATION",
      "HOSPITALISATION",
      "VACCINATION",
      "RESTRICTION_SPORT",
      "AUTRE",
    ]),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    description: z
      .string()
      .trim()
      .min(1, t("health.validation.descriptionRequired")),
    sportRestriction: z.boolean().optional(),
  });
}

type ConditionFormValues = z.infer<ReturnType<typeof createConditionSchema>>;
type ReportFormValues = z.infer<ReturnType<typeof createReportSchema>>;

export default function ChildSantePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [careEvents, setCareEvents] = useState<CareEventRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<LocalTab>("conditions");

  const conditionSchema = useMemo(() => createConditionSchema(t), [t]);
  const reportSchema = useMemo(() => createReportSchema(t), [t]);

  const conditionForm = useForm<
    z.input<typeof conditionSchema>,
    unknown,
    z.output<typeof conditionSchema>
  >({
    resolver: zodResolver(conditionSchema),
    mode: "onChange",
    defaultValues: {
      type: "ALLERGY",
      alertLevel: "INFO",
      label: "",
      description: "",
    },
  });

  const reportForm = useForm<
    z.input<typeof reportSchema>,
    unknown,
    z.output<typeof reportSchema>
  >({
    resolver: zodResolver(reportSchema),
    mode: "onChange",
    defaultValues: {
      type: "MALADIE",
      alertLevel: "INFO",
      description: "",
      sportRestriction: false,
    },
  });

  const conditionValues = conditionForm.watch();
  const reportValues = reportForm.watch();

  useEffect(() => {
    if (!schoolSlug) return;
    void bootstrap();
  }, [schoolSlug, childId]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });
      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }
      const payload = (await meResponse.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
        onboardingHelpEnabled?: boolean;
      };
      if (payload.role !== "PARENT") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }
      const linked = payload.linkedStudents ?? [];
      setChildren(linked);
      if (linked.length > 0 && !linked.some((entry) => entry.id === childId)) {
        router.replace(`/schools/${schoolSlug}/children/${linked[0].id}/sante`);
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        payload.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("parent", HEALTH_PARENT_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          HEALTH_PARENT_TOUR_ID,
          "parent",
          HEALTH_PARENT_TOUR_STEPS,
        );
      }
      await Promise.all([
        loadConditions(schoolSlug, childId),
        loadCareEvents(schoolSlug, childId),
        loadReports(schoolSlug, childId),
      ]);
    } catch {
      setError(t("health.errors.load"));
    } finally {
      setLoading(false);
    }
  }

  async function loadConditions(slug: string, id: string) {
    const response = await fetch(
      `${API_URL}/schools/${slug}/students/${id}/health/conditions`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) return;
    setConditions((await response.json()) as ConditionRow[]);
  }

  async function loadCareEvents(slug: string, id: string) {
    const response = await fetch(
      `${API_URL}/schools/${slug}/students/${id}/health/care-events`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) return;
    setCareEvents((await response.json()) as CareEventRow[]);
  }

  async function loadReports(slug: string, id: string) {
    const response = await fetch(
      `${API_URL}/schools/${slug}/students/${id}/health/reports`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) return;
    setReports((await response.json()) as ReportRow[]);
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  async function submitCondition(values: ConditionFormValues) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${childId}/health/conditions`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: values.type,
            alertLevel: values.alertLevel,
            label: values.label,
            description: values.description || undefined,
          }),
        },
      );
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      conditionForm.reset({
        type: "ALLERGY",
        alertLevel: "INFO",
        label: "",
        description: "",
      });
      setSuccess(t("health.success.conditionCreated"));
      await loadConditions(schoolSlug, childId);
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function submitReport(values: ReportFormValues) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${childId}/health/reports`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: values.type,
            alertLevel: values.alertLevel,
            description: values.description,
            sportRestriction: values.sportRestriction ?? false,
          }),
        },
      );
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      reportForm.reset({
        type: "MALADIE",
        alertLevel: "INFO",
        description: "",
        sportRestriction: false,
      });
      setSuccess(t("health.success.reportCreated"));
      await loadReports(schoolSlug, childId);
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  const historyItems = useMemo(() => {
    const items = [
      ...conditions.map((row) => ({
        kind: "condition" as const,
        id: row.id,
        title: row.label,
        alertLevel: row.alertLevel,
        at: row.createdAt,
      })),
      ...careEvents.map((row) => ({
        kind: "care" as const,
        id: row.id,
        title: row.summary,
        alertLevel: row.alertLevel,
        at: row.occurredAt,
      })),
      ...reports.map((row) => ({
        kind: "report" as const,
        id: row.id,
        title: reportTypeLabel(t, row.type),
        alertLevel: row.alertLevel,
        at: row.createdAt,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [conditions, careEvents, reports, t]);

  return (
    <div className="grid gap-4">
      <Card
        title={t("health.title")}
        subtitle={
          currentChild
            ? `${currentChild.firstName} ${currentChild.lastName}`
            : t("health.subtitleDefault")
        }
      >
        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("health.common.loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : (
          <div className="grid gap-4">
            <OnboardingTarget
              id={HEALTH_PARENT_TOUR_TARGETS.tabs}
              className="flex flex-wrap items-end gap-2 border-b border-border"
            >
              {(
                [
                  ["conditions", t("health.tabs.conditions")],
                  ["care", t("health.tabs.care")],
                  ["reports", t("health.tabs.reports")],
                  ["history", t("health.tabs.history")],
                ] as [LocalTab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                    tab === key
                      ? "border border-border border-b-surface bg-surface text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </OnboardingTarget>

            {formError ? (
              <p className="text-sm text-notification">{formError}</p>
            ) : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            {tab === "conditions" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  {conditions.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {t("health.conditions.empty")}
                    </p>
                  ) : (
                    conditions.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {row.label}
                          </p>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                          >
                            {alertLevelLabel(t, row.alertLevel)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {conditionTypeLabel(t, row.type)}
                          {!row.active
                            ? ` · ${t("health.conditions.inactive")}`
                            : ""}
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

                <OnboardingTarget id={HEALTH_PARENT_TOUR_TARGETS.conditionForm}>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={conditionForm.handleSubmit(submitCondition)}
                    noValidate
                  >
                    <FormField
                      label={t("health.form.conditionType")}
                      htmlFor="health-condition-type"
                    >
                      <FormSelect
                        id="health-condition-type"
                        value={conditionValues.type}
                        onChange={(event) =>
                          conditionForm.setValue(
                            "type",
                            event.target.value as ConditionType,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <option value="ALLERGY">
                          {conditionTypeLabel(t, "ALLERGY")}
                        </option>
                        <option value="PATHOLOGY">
                          {conditionTypeLabel(t, "PATHOLOGY")}
                        </option>
                        <option value="TREATMENT">
                          {conditionTypeLabel(t, "TREATMENT")}
                        </option>
                        <option value="INSTRUCTION">
                          {conditionTypeLabel(t, "INSTRUCTION")}
                        </option>
                        <option value="OTHER">
                          {conditionTypeLabel(t, "OTHER")}
                        </option>
                      </FormSelect>
                    </FormField>

                    <FormField
                      label={t("health.form.alertLevel")}
                      htmlFor="health-condition-alert"
                    >
                      <FormSelect
                        id="health-condition-alert"
                        value={conditionValues.alertLevel}
                        onChange={(event) =>
                          conditionForm.setValue(
                            "alertLevel",
                            event.target.value as AlertLevel,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <option value="INFO">
                          {alertLevelLabel(t, "INFO")}
                        </option>
                        <option value="ATTENTION">
                          {alertLevelLabel(t, "ATTENTION")}
                        </option>
                        <option value="URGENT">
                          {alertLevelLabel(t, "URGENT")}
                        </option>
                      </FormSelect>
                    </FormField>

                    <FormField
                      label={t("health.form.label")}
                      error={conditionForm.formState.errors.label?.message}
                      className="md:col-span-2"
                    >
                      <FormTextInput
                        invalid={!!conditionForm.formState.errors.label}
                        value={conditionValues.label}
                        onChange={(event) =>
                          conditionForm.setValue("label", event.target.value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                        }
                        placeholder={t("health.form.labelPlaceholder")}
                      />
                    </FormField>

                    <FormField
                      label={t("health.form.description")}
                      className="md:col-span-2"
                    >
                      <FormTextarea
                        value={conditionValues.description}
                        onChange={(event) =>
                          conditionForm.setValue(
                            "description",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        rows={3}
                      />
                    </FormField>

                    <div className="md:col-span-2 flex items-center gap-3">
                      <SubmitButton disabled={saving}>
                        {t("health.form.submitCondition")}
                      </SubmitButton>
                      <FormSubmitHint
                        visible={!conditionForm.formState.isValid}
                      />
                    </div>
                  </form>
                </OnboardingTarget>
              </div>
            ) : null}

            {tab === "care" ? (
              <div className="grid gap-2">
                {careEvents.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    {t("health.care.empty")}
                  </p>
                ) : (
                  careEvents.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-card border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {row.summary}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                        >
                          {alertLevelLabel(t, row.alertLevel)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {new Date(row.occurredAt).toLocaleString("fr-FR")}
                        {row.authorUser
                          ? ` · ${row.authorUser.firstName} ${row.authorUser.lastName}`
                          : ""}
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
            ) : null}

            {tab === "reports" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  {reports.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {t("health.reports.empty")}
                    </p>
                  ) : (
                    reports.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-card border border-border bg-background p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {reportTypeLabel(t, row.type)}
                          </p>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                          >
                            {alertLevelLabel(t, row.alertLevel)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">
                          {row.description}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {row.acknowledgedAt
                            ? t("health.reports.acknowledged")
                            : t("health.reports.pending")}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <OnboardingTarget id={HEALTH_PARENT_TOUR_TARGETS.reportForm}>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={reportForm.handleSubmit(submitReport)}
                    noValidate
                  >
                    <FormField
                      label={t("health.form.reportType")}
                      htmlFor="health-report-type"
                    >
                      <FormSelect
                        id="health-report-type"
                        value={reportValues.type}
                        onChange={(event) =>
                          reportForm.setValue(
                            "type",
                            event.target.value as ReportType,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <option value="MALADIE">
                          {reportTypeLabel(t, "MALADIE")}
                        </option>
                        <option value="TRAITEMENT">
                          {reportTypeLabel(t, "TRAITEMENT")}
                        </option>
                        <option value="ACCIDENT">
                          {reportTypeLabel(t, "ACCIDENT")}
                        </option>
                        <option value="CONSULTATION">
                          {reportTypeLabel(t, "CONSULTATION")}
                        </option>
                        <option value="HOSPITALISATION">
                          {reportTypeLabel(t, "HOSPITALISATION")}
                        </option>
                        <option value="VACCINATION">
                          {reportTypeLabel(t, "VACCINATION")}
                        </option>
                        <option value="RESTRICTION_SPORT">
                          {reportTypeLabel(t, "RESTRICTION_SPORT")}
                        </option>
                        <option value="AUTRE">
                          {reportTypeLabel(t, "AUTRE")}
                        </option>
                      </FormSelect>
                    </FormField>

                    <FormField
                      label={t("health.form.alertLevel")}
                      htmlFor="health-report-alert"
                    >
                      <FormSelect
                        id="health-report-alert"
                        value={reportValues.alertLevel}
                        onChange={(event) =>
                          reportForm.setValue(
                            "alertLevel",
                            event.target.value as AlertLevel,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <option value="INFO">
                          {alertLevelLabel(t, "INFO")}
                        </option>
                        <option value="ATTENTION">
                          {alertLevelLabel(t, "ATTENTION")}
                        </option>
                        <option value="URGENT">
                          {alertLevelLabel(t, "URGENT")}
                        </option>
                      </FormSelect>
                    </FormField>

                    <FormField
                      label={t("health.form.description")}
                      error={reportForm.formState.errors.description?.message}
                      className="md:col-span-2"
                    >
                      <FormTextarea
                        invalid={!!reportForm.formState.errors.description}
                        value={reportValues.description}
                        onChange={(event) =>
                          reportForm.setValue(
                            "description",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        rows={3}
                        placeholder={t("health.form.descriptionPlaceholder")}
                      />
                    </FormField>

                    <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                      <FormCheckbox
                        checked={reportValues.sportRestriction ?? false}
                        onChange={(event) =>
                          reportForm.setValue(
                            "sportRestriction",
                            event.target.checked,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      />
                      {t("health.form.sportRestriction")}
                    </label>

                    <div className="md:col-span-2 flex items-center gap-3">
                      <SubmitButton disabled={saving}>
                        {t("health.form.submitReport")}
                      </SubmitButton>
                      <FormSubmitHint visible={!reportForm.formState.isValid} />
                    </div>
                  </form>
                </OnboardingTarget>
              </div>
            ) : null}

            {tab === "history" ? (
              <div className="grid gap-2">
                {historyItems.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    {t("health.history.empty")}
                  </p>
                ) : (
                  historyItems.map((item) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="rounded-card border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {item.kind === "condition"
                            ? t("health.history.kindCondition")
                            : item.kind === "care"
                              ? t("health.history.kindCare")
                              : t("health.history.kindReport")}
                          {" · "}
                          {item.title}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(item.alertLevel)}`}
                        >
                          {alertLevelLabel(t, item.alertLevel)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {new Date(item.at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
