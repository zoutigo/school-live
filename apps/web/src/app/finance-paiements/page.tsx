"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { FormTextInput } from "../../components/ui/form-controls";
import { SearchableSelect } from "../../components/ui/searchable-select";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
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
type StudentRow = { id: string; firstName: string; lastName: string };

type FinanceSummary = {
  student: { id: string; firstName: string; lastName: string };
  decision: {
    decision: string;
    nextAcademicLevelId: string;
    nextTrackId: string | null;
  };
  feeSchedule: {
    academicLevel?: { label: string };
    track?: { label: string } | null;
    installments: { id: string; rank: number; label: string; amount: number }[];
  };
  totalPaid: number;
  thresholdAmount: number;
  reinscriptionEligible: boolean;
};

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Montant requis"),
  paidAt: z.string().trim().min(1, "Date requise"),
  note: z.string().optional().default(""),
});
type PaymentFormValues = z.input<typeof paymentSchema>;

export default function FinancePaiementsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("manage");

  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [targetSchoolYearId, setTargetSchoolYearId] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    defaultValues: {
      amount: 0,
      paidAt: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (schoolSlug) void loadSchoolYears(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (selectedStudentId && targetSchoolYearId) void loadSummary();
    else setSummary(null);
  }, [selectedStudentId, targetSchoolYearId]);

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

  async function loadSchoolYears(currentSchoolSlug: string) {
    const res = await fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
      credentials: "include",
    });
    if (!res.ok) return;
    const years = (await res.json()) as SchoolYearRow[];
    setSchoolYears(years);
  }

  async function onSearch() {
    if (!schoolSlug) return;
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(
        buildAdminPath(schoolSlug, `students?${params.toString()}`),
        { credentials: "include" },
      );
      if (!res.ok) {
        setError(t("financePayments.errors.search"));
        return;
      }
      const payload = (await res.json()) as { students: StudentRow[] };
      setStudents(payload.students);
    } catch {
      setError(t("financePayments.errors.network"));
    }
  }

  async function loadSummary() {
    if (!schoolSlug || !selectedStudentId || !targetSchoolYearId) return;
    setError(null);
    setSummary(null);
    try {
      const res = await fetch(
        buildAdminPath(
          schoolSlug,
          `finance/students/${selectedStudentId}/summary?schoolYearId=${targetSchoolYearId}`,
        ),
        { credentials: "include" },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(payload?.message ?? t("financePayments.errors.summary"));
        return;
      }
      setSummary((await res.json()) as FinanceSummary);
    } catch {
      setError(t("financePayments.errors.network"));
    }
  }

  async function onSubmitPayment(values: PaymentFormValues) {
    if (!schoolSlug || !selectedStudentId || !targetSchoolYearId) return;
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
        buildAdminPath(schoolSlug, "finance/payments"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            schoolYearId: targetSchoolYearId,
            amount: values.amount,
            paidAt: values.paidAt,
            note: values.note || undefined,
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
            : (payload?.message ?? t("financePayments.errors.save"));
        setError(String(message));
        return;
      }
      const result = (await response.json()) as {
        reinscriptionConfirmed: boolean;
      };
      setSuccess(
        result.reinscriptionConfirmed
          ? t("financePayments.success.paidAndReinscribed")
          : t("financePayments.success.paid"),
      );
      form.reset({
        amount: 0,
        paidAt: new Date().toISOString().slice(0, 10),
        note: "",
      });
      await loadSummary();
    } catch {
      setError(t("financePayments.errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("financePayments.title")}>
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">
          {t("financePayments.title")}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {t("financePayments.subtitle")}
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
            moduleName={t("financePayments.title")}
            moduleSummary={t("financePayments.help.summary")}
            actions={[
              {
                name: t("financePayments.help.action1.name"),
                purpose: t("financePayments.help.action1.purpose"),
                howTo: t("financePayments.help.action1.howTo"),
                moduleImpact: t("financePayments.help.action1.moduleImpact"),
                crossModuleImpact: t(
                  "financePayments.help.action1.crossModuleImpact",
                ),
              },
            ]}
            tips={[
              t("financePayments.help.tip1"),
              t("financePayments.help.tip2"),
            ]}
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

            <Card title={t("financePayments.search.title")} className="mb-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <FormTextInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("financePayments.search.placeholder")}
                />
                <button
                  type="button"
                  onClick={onSearch}
                  className="rounded-card border border-warm-border bg-warm-surface px-4 py-2 text-sm font-heading font-semibold text-primary hover:bg-warm-highlight"
                >
                  {t("common.apply")}
                </button>
              </div>
              {students.length > 0 ? (
                <ul className="mt-3 grid gap-1">
                  {students.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`w-full rounded-card border px-3 py-2 text-left text-sm ${
                          selectedStudentId === student.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-warm-border text-text-primary"
                        }`}
                      >
                        {student.lastName} {student.firstName}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            {selectedStudentId ? (
              <Card title={t("financePayments.target.title")} className="mb-4">
                <FormField label={t("financePayments.target.schoolYear")}>
                  <SearchableSelect
                    ariaLabel={t("financePayments.target.schoolYear")}
                    value={targetSchoolYearId}
                    onChange={setTargetSchoolYearId}
                    placeholder={t("common.select")}
                    options={schoolYears.map((year) => ({
                      value: year.id,
                      label: year.label,
                    }))}
                  />
                </FormField>
              </Card>
            ) : null}

            {summary ? (
              <>
                <Card
                  title={t("financePayments.summary.title")}
                  subtitle={`${summary.feeSchedule.academicLevel?.label ?? ""}${
                    summary.feeSchedule.track
                      ? ` - ${summary.feeSchedule.track.label}`
                      : ""
                  }`}
                  className="mb-4"
                >
                  <p className="text-sm text-text-secondary">
                    {t("financePayments.summary.totalPaid")}:{" "}
                    {summary.totalPaid.toLocaleString()}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t("financePayments.summary.threshold")}:{" "}
                    {summary.thresholdAmount.toLocaleString()}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      summary.reinscriptionEligible
                        ? "text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {summary.reinscriptionEligible
                      ? t("financePayments.summary.eligible")
                      : t("financePayments.summary.notEligible")}
                  </p>
                </Card>

                <Card title={t("financePayments.form.title")}>
                  <form
                    onSubmit={form.handleSubmit(onSubmitPayment)}
                    className="grid gap-4"
                    noValidate
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        label={t("financePayments.form.amount")}
                        error={form.formState.errors.amount?.message}
                      >
                        <FormTextInput
                          type="number"
                          min={0}
                          step="0.01"
                          {...form.register("amount")}
                        />
                      </FormField>
                      <FormField
                        label={t("financePayments.form.paidAt")}
                        error={form.formState.errors.paidAt?.message}
                      >
                        <FormTextInput
                          type="date"
                          {...form.register("paidAt")}
                        />
                      </FormField>
                    </div>
                    <FormField label={t("financePayments.form.note")}>
                      <FormTextInput {...form.register("note")} />
                    </FormField>
                    <p className="text-xs text-text-secondary">
                      {t("common.requiredFieldsHint")}
                    </p>
                    <SubmitButton disabled={submitting}>
                      {submitting
                        ? t("common.loading")
                        : t("financePayments.form.submit")}
                    </SubmitButton>
                  </form>
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
