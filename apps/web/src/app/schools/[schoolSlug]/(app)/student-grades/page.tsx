"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { FormField } from "../../../../../components/ui/form-field";
import { SubmitButton } from "../../../../../components/ui/form-buttons";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

const createGradeSchema = z.object({
  schoolYearId: z.string().trim().min(1, "L'annee scolaire est obligatoire."),
  assignmentKey: z.string().trim().min(1, "L'affectation est obligatoire."),
  studentId: z.string().trim().min(1, "L'eleve est obligatoire."),
  term: z.enum(["TERM_1", "TERM_2", "TERM_3"]),
  value: z.coerce.number().min(0, "La note doit etre positive."),
  maxValue: z.coerce.number().gt(0, "La note max doit etre superieure a 0."),
  assessmentWeight: z.coerce
    .number()
    .min(0, "Le coefficient doit etre positif."),
});

export default function StudentGradesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [context, setContext] = useState<StudentGradesContext | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const createGradeForm = useForm<
    z.input<typeof createGradeSchema>,
    unknown,
    z.output<typeof createGradeSchema>
  >({
    resolver: zodResolver(createGradeSchema),
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
        setError("Impossible de charger le contexte de saisie des notes.");
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

  async function onCreateGrade(values: z.output<typeof createGradeSchema>) {
    if (!selectedAssignment || !values.studentId) {
      setError("Selectionnez une affectation et un eleve.");
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Creation de note impossible.");
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
      setSuccess("Note enregistree.");
      await loadStudentGrades();
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  const canWrite =
    role === "TEACHER" || role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN";

  return (
    <div className="grid gap-4">
      <Card
        title="Notes & Devoirs"
        subtitle="Saisie et historique des resultats"
      >
        {canWrite ? (
          <form
            className="mb-4 grid gap-3 border-b border-border pb-4 md:grid-cols-3"
            onSubmit={createGradeForm.handleSubmit(onCreateGrade)}
          >
            <FormField
              label="Annee scolaire"
              error={createGradeForm.formState.errors.schoolYearId?.message}
            >
              <select
                aria-label="Annee scolaire"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selectionner</option>
                {(context?.schoolYears ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                    {entry.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Affectation (classe + matiere)"
              error={createGradeForm.formState.errors.assignmentKey?.message}
              className="md:col-span-2"
            >
              <select
                aria-label="Affectation"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selectionner</option>
                {assignmentOptions.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Eleve"
              error={createGradeForm.formState.errors.studentId?.message}
            >
              <select
                aria-label="Eleve"
                value={gradeValues.studentId ?? ""}
                onChange={(event) =>
                  createGradeForm.setValue("studentId", event.target.value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loadingContext}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selectionner</option>
                {studentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Periode"
              error={createGradeForm.formState.errors.term?.message}
            >
              <select
                aria-label="Periode"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TERM_1">TERM_1</option>
                <option value="TERM_2">TERM_2</option>
                <option value="TERM_3">TERM_3</option>
              </select>
            </FormField>

            <FormField
              label="Note"
              error={createGradeForm.formState.errors.value?.message}
            >
              <input
                aria-label="Note"
                type="number"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField
              label="Note max"
              error={createGradeForm.formState.errors.maxValue?.message}
            >
              <input
                aria-label="Note max"
                type="number"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <FormField
              label="Coef. evaluation"
              error={createGradeForm.formState.errors.assessmentWeight?.message}
            >
              <input
                aria-label="Coef. evaluation"
                type="number"
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
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </FormField>

            <div className="self-end md:col-span-3">
              <SubmitButton
                disabled={
                  saving || loadingContext || !createGradeForm.formState.isValid
                }
              >
                {saving ? "Enregistrement..." : "Ajouter la note"}
              </SubmitButton>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="px-3 py-2 font-medium">Eleve</th>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 font-medium">Matiere</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-3 py-2 font-medium">Coef eval.</th>
                <th className="px-3 py-2 font-medium">Periode</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-text-secondary" colSpan={6}>
                    Chargement...
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
                    Aucune note disponible.
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
