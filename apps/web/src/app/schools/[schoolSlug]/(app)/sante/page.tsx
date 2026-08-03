"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
  FormTextarea,
} from "../../../../../components/ui/form-controls";
import { FormField } from "../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { OnboardingTarget } from "../../../../../components/onboarding/onboarding-target";
import {
  HEALTH_SCHOOL_TOUR_ID,
  HEALTH_SCHOOL_TOUR_STEPS,
  HEALTH_SCHOOL_TOUR_TARGETS,
} from "../../../../../components/health/health-school-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";

type StudentSearchRow = {
  id: string;
  firstName: string;
  lastName: string;
  currentEnrollment: { class: { id: string; name: string } } | null;
};

type ConditionRow = {
  id: string;
  label: string;
  alertLevel: AlertLevel;
  active: boolean;
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
  type: string;
  alertLevel: AlertLevel;
  description: string;
  createdAt: string;
  acknowledgedAt: string | null;
};

type EmergencyContact = { id: string; fullName: string; phone: string | null };

type UrgencySummary = {
  student: { id: string; firstName: string; lastName: string };
  conditions: ConditionRow[];
  emergencyContacts: EmergencyContact[];
};

function alertLevelLabel(t: TranslateFn, level: AlertLevel) {
  return t(`health.alertLevel.${level}`);
}

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

function createCareEventSchema(t: TranslateFn) {
  return z.object({
    summary: z.string().trim().min(1, t("health.validation.labelRequired")),
    alertLevel: z.enum(["INFO", "ATTENTION", "URGENT"]),
    description: z.string().trim().optional(),
  });
}

type CareEventFormValues = z.infer<ReturnType<typeof createCareEventSchema>>;

