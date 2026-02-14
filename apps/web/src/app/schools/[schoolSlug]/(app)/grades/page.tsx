"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { getCsrfTokenCookie } from "../../../../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SCHOOL_ACCOUNTANT"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type Grade = {
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

type GradesContext = {
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

export default function GradesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [context, setContext] = useState<GradesContext | null>(null);

  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState("");
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [term, setTerm] = useState("TERM_1");
  const [value, setValue] = useState("");
  const [maxValue, setMaxValue] = useState("20");
  const [assessmentWeight, setAssessmentWeight] = useState("1");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      await loadGrades();

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

  async function loadGrades() {
    const response = await fetch(`${API_URL}/schools/${schoolSlug}/grades`, {
      credentials: "include",
    });

    if (!response.ok) {
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setGrades((await response.json()) as Grade[]);
  }

  async function loadContext(schoolYearId?: string) {
    setLoadingContext(true);
    try {
      const query = schoolYearId
        ? `?schoolYearId=${encodeURIComponent(schoolYearId)}`
        : "";
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/grades/context${query}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setError("Impossible de charger le contexte de saisie des notes.");
        return;
      }

      const payload = (await response.json()) as GradesContext;
      setContext(payload);

      const schoolYearToUse =
        schoolYearId ?? payload.selectedSchoolYearId ?? "";
      setSelectedSchoolYearId(schoolYearToUse);

      const assignmentRows = payload.assignments.filter(
        (entry) => !schoolYearToUse || entry.schoolYearId === schoolYearToUse,
      );
      const firstKey =
        assignmentRows.length > 0
          ? `${assignmentRows[0].classId}::${assignmentRows[0].subjectId}`
          : "";

      setSelectedAssignmentKey((current) => {
        const exists = assignmentRows.some(
          (entry) => `${entry.classId}::${entry.subjectId}` === current,
        );
        return exists ? current : firstKey;
      });
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
          !selectedSchoolYearId || entry.schoolYearId === selectedSchoolYearId,
      )
      .map((entry) => ({
        key: `${entry.classId}::${entry.subjectId}`,
        classId: entry.classId,
        subjectId: entry.subjectId,
        label: `${entry.className} - ${entry.subjectName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [context, selectedSchoolYearId]);

  const selectedAssignment = useMemo(() => {
    return assignmentOptions.find(
      (entry) => entry.key === selectedAssignmentKey,
    );
  }, [assignmentOptions, selectedAssignmentKey]);

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
      setSelectedAssignmentKey("");
      setSelectedStudentId("");
      return;
    }

    const exists = assignmentOptions.some(
      (entry) => entry.key === selectedAssignmentKey,
    );
    if (!exists) {
      setSelectedAssignmentKey(assignmentOptions[0].key);
    }
  }, [assignmentOptions, selectedAssignmentKey]);

  useEffect(() => {
    if (studentOptions.length === 0) {
      setSelectedStudentId("");
      return;
    }

    const exists = studentOptions.some(
      (entry) => entry.id === selectedStudentId,
    );
    if (!exists) {
      setSelectedStudentId(studentOptions[0].id);
    }
  }, [studentOptions, selectedStudentId]);

  async function onCreateGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAssignment || !selectedStudentId) {
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
      const response = await fetch(`${API_URL}/schools/${schoolSlug}/grades`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          classId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          value: Number(value),
          maxValue: Number(maxValue),
          assessmentWeight: Number(assessmentWeight),
          term,
        }),
      });

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

      setValue("");
      setMaxValue("20");
      setAssessmentWeight("1");
      setSuccess("Note enregistree.");
      await loadGrades();
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
            onSubmit={onCreateGrade}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Annee scolaire</span>
              <select
                value={selectedSchoolYearId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedSchoolYearId(next);
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
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-text-secondary">
                Affectation (classe + matiere)
              </span>
              <select
                value={selectedAssignmentKey}
                onChange={(event) =>
                  setSelectedAssignmentKey(event.target.value)
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
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Eleve</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
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
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Periode</span>
              <select
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TERM_1">TERM_1</option>
                <option value="TERM_2">TERM_2</option>
                <option value="TERM_3">TERM_3</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Note</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Note max</span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={maxValue}
                onChange={(event) => setMaxValue(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">Coef. evaluation</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={assessmentWeight}
                onChange={(event) => setAssessmentWeight(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <div className="self-end md:col-span-3">
              <Button type="submit" disabled={saving || loadingContext}>
                {saving ? "Enregistrement..." : "Ajouter la note"}
              </Button>
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
                grades.map((grade) => (
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

              {!loading && grades.length === 0 ? (
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
