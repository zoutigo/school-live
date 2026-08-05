"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Card } from "../../components/ui/card";
import { FormSelect } from "../../components/ui/form-controls";
import { FormField } from "../../components/ui/form-field";
import { Button } from "../../components/ui/button";
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
type SubTab = "decisions" | "waiting";
type Decision = "PROMOTED" | "REPEATED" | "LEFT";

type MeResponse = { role: Role; schoolSlug: string | null };
type SchoolYearRow = { id: string; label: string; isActive: boolean };
type ClassroomRow = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
  academicLevel: { id: string; code: string; label: string } | null;
  track: { id: string; code: string; label: string } | null;
};
type AcademicLevelRow = { id: string; code: string; label: string };
type TrackRow = { id: string; code: string; label: string };

type TermReportRow = {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  decision: Decision | null;
  nextAcademicLevel: { id: string; label: string } | null;
  nextTrack: { id: string; label: string } | null;
};

type WaitingEnrollmentRow = {
  id: string;
  student: { id: string; firstName: string; lastName: string };
  academicLevel: { id: string; label: string } | null;
  track: { id: string; label: string } | null;
};

export default function PromotionsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("manage");
  const [subTab, setSubTab] = useState<SubTab>("decisions");

  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [academicLevels, setAcademicLevels] = useState<AcademicLevelRow[]>([]);
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [termReports, setTermReports] = useState<TermReportRow[]>([]);
  const [decisionDrafts, setDecisionDrafts] = useState<
    Record<
      string,
      { decision: Decision; nextAcademicLevelId: string; nextTrackId: string }
    >
  >({});
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const [targetSchoolYearId, setTargetSchoolYearId] = useState("");
  const [waitingLevelId, setWaitingLevelId] = useState("");
  const [waiting, setWaiting] = useState<WaitingEnrollmentRow[]>([]);
  const [assignDrafts, setAssignDrafts] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (schoolSlug) void loadReferenceData(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (selectedClassId) void loadTermReports();
    else setTermReports([]);
  }, [selectedClassId]);

  useEffect(() => {
    if (targetSchoolYearId) void loadWaiting();
    else setWaiting([]);
  }, [targetSchoolYearId, waitingLevelId]);

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
      me.role === "SUPERVISOR";
    if (!allowed || !me.schoolSlug) {
      router.replace(
        me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
      );
      return;
    }
    setSchoolSlug(me.schoolSlug);
    setLoading(false);
  }

  async function loadReferenceData(currentSchoolSlug: string) {
    const [classroomsRes, levelsRes, tracksRes, yearsRes] = await Promise.all([
      fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
        credentials: "include",
      }),
      fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
        credentials: "include",
      }),
      fetch(buildAdminPath(currentSchoolSlug, "tracks"), {
        credentials: "include",
      }),
      fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
        credentials: "include",
      }),
    ]);
    if (classroomsRes.ok)
      setClassrooms((await classroomsRes.json()) as ClassroomRow[]);
    if (levelsRes.ok)
      setAcademicLevels((await levelsRes.json()) as AcademicLevelRow[]);
    if (tracksRes.ok) setTracks((await tracksRes.json()) as TrackRow[]);
    if (yearsRes.ok) setSchoolYears((await yearsRes.json()) as SchoolYearRow[]);
  }

  async function loadTermReports() {
    if (!schoolSlug || !selectedClassId) return;
    setError(null);
    try {
      const res = await fetch(
        buildAdminPath(
          schoolSlug,
          `promotions/classes/${selectedClassId}/term-reports`,
        ),
        { credentials: "include" },
      );
      if (!res.ok) {
        setError(t("promotions.errors.loadReports"));
        return;
      }
      const rows = (await res.json()) as TermReportRow[];
      setTermReports(rows);
      setDecisionDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            {
              decision: row.decision ?? "PROMOTED",
              nextAcademicLevelId: row.nextAcademicLevel?.id ?? "",
              nextTrackId: row.nextTrack?.id ?? "",
            },
          ]),
        ),
      );
    } catch {
      setError(t("promotions.errors.network"));
    }
  }

  async function saveDecision(reportId: string) {
    if (!schoolSlug) return;
    const draft = decisionDrafts[reportId];
    if (!draft) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setSavingReportId(reportId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `promotions/term-reports/${reportId}/decision`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            decision: draft.decision,
            nextAcademicLevelId:
              draft.decision === "LEFT"
                ? undefined
                : draft.nextAcademicLevelId || undefined,
            nextTrackId:
              draft.decision === "LEFT"
                ? undefined
                : draft.nextTrackId || undefined,
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
            : (payload?.message ?? t("promotions.errors.saveDecision"));
        setError(String(message));
        return;
      }
      setSuccess(t("promotions.success.decisionSaved"));
      await loadTermReports();
    } catch {
      setError(t("promotions.errors.network"));
    } finally {
      setSavingReportId(null);
    }
  }

  async function loadWaiting() {
    if (!schoolSlug || !targetSchoolYearId) return;
    setError(null);
    try {
      const params = new URLSearchParams({ schoolYearId: targetSchoolYearId });
      if (waitingLevelId) params.set("academicLevelId", waitingLevelId);
      const res = await fetch(
        buildAdminPath(
          schoolSlug,
          `promotions/waiting-enrollments?${params.toString()}`,
        ),
        { credentials: "include" },
      );
      if (!res.ok) {
        setError(t("promotions.errors.loadWaiting"));
        return;
      }
      setWaiting((await res.json()) as WaitingEnrollmentRow[]);
    } catch {
      setError(t("promotions.errors.network"));
    }
  }

  async function assignToClass(enrollmentId: string) {
    if (!schoolSlug) return;
    const classId = assignDrafts[enrollmentId];
    if (!classId) return;
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("common.errors.invalidCsrfSession"));
      router.replace("/");
      return;
    }
    setAssigningId(enrollmentId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `promotions/enrollments/${enrollmentId}/assign-class`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ classId }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("promotions.errors.assign"));
        setError(String(message));
        return;
      }
      setSuccess(t("promotions.success.assigned"));
      await loadWaiting();
    } catch {
      setError(t("promotions.errors.network"));
    } finally {
      setAssigningId(null);
    }
  }

  const targetYearClassrooms = classrooms.filter(
    (c) => c.schoolYear.id === targetSchoolYearId,
  );

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("promotions.title")}>
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-1 font-heading text-2xl font-bold text-text-primary">
          {t("promotions.title")}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {t("promotions.subtitle")}
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
            moduleName={t("promotions.title")}
            moduleSummary={t("promotions.help.summary")}
            actions={[
              {
                name: t("promotions.help.action1.name"),
                purpose: t("promotions.help.action1.purpose"),
                howTo: t("promotions.help.action1.howTo"),
                moduleImpact: t("promotions.help.action1.moduleImpact"),
                crossModuleImpact: t(
                  "promotions.help.action1.crossModuleImpact",
                ),
              },
              {
                name: t("promotions.help.action2.name"),
                purpose: t("promotions.help.action2.purpose"),
                howTo: t("promotions.help.action2.howTo"),
                moduleImpact: t("promotions.help.action2.moduleImpact"),
                crossModuleImpact: t(
                  "promotions.help.action2.crossModuleImpact",
                ),
              },
            ]}
            tips={[t("promotions.help.tip1")]}
            workflowExample={{
              title: t("promotions.help.workflow.title"),
              intro: t("promotions.help.workflow.intro"),
              steps: [
                {
                  title: t("promotions.help.workflow.step1.title"),
                  description: t("promotions.help.workflow.step1.description"),
                },
                {
                  title: t("promotions.help.workflow.step2.title"),
                  description: t("promotions.help.workflow.step2.description"),
                },
                {
                  title: t("promotions.help.workflow.step3.title"),
                  description: t("promotions.help.workflow.step3.description"),
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

            <div className="mb-4 flex gap-2">
              <Button
                type="button"
                variant={subTab === "decisions" ? "primary" : "secondary"}
                onClick={() => setSubTab("decisions")}
              >
                {t("promotions.subtab.decisions")}
              </Button>
              <Button
                type="button"
                variant={subTab === "waiting" ? "primary" : "secondary"}
                onClick={() => setSubTab("waiting")}
              >
                {t("promotions.subtab.waiting")}
              </Button>
            </div>

            {subTab === "decisions" ? (
              <>
                <Card className="mb-4">
                  <FormField label={t("promotions.decisions.selectClass")}>
                    <FormSelect
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                      <option value="">{t("common.select")}</option>
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.schoolYear.label})
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                </Card>

                <div className="grid gap-3">
                  {termReports.map((report) => {
                    const draft = decisionDrafts[report.id];
                    return (
                      <Card
                        key={report.id}
                        title={`${report.student.lastName} ${report.student.firstName}`}
                      >
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormField label={t("promotions.decisions.decision")}>
                            <FormSelect
                              value={draft?.decision ?? "PROMOTED"}
                              onChange={(e) =>
                                setDecisionDrafts((current) => ({
                                  ...current,
                                  [report.id]: {
                                    ...current[report.id],
                                    decision: e.target.value as Decision,
                                  },
                                }))
                              }
                            >
                              <option value="PROMOTED">
                                {t("promotions.decision.PROMOTED")}
                              </option>
                              <option value="REPEATED">
                                {t("promotions.decision.REPEATED")}
                              </option>
                              <option value="LEFT">
                                {t("promotions.decision.LEFT")}
                              </option>
                            </FormSelect>
                          </FormField>
                          {draft?.decision !== "LEFT" ? (
                            <>
                              <FormField
                                label={t("promotions.decisions.nextLevel")}
                              >
                                <FormSelect
                                  value={draft?.nextAcademicLevelId ?? ""}
                                  onChange={(e) =>
                                    setDecisionDrafts((current) => ({
                                      ...current,
                                      [report.id]: {
                                        ...current[report.id],
                                        nextAcademicLevelId: e.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">{t("common.select")}</option>
                                  {academicLevels.map((level) => (
                                    <option key={level.id} value={level.id}>
                                      {level.label}
                                    </option>
                                  ))}
                                </FormSelect>
                              </FormField>
                              <FormField
                                label={t("promotions.decisions.nextTrack")}
                              >
                                <FormSelect
                                  value={draft?.nextTrackId ?? ""}
                                  onChange={(e) =>
                                    setDecisionDrafts((current) => ({
                                      ...current,
                                      [report.id]: {
                                        ...current[report.id],
                                        nextTrackId: e.target.value,
                                      },
                                    }))
                                  }
                                >
                                  <option value="">
                                    {t("financeSchedules.form.trackNone")}
                                  </option>
                                  {tracks.map((track) => (
                                    <option key={track.id} value={track.id}>
                                      {track.label}
                                    </option>
                                  ))}
                                </FormSelect>
                              </FormField>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <Button
                            type="button"
                            onClick={() => saveDecision(report.id)}
                            disabled={savingReportId === report.id}
                          >
                            {t("common.save")}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                  {selectedClassId && termReports.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {t("promotions.decisions.empty")}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Card title={t("promotions.waiting.filters")} className="mb-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label={t("promotions.waiting.targetYear")}>
                      <FormSelect
                        value={targetSchoolYearId}
                        onChange={(e) => setTargetSchoolYearId(e.target.value)}
                      >
                        <option value="">{t("common.select")}</option>
                        {schoolYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.label}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                    <FormField label={t("promotions.waiting.level")}>
                      <FormSelect
                        value={waitingLevelId}
                        onChange={(e) => setWaitingLevelId(e.target.value)}
                      >
                        <option value="">
                          {t("promotions.waiting.allLevels")}
                        </option>
                        {academicLevels.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.label}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                  </div>
                </Card>

                <div className="grid gap-3">
                  {waiting.map((row) => (
                    <Card
                      key={row.id}
                      title={`${row.student.lastName} ${row.student.firstName}`}
                      subtitle={`${row.academicLevel?.label ?? ""}${
                        row.track ? ` - ${row.track.label}` : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <FormField label={t("promotions.waiting.targetClass")}>
                          <FormSelect
                            value={assignDrafts[row.id] ?? ""}
                            onChange={(e) =>
                              setAssignDrafts((current) => ({
                                ...current,
                                [row.id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">{t("common.select")}</option>
                            {targetYearClassrooms.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </FormSelect>
                        </FormField>
                        <Button
                          type="button"
                          onClick={() => assignToClass(row.id)}
                          disabled={
                            assigningId === row.id || !assignDrafts[row.id]
                          }
                        >
                          {t("promotions.waiting.assign")}
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {targetSchoolYearId && waiting.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      {t("promotions.waiting.empty")}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