export default function SchoolSantePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  const [urgency, setUrgency] = useState<UrgencySummary | null>(null);
  const [careEvents, setCareEvents] = useState<CareEventRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const careEventSchema = useMemo(() => createCareEventSchema(t), [t]);
  const careEventForm = useForm<
    z.input<typeof careEventSchema>,
    unknown,
    z.output<typeof careEventSchema>
  >({
    resolver: zodResolver(careEventSchema),
    mode: "onChange",
    defaultValues: { summary: "", alertLevel: "INFO", description: "" },
  });
  const careEventValues = careEventForm.watch();

  const search = useCallback(
    async (search: string) => {
      if (!schoolSlug) return;
      setSearching(true);
      try {
        const q = new URLSearchParams({ search, page: "1", limit: "20" });
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/admin/students?${q.toString()}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const payload = (await response.json()) as {
          students: StudentSearchRow[];
        };
        setResults(payload.students ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [schoolSlug],
  );

  useEffect(() => {
    void search("");
  }, [search]);

  useEffect(() => {
    if (!schoolSlug) return;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          onboardingHelpEnabled?: boolean;
        };
        const tourStore = useOnboardingTourStore.getState();
        if (
          payload.onboardingHelpEnabled !== false &&
          !tourStore.isCompleted("school", HEALTH_SCHOOL_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(
            HEALTH_SCHOOL_TOUR_ID,
            "school",
            HEALTH_SCHOOL_TOUR_STEPS,
          );
        }
      } catch {
        // Silent: the onboarding tour is a non-blocking enhancement.
      }
    })();
  }, [schoolSlug]);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const loadDetail = useCallback(
    async (studentId: string) => {
      if (!schoolSlug) return;
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const [urgencyRes, careRes, reportsRes] = await Promise.all([
          fetch(
            `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/urgence`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/care-events`,
            {
              credentials: "include",
            },
          ),
          fetch(
            `${API_URL}/schools/${schoolSlug}/students/${studentId}/health/reports`,
            {
              credentials: "include",
            },
          ),
        ]);
        if (!urgencyRes.ok || !careRes.ok || !reportsRes.ok) {
          setDetailError(t("health.errors.load"));
          return;
        }
        setUrgency((await urgencyRes.json()) as UrgencySummary);
        setCareEvents((await careRes.json()) as CareEventRow[]);
        setReports((await reportsRes.json()) as ReportRow[]);
      } catch {
        setDetailError(t("health.errors.load"));
      } finally {
        setLoadingDetail(false);
      }
    },
    [schoolSlug, t],
  );

  useEffect(() => {
    if (!selectedStudentId) return;
    void loadDetail(selectedStudentId);
  }, [selectedStudentId, loadDetail]);

  async function submitCareEvent(values: CareEventFormValues) {
    if (!selectedStudentId) return;
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
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/health/care-events`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            summary: values.summary,
            alertLevel: values.alertLevel,
            description: values.description || undefined,
          }),
        },
      );
      if (!response.ok) {
        setFormError(t("health.errors.createFailed"));
        return;
      }
      careEventForm.reset({ summary: "", alertLevel: "INFO", description: "" });
      setSuccess(t("health.success.careEventCreated"));
      await loadDetail(selectedStudentId);
    } catch {
      setFormError(t("health.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function acknowledgeReport(reportId: string) {
    if (!selectedStudentId) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setFormError(t("health.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/health/reports/${reportId}/acknowledge`,
        {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        },
      );
      if (response.ok) {
        await loadDetail(selectedStudentId);
      }
    } catch {
      // Silent: the user can retry from the UI.
    }
  }

  return (
    <div className="grid gap-4">
      <Card
        title={t("health.title")}
        subtitle={t("health.school.searchSubtitle")}
      >
        <OnboardingTarget id={HEALTH_SCHOOL_TOUR_TARGETS.search}>
          <FormTextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("health.school.searchPlaceholder")}
          />
        </OnboardingTarget>
        <div className="mt-3 grid gap-2">
          {searching ? (
            <p className="text-sm text-text-secondary">
              {t("health.common.loading")}
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t("health.school.noStudent")}
            </p>
          ) : (
            results.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedStudentId(student.id)}
                className={`flex items-center justify-between rounded-card border p-3 text-left text-sm ${
                  selectedStudentId === student.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
                }`}
              >
                <span className="font-semibold text-text-primary">
                  {student.lastName} {student.firstName}
                </span>
                <span className="text-text-secondary">
                  {student.currentEnrollment?.class.name ?? "-"}
                </span>
              </button>
            ))
          )}
        </div>
      </Card>

      {selectedStudentId ? (
        <Card
          title={
            urgency
              ? `${urgency.student.firstName} ${urgency.student.lastName}`
              : t("health.title")
          }
        >
          {loadingDetail ? (
            <p className="text-sm text-text-secondary">
              {t("health.common.loading")}
            </p>
          ) : detailError ? (
            <p className="text-sm text-notification">{detailError}</p>
          ) : (
            <OnboardingTarget
              id={HEALTH_SCHOOL_TOUR_TARGETS.urgencyBanner}
              className="grid gap-4"
            >
              {urgency && urgency.conditions.length > 0 ? (
                <div className="rounded-card border border-rose-300 bg-rose-50 p-3">
                  <p className="text-sm font-semibold text-rose-800">
                    {t("health.school.urgencyTitle")}
                  </p>
                  <div className="mt-2 grid gap-1">
                    {urgency.conditions.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-rose-900">
                          {row.label}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(row.alertLevel)}`}
                        >
                          {alertLevelLabel(t, row.alertLevel)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {urgency.emergencyContacts.length > 0 ? (
                    <p className="mt-2 text-xs text-rose-800">
                      {t("health.school.contacts")}:{" "}
                      {urgency.emergencyContacts
                        .map(
                          (contact) =>
                            `${contact.fullName} (${contact.phone ?? "-"})`,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {formError ? (
                <p className="text-sm text-notification">{formError}</p>
              ) : null}
              {success ? (
                <p className="text-sm text-success">{success}</p>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("health.tabs.care")}
                </p>
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
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <OnboardingTarget id={HEALTH_SCHOOL_TOUR_TARGETS.careEventForm}>
                  <form
                    className="mt-3 grid gap-3 md:grid-cols-2"
                    onSubmit={careEventForm.handleSubmit(submitCareEvent)}
                    noValidate
                  >
                    <FormField
                      label={t("health.form.label")}
                      error={careEventForm.formState.errors.summary?.message}
                      className="md:col-span-2"
                    >
                      <FormTextInput
                        invalid={!!careEventForm.formState.errors.summary}
                        value={careEventValues.summary}
                        onChange={(event) =>
                          careEventForm.setValue(
                            "summary",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          )
                        }
                        placeholder={t("health.form.careSummaryPlaceholder")}
                      />
                    </FormField>

                    <FormField
                      label={t("health.form.alertLevel")}
                      htmlFor="health-care-alert"
                    >
                      <FormSelect
                        id="health-care-alert"
                        value={careEventValues.alertLevel}
                        onChange={(event) =>
                          careEventForm.setValue(
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
                      className="md:col-span-2"
                    >
                      <FormTextarea
                        value={careEventValues.description}
                        onChange={(event) =>
                          careEventForm.setValue(
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
                        {t("health.form.submitCareEvent")}
                      </SubmitButton>
                      <FormSubmitHint
                        visible={!careEventForm.formState.isValid}
                      />
                    </div>
                  </form>
                </OnboardingTarget>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-text-primary">
                  {t("health.tabs.reports")}
                </p>
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
                            {t(`health.reportType.${row.type}`)}
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
                        {row.acknowledgedAt ? (
                          <p className="mt-1 text-xs text-success">
                            {t("health.reports.acknowledged")}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void acknowledgeReport(row.id)}
                            className="mt-1 text-xs font-semibold text-primary underline"
                          >
                            {t("health.reports.acknowledgeAction")}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </OnboardingTarget>
          )}
        </Card>
      ) : null}
    </div>
  );
}
