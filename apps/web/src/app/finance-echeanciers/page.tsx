"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormTextInput } from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { SearchableSelect } from "../../components/ui/searchable-select";
import { useTranslation } from "../../i18n/useTranslation";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
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
type Tab = "manage" | "help";

type MeResponse = { role: Role; schoolSlug: string | null };
type SchoolYearRow = { id: string; label: string; isActive: boolean };
type AcademicLevelRow = { id: string; code: string; label: string };
type TrackRow = { id: string; code: string; label: string };

type FeeInstallmentRow = {
  id: string;
  rank: number;
  label: string;
  amount: number;
  dueDate: string | null;
};

type FeeScheduleRow = {
  id: string;
  academicLevel: { id: string; label: string; code: string };
  track: { id: string; label: string; code: string } | null;
  schoolYear: { id: string; label: string };
  installments: FeeInstallmentRow[];
};

const installmentSchema = z.object({
  rank: z.coerce.number().int().min(1, "Rang requis"),
  label: z.string().trim().min(1, "Libelle requis"),
  amount: z.coerce.number().min(0.01, "Montant requis"),
  dueDate: z.string().optional().default(""),
});

const scheduleFormSchema = z.object({
  schoolYearId: z.string().trim().min(1, "Annee scolaire requise"),
  academicLevelId: z.string().trim().min(1, "Niveau requis"),
  trackId: z.string().optional().default(""),
  installments: z.array(installmentSchema).min(1, "Au moins une echeance"),
});

type ScheduleFormValues = z.input<typeof scheduleFormSchema>;

