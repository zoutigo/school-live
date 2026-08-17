"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { DateInput } from "../../components/ui/date-input";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { PaginationControls } from "../../components/ui/pagination-controls";
import { SearchableSelect } from "../../components/ui/searchable-select";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation } from "../../i18n/useTranslation";

const ROOMS_PAGE_SIZE = 20;

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

type Tab = "list" | "calendar" | "help";

type RoomStatus = "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type RoomRow = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  capacity: number | null;
  maxConcurrentSlots: number;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
};

type RoomCalendarEntry = {
  id: string;
  occurrenceDate: string;
  startMinute: number;
  endMinute: number;
  className: string;
  subjectName: string;
  teacherName: string;
};

type RoomSimultaneity = "SINGLE" | "MULTIPLE";

type RoomsListFilters = {
  status: RoomStatus | null;
  simultaneity: RoomSimultaneity | null;
  availabilityFromDate: string | null;
  availabilityToDate: string | null;
  availabilityStartMinute: number | null;
  availabilityEndMinute: number | null;
};

const NO_ROOM_FILTERS: RoomsListFilters = {
  status: null,
  simultaneity: null,
  availabilityFromDate: null,
  availabilityToDate: null,
  availabilityStartMinute: null,
  availabilityEndMinute: null,
};

function hasActiveRoomFilters(filters: RoomsListFilters) {
  return (
    filters.status != null ||
    filters.simultaneity != null ||
    filters.availabilityFromDate != null
  );
}

type RoomsListResult = {
  items: RoomRow[];
  page: number;
  limit: number;
  total: number;
};

function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function minutesToTimeInput(minutes: number | null): string {
  if (minutes == null) return "";
  return minutesToTime(minutes);
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toIsoDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfCurrentWeek() {
  const now = new Date();
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (weekday - 1));
  return start;
}

const roomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la salle est obligatoire."),
  description: z.string().trim().optional(),
  capacity: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[0-9]+$/.test(value),
      "La capacite doit etre un nombre entier positif.",
    ),
  maxConcurrentSlots: z
    .string()
    .trim()
    .min(1, "Ce champ est obligatoire.")
    .refine(
      (value) => /^[0-9]+$/.test(value) && Number(value) >= 1,
      "Doit etre un nombre entier superieur ou egal a 1.",
    ),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"]),
});

type RoomFormValues = z.input<typeof roomSchema>;

function toApiPayload(values: z.output<typeof roomSchema>) {
  return {
    name: values.name,
    description: values.description || undefined,
    capacity: values.capacity ? Number(values.capacity) : undefined,
    maxConcurrentSlots: Number(values.maxConcurrentSlots),
    status: values.status,
  };
}

