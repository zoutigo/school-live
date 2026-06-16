"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import {
  FormNumberInput,
  FormSelect,
  FormSubmitHint,
} from "../../../../../components/ui/form-controls";
import { FormField } from "../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useTranslation,
  type TranslateFn,
} from "../../../../../i18n/useTranslation";

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

type StudentGrade = {
  id: string;
  value: number;
  maxValue: number;
  assessmentWeight: number;
  term: string;
  subjectId: string;
  classId: string;
  studentId: string;
  subject?: { id: string; name: string };
  class?: { id: string; name: string };
  student?: { id: string; firstName: string; lastName: string };
  createdAt?: string;
};

type MeResponse = {
  role: Role;
};

type StudentGradesContext = {
  schoolYears: Array<{ id: string; label: string; isActive: boolean }>;
  selectedSchoolYearId: string | null;
  assignments: Array<{
    classId: string;
    subjectId: string;
    className: string;
    subjectName: string;
    schoolYearId: string;
  }>;
  students: Array<{
    classId: string;
    className: string;
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
  }>;
};

function createGradeSchema(t: TranslateFn) {
  return z.object({
    schoolYearId: z
      .string()
      .trim()
      .min(1, t("notes.admin.validation.schoolYearRequired")),
    assignmentKey: z
      .string()
      .trim()
      .min(1, t("notes.admin.validation.assignmentRequired")),
    studentId: z
      .string()
      .trim()
      .min(1, t("notes.admin.validation.studentRequired")),
    term: z.enum(["TERM_1", "TERM_2", "TERM_3"]),
    value: z.coerce.number().min(0, t("notes.admin.validation.valuePositive")),
    maxValue: z.coerce
      .number()
      .gt(0, t("notes.admin.validation.maxValuePositive")),
    assessmentWeight: z.coerce
      .number()
      .min(0, t("notes.admin.validation.weightPositive")),
  });
}

