"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormTextInput } from "../ui/form-controls";
import { SearchableSelect } from "../ui/searchable-select";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import {
  academicYearValues,
  currentAcademicYearLabel,
  searchSchools,
  type CreateResourcePayload,
  type ResourceCatalog,
  type ResourceKind,
  type ResourceRow,
  type SchoolSearchOption,
} from "./resources-api";

const EXAM_TYPE_VALUES = ["SEQUENCE_TEST", "POP_QUIZ", "MOCK_EXAM"] as const;
const SEQUENCE_VALUES = [
  "SEQ_1",
  "SEQ_2",
  "SEQ_3",
  "SEQ_4",
  "SEQ_5",
  "SEQ_6",
] as const;

function buildSchema(
  t: TranslateFn,
  kind: ResourceKind,
  levelHasTracks: boolean,
) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t("resourcesMine.form.errors.titleRequired")),
      schoolId: z.string(),
      cycleId: z.string(),
      academicLevelId: z
        .string()
        .min(1, t("resourcesMine.form.errors.levelRequired")),
      trackId: z.string(),
      subjectId: z
        .string()
        .min(1, t("resourcesMine.form.errors.subjectRequired")),
      examType: z.string().min(1),
      sequence: z.string(),
      academicYearLabel: z
        .string()
        .min(1, t("resourcesMine.form.errors.yearRequired")),
    })
    .superRefine((values, ctx) => {
      if (kind === "ASSESSMENT" && !values.schoolId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schoolId"],
          message: t("resourcesMine.form.errors.schoolRequired"),
        });
      }
      if (kind === "ASSESSMENT" && !values.sequence) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sequence"],
          message: t("resourcesMine.form.errors.sequenceRequired"),
        });
      }
      if (levelHasTracks && !values.trackId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trackId"],
          message: t("resourcesMine.form.errors.trackRequired"),
        });
      }
    });
}

type FormValues = {
  title: string;
  schoolId: string;
  cycleId: string;
  academicLevelId: string;
  trackId: string;
  subjectId: string;
  examType: string;
  sequence: string;
  academicYearLabel: string;
};