export default function RoomsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [allRoomOptions, setAllRoomOptions] = useState<RoomRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(ROOMS_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] =
    useState<RoomsListFilters>(NO_ROOM_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<RoomsListFilters>(NO_ROOM_FILTERS);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const weekStart = startOfCurrentWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const [calendarRoomId, setCalendarRoomId] = useState<string>("");
  const [calendarFromDate, setCalendarFromDate] = useState(
    toIsoDateString(weekStart),
  );
  const [calendarToDate, setCalendarToDate] = useState(
    toIsoDateString(weekEnd),
  );
  const [calendarEntries, setCalendarEntries] = useState<RoomCalendarEntry[]>(
    [],
  );
  const [calendarLoading, setCalendarLoading] = useState(false);

  const defaultValues: RoomFormValues = {
    name: "",
    description: "",
    capacity: "",
    maxConcurrentSlots: "1",
    status: "AVAILABLE",
  };

  const createForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    mode: "onChange",
    defaultValues,
  });
  const editForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    mode: "onChange",
    defaultValues,
  });

  const createValues = createForm.watch();
  const editValues = editForm.watch();

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    void createForm.trigger();
  }, [createForm]);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadRooms(schoolSlug, 1, appliedFilters, appliedSearch);
    void loadAllRoomOptions(schoolSlug);
  }, [schoolSlug, appliedFilters, appliedSearch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!calendarRoomId && allRoomOptions.length > 0) {
      setCalendarRoomId(allRoomOptions[0].id);
    }
  }, [allRoomOptions, calendarRoomId]);

  useEffect(() => {
    if (
      tab !== "calendar" ||
      !schoolSlug ||
      !calendarRoomId ||
      !calendarFromDate ||
      !calendarToDate
    ) {
      return;
    }
    void loadRoomCalendar(
      schoolSlug,
      calendarRoomId,
      calendarFromDate,
      calendarToDate,
    );
  }, [tab, schoolSlug, calendarRoomId, calendarFromDate, calendarToDate]);

  function buildAdminPath(currentSchoolSlug: string, segment: string) {
    return `${API_URL}/schools/${currentSchoolSlug}/admin/${segment}`;
  }

  async function bootstrap() {
    try {
      const meResponse = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });
      if (!meResponse.ok) {
        router.replace("/");
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      setRole(me.role);

      const allowed =
        me.role === "SUPER_ADMIN" ||
        me.role === "ADMIN" ||
        me.role === "SCHOOL_ADMIN";

      if (!allowed) {
        router.replace(
          me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
        );
        return;
      }

      if (me.role === "SCHOOL_ADMIN") {
        if (!me.schoolSlug) {
          setError("Aucune ecole rattachee a ce compte SCHOOL_ADMIN.");
          setLoading(false);
          return;
        }
        setSchoolSlug(me.schoolSlug);
        setLoading(false);
        return;
      }

      const schoolsResponse = await fetch(`${API_URL}/system/schools/options`, {
        credentials: "include",
      });
      if (!schoolsResponse.ok) {
        router.replace("/");
        return;
      }

      const schoolRows = (await schoolsResponse.json()) as SchoolOption[];
      setSchools(schoolRows);
      setSchoolSlug(schoolRows[0]?.slug ?? null);
      setLoading(false);
    } catch {
      setError(
        "API indisponible. Verifiez que le serveur backend est demarre.",
      );
      setLoading(false);
    }
  }

  function buildRoomsQuery(
    targetPage: number,
    filters: RoomsListFilters,
    search: string,
  ) {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    params.set("limit", String(ROOMS_PAGE_SIZE));
    if (search.trim()) params.set("search", search.trim());
    if (filters.status) params.set("status", filters.status);
    if (filters.simultaneity) params.set("simultaneity", filters.simultaneity);
    if (filters.availabilityFromDate) {
      params.set("availabilityFromDate", filters.availabilityFromDate);
    }
    if (filters.availabilityToDate) {
      params.set("availabilityToDate", filters.availabilityToDate);
    }
    if (filters.availabilityStartMinute != null) {
      params.set(
        "availabilityStartMinute",
        String(filters.availabilityStartMinute),
      );
    }
    if (filters.availabilityEndMinute != null) {
      params.set(
        "availabilityEndMinute",
        String(filters.availabilityEndMinute),
      );
    }
    return params.toString();
  }

  async function loadRooms(
    currentSchoolSlug: string,
    targetPage: number,
    filters: RoomsListFilters,
    search: string,
  ) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const query = buildRoomsQuery(targetPage, filters, search);
      const roomsResponse = await fetch(
        `${buildAdminPath(currentSchoolSlug, "rooms")}?${query}`,
        { credentials: "include" },
      );

      if (!roomsResponse.ok) {
        setError("Impossible de charger le module salles.");
        return;
      }

      const result = (await roomsResponse.json()) as RoomsListResult;
      setRooms(result.items);
      setPage(result.page);
      setLimit(result.limit);
      setTotal(result.total);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function reloadAfterMutation(currentSchoolSlug: string) {
    await Promise.all([
      loadRooms(currentSchoolSlug, 1, appliedFilters, appliedSearch),
      loadAllRoomOptions(currentSchoolSlug),
    ]);
  }

  async function loadAllRoomOptions(currentSchoolSlug: string) {
    try {
      const response = await fetch(
        `${buildAdminPath(currentSchoolSlug, "rooms")}?limit=200`,
        { credentials: "include" },
      );
      if (!response.ok) return;
      const result = (await response.json()) as RoomsListResult;
      setAllRoomOptions(result.items);
    } catch {
      // Le selecteur du tab calendrier reste vide, non bloquant.
    }
  }

  async function loadRoomCalendar(
    currentSchoolSlug: string,
    roomId: string,
    fromDate: string,
    toDate: string,
  ) {
    setCalendarLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${buildAdminPath(currentSchoolSlug, `rooms/${roomId}/calendar`)}?fromDate=${fromDate}&toDate=${toDate}`,
        { credentials: "include" },
      );

      if (!response.ok) {
        setError("Impossible de charger le calendrier de la salle.");
        return;
      }

      const payload = (await response.json()) as RoomCalendarEntry[];
      setCalendarEntries(payload);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function onCreateRoom(values: z.output<typeof roomSchema>) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(buildAdminPath(schoolSlug, "rooms"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(toApiPayload(values)),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        return;
      }

      createForm.reset(defaultValues);
      setSuccess("Salle creee.");
      await reloadAfterMutation(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditRoom(room: RoomRow) {
    setEditingRoomId(room.id);
    editForm.reset({
      name: room.name,
      description: room.description ?? "",
      capacity: room.capacity ? String(room.capacity) : "",
      maxConcurrentSlots: String(room.maxConcurrentSlots),
      status: room.status,
    });
    void editForm.trigger();
    setError(null);
    setSuccess(null);
  }

  async function saveRoom(roomId: string, values: z.output<typeof roomSchema>) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `rooms/${roomId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(toApiPayload(values)),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Mise a jour impossible.");
        setError(String(message));
        return;
      }

      setEditingRoomId(null);
      setSuccess("Salle modifiee.");
      await reloadAfterMutation(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  function askDeleteRoom(room: RoomRow) {
    setDeleteTarget({ id: room.id, label: room.name });
  }

  async function onConfirmDelete() {
    if (!schoolSlug || !deleteTarget) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `rooms/${deleteTarget.id}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      setDeleteTarget(null);
      setSuccess("Salle supprimee.");
      await reloadAfterMutation(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function openFilters() {
    setDraftFilters(appliedFilters);
    setFiltersOpen(true);
  }
  function closeFilters() {
    setDraftFilters(appliedFilters);
    setFiltersOpen(false);
  }
  function applyFilters() {
    setAppliedFilters(draftFilters);
    setFiltersOpen(false);
  }
  function resetFilters() {
    setDraftFilters(NO_ROOM_FILTERS);
    setAppliedFilters(NO_ROOM_FILTERS);
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("salles.shellName")}>
      <div className="grid gap-4">
        <Card title={t("salles.title")} subtitle={t("salles.subtitle")}>
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "list"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("salles.tab.list")}
            </button>
            <button
              type="button"
              onClick={() => setTab("calendar")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "calendar"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("salles.tab.calendar")}
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
              {t("salles.tab.help")}
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("salles.schoolLabel")}
                </span>
                <SearchableSelect
                  value={schoolSlug ?? ""}
                  onChange={(value) => setSchoolSlug(value || null)}
                  placeholder={t("salles.schoolPlaceholder")}
                  searchPlaceholder={t("settings.form.searchPlaceholder")}
                  noResultsLabel={t("settings.form.noResults")}
                  ariaLabel={t("salles.schoolLabel")}
                  data-testid="salles-school-select"
                  options={schools.map((school) => ({
                    value: school.slug,
                    label: school.name,
                  }))}
                />
              </label>
            ) : null}
          </div>

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName={t("salles.help.moduleName")}
              moduleSummary={t("salles.help.moduleSummary")}
              actions={[
                {
                  name: t("salles.help.action1.name"),
                  purpose: t("salles.help.action1.purpose"),
                  howTo: t("salles.help.action1.howTo"),
                  moduleImpact: t("salles.help.action1.moduleImpact"),
                  crossModuleImpact: t("salles.help.action1.crossModuleImpact"),
                },
                {
                  name: t("salles.help.action2.name"),
                  purpose: t("salles.help.action2.purpose"),
                  howTo: t("salles.help.action2.howTo"),
                  moduleImpact: t("salles.help.action2.moduleImpact"),
                  crossModuleImpact: t("salles.help.action2.crossModuleImpact"),
                },
                {
                  name: t("salles.help.action3.name"),
                  purpose: t("salles.help.action3.purpose"),
                  howTo: t("salles.help.action3.howTo"),
                  moduleImpact: t("salles.help.action3.moduleImpact"),
                  crossModuleImpact: t("salles.help.action3.crossModuleImpact"),
                },
              ]}
              tips={[t("salles.help.tip1"), t("salles.help.tip2")]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              {t("salles.noSchool")}
            </p>
          ) : tab === "calendar" ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-text-secondary">
                    {t("salles.calendar.roomLabel")}
                  </span>
                  <SearchableSelect
                    ariaLabel={t("salles.calendar.roomLabel")}
                    value={calendarRoomId}
                    onChange={setCalendarRoomId}
                    searchPlaceholder={t("settings.form.searchPlaceholder")}
                    noResultsLabel={t("settings.form.noResults")}
                    data-testid="salles-calendar-room-select"
                    options={allRoomOptions.map((room) => ({
                      value: room.id,
                      label: room.name,
                    }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-text-secondary">
                    {t("salles.calendar.fromLabel")}
                  </span>
                  <DateInput
                    aria-label={t("salles.calendar.fromLabel")}
                    value={calendarFromDate}
                    onChange={(event) =>
                      setCalendarFromDate(event.target.value)
                    }
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-text-secondary">
                    {t("salles.calendar.toLabel")}
                  </span>
                  <DateInput
                    aria-label={t("salles.calendar.toLabel")}
                    value={calendarToDate}
                    onChange={(event) => setCalendarToDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("salles.calendar.colDate")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.calendar.colTime")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.calendar.colClass")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.calendar.colSubject")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.calendar.colTeacher")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarLoading ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    ) : calendarEntries.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("salles.calendar.empty")}
                        </td>
                      </tr>
                    ) : (
                      calendarEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">{entry.occurrenceDate}</td>
                          <td className="px-3 py-2">
                            {minutesToTime(entry.startMinute)} -{" "}
                            {minutesToTime(entry.endMinute)}
                          </td>
                          <td className="px-3 py-2">{entry.className}</td>
                          <td className="px-3 py-2">{entry.subjectName}</td>
                          <td className="px-3 py-2">{entry.teacherName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-5"
                onSubmit={createForm.handleSubmit(onCreateRoom)}
              >
                <FormField
                  label={t("salles.form.nameLabel")}
                  error={createForm.formState.errors.name?.message}
                >
                  <FormTextInput
                    aria-label={t("salles.form.nameLabel")}
                    {...createForm.register("name")}
                    placeholder={t("salles.form.namePlaceholder")}
                    invalid={Boolean(createForm.formState.errors.name)}
                  />
                </FormField>
                <FormField
                  label={t("salles.form.descriptionLabel")}
                  error={createForm.formState.errors.description?.message}
                >
                  <FormTextInput
                    aria-label={t("salles.form.descriptionLabel")}
                    {...createForm.register("description")}
                    placeholder={t("salles.form.descriptionPlaceholder")}
                  />
                </FormField>
                <FormField
                  label={t("salles.form.capacityLabel")}
                  error={createForm.formState.errors.capacity?.message}
                >
                  <FormTextInput
                    aria-label={t("salles.form.capacityLabel")}
                    inputMode="numeric"
                    {...createForm.register("capacity")}
                    invalid={Boolean(createForm.formState.errors.capacity)}
                  />
                </FormField>
                <FormField
                  label={t("salles.form.maxConcurrentSlotsLabel")}
                  error={
                    createForm.formState.errors.maxConcurrentSlots?.message
                  }
                >
                  <FormTextInput
                    aria-label={t("salles.form.maxConcurrentSlotsLabel")}
                    inputMode="numeric"
                    {...createForm.register("maxConcurrentSlots")}
                    invalid={Boolean(
                      createForm.formState.errors.maxConcurrentSlots,
                    )}
                  />
                </FormField>
                <FormField
                  label={t("salles.form.statusLabel")}
                  error={createForm.formState.errors.status?.message}
                >
                  <SearchableSelect
                    ariaLabel={t("salles.form.statusLabel")}
                    invalid={Boolean(createForm.formState.errors.status)}
                    value={createValues.status ?? "AVAILABLE"}
                    onChange={(value) =>
                      createForm.setValue("status", value as RoomStatus, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                    data-testid="salles-create-status-select"
                    options={[
                      {
                        value: "AVAILABLE",
                        label: t("salles.status.AVAILABLE"),
                      },
                      {
                        value: "UNAVAILABLE",
                        label: t("salles.status.UNAVAILABLE"),
                      },
                      {
                        value: "MAINTENANCE",
                        label: t("salles.status.MAINTENANCE"),
                      },
                    ]}
                  />
                </FormField>

                <div className="md:col-span-5">
                  <p className="mb-2 text-xs text-text-secondary">
                    {t("salles.form.maxConcurrentSlotsHint")}
                  </p>
                  <FormSubmitHint visible={!createForm.formState.isValid} />
                  <SubmitButton
                    disabled={submitting || !createForm.formState.isValid}
                  >
                    {submitting
                      ? t("salles.list.creating")
                      : t("salles.list.add")}
                  </SubmitButton>
                </div>
              </form>

              <div className="flex flex-wrap items-end gap-2">
                <label className="grid min-w-[220px] flex-1 gap-1 text-sm">
                  <span className="font-medium text-text-secondary">
                    {t("salles.search.placeholder")}
                  </span>
                  <FormTextInput
                    aria-label={t("salles.search.placeholder")}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={t("salles.search.placeholder")}
                    data-testid="salles-search-input"
                  />
                </label>
                <Button
                  type="button"
                  variant={
                    hasActiveRoomFilters(appliedFilters)
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => (filtersOpen ? closeFilters() : openFilters())}
                  data-testid="salles-filter-toggle"
                >
                  {t("salles.filters.toggle")}
                </Button>
              </div>

              {filtersOpen ? (
                <div
                  className="grid gap-3 rounded-card border border-border p-3 md:grid-cols-3"
                  data-testid="salles-filter-panel"
                >
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.statusLabel")}
                    </span>
                    <SearchableSelect
                      ariaLabel={t("salles.filters.statusLabel")}
                      value={draftFilters.status ?? ""}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          status: (value || null) as RoomStatus | null,
                        }))
                      }
                      data-testid="salles-filter-status"
                      options={[
                        { value: "", label: t("salles.filters.allOption") },
                        {
                          value: "AVAILABLE",
                          label: t("salles.status.AVAILABLE"),
                        },
                        {
                          value: "UNAVAILABLE",
                          label: t("salles.status.UNAVAILABLE"),
                        },
                        {
                          value: "MAINTENANCE",
                          label: t("salles.status.MAINTENANCE"),
                        },
                      ]}
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.simultaneityLabel")}
                    </span>
                    <SearchableSelect
                      ariaLabel={t("salles.filters.simultaneityLabel")}
                      value={draftFilters.simultaneity ?? ""}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          simultaneity: (value ||
                            null) as RoomSimultaneity | null,
                        }))
                      }
                      data-testid="salles-filter-simultaneity"
                      options={[
                        { value: "", label: t("salles.filters.allOption") },
                        {
                          value: "SINGLE",
                          label: t("salles.filters.simultaneity.SINGLE"),
                        },
                        {
                          value: "MULTIPLE",
                          label: t("salles.filters.simultaneity.MULTIPLE"),
                        },
                      ]}
                    />
                  </label>

                  <div />

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.availabilityFromLabel")}
                    </span>
                    <DateInput
                      aria-label={t("salles.filters.availabilityFromLabel")}
                      value={draftFilters.availabilityFromDate ?? ""}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          availabilityFromDate: event.target.value || null,
                        }))
                      }
                      data-testid="salles-filter-availability-from"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.availabilityToLabel")}
                    </span>
                    <DateInput
                      aria-label={t("salles.filters.availabilityToLabel")}
                      value={
                        draftFilters.availabilityToDate ??
                        draftFilters.availabilityFromDate ??
                        ""
                      }
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          availabilityToDate: event.target.value || null,
                        }))
                      }
                      data-testid="salles-filter-availability-to"
                    />
                  </label>
                  <div />
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.availabilityStartLabel")}
                    </span>
                    <FormTextInput
                      aria-label={t("salles.filters.availabilityStartLabel")}
                      type="time"
                      value={minutesToTimeInput(
                        draftFilters.availabilityStartMinute,
                      )}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          availabilityStartMinute: timeToMinutes(
                            event.target.value,
                          ),
                        }))
                      }
                      data-testid="salles-filter-availability-start"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-text-secondary">
                      {t("salles.filters.availabilityEndLabel")}
                    </span>
                    <FormTextInput
                      aria-label={t("salles.filters.availabilityEndLabel")}
                      type="time"
                      value={minutesToTimeInput(
                        draftFilters.availabilityEndMinute,
                      )}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          availabilityEndMinute: timeToMinutes(
                            event.target.value,
                          ),
                        }))
                      }
                      data-testid="salles-filter-availability-end"
                    />
                  </label>

                  <div className="flex gap-2 md:col-span-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetFilters}
                      data-testid="salles-filter-reset"
                    >
                      {t("salles.filters.reset")}
                    </Button>
                    <Button
                      type="button"
                      onClick={applyFilters}
                      data-testid="salles-filter-apply"
                    >
                      {t("salles.filters.apply")}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colName")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colDescription")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colCapacity")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colConcurrentSlots")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colStatus")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("salles.list.colDetail")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("salles.list.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={7}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      rooms.map((room) => (
                        <Fragment key={room.id}>
                          <tr
                            className={`border-b border-border text-text-primary border-l-4 ${
                              room.status === "AVAILABLE"
                                ? "border-l-warm-accent"
                                : "border-l-notification"
                            }`}
                            data-testid={`salles-room-row-${room.id}`}
                          >
                            <td className="px-3 py-2">{room.name}</td>
                            <td className="px-3 py-2">
                              {room.description ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {room.capacity ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {room.maxConcurrentSlots}
                            </td>
                            <td className="px-3 py-2">
                              {t(`salles.status.${room.status}`)}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  router.push(
                                    `/salles/${room.id}?schoolSlug=${schoolSlug ?? ""}`,
                                  )
                                }
                                data-testid={`salles-room-view-${room.id}`}
                              >
                                {t("salles.list.viewDetail")}
                              </Button>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditRoom(room)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => askDeleteRoom(room)}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingRoomId === room.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={7}>
                                <div className="grid gap-3 md:grid-cols-5">
                                  <FormField
                                    label={t("salles.form.nameLabel")}
                                    error={
                                      editForm.formState.errors.name?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t("salles.form.nameLabel")}
                                      {...editForm.register("name")}
                                      invalid={Boolean(
                                        editForm.formState.errors.name,
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("salles.form.descriptionLabel")}
                                    error={
                                      editForm.formState.errors.description
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "salles.form.descriptionLabel",
                                      )}
                                      {...editForm.register("description")}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("salles.form.capacityLabel")}
                                    error={
                                      editForm.formState.errors.capacity
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "salles.form.capacityLabel",
                                      )}
                                      inputMode="numeric"
                                      {...editForm.register("capacity")}
                                      invalid={Boolean(
                                        editForm.formState.errors.capacity,
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t(
                                      "salles.form.maxConcurrentSlotsLabel",
                                    )}
                                    error={
                                      editForm.formState.errors
                                        .maxConcurrentSlots?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "salles.form.maxConcurrentSlotsLabel",
                                      )}
                                      inputMode="numeric"
                                      {...editForm.register(
                                        "maxConcurrentSlots",
                                      )}
                                      invalid={Boolean(
                                        editForm.formState.errors
                                          .maxConcurrentSlots,
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("salles.form.statusLabel")}
                                    error={
                                      editForm.formState.errors.status?.message
                                    }
                                  >
                                    <SearchableSelect
                                      ariaLabel={t("salles.form.statusLabel")}
                                      invalid={Boolean(
                                        editForm.formState.errors.status,
                                      )}
                                      value={editValues.status ?? "AVAILABLE"}
                                      onChange={(value) =>
                                        editForm.setValue(
                                          "status",
                                          value as RoomStatus,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                      data-testid="salles-edit-status-select"
                                      options={[
                                        {
                                          value: "AVAILABLE",
                                          label: t("salles.status.AVAILABLE"),
                                        },
                                        {
                                          value: "UNAVAILABLE",
                                          label: t("salles.status.UNAVAILABLE"),
                                        },
                                        {
                                          value: "MAINTENANCE",
                                          label: t("salles.status.MAINTENANCE"),
                                        },
                                      ]}
                                    />
                                  </FormField>
                                  <div className="md:col-span-5">
                                    <FormSubmitHint
                                      visible={!editForm.formState.isValid}
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    disabled={
                                      saving || !editForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editForm.handleSubmit((values) =>
                                        saveRoom(room.id, values),
                                      )();
                                    }}
                                  >
                                    {saving
                                      ? t("salles.list.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingRoomId(null);
                                      editForm.reset();
                                    }}
                                  >
                                    {t("common.cancel")}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}

                    {!loading && !loadingData && rooms.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={7}
                        >
                          {t("salles.list.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalItems={total}
                disabled={loadingData}
                onPageChange={(nextPage) => {
                  if (!schoolSlug) return;
                  void loadRooms(
                    schoolSlug,
                    nextPage,
                    appliedFilters,
                    appliedSearch,
                  );
                }}
              />
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-notification">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-primary">{success}</p>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("salles.delete.title")}
        message={
          deleteTarget
            ? t("salles.delete.message").replace("{label}", deleteTarget.label)
            : ""
        }
        confirmLabel={t("salles.delete.confirm")}
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void onConfirmDelete();
        }}
      />
    </AppShell>
  );
}
