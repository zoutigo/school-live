"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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

type ReinscriptionDeadlineRow = {
  id: string;
  academicLevel: { id: string; label: string; code: string };
  schoolYear: { id: string; label: string };
  deadline: string;
};

const deadlineFormSchema = z.object({
  schoolYearId: z.string().trim().min(1, "Annee scolaire requise"),
  academicLevelId: z.string().trim().min(1, "Niveau requis"),
  deadline: z.string().trim().min(1, "Date limite requise"),
});

type DeadlineFormValues = z.input<typeof deadlineFormSchema>;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function FinanceReinscriptionDeadlinesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("manage");

  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [deadlines, setDeadlines] = useState<ReinscriptionDeadlineRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<DeadlineFormValues>({
    resolver: zodResolver(deadlineFormSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      academicLevelId: "",
      deadline: "",
    },
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
      const [yearsRes, levelsRes, deadlinesRes] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
          credentials: "include",
        }),
        fetch(
          buildAdminPath(currentSchoolSlug, "finance/reinscription-deadlines"),
          { credentials: "include" },
        ),
      ]);
      if (!yearsRes.ok || !levelsRes.ok || !deadlinesRes.ok) {
        setError(t("financeReinscriptionDeadlines.errors.load"));
        return;
      }
      const years = (await yearsRes.json()) as SchoolYearRow[];
      setSchoolYears(years);
      setAcademicLevels((await levelsRes.json()) as AcademicLevelRow[]);
      setDeadlines((await deadlinesRes.json()) as ReinscriptionDeadlineRow[]);

      if (!form.getValues("schoolYearId")) {
        const active = years.find((y) => y.isActive);
        if (active) form.setValue("schoolYearId", active.id);
      }
    } catch {
      setError(t("financeReinscriptionDeadlines.errors.network"));
    }
  }

  async function onSubmit(values: DeadlineFormValues) {
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
        buildAdminPath(schoolSlug, "finance/reinscription-deadlines"),
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
            deadline: values.deadline,
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
            : (payload?.message ??
              t("financeReinscriptionDeadlines.errors.save"));
        setError(String(message));
        return;
      }
      setSuccess(t("financeReinscriptionDeadlines.success.saved"));
      form.reset({
        schoolYearId: values.schoolYearId,
        academicLevelId: "",
        deadline: "",
      });
      await loadData(schoolSlug);
    } catch {
      setError(t("financeReinscriptionDeadlines.errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(deadlineId: string) {
    if (!schoolSlug) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setDeletingId(deadlineId);
    setError(null);
    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `finance/reinscription-deadlines/${deadlineId}`,
        ),
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        },
      );
      if (!response.ok) {
        setError(t("financeReinscriptionDeadlines.errors.delete"));
        return;
      }
      await loadData(schoolSlug);
    } catch {
      setError(t("financeReinscriptionDeadlines.errors.network"));
    } finally {
      setDeletingId(null);
    }
  }

  const groupedDeadlines = useMemo(
    () =>
      [...deadlines].sort((a, b) =>
        `${a.schoolYear.label}${a.academicLevel.code}`.localeCompare(
          `${b.schoolYear.label}${b.academicLevel.code}`,
        ),
      ),
    [deadlines],
  );

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  return (
    <AppShell
      schoolSlug={schoolSlug}
      schoolName={t("financeReinscriptionDeadlines.title")}
    >
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">
          {t("financeReinscriptionDeadlines.title")}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {t("financeReinscriptionDeadlines.subtitle")}
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
            moduleName={t("financeReinscriptionDeadlines.title")}
            moduleSummary={t("financeReinscriptionDeadlines.help.summary")}
            actions={[
              {
                name: t("financeReinscriptionDeadlines.help.action1.name"),
                purpose: t(
                  "financeReinscriptionDeadlines.help.action1.purpose",
                ),
                howTo: t("financeReinscriptionDeadlines.help.action1.howTo"),
                moduleImpact: t(
                  "financeReinscriptionDeadlines.help.action1.moduleImpact",
                ),
                crossModuleImpact: t(
                  "financeReinscriptionDeadlines.help.action1.crossModuleImpact",
                ),
              },
              {
                name: t("financeReinscriptionDeadlines.help.action2.name"),
                purpose: t(
                  "financeReinscriptionDeadlines.help.action2.purpose",
                ),
                howTo: t("financeReinscriptionDeadlines.help.action2.howTo"),
                moduleImpact: t(
                  "financeReinscriptionDeadlines.help.action2.moduleImpact",
                ),
                crossModuleImpact: t(
                  "financeReinscriptionDeadlines.help.action2.crossModuleImpact",
                ),
              },
            ]}
            tips={[t("financeReinscriptionDeadlines.help.tip1")]}
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

            <Card
              title={t("financeReinscriptionDeadlines.form.title")}
              className="mb-6"
            >
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    label={t("financeReinscriptionDeadlines.form.schoolYear")}
                    error={form.formState.errors.schoolYearId?.message}
                  >
                    <SearchableSelect
                      id="schoolYearId"
                      ariaLabel={t(
                        "financeReinscriptionDeadlines.form.schoolYear",
                      )}
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
                    label={t(
                      "financeReinscriptionDeadlines.form.academicLevel",
                    )}
                    error={form.formState.errors.academicLevelId?.message}
                  >
                    <SearchableSelect
                      id="academicLevelId"
                      ariaLabel={t(
                        "financeReinscriptionDeadlines.form.academicLevel",
                      )}
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
                  <FormField
                    label={t("financeReinscriptionDeadlines.form.deadline")}
                    error={form.formState.errors.deadline?.message}
                  >
                    <FormTextInput
                      type="date"
                      invalid={Boolean(form.formState.errors.deadline)}
                      {...form.register("deadline")}
                    />
                  </FormField>
                </div>

                <p className="text-xs text-text-secondary">
                  {t("common.requiredFieldsHint")}
                </p>
                <SubmitButton disabled={submitting}>
                  {submitting ? t("common.loading") : t("common.save")}
                </SubmitButton>
              </form>
            </Card>

            <div
              className="grid gap-3"
              data-testid="reinscription-deadlines-list"
            >
              {groupedDeadlines.map((deadline) => (
                <Card
                  key={deadline.id}
                  title={deadline.academicLevel.label}
                  subtitle={`${deadline.schoolYear.label} — ${formatDate(deadline.deadline)}`}
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => onDelete(deadline.id)}
                      disabled={deletingId === deadline.id}
                    >
                      {t("common.delete")}
                    </Button>
                  }
                >
                  <span />
                </Card>
              ))}
              {groupedDeadlines.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("financeReinscriptionDeadlines.empty")}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