export function ResourceForm(props: {
  kind: ResourceKind;
  catalog: ResourceCatalog;
  schools: { id: string; name: string }[];
  editingResource: ResourceRow | null;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (payload: CreateResourcePayload) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { kind, catalog, editingResource } = props;
  const requiresSchool = kind === "ASSESSMENT";

  const levelIdsWithTracks = useMemo(
    () =>
      new Set(
        catalog.curriculums
          .filter((c) => c.trackId)
          .map((c) => c.academicLevelId),
      ),
    [catalog.curriculums],
  );

  const initialCycleId =
    catalog.academicLevels.find(
      (l) => l.id === editingResource?.academicLevelId,
    )?.cycleId ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      buildSchema(
        t,
        kind,
        levelIdsWithTracks.has(editingResource?.academicLevelId ?? ""),
      ),
    ),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      title: editingResource?.title ?? "",
      schoolId: editingResource?.schoolId ?? "",
      cycleId: initialCycleId,
      academicLevelId: editingResource?.academicLevelId ?? "",
      trackId: editingResource?.trackId ?? "",
      subjectId: editingResource?.subjectId ?? "",
      examType: editingResource?.examType ?? "SEQUENCE_TEST",
      sequence: editingResource?.sequence ?? "SEQ_1",
      academicYearLabel:
        editingResource?.academicYearLabel ?? currentAcademicYearLabel(),
    },
  });

  const selectedSchoolId = watch("schoolId");
  const selectedCycleId = watch("cycleId");
  const selectedLevelId = watch("academicLevelId");
  const selectedTrackId = watch("trackId");

  const [schoolResults, setSchoolResults] = useState<SchoolSearchOption[]>([]);
  const [schoolQuery, setSchoolQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!requiresSchool) return;
    void searchSchools()
      .then(setSchoolResults)
      .catch(() => {});
  }, [requiresSchool]);

  function handleSchoolQueryChange(query: string) {
    setSchoolQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchSchools(query || undefined)
        .then(setSchoolResults)
        .catch(() => {});
    }, 300);
  }

  const schoolPool: SchoolSearchOption[] = useMemo(() => {
    const byId = new Map<string, SchoolSearchOption>();
    for (const s of schoolResults) byId.set(s.id, s);
    if (
      editingResource?.schoolId &&
      editingResource.school &&
      !byId.has(editingResource.schoolId)
    ) {
      byId.set(editingResource.schoolId, {
        id: editingResource.schoolId,
        name: editingResource.school.name,
        cycle: null,
        languageSystem: null,
      });
    }
    return Array.from(byId.values());
  }, [schoolResults, editingResource]);

  const selectedSchool = schoolPool.find((s) => s.id === selectedSchoolId);

  useEffect(() => {
    if (!requiresSchool || !selectedSchool?.cycle) return;
    const resolvedCycleId =
      catalog.cycles.find((c) => c.code === selectedSchool.cycle)?.id ?? "";
    if (resolvedCycleId && resolvedCycleId !== selectedCycleId) {
      setValue("cycleId", resolvedCycleId);
      setValue("academicLevelId", "");
      setValue("trackId", "");
      setValue("subjectId", "");
    }
  }, [requiresSchool, selectedSchool, catalog.cycles]);

  const levelOptions = catalog.academicLevels
    .filter((l) => !selectedCycleId || l.cycleId === selectedCycleId)
    .filter(
      (l) =>
        !requiresSchool ||
        !selectedSchool?.languageSystem ||
        selectedSchool.languageSystem === "BILINGUAL" ||
        !l.languageSystem ||
        l.languageSystem === selectedSchool.languageSystem,
    );

  const trackIdsForLevel = new Set(
    catalog.curriculums
      .filter((c) => c.academicLevelId === selectedLevelId && c.trackId)
      .map((c) => c.trackId as string),
  );
  const levelHasTracks = trackIdsForLevel.size > 0;
  const trackOptions = catalog.tracks.filter((tr) =>
    trackIdsForLevel.has(tr.id),
  );

  const resolvedCurriculum = catalog.curriculums.find(
    (c) =>
      c.academicLevelId === selectedLevelId &&
      c.trackId === (levelHasTracks ? selectedTrackId || null : null),
  );
  const subjectIdsForCurriculum = resolvedCurriculum
    ? new Set(
        catalog.curriculumSubjects
          .filter((cs) => cs.curriculumId === resolvedCurriculum.id)
          .map((cs) => cs.subjectId),
      )
    : new Set<string>();
  const subjectOptions = catalog.subjects.filter((s) =>
    subjectIdsForCurriculum.has(s.id),
  );

  const submit = handleSubmit((values) => {
    props.onSubmit({
      kind,
      schoolId: kind === "ASSESSMENT" ? values.schoolId : undefined,
      academicLevelId: values.academicLevelId,
      trackId: levelHasTracks ? values.trackId || undefined : undefined,
      subjectId: values.subjectId,
      examType: values.examType as CreateResourcePayload["examType"],
      sequence:
        kind === "ASSESSMENT"
          ? (values.sequence as CreateResourcePayload["sequence"])
          : undefined,
      academicYearLabel: values.academicYearLabel,
      title: values.title.trim(),
    });
  });

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-5">
      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.titleLabel")}
        </label>
        <FormTextInput
          {...register("title")}
          invalid={!!errors.title}
          placeholder={t("resourcesMine.form.titlePlaceholder")}
          data-testid="resources-mine-form-title"
        />
        {errors.title?.message && (
          <p className="mt-1 text-xs text-notification">
            {errors.title.message}
          </p>
        )}
      </div>

      {requiresSchool && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-primary">
            {t("resourcesMine.form.schoolLabel")}
          </label>
          <FormTextInput
            value={schoolQuery}
            onChange={(e) => handleSchoolQueryChange(e.target.value)}
            placeholder={t("resourcesMine.form.schoolSearchPlaceholder")}
            className="mb-2"
            data-testid="resources-mine-form-school-search"
          />
          <SearchableSelect
            ariaLabel={t("resourcesMine.form.schoolLabel")}
            value={watch("schoolId") ?? ""}
            onChange={(value) => setValue("schoolId", value)}
            invalid={!!errors.schoolId}
            placeholder={t("resourcesMine.form.schoolPlaceholder")}
            searchPlaceholder={t("settings.form.searchPlaceholder")}
            noResultsLabel={t("settings.form.noResults")}
            data-testid="resources-mine-form-school"
            options={schoolPool.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />
          {errors.schoolId?.message && (
            <p className="mt-1 text-xs text-notification">
              {errors.schoolId.message}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.cycleLabel")}
        </label>
        <SearchableSelect
          ariaLabel={t("resourcesMine.form.cycleLabel")}
          value={watch("cycleId") ?? ""}
          onChange={(value) => {
            setValue("cycleId", value);
            setValue("academicLevelId", "");
            setValue("trackId", "");
            setValue("subjectId", "");
          }}
          placeholder={t("resourcesMine.form.cyclePlaceholder")}
          searchPlaceholder={t("settings.form.searchPlaceholder")}
          noResultsLabel={t("settings.form.noResults")}
          data-testid="resources-mine-form-cycle"
          options={catalog.cycles.map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.levelLabel")}
        </label>
        <SearchableSelect
          ariaLabel={t("resourcesMine.form.levelLabel")}
          value={watch("academicLevelId") ?? ""}
          invalid={!!errors.academicLevelId}
          onChange={(value) => {
            setValue("academicLevelId", value);
            setValue("trackId", "");
            setValue("subjectId", "");
          }}
          placeholder={t("resourcesMine.form.levelPlaceholder")}
          searchPlaceholder={t("settings.form.searchPlaceholder")}
          noResultsLabel={t("settings.form.noResults")}
          data-testid="resources-mine-form-level"
          options={levelOptions.map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
        {errors.academicLevelId?.message && (
          <p className="mt-1 text-xs text-notification">
            {errors.academicLevelId.message}
          </p>
        )}
      </div>

      {levelHasTracks && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-primary">
            {t("resourcesMine.form.trackLabel")}
          </label>
          <SearchableSelect
            ariaLabel={t("resourcesMine.form.trackLabel")}
            value={watch("trackId") ?? ""}
            invalid={!!errors.trackId}
            onChange={(value) => {
              setValue("trackId", value);
              setValue("subjectId", "");
            }}
            placeholder={t("resourcesMine.form.trackPlaceholder")}
            searchPlaceholder={t("settings.form.searchPlaceholder")}
            noResultsLabel={t("settings.form.noResults")}
            data-testid="resources-mine-form-track"
            options={trackOptions.map((tr) => ({
              value: tr.id,
              label: tr.label,
            }))}
          />
          {errors.trackId?.message && (
            <p className="mt-1 text-xs text-notification">
              {errors.trackId.message}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.subjectLabel")}
        </label>
        <SearchableSelect
          ariaLabel={t("resourcesMine.form.subjectLabel")}
          value={watch("subjectId") ?? ""}
          invalid={!!errors.subjectId}
          onChange={(value) => setValue("subjectId", value)}
          placeholder={t("resourcesMine.form.subjectPlaceholder")}
          searchPlaceholder={t("settings.form.searchPlaceholder")}
          noResultsLabel={t("settings.form.noResults")}
          data-testid="resources-mine-form-subject"
          options={subjectOptions.map((s) => ({
            value: s.id,
            label: s.name,
          }))}
        />
        {errors.subjectId?.message && (
          <p className="mt-1 text-xs text-notification">
            {errors.subjectId.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.examTypeLabel")}
        </label>
        <SearchableSelect
          ariaLabel={t("resourcesMine.form.examTypeLabel")}
          value={watch("examType") ?? ""}
          onChange={(value) => setValue("examType", value)}
          data-testid="resources-mine-form-exam-type"
          options={EXAM_TYPE_VALUES.map((type) => ({
            value: type,
            label: t(`resources.examType.${type}`),
          }))}
        />
      </div>

      {requiresSchool && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-primary">
            {t("resourcesMine.form.sequenceLabel")}
          </label>
          <SearchableSelect
            ariaLabel={t("resourcesMine.form.sequenceLabel")}
            value={watch("sequence") ?? ""}
            invalid={!!errors.sequence}
            onChange={(value) => setValue("sequence", value)}
            data-testid="resources-mine-form-sequence"
            options={SEQUENCE_VALUES.map((seq) => ({
              value: seq,
              label: t(`resources.sequence.${seq}`),
            }))}
          />
          {errors.sequence?.message && (
            <p className="mt-1 text-xs text-notification">
              {errors.sequence.message}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-primary">
          {t("resourcesMine.form.yearLabel")}
        </label>
        <SearchableSelect
          ariaLabel={t("resourcesMine.form.yearLabel")}
          value={watch("academicYearLabel") ?? ""}
          invalid={!!errors.academicYearLabel}
          onChange={(value) => setValue("academicYearLabel", value)}
          data-testid="resources-mine-form-year"
          options={academicYearValues().map((year) => ({
            value: year,
            label: year,
          }))}
        />
      </div>

      {props.errorMessage && (
        <p className="text-sm text-notification">{props.errorMessage}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={props.saving}
          className="rounded-card bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          data-testid="resources-mine-form-submit"
        >
          {props.saving
            ? t("resourcesMine.form.saving")
            : t("resourcesMine.form.save")}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-card border border-border px-6 py-2 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary"
          data-testid="resources-mine-form-cancel"
        >
          {t("resourcesMine.form.cancel")}
        </button>
      </div>
    </form>
  );
}
