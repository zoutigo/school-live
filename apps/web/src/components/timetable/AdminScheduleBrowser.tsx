"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  TimetableViews,
  type TimetableDisplaySlot,
  type TimetableViewMode,
} from "./timetable-views";
import { useTranslation } from "../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const SEARCH_DEBOUNCE_MS = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "SCHOOL_ACCOUNTANT"
  | "SCHOOL_STAFF"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

type SchoolMemberRow = {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  roles: SchoolRole[];
};

type AcademicLevel = {
  id: string;
  code: string;
  label: string;
};

type ClassOption = {
  classId: string;
  className: string;
  schoolYearId: string;
  academicLevelId: string | null;
  academicLevelName: string | null;
};

type PageMeta = { page: number; limit: number; total: number };

type OccurrenceRow = {
  id: string;
  source: "RECURRING" | "EXCEPTION_OVERRIDE" | "ONE_OFF";
  status: "PLANNED" | "CANCELLED";
  occurrenceDate: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  subject: { id: string; name: string };
  teacherUser: {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string | null;
  };
};

type TeacherMyTimetableResponse = {
  occurrences: OccurrenceRow[];
  occurrenceContexts: Array<{ occurrenceId: string; classId: string }>;
  subjectStyles: Array<{ subjectId: string; colorHex: string }>;
};

type StudentMyTimetableResponse = {
  class: { id: string };
  occurrences: OccurrenceRow[];
  subjectStyles: Array<{ subjectId: string; colorHex: string }>;
};

type ClassTimetableResponse = {
  occurrences: OccurrenceRow[];
  subjectStyles: Array<{ subjectId: string; colorHex: string }>;
};

type Mode = "USER" | "CLASS";
type TargetKind = "TEACHER" | "STUDENT" | "CLASS" | "NONE";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!resp.ok) throw new Error(`Request failed: ${path}`);
  return resp.json() as Promise<T>;
}

function memberHasRole(member: SchoolMemberRow, role: "TEACHER" | "STUDENT") {
  return member.roles.includes(role);
}