export default function StudentGradesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [role, setRole] = useState<Role | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [context, setContext] = useState<StudentGradesContext | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const gradeSchema = useMemo(() => createGradeSchema(t), [t]);
  const createGradeForm = useForm<
    z.input<typeof gradeSchema>,
    unknown,
    z.output<typeof gradeSchema>
  >({
    resolver: zodResolver(gradeSchema),
    mode: "onChange",
    defaultValues: {
      schoolYearId: "",
      assignmentKey: "",
      studentId: "",
      term: "TERM_1",
      value: undefined,
      maxValue: 20,
      assessmentWeight: 1,
    },
  });
  const gradeValues = createGradeForm.watch();
  const noteValue =
    typeof gradeValues.value === "number" && Number.isFinite(gradeValues.value)
      ? gradeValues.value
      : "";
  const noteMaxValue =
    typeof gradeValues.maxValue === "number" &&
    Number.isFinite(gradeValues.maxValue)
      ? gradeValues.maxValue
      : 20;
  const noteWeightValue =
    typeof gradeValues.assessmentWeight === "number" &&
    Number.isFinite(gradeValues.assessmentWeight)
      ? gradeValues.assessmentWeight
      : 1;
  const schoolYearInvalid =
    !!createGradeForm.formState.errors.schoolYearId ||
    !(gradeValues.schoolYearId ?? "").trim();
  const assignmentInvalid =
    !!createGradeForm.formState.errors.assignmentKey ||
    !(gradeValues.assignmentKey ?? "").trim();
  const studentInvalid =
    !!createGradeForm.formState.errors.studentId ||
    !(gradeValues.studentId ?? "").trim();
  const termInvalid = !!createGradeForm.formState.errors.term;
  const valueInvalid =
    !!createGradeForm.formState.errors.value ||
    !(
      typeof gradeValues.value === "number" &&
      Number.isFinite(gradeValues.value)
    );
  const maxValueInvalid = !!createGradeForm.formState.errors.maxValue;
  const assessmentWeightInvalid =
    !!createGradeForm.formState.errors.assessmentWeight;

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      setRole(me.role);

      await loadStudentGrades();

      const canWrite =
        me.role === "TEACHER" ||
        me.role === "SCHOOL_ADMIN" ||
        me.role === "SUPER_ADMIN";

      if (canWrite) {
        await loadContext();
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentGrades() {
    const response = await fetch(
      `${API_URL}/schools/${schoolSlug}/student-grades`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setStudentGrades((await response.json()) as StudentGrade[]);
  }

  async function loadContext(schoolYearId?: string) {
    setLoadingContext(true);
    try {
      const query = schoolYearId
        ? `?schoolYearId=${encodeURIComponent(schoolYearId)}`
        : "";
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context${query}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setError(t("notes.admin.errors.loadContext"));
        return;
      }

      const payload = (await response.json()) as StudentGradesContext;
      setContext(payload);

      const schoolYearToUse =
        schoolYearId ?? payload.selectedSchoolYearId ?? "";
      createGradeForm.setValue("schoolYearId", schoolYearToUse, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });

      const assignmentRows = payload.assignments.filter(
        (entry) => !schoolYearToUse || entry.schoolYearId === schoolYearToUse,
      );
      const firstKey =
        assignmentRows.length > 0
          ? `${assignmentRows[0].classId}::${assignmentRows[0].subjectId}`
          : "";

      const currentAssignment = createGradeForm.getValues("assignmentKey");
      const assignmentExists = assignmentRows.some(
        (entry) => `${entry.classId}::${entry.subjectId}` === currentAssignment,
      );
      createGradeForm.setValue(
        "assignmentKey",
        assignmentExists ? currentAssignment : firstKey,
        {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        },
      );
    } finally {
      setLoadingContext(false);
    }
  }

  const assignmentOptions = useMemo(() => {
    if (!context) {
      return [] as Array<{
        key: string;
        classId: string;
        subjectId: string;
        label: string;
      }>;
    }

    return context.assignments
      .filter(
        (entry) =>
          !gradeValues.schoolYearId ||
          entry.schoolYearId === gradeValues.schoolYearId,
      )
      .map((entry) => ({
        key: `${entry.classId}::${entry.subjectId}`,
        classId: entry.classId,
        subjectId: entry.subjectId,
        label: `${entry.className} - ${entry.subjectName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [context, gradeValues.schoolYearId]);

  const selectedAssignment = useMemo(() => {
    return assignmentOptions.find(
      (entry) => entry.key === gradeValues.assignmentKey,
    );
  }, [assignmentOptions, gradeValues.assignmentKey]);

  const studentOptions = useMemo(() => {
    if (!context || !selectedAssignment) {
      return [] as Array<{ id: string; label: string }>;
    }

    return context.students
      .filter((entry) => entry.classId === selectedAssignment.classId)
      .map((entry) => ({
        id: entry.studentId,
        label: `${entry.studentLastName} ${entry.studentFirstName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [context, selectedAssignment]);

  useEffect(() => {
    if (assignmentOptions.length === 0) {
      createGradeForm.setValue("assignmentKey", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      createGradeForm.setValue("studentId", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    const exists = assignmentOptions.some(
      (entry) => entry.key === gradeValues.assignmentKey,
    );
    if (!exists) {
      createGradeForm.setValue("assignmentKey", assignmentOptions[0].key, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [assignmentOptions, createGradeForm, gradeValues.assignmentKey]);

  useEffect(() => {
    if (studentOptions.length === 0) {
      createGradeForm.setValue("studentId", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      return;
    }

    const exists = studentOptions.some(
      (entry) => entry.id === gradeValues.studentId,
    );
    if (!exists) {
      createGradeForm.setValue("studentId", studentOptions[0].id, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [createGradeForm, gradeValues.studentId, studentOptions]);

  async function onCreateGrade(values: z.output<typeof gradeSchema>) {
    if (!selectedAssignment || !values.studentId) {
      setError(t("notes.admin.errors.missingAssignmentOrStudent"));
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("notes.admin.errors.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            studentId: values.studentId,
            classId: selectedAssignment.classId,
            subjectId: selectedAssignment.subjectId,
            value: values.value,
            maxValue: values.maxValue,
            assessmentWeight: values.assessmentWeight,
            term: values.term,
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
            : (payload?.message ?? t("notes.admin.errors.createGradeFailed"));
        setError(String(message));
        return;
      }

      createGradeForm.reset({
        schoolYearId: values.schoolYearId,
        assignmentKey: values.assignmentKey,
        studentId: values.studentId,
        term: values.term,
        value: undefined,
        maxValue: 20,
        assessmentWeight: 1,
      });
      setSuccess(t("notes.admin.success.gradeCreated"));
      await loadStudentGrades();
    } catch {
      setError(t("notes.admin.errors.networkError"));
    } finally {
      setSaving(false);
    }
  }

  const canWrite =
    role === "TEACHER" || role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN";

  return (
    <div className="grid gap-4">
      <Card
        title={t("notes.admin.card.title")}
        subtitle={t("notes.admin.card.subtitle")}
      >
        {canWrite ? (
          <form
            className="mb-4 grid gap-3 border-b border-border pb-4 md:grid-cols-3"
            onSubmit={createGradeForm.handleSubmit(onCreateGrade)}
          >
            <FormField
              label={t("notes.admin.form.schoolYear")}
              error={createGradeForm.formState.errors.schoolYearId?.message}
            >
              <FormSelect
                aria-label={t("notes.admin.form.schoolYear")}
                invalid={schoolYearInvalid}
                value={gradeValues.schoolYearId ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  createGradeForm.setValue("schoolYearId", next, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  void loadContext(next);
                }}
                disabled={loadingContext}
              >
                <option value="">{t("notes.common.select")}</option>
                {(context?.schoolYears ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                    {entry.isActive
                      ? t("notes.admin.form.schoolYearActiveSuffix")
                      : ""}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField
              label={t("notes.admin.form.assignment")}
              error={createGradeForm.formState.errors.assignmentKey?.message}
              className="md:col-span-2"
            >
              <FormSelect
                aria-label={t("notes.admin.form.assignment")}
                invalid={assignmentInvalid}
                value={gradeValues.assignmentKey ?? ""}
                onChange={(event) =>
                  createGradeForm.setValue(
                    "assignmentKey",
                    event.target.value,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
                disabled={loadingContext}
              >
                <option value="">{t("notes.common.select")}</option>
                {assignmentOptions.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField
              label={t("notes.admin.form.student")}
              error={createGradeForm.formState.errors.studentId?.message}
            >
              <FormSelect
                aria-label={t("notes.admin.form.student")}
                invalid={studentInvalid}
                value={gradeValues.studentId ?? ""}
                onChange={(event) =>
                  createGradeForm.setValue("studentId", event.target.value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loadingContext}
              >
                <option value="">{t("notes.common.select")}</option>
                {studentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField
              label={t("notes.admin.form.term")}
              error={createGradeForm.formState.errors.term?.message}
            >
              <FormSelect
                aria-label={t("notes.admin.form.term")}
                invalid={termInvalid}
                value={gradeValues.term ?? "TERM_1"}
                onChange={(event) =>
                  createGradeForm.setValue(
                    "term",
                    event.target.value as "TERM_1" | "TERM_2" | "TERM_3",
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              >
                <option value="TERM_1">TERM_1</option>
                <option value="TERM_2">TERM_2</option>
                <option value="TERM_3">TERM_3</option>
              </FormSelect>
            </FormField>

            <FormField
              label={t("notes.admin.form.value")}
              error={createGradeForm.formState.errors.value?.message}
            >
              <FormNumberInput
                aria-label={t("notes.admin.form.value")}
                invalid={valueInvalid}
                min={0}
                step="0.01"
                value={noteValue}
                onChange={(event) =>
                  createGradeForm.setValue(
                    "value",
                    event.target.valueAsNumber,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              />
            </FormField>

            <FormField
              label={t("notes.admin.form.maxValue")}
              error={createGradeForm.formState.errors.maxValue?.message}
            >
              <FormNumberInput
                aria-label={t("notes.admin.form.maxValue")}
                invalid={maxValueInvalid}
                min={1}
                step="0.01"
                value={noteMaxValue}
                onChange={(event) =>
                  createGradeForm.setValue(
                    "maxValue",
                    event.target.valueAsNumber,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              />
            </FormField>

            <FormField
              label={t("notes.admin.form.assessmentWeight")}
              error={createGradeForm.formState.errors.assessmentWeight?.message}
            >
              <FormNumberInput
                aria-label={t("notes.admin.form.assessmentWeight")}
                invalid={assessmentWeightInvalid}
                min={0}
                step="0.1"
                value={noteWeightValue}
                onChange={(event) =>
                  createGradeForm.setValue(
                    "assessmentWeight",
                    event.target.valueAsNumber,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              />
            </FormField>

            <div className="self-end md:col-span-3">
              <FormSubmitHint
                visible={!createGradeForm.formState.isValid}
                className="mb-2"
              />
              <SubmitButton
                disabled={
                  saving || loadingContext || !createGradeForm.formState.isValid
                }
              >
                {saving
                  ? t("notes.admin.form.submitting")
                  : t("notes.admin.form.submit")}
              </SubmitButton>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.student")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.class")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.subject")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.score")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.weight")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("notes.admin.table.term")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-text-secondary" colSpan={6}>
                    {t("notes.admin.table.loading")}
                  </td>
                </tr>
              ) : null}

              {!loading &&
                studentGrades.map((grade) => (
                  <tr
                    key={grade.id}
                    className="border-b border-border text-text-primary last:border-none"
                  >
                    <td className="px-3 py-2">
                      {grade.student
                        ? `${grade.student.lastName} ${grade.student.firstName}`
                        : grade.studentId}
                    </td>
                    <td className="px-3 py-2">
                      {grade.class?.name ?? grade.classId}
                    </td>
                    <td className="px-3 py-2">
                      {grade.subject?.name ?? grade.subjectId}
                    </td>
                    <td className="px-3 py-2">
                      {grade.value}/{grade.maxValue}
                    </td>
                    <td className="px-3 py-2">{grade.assessmentWeight ?? 1}</td>
                    <td className="px-3 py-2">{grade.term}</td>
                  </tr>
                ))}

              {!loading && studentGrades.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-text-secondary" colSpan={6}>
                    {t("notes.admin.table.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-notification">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-3 text-sm text-primary">{success}</p>
        ) : null}
      </Card>
    </div>
  );
}