export default function FinanceEcheanciersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("manage");

  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [schedules, setSchedules] = useState<FeeScheduleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      academicLevelId: "",
      trackId: "",
      installments: [{ rank: 1, label: "", amount: 0, dueDate: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "installments",
  });

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (schoolSlug) void loadData(schoolSlug);
  }, [schoolSlug]);

  async function bootstrap() {
    const meResponse = await fetch(`${API_URL}/me`, { credentials: "include" });
    if (!meResponse.ok) {
      router.replace("/");
      return;
    }
    const me = (await meResponse.json()) as MeResponse;
    const allowed =
      me.role === "SUPER_ADMIN" ||
      me.role === "ADMIN" ||
      me.role === "SCHOOL_ADMIN" ||
      me.role === "SCHOOL_MANAGER" ||
      me.role === "SCHOOL_ACCOUNTANT";
    if (!allowed || !me.schoolSlug) {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }
    setSchoolSlug(me.schoolSlug);
    setLoading(false);
  }

  async function loadData(currentSchoolSlug: string) {
    setError(null);
    try {
      const [yearsRes, levelsRes, tracksRes, schedulesRes] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "tracks"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "finance/fee-schedules"), {
          credentials: "include",
        }),
      ]);
      if (!yearsRes.ok || !levelsRes.ok || !tracksRes.ok || !schedulesRes.ok) {
        setError(t("financeSchedules.errors.load"));
        return;
      }
      const years = (await yearsRes.json()) as SchoolYearRow[];
      setSchoolYears(years);
      setAcademicLevels((await levelsRes.json()) as AcademicLevelRow[]);
      setTracks((await tracksRes.json()) as TrackRow[]);
      setSchedules((await schedulesRes.json()) as FeeScheduleRow[]);

      if (!form.getValues("schoolYearId")) {
        const active = years.find((y) => y.isActive);
        if (active) form.setValue("schoolYearId", active.id);
      }
    } catch {
      setError(t("financeSchedules.errors.network"));
    }
  }

  async function onSubmit(values: ScheduleFormValues) {
    if (!schoolSlug) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "finance/fee-schedules"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            schoolYearId: values.schoolYearId,
            academicLevelId: values.academicLevelId,
            trackId: values.trackId || undefined,
            installments: values.installments.map((i) => ({
              rank: i.rank,
              label: i.label,
              amount: i.amount,
              dueDate: i.dueDate || undefined,
            })),
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("financeSchedules.errors.save"));
        setError(String(message));
        return;
      }
      setSuccess(t("financeSchedules.success.saved"));
      form.reset({
        schoolYearId: values.schoolYearId,
        academicLevelId: "",
        trackId: "",
        installments: [{ rank: 1, label: "", amount: 0, dueDate: "" }],
      });
      await loadData(schoolSlug);
    } catch {
      setError(t("financeSchedules.errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(feeScheduleId: string) {
    if (!schoolSlug) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setDeletingId(feeScheduleId);
    setError(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `finance/fee-schedules/${feeScheduleId}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        },
      );
      if (!response.ok) {
        setError(t("financeSchedules.errors.delete"));
        return;
      }
      await loadData(schoolSlug);
    } catch {
      setError(t("financeSchedules.errors.network"));
    } finally {
      setDeletingId(null);
    }
  }

  const groupedSchedules = useMemo(
    () =>
      [...schedules].sort((a, b) =>
        `${a.academicLevel.code}${a.track?.code ?? ""}`.localeCompare(
          `${b.academicLevel.code}${b.track?.code ?? ""}`,
        ),
      ),
    [schedules],
  );

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("financeSchedules.title")}>
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">
          {t("financeSchedules.title")}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {t("financeSchedules.subtitle")}
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("manage")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "manage"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("common.manage")}
          </button>
          <button
            type="button"
            onClick={() => setTab("help")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "help"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("common.help")}
          </button>
        </div>

        {tab === "help" ? (
          <ModuleHelpTab
            moduleName={t("financeSchedules.title")}
            moduleSummary={t("financeSchedules.help.summary")}
            actions={[
              {
                name: t("financeSchedules.help.action1.name"),
                purpose: t("financeSchedules.help.action1.purpose"),
                howTo: t("financeSchedules.help.action1.howTo"),
                moduleImpact: t("financeSchedules.help.action1.moduleImpact"),
                crossModuleImpact: t(
                  "financeSchedules.help.action1.crossModuleImpact",
                ),
              },
              {
                name: t("financeSchedules.help.action2.name"),
                purpose: t("financeSchedules.help.action2.purpose"),
                howTo: t("financeSchedules.help.action2.howTo"),
                moduleImpact: t("financeSchedules.help.action2.moduleImpact"),
                crossModuleImpact: t(
                  "financeSchedules.help.action2.crossModuleImpact",
                ),
              },
            ]}
            tips={[t("financeSchedules.help.tip1")]}
            workflowExample={{
              title: t("financeSchedules.help.workflow.title"),
              intro: t("financeSchedules.help.workflow.intro"),
              steps: [
                {
                  title: t("financeSchedules.help.workflow.step1.title"),
                  description: t(
                    "financeSchedules.help.workflow.step1.description",
                  ),
                },
                {
                  title: t("financeSchedules.help.workflow.step2.title"),
                  description: t(
                    "financeSchedules.help.workflow.step2.description",
                  ),
                },
                {
                  title: t("financeSchedules.help.workflow.step3.title"),
                  description: t(
                    "financeSchedules.help.workflow.step3.description",
                  ),
                },
              ],
            }}
          />
        ) : null}

        {tab === "manage" ? (
          <>
            {error ? (
              <div className="mb-4 rounded-card border border-notification bg-notification/5 p-3 text-sm text-notification">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mb-4 rounded-card border border-primary bg-primary/5 p-3 text-sm text-primary">
                {success}
              </div>
            ) : null}

            <Card title={t("financeSchedules.form.title")} className="mb-6">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    label={t("financeSchedules.form.schoolYear")}
                    error={form.formState.errors.schoolYearId?.message}
                  >
                    <SearchableSelect
                      id="schoolYearId"
                      ariaLabel={t("financeSchedules.form.schoolYear")}
                      invalid={Boolean(form.formState.errors.schoolYearId)}
                      value={form.watch("schoolYearId") ?? ""}
                      onChange={(value) =>
                        form.setValue("schoolYearId", value, {
                          shouldValidate: true,
                        })
                      }
                      placeholder={t("common.select")}
                      options={schoolYears.map((year) => ({
                        value: year.id,
                        label: year.label,
                      }))}
                    />
                  </FormField>
                  <FormField
                    label={t("financeSchedules.form.academicLevel")}
                    error={form.formState.errors.academicLevelId?.message}
                  >
                    <SearchableSelect
                      id="academicLevelId"
                      ariaLabel={t("financeSchedules.form.academicLevel")}
                      invalid={Boolean(form.formState.errors.academicLevelId)}
                      value={form.watch("academicLevelId") ?? ""}
                      onChange={(value) =>
                        form.setValue("academicLevelId", value, {
                          shouldValidate: true,
                        })
                      }
                      placeholder={t("common.select")}
                      options={academicLevels.map((level) => ({
                        value: level.id,
                        label: level.label,
                      }))}
                    />
                  </FormField>
                  <FormField label={t("financeSchedules.form.track")}>
                    <SearchableSelect
                      id="trackId"
                      ariaLabel={t("financeSchedules.form.track")}
                      value={form.watch("trackId") ?? ""}
                      onChange={(value) =>
                        form.setValue("trackId", value, {
                          shouldValidate: true,
                        })
                      }
                      placeholder={t("financeSchedules.form.trackNone")}
                      options={[
                        {
                          value: "",
                          label: t("financeSchedules.form.trackNone"),
                        },
                        ...tracks.map((track) => ({
                          value: track.id,
                          label: track.label,
                        })),
                      ]}
                    />
                  </FormField>
                </div>

                <div className="grid gap-2">
                  <span className="text-sm font-medium text-text-secondary">
                    {t("financeSchedules.form.installments")}
                  </span>
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[70px_1fr_140px_160px_auto] items-end gap-2"
                    >
                      <FormField
                        label={t("financeSchedules.form.rank")}
                        error={
                          form.formState.errors.installments?.[index]?.rank
                            ?.message
                        }
                      >
                        <FormTextInput
                          type="number"
                          min={1}
                          {...form.register(`installments.${index}.rank`)}
                        />
                      </FormField>
                      <FormField
                        label={t("financeSchedules.form.label")}
                        error={
                          form.formState.errors.installments?.[index]?.label
                            ?.message
                        }
                      >
                        <FormTextInput
                          {...form.register(`installments.${index}.label`)}
                        />
                      </FormField>
                      <FormField
                        label={t("financeSchedules.form.amount")}
                        error={
                          form.formState.errors.installments?.[index]?.amount
                            ?.message
                        }
                      >
                        <FormTextInput
                          type="number"
                          min={0}
                          step="0.01"
                          {...form.register(`installments.${index}.amount`)}
                        />
                      </FormField>
                      <FormField label={t("financeSchedules.form.dueDate")}>
                        <FormTextInput
                          type="date"
                          {...form.register(`installments.${index}.dueDate`)}
                        />
                      </FormField>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        {t("common.remove")}
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      append({
                        rank: fields.length + 1,
                        label: "",
                        amount: 0,
                        dueDate: "",
                      })
                    }
                  >
                    {t("financeSchedules.form.addInstallment")}
                  </Button>
                </div>

                <p className="text-xs text-text-secondary">
                  {t("common.requiredFieldsHint")}
                </p>
                <SubmitButton disabled={submitting}>
                  {submitting ? t("common.loading") : t("common.save")}
                </SubmitButton>
              </form>
            </Card>

            <div className="grid gap-3">
              {groupedSchedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  title={`${schedule.academicLevel.label}${schedule.track ? ` - ${schedule.track.label}` : ""}`}
                  subtitle={schedule.schoolYear.label}
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => onDelete(schedule.id)}
                      disabled={deletingId === schedule.id}
                    >
                      {t("common.delete")}
                    </Button>
                  }
                >
                  <ul className="grid gap-1 text-sm text-text-secondary">
                    {schedule.installments
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .map((installment) => (
                        <li key={installment.id}>
                          {installment.rank}. {installment.label} —{" "}
                          {installment.amount.toLocaleString()}
                          {installment.dueDate
                            ? ` (${new Date(installment.dueDate).toLocaleDateString()})`
                            : ""}
                        </li>
                      ))}
                  </ul>
                </Card>
              ))}
              {groupedSchedules.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("financeSchedules.empty")}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