function computeHasMore(meta: PageMeta | null): boolean {
  if (!meta) return false;
  return meta.page < Math.max(1, Math.ceil(meta.total / meta.limit));
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}
function toWeekdayMondayFirst(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
function startOfWeek(date: Date) {
  const normalized = stripTime(date);
  return addDays(normalized, 1 - toWeekdayMondayFirst(normalized));
}
function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function occurrenceToDisplaySlot(entry: OccurrenceRow): TimetableDisplaySlot {
  return {
    id: entry.id,
    occurrenceDate: entry.occurrenceDate,
    weekday: entry.weekday,
    startMinute: entry.startMinute,
    endMinute: entry.endMinute,
    subjectId: entry.subject.id,
    subjectName: entry.subject.name,
    teacherName: `${entry.teacherUser.lastName.toUpperCase()} ${entry.teacherUser.firstName}`,
    teacherGender: entry.teacherUser.gender,
    room: entry.room,
    status: entry.status,
    source: entry.source,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminScheduleBrowser({ schoolSlug }: { schoolSlug: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("USER");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  function switchMode(next: Mode) {
    setMode(next);
    setSearchInput("");
    setAppliedSearch("");
    setSelectedMember(null);
    setSelectedClass(null);
    setLevelId(null);
  }

  // ── Users picker ─────────────────────────────────────────────────────────

  const [members, setMembers] = useState<SchoolMemberRow[]>([]);
  const [memberMeta, setMemberMeta] = useState<PageMeta | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SchoolMemberRow | null>(
    null,
  );

  const loadMembers = useCallback(
    async (page: number, appendMode: boolean) => {
      if (appendMode) setLoadingMoreMembers(true);
      else setLoadingMembers(true);
      try {
        const q = new URLSearchParams({ page: String(page), limit: "20" });
        if (appliedSearch) q.set("search", appliedSearch);
        const res = await apiFetch<{
          data: SchoolMemberRow[];
          page: number;
          limit: number;
          total: number;
        }>(`/schools/${schoolSlug}/users?${q.toString()}`);
        setMembers((current) =>
          appendMode ? [...current, ...res.data] : res.data,
        );
        setMemberMeta({ page: res.page, limit: res.limit, total: res.total });
      } catch {
        // conserve les éléments déjà chargés
      } finally {
        setLoadingMembers(false);
        setLoadingMoreMembers(false);
      }
    },
    [schoolSlug, appliedSearch],
  );

  useEffect(() => {
    if (mode !== "USER") return;
    void loadMembers(1, false);
  }, [mode, appliedSearch]);

  // ── Levels + Classes picker ──────────────────────────────────────────────

  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [levelId, setLevelId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AcademicLevel[]>(`/schools/${schoolSlug}/admin/academic-levels`)
      .then(setLevels)
      .catch(() => setLevels([]));
  }, [schoolSlug]);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classMeta, setClassMeta] = useState<PageMeta | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingMoreClasses, setLoadingMoreClasses] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);

  const loadClasses = useCallback(
    async (page: number, appendMode: boolean) => {
      if (appendMode) setLoadingMoreClasses(true);
      else setLoadingClasses(true);
      try {
        const q = new URLSearchParams({ page: String(page), limit: "20" });
        if (appliedSearch) q.set("search", appliedSearch);
        if (levelId) q.set("academicLevelId", levelId);
        const res = await apiFetch<{
          data: ClassOption[];
          page: number;
          limit: number;
          total: number;
        }>(`/schools/${schoolSlug}/timetable/classes?${q.toString()}`);
        setClasses((current) =>
          appendMode ? [...current, ...res.data] : res.data,
        );
        setClassMeta({ page: res.page, limit: res.limit, total: res.total });
      } catch {
        // conserve les éléments déjà chargés
      } finally {
        setLoadingClasses(false);
        setLoadingMoreClasses(false);
      }
    },
    [schoolSlug, appliedSearch, levelId],
  );

  useEffect(() => {
    if (mode !== "CLASS") return;
    void loadClasses(1, false);
  }, [mode, appliedSearch, levelId]);

  // ── Agenda display state ──────────────────────────────────────────────────

  const today = stripTime(new Date());
  const [viewMode, setViewMode] = useState<TimetableViewMode>("day");
  const [cursorDate, setCursorDate] = useState(today);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompactViewport(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const activeRange = useMemo(() => {
    if (viewMode === "day") {
      return { from: stripTime(cursorDate), to: stripTime(cursorDate) };
    }
    if (viewMode === "week") {
      const from = startOfWeek(cursorDate);
      return { from, to: addDays(from, 6) };
    }
    const from = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const to = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
    return { from, to };
  }, [viewMode, cursorDate]);

  const targetKind: TargetKind =
    mode === "CLASS"
      ? selectedClass
        ? "CLASS"
        : "NONE"
      : selectedMember
        ? memberHasRole(selectedMember, "TEACHER")
          ? "TEACHER"
          : memberHasRole(selectedMember, "STUDENT")
            ? "STUDENT"
            : "NONE"
        : "NONE";

  const hasSelection = selectedMember != null || selectedClass != null;

  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [subjectColorsBySubjectId, setSubjectColorsBySubjectId] = useState<
    Record<string, string>
  >({});
  const [classIdByOccurrenceId, setClassIdByOccurrenceId] = useState<
    Record<string, string>
  >({});
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  const loadAgenda = useCallback(async () => {
    setLoadingAgenda(true);
    setAgendaError(null);
    try {
      const fromDate = toIsoDateString(activeRange.from);
      const toDate = toIsoDateString(activeRange.to);
      if (targetKind === "TEACHER" && selectedMember) {
        const q = new URLSearchParams({
          teacherUserId: selectedMember.id,
          fromDate,
          toDate,
        });
        const payload = await apiFetch<TeacherMyTimetableResponse>(
          `/schools/${schoolSlug}/timetable/me/teacher?${q.toString()}`,
        );
        setOccurrences(payload.occurrences);
        setSubjectColorsBySubjectId(
          Object.fromEntries(
            payload.subjectStyles.map((s) => [s.subjectId, s.colorHex]),
          ),
        );
        setClassIdByOccurrenceId(
          Object.fromEntries(
            payload.occurrenceContexts.map((c) => [c.occurrenceId, c.classId]),
          ),
        );
      } else if (targetKind === "STUDENT" && selectedMember) {
        const q = new URLSearchParams({
          studentId: selectedMember.studentId ?? selectedMember.id,
          fromDate,
          toDate,
        });
        const payload = await apiFetch<StudentMyTimetableResponse>(
          `/schools/${schoolSlug}/timetable/me?${q.toString()}`,
        );
        setOccurrences(payload.occurrences);
        setSubjectColorsBySubjectId(
          Object.fromEntries(
            payload.subjectStyles.map((s) => [s.subjectId, s.colorHex]),
          ),
        );
        const classId = payload.class.id;
        setClassIdByOccurrenceId(
          Object.fromEntries(payload.occurrences.map((o) => [o.id, classId])),
        );
      } else if (targetKind === "CLASS" && selectedClass) {
        const q = new URLSearchParams({ fromDate, toDate });
        const payload = await apiFetch<ClassTimetableResponse>(
          `/schools/${schoolSlug}/timetable/classes/${selectedClass.classId}?${q.toString()}`,
        );
        setOccurrences(payload.occurrences);
        setSubjectColorsBySubjectId(
          Object.fromEntries(
            payload.subjectStyles.map((s) => [s.subjectId, s.colorHex]),
          ),
        );
        const classId = selectedClass.classId;
        setClassIdByOccurrenceId(
          Object.fromEntries(payload.occurrences.map((o) => [o.id, classId])),
        );
      } else {
        setOccurrences([]);
        setClassIdByOccurrenceId({});
      }
    } catch {
      setAgendaError(t("timetable.adminSchedule.errors.loadAgenda"));
    } finally {
      setLoadingAgenda(false);
    }
  }, [
    schoolSlug,
    targetKind,
    selectedMember,
    selectedClass,
    activeRange.from,
    activeRange.to,
    t,
  ]);

  useEffect(() => {
    setViewMode("day");
    setCursorDate(today);
  }, [selectedMember?.id, selectedClass?.classId]);

  useEffect(() => {
    if (targetKind === "NONE") {
      setOccurrences([]);
      setClassIdByOccurrenceId({});
      return;
    }
    void loadAgenda();
  }, [loadAgenda, targetKind]);

  const timetableViewSlots: TimetableDisplaySlot[] = occurrences.map(
    occurrenceToDisplaySlot,
  );

  return (
    <div
      className="flex flex-col gap-4 lg:flex-row"
      data-testid="admin-schedule-browser"
    >
      {/* LEFT — filtres et sélection */}
      <div className="w-full shrink-0 lg:w-[360px]">
        <Card
          title={t("timetable.adminSchedule.filters.title")}
          data-testid="admin-schedule-filters"
        >
          <div
            className="mb-3 flex gap-2"
            data-testid="admin-schedule-mode-toggle"
          >
            <button
              type="button"
              data-testid="admin-schedule-mode-user"
              onClick={() => switchMode("USER")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${mode === "USER" ? "border-primary bg-primary text-white" : "border-warm-border bg-warm-surface text-text-secondary"}`}
            >
              {t("timetable.adminSchedule.filters.modeUser")}
            </button>
            <button
              type="button"
              data-testid="admin-schedule-mode-class"
              onClick={() => switchMode("CLASS")}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${mode === "CLASS" ? "border-primary bg-primary text-white" : "border-warm-border bg-warm-surface text-text-secondary"}`}
            >
              {t("timetable.adminSchedule.filters.modeClass")}
            </button>
          </div>

          <div className="relative mb-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              data-testid="admin-schedule-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                mode === "CLASS"
                  ? t("timetable.adminSchedule.filters.searchClassPlaceholder")
                  : t("timetable.adminSchedule.filters.searchUserPlaceholder")
              }
              className="w-full rounded-xl border border-warm-border bg-background py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            {searchInput ? (
              <button
                type="button"
                data-testid="admin-schedule-search-clear"
                aria-label={t("timetable.adminSchedule.filters.clearSearch")}
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                <XCircle size={16} />
              </button>
            ) : null}
          </div>

          {mode === "CLASS" ? (
            <div
              className="mb-3 flex flex-wrap gap-2"
              data-testid="admin-schedule-level-chips"
            >
              <button
                type="button"
                data-testid="admin-schedule-level-all"
                onClick={() => setLevelId(null)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${!levelId ? "border-primary bg-primary text-white" : "border-warm-border bg-warm-surface text-text-secondary"}`}
              >
                {t("timetable.adminSchedule.filters.allLevels")}
              </button>
              {levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  data-testid={`admin-schedule-level-${level.id}`}
                  onClick={() => setLevelId(level.id)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${levelId === level.id ? "border-primary bg-primary text-white" : "border-warm-border bg-warm-surface text-text-secondary"}`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="max-h-80 space-y-1.5 overflow-y-auto pr-1"
            data-testid="admin-schedule-results-list"
          >
            {mode === "USER" ? (
              loadingMembers ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  {t("timetable.adminSchedule.filters.loading")}
                </p>
              ) : members.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  {t("timetable.adminSchedule.filters.noResult")}
                </p>
              ) : (
                <>
                  {members.map((member) => {
                    const isSelected = selectedMember?.id === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        data-testid={`admin-schedule-user-${member.id}`}
                        onClick={() => setSelectedMember(member)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? "border-primary bg-blue-50" : "border-warm-border bg-warm-surface hover:bg-warm-highlight"}`}
                      >
                        <p
                          className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-primary"}`}
                        >
                          {member.lastName} {member.firstName}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {memberHasRole(member, "TEACHER")
                            ? t("timetable.adminSchedule.filters.roleTeacher")
                            : memberHasRole(member, "STUDENT")
                              ? t("timetable.adminSchedule.filters.roleStudent")
                              : t("timetable.adminSchedule.filters.roleStaff")}
                        </p>
                      </button>
                    );
                  })}
                  {computeHasMore(memberMeta) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid="admin-schedule-users-load-more"
                      disabled={loadingMoreMembers}
                      onClick={() =>
                        void loadMembers((memberMeta?.page ?? 1) + 1, true)
                      }
                      className="w-full"
                    >
                      {t("timetable.adminSchedule.filters.loadMore")}
                    </Button>
                  ) : null}
                </>
              )
            ) : loadingClasses ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                {t("timetable.adminSchedule.filters.loading")}
              </p>
            ) : classes.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-secondary">
                {t("timetable.adminSchedule.filters.noResult")}
              </p>
            ) : (
              <>
                {classes.map((cls) => {
                  const isSelected = selectedClass?.classId === cls.classId;
                  return (
                    <button
                      key={cls.classId}
                      type="button"
                      data-testid={`admin-schedule-class-${cls.classId}`}
                      onClick={() => setSelectedClass(cls)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? "border-primary bg-blue-50" : "border-warm-border bg-warm-surface hover:bg-warm-highlight"}`}
                    >
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text-primary"}`}
                      >
                        {cls.className}
                      </p>
                      {cls.academicLevelName ? (
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {cls.academicLevelName}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
                {computeHasMore(classMeta) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid="admin-schedule-classes-load-more"
                    disabled={loadingMoreClasses}
                    onClick={() =>
                      void loadClasses((classMeta?.page ?? 1) + 1, true)
                    }
                    className="w-full"
                  >
                    {t("timetable.adminSchedule.filters.loadMore")}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* RIGHT — agenda du profil/classe sélectionné */}
      <div className="min-w-0 flex-1">
        <Card title={t("timetable.adminSchedule.title")}>
          {!hasSelection ? (
            <p
              className="py-8 text-center text-sm text-text-secondary"
              data-testid="admin-schedule-empty-selection"
            >
              {t("timetable.adminSchedule.emptySelectionMessage")}
            </p>
          ) : targetKind === "NONE" ? (
            <p
              className="py-8 text-center text-sm text-text-secondary"
              data-testid="admin-schedule-no-agenda"
            >
              {t("timetable.adminSchedule.noAgendaMessage")}
            </p>
          ) : loadingAgenda ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              {t("timetable.adminSchedule.loading")}
            </p>
          ) : agendaError ? (
            <p className="py-8 text-center text-sm text-red-600">
              {agendaError}
            </p>
          ) : (
            <TimetableViews
              slots={timetableViewSlots}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cursorDate={cursorDate}
              onCursorDateChange={setCursorDate}
              isCompactViewport={isCompactViewport}
              subjectColorsBySubjectId={subjectColorsBySubjectId}
              dayEmptyLabel={t("timetable.adminSchedule.emptyDay")}
              monthEmptyLabel={t("timetable.adminSchedule.emptyDay")}
              onSlotClick={(slot) => {
                const classId = classIdByOccurrenceId[slot.id];
                if (classId) {
                  router.push(
                    `/schools/${schoolSlug}/classes/${classId}/agenda`,
                  );
                }
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
