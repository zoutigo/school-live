"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { FormSelect } from "../../../../../components/ui/form-controls";
import { ModuleHelpTab } from "../../../../../components/ui/module-help-tab";
import { useTranslation } from "../../../../../i18n/useTranslation";

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

type MeResponse = {
  role: Role;
};

type TabKey = "list" | "view" | "help";

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

type ClassRow = {
  classId: string;
  className: string;
  schoolYearId: string;
  schoolYearLabel: string;
  subjects: string[];
  students: Array<{ id: string; firstName: string; lastName: string }>;
};

export default function TeacherClassesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>("");

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug]);

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

      const me = (await meResponse.json()) as MeResponse;
      if (me.role !== "TEACHER") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        {
          credentials: "include",
        },
      );

      if (!contextResponse.ok) {
        setError(t("mesClasses.error.loadFailed"));
        return;
      }

      const payload = (await contextResponse.json()) as GradesContext;
      setContext(payload);
      const defaultYearId = payload.selectedSchoolYearId ?? "";
      setSchoolYearFilter(defaultYearId);
    } catch {
      setError(t("mesClasses.error.network"));
    } finally {
      setLoading(false);
    }
  }

  const classes = useMemo<ClassRow[]>(() => {
    if (!context) {
      return [];
    }

    const yearLabelById = new Map(
      context.schoolYears.map((entry) => [entry.id, entry.label] as const),
    );
    const rows = new Map<string, ClassRow>();

    for (const assignment of context.assignments) {
      if (schoolYearFilter && assignment.schoolYearId !== schoolYearFilter) {
        continue;
      }

      const existing = rows.get(assignment.classId);
      if (existing) {
        if (!existing.subjects.includes(assignment.subjectName)) {
          existing.subjects.push(assignment.subjectName);
        }
      } else {
        rows.set(assignment.classId, {
          classId: assignment.classId,
          className: assignment.className,
          schoolYearId: assignment.schoolYearId,
          schoolYearLabel:
            yearLabelById.get(assignment.schoolYearId) ??
            t("mesClasses.schoolYear.unknown"),
          subjects: [assignment.subjectName],
          students: [],
        });
      }
    }

    for (const student of context.students) {
      const classRow = rows.get(student.classId);
      if (!classRow) {
        continue;
      }
      const exists = classRow.students.some(
        (entry) => entry.id === student.studentId,
      );
      if (!exists) {
        classRow.students.push({
          id: student.studentId,
          firstName: student.studentFirstName,
          lastName: student.studentLastName,
        });
      }
    }

    return Array.from(rows.values())
      .sort((a, b) => a.className.localeCompare(b.className))
      .map((row) => ({
        ...row,
        subjects: [...row.subjects].sort((a, b) => a.localeCompare(b)),
        students: [...row.students].sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
          ),
        ),
      }));
  }, [context, schoolYearFilter]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClassId("");
      return;
    }

    const exists = classes.some((entry) => entry.classId === selectedClassId);
    if (!exists) {
      setSelectedClassId(classes[0].classId);
    }
  }, [classes, selectedClassId]);

  const selectedClass = useMemo(
    () => classes.find((entry) => entry.classId === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  return (
    <div className="grid gap-4">
      <Card title={t("mesClasses.title")} subtitle={t("mesClasses.subtitle")}>
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "list"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("mesClasses.tab.list")}
          </button>
          <button
            type="button"
            onClick={() => setTab("view")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "view"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            {t("mesClasses.tab.view")}
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
            {t("mesClasses.tab.help")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName={t("mesClasses.title")}
            moduleSummary={t("mesClasses.subtitle")}
            actions={[
              {
                name: t("mesClasses.tab.list"),
                purpose: t("mesClasses.view.hint"),
                howTo: t("mesClasses.schoolYear.label"),
                moduleImpact: "",
                crossModuleImpact: "",
              },
            ]}
          />
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm md:max-w-[320px]">
              <span className="text-text-secondary">
                {t("mesClasses.schoolYear.label")}
              </span>
              <FormSelect
                value={schoolYearFilter}
                onChange={(event) => setSchoolYearFilter(event.target.value)}
                className="bg-surface"
              >
                <option value="">{t("mesClasses.schoolYear.all")}</option>
                {(context?.schoolYears ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                    {entry.isActive
                      ? ` ${t("mesClasses.schoolYear.active")}`
                      : ""}
                  </option>
                ))}
              </FormSelect>
            </label>

            {tab === "list" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("mesClasses.table.class")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("mesClasses.table.year")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("mesClasses.table.subjects")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("mesClasses.table.students")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={4}
                        >
                          {t("mesClasses.table.empty")}
                        </td>
                      </tr>
                    ) : (
                      classes.map((entry) => (
                        <tr
                          key={entry.classId}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">{entry.className}</td>
                          <td className="px-3 py-2">{entry.schoolYearLabel}</td>
                          <td className="px-3 py-2">{entry.subjects.length}</td>
                          <td className="px-3 py-2">{entry.students.length}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm md:max-w-[420px]">
                  <span className="text-text-secondary">
                    {t("mesClasses.view.selectLabel")}
                  </span>
                  <FormSelect
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="bg-surface"
                  >
                    <option value="">
                      {t("mesClasses.view.selectPlaceholder")}
                    </option>
                    {classes.map((entry) => (
                      <option key={entry.classId} value={entry.classId}>
                        {entry.className} ({entry.schoolYearLabel})
                      </option>
                    ))}
                  </FormSelect>
                </label>

                {!selectedClass ? (
                  <p className="text-sm text-text-secondary">
                    {t("mesClasses.view.hint")}
                  </p>
                ) : (
                  <div className="grid gap-3 rounded-card border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedClass.className} -{" "}
                      {selectedClass.schoolYearLabel}
                    </p>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {t("mesClasses.view.subjectsTitle")}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {selectedClass.subjects.join(", ") || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {t("mesClasses.view.studentsTitle")}
                      </p>
                      {selectedClass.students.length === 0 ? (
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("mesClasses.view.noStudents")}
                        </p>
                      ) : (
                        <ul className="mt-1 grid gap-1 text-sm text-text-secondary">
                          {selectedClass.students.map((student) => (
                            <li key={student.id}>
                              {student.lastName} {student.firstName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
