"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { DateInput } from "../../../../../../../components/ui/date-input";
import { getCsrfTokenCookie } from "../../../../../../../lib/auth-cookies";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
} from "../_shared";
import { OnboardingTarget } from "../../../../../../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import {
  TEACHER_ATTENDANCE_TOUR_ID,
  TEACHER_ATTENDANCE_TOUR_STEPS,
  TEACHER_ATTENDANCE_TOUR_TARGETS,
} from "../../../../../../../components/attendance/teacher-attendance-tour.config";
import { usePageHelp } from "../../../../../../../store/page-help";

type AttendanceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  present: boolean;
};

type AttendanceRoster = {
  classId: string;
  className: string;
  date: string;
  students: AttendanceStudent[];
};

function todayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export default function TeacherClassAttendancePage() {
  const { t } = useTranslation();
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => todayIsoDate());
  const [context, setContext] = useState<GradesContext | null>(null);
  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [absentStudentIds, setAbsentStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  usePageHelp({
    title: t("attendance.pageHelp.title"),
    sections: [
      {
        title: t("attendance.pageHelp.section1Title"),
        body: [t("attendance.pageHelp.section1Body")],
      },
    ],
  });

  const loadContext = useCallback(async () => {
    if (!schoolSlug) {
      return;
    }

    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });
      const me = meResponse.ok
        ? ((await meResponse.json()) as MeResponse)
        : null;

      const tourStore = useOnboardingTourStore.getState();
      if (
        me?.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("teacher", TEACHER_ATTENDANCE_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          TEACHER_ATTENDANCE_TOUR_ID,
          "teacher",
          TEACHER_ATTENDANCE_TOUR_STEPS,
        );
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        { credentials: "include" },
      );

      if (!contextResponse.ok) {
        setError(t("attendance.errors.loadClass"));
        return;
      }

      setContext((await contextResponse.json()) as GradesContext);
    } catch {
      setError(t("attendance.common.networkError"));
    }
  }, [schoolSlug, t]);

  const loadRoster = useCallback(
    async (currentSchoolSlug: string, date: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/schools/${currentSchoolSlug}/classes/${classId}/attendance?date=${encodeURIComponent(date)}`,
          { credentials: "include" },
        );

        if (!response.ok) {
          setError(t("attendance.errors.loadRoster"));
          setRoster(null);
          return;
        }

        const payload = (await response.json()) as AttendanceRoster;
        setRoster(payload);
        setAbsentStudentIds(
          new Set(
            payload.students
              .filter((student) => !student.present)
              .map((student) => student.id),
          ),
        );
      } catch {
        setError(t("attendance.common.networkError"));
        setRoster(null);
      } finally {
        setLoading(false);
      }
    },
    [classId, t],
  );

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadRoster(schoolSlug, selectedDate);
  }, [schoolSlug, selectedDate, loadRoster]);

  function toggleStudent(studentId: string) {
    setSuccess(null);
    setAbsentStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  async function saveRollCall() {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("attendance.common.csrfInvalid"));
      router.replace(`/schools/${schoolSlug}/login`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/classes/${classId}/attendance`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            date: selectedDate,
            absentStudentIds: Array.from(absentStudentIds),
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
            : (payload?.message ?? t("attendance.errors.saveFailed"));
        setError(String(message));
        return;
      }

      const payload = (await response.json()) as AttendanceRoster;
      setRoster(payload);
      setSuccess(t("attendance.success.saved"));
    } catch {
      setError(t("attendance.common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  const presentCount = roster
    ? roster.students.length - absentStudentIds.size
    : 0;

  return (
    <div className="grid gap-4">
      <Card
        title={`${t("attendance.page.titlePrefix")} - ${
          classContext?.className ?? t("attendance.page.defaultClassName")
        }`}
        subtitle={t("attendance.page.subtitle")}
      >
        <OnboardingTarget
          id={TEACHER_ATTENDANCE_TOUR_TARGETS.dateNav}
          className="mb-4 flex flex-wrap items-center gap-3"
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate((date) => shiftIsoDate(date, -1))}
            aria-label={t("attendance.page.previousDayAria")}
          >
            {"‹"}
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">
              {t("attendance.page.dateLabel")}
            </span>
            <DateInput
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedDate((date) => shiftIsoDate(date, 1))}
            aria-label={t("attendance.page.nextDayAria")}
          >
            {"›"}
          </Button>
        </OnboardingTarget>

        {error ? <p className="text-sm text-notification">{error}</p> : null}
        {success ? <p className="text-sm text-success">{success}</p> : null}

        {loading ? (
          <p className="text-sm text-text-secondary">
            {t("attendance.common.loading")}
          </p>
        ) : !classContext ? (
          <p className="text-sm text-notification">
            {t("attendance.page.classNotAccessible")}
          </p>
        ) : !roster || roster.students.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("attendance.page.emptyState")}
          </p>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm font-semibold text-text-primary">
              {t("attendance.page.summary")
                .replace("{present}", String(presentCount))
                .replace("{total}", String(roster.students.length))}
            </p>

            <OnboardingTarget
              id={TEACHER_ATTENDANCE_TOUR_TARGETS.rosterList}
              className="grid gap-2"
            >
              {roster.students.map((student) => {
                const isAbsent = absentStudentIds.has(student.id);
                return (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-warm-surface px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {student.lastName} {student.firstName}
                    </p>
                    <div className="inline-flex overflow-hidden rounded-card border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAbsent) {
                            toggleStudent(student.id);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                          isAbsent
                            ? "bg-surface text-text-secondary"
                            : "bg-success text-surface"
                        }`}
                      >
                        {t("attendance.page.presentLabel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAbsent) {
                            toggleStudent(student.id);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                          isAbsent
                            ? "bg-notification text-surface"
                            : "bg-surface text-text-secondary"
                        }`}
                      >
                        {t("attendance.page.absentLabel")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </OnboardingTarget>

            <Button
              type="button"
              onClick={() => void saveRollCall()}
              disabled={saving}
              className="w-fit"
            >
              {saving
                ? t("attendance.page.saving")
                : t("attendance.page.saveButton")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
