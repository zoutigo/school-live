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

type SupplyItemRow = {
  id: string;
  rank: number;
  label: string;
  quantity: number;
  note: string | null;
};

type SupplyListRow = {
  id: string;
  academicLevel: { id: string; label: string; code: string };
  track: { id: string; label: string; code: string } | null;
  schoolYear: { id: string; label: string };
  items: SupplyItemRow[];
};

const itemSchema = z.object({
  rank: z.coerce.number().int().min(1, "Rang requis"),
  label: z.string().trim().min(1, "Libelle requis"),
  quantity: z.coerce.number().int().min(1, "Quantite requise"),
  note: z.string().optional().default(""),
});

const supplyListFormSchema = z.object({
  schoolYearId: z.string().trim().min(1, "Annee scolaire requise"),
  academicLevelId: z.string().trim().min(1, "Niveau requis"),
  trackId: z.string().optional().default(""),
  items: z.array(itemSchema).min(1, "Au moins un article"),
});

type SupplyListFormValues = z.input<typeof supplyListFormSchema>;

const ALLOWED_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
];

export default function SupplyListsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("manage");

  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [supplyLists, setSupplyLists] = useState<SupplyListRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<SupplyListFormValues>({
    resolver: zodResolver(supplyListFormSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      academicLevelId: "",
      trackId: "",
      items: [{ rank: 1, label: "", quantity: 1, note: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
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
    const allowed = ALLOWED_ROLES.includes(me.role);
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
      const [yearsRes, levelsRes, tracksRes, listsRes] = await Promise.all([
        fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "tracks"), {
          credentials: "include",
        }),
        fetch(buildAdminPath(currentSchoolSlug, "supply-lists"), {
          credentials: "include",
        }),
      ]);
      if (!yearsRes.ok || !levelsRes.ok || !tracksRes.ok || !listsRes.ok) {
        setError(t("supplyLists.errors.load"));
        return;
      }
      const years = (await yearsRes.json()) as SchoolYearRow[];
      setSchoolYears(years);
      setAcademicLevels((await levelsRes.json()) as AcademicLevelRow[]);
      setTracks((await tracksRes.json()) as TrackRow[]);
      setSupplyLists((await listsRes.json()) as SupplyListRow[]);

      if (!form.getValues("schoolYearId")) {
        const active = years.find((y) => y.isActive);
        if (active) form.setValue("schoolYearId", active.id);
      }
    } catch {
      setError(t("supplyLists.errors.network"));
    }
  }

  async function onSubmit(values: SupplyListFormValues) {
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
      const response = await fetch(buildAdminPath(schoolSlug, "supply-lists"), {
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
          items: values.items.map((item) => ({
            rank: item.rank,
            label: item.label,
            quantity: item.quantity,
            note: item.note || undefined,
          })),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("supplyLists.errors.save"));
        setError(String(message));
        return;
      }
      setSuccess(t("supplyLists.success.saved"));
      form.reset({
        schoolYearId: values.schoolYearId,
        academicLevelId: "",
        trackId: "",
        items: [{ rank: 1, label: "", quantity: 1, note: "" }],
      });
      await loadData(schoolSlug);
    } catch {
      setError(t("supplyLists.errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(supplyListId: string) {
    if (!schoolSlug) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setDeletingId(supplyListId);
    setError(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `supply-lists/${supplyListId}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        },
      );
      if (!response.ok) {
        setError(t("supplyLists.errors.delete"));
        return;
      }
      await loadData(schoolSlug);
    } catch {
      setError(t("supplyLists.errors.network"));
    } finally {
      setDeletingId(null);
    }
  }

  const groupedSupplyLists = useMemo(
    () =>
      [...supplyLists].sort((a, b) =>
        `${a.academicLevel.code}${a.track?.code ?? ""}`.localeCompare(
          `${b.academicLevel.code}${b.track?.code ?? ""}`,
        ),
      ),
    [supplyLists],
  );

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("supplyLists.title")}>
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">
          {t("supplyLists.title")}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {t("supplyLists.subtitle")}
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
            moduleName={t("supplyLists.title")}
            moduleSummary={t("supplyLists.help.summary")}
            actions={[
              {
                name: t("supplyLists.help.action1.name"),
                purpose: t("supplyLists.help.action1.purpose"),
                howTo: t("supplyLists.help.action1.howTo"),
                moduleImpact: t("supplyLists.help.action1.moduleImpact"),
                crossModuleImpact: t(
                  "supplyLists.help.action1.crossModuleImpact",
                ),
              },
              {
                name: t("supplyLists.help.action2.name"),
                purpose: t("supplyLists.help.action2.purpose"),
                howTo: t("supplyLists.help.action2.howTo"),
                moduleImpact: t("supplyLists.help.action2.moduleImpact"),
                crossModuleImpact: t(
                  "supplyLists.help.action2.crossModuleImpact",
                ),
              },
            ]}
            tips={[t("supplyLists.help.tip1")]}
            workflowExample={{
              title: t("supplyLists.help.workflow.title"),
              intro: t("supplyLists.help.workflow.intro"),
              steps: [
                {
                  title: t("supplyLists.help.workflow.step1.title"),
                  description: t("supplyLists.help.workflow.step1.description"),
                },
                {
                  title: t("supplyLists.help.workflow.step2.title"),
                  description: t("supplyLists.help.workflow.step2.description"),
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

            <Card title={t("supplyLists.form.title")} className="mb-6">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    label={t("supplyLists.form.schoolYear")}
                    error={form.formState.errors.schoolYearId?.message}
                  >
                    <SearchableSelect
                      id="schoolYearId"
                      ariaLabel={t("supplyLists.form.schoolYear")}
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
                    label={t("supplyLists.form.academicLevel")}
                    error={form.formState.errors.academicLevelId?.message}
                  >
                    <SearchableSelect
                      id="academicLevelId"
                      ariaLabel={t("supplyLists.form.academicLevel")}
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
                  <FormField label={t("supplyLists.form.track")}>
                    <SearchableSelect
                      id="trackId"
                      ariaLabel={t("supplyLists.form.track")}
                      value={form.watch("trackId") ?? ""}
                      onChange={(value) =>
                        form.setValue("trackId", value, {
                          shouldValidate: true,
                        })
                      }
                      placeholder={t("supplyLists.form.trackNone")}
                      options={[
                        {
                          value: "",
                          label: t("supplyLists.form.trackNone"),
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
                    {t("supplyLists.form.items")}
                  </span>
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[70px_1fr_120px_auto] items-end gap-2"
                    >
                      <FormField
                        label={t("supplyLists.form.rank")}
                        error={
                          form.formState.errors.items?.[index]?.rank?.message
                        }
                      >
                        <FormTextInput
                          type="number"
                          min={1}
                          {...form.register(`items.${index}.rank`)}
                        />
                      </FormField>
                      <FormField
                        label={t("supplyLists.form.label")}
                        error={
                          form.formState.errors.items?.[index]?.label?.message
                        }
                      >
                        <FormTextInput
                          {...form.register(`items.${index}.label`)}
                        />
                      </FormField>
                      <FormField
                        label={t("supplyLists.form.quantity")}
                        error={
                          form.formState.errors.items?.[index]?.quantity
                            ?.message
                        }
                      >
                        <FormTextInput
                          type="number"
                          min={1}
                          {...form.register(`items.${index}.quantity`)}
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
                        quantity: 1,
                        note: "",
                      })
                    }
                  >
                    {t("supplyLists.form.addItem")}
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

            <div className="grid gap-3" data-testid="supply-lists-list">
              {groupedSupplyLists.map((supplyList) => (
                <Card
                  key={supplyList.id}
                  title={`${supplyList.academicLevel.label}${supplyList.track ? ` - ${supplyList.track.label}` : ""}`}
                  subtitle={supplyList.schoolYear.label}
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => onDelete(supplyList.id)}
                      disabled={deletingId === supplyList.id}
                    >
                      {t("common.delete")}
                    </Button>
                  }
                >
                  <ul className="grid gap-1 text-sm text-text-secondary">
                    {supplyList.items
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .map((item) => (
                        <li key={item.id}>
                          {item.rank}. {item.label} — x{item.quantity}
                        </li>
                      ))}
                  </ul>
                </Card>
              ))}
              {groupedSupplyLists.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t("supplyLists.empty")}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
