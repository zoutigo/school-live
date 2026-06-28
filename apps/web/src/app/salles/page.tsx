"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
import { DateInput } from "../../components/ui/date-input";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";
import { useTranslation } from "../../i18n/useTranslation";

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
    void loadData(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (!calendarRoomId && rooms.length > 0) {
      setCalendarRoomId(rooms[0].id);
    }
  }, [rooms, calendarRoomId]);

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

      const schoolsResponse = await fetch(`${API_URL}/system/schools`, {
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

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const roomsResponse = await fetch(
        buildAdminPath(currentSchoolSlug, "rooms"),
        { credentials: "include" },
      );

      if (!roomsResponse.ok) {
        setError("Impossible de charger le module salles.");
        return;
      }

      const roomsPayload = (await roomsResponse.json()) as RoomRow[];
      setRooms(roomsPayload);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
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
      await loadData(schoolSlug);
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
      await loadData(schoolSlug);
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
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.name.localeCompare(b.name)),
    [rooms],
  );

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
                <FormSelect
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                >
                  <option value="">{t("salles.schoolPlaceholder")}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </FormSelect>
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
                  <FormSelect
                    aria-label={t("salles.calendar.roomLabel")}
                    value={calendarRoomId}
                    onChange={(event) => setCalendarRoomId(event.target.value)}
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </FormSelect>
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
                  <FormSelect
                    aria-label={t("salles.form.statusLabel")}
                    invalid={Boolean(createForm.formState.errors.status)}
                    value={createValues.status ?? "AVAILABLE"}
                    onChange={(event) =>
                      createForm.setValue(
                        "status",
                        event.target.value as RoomStatus,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <option value="AVAILABLE">
                      {t("salles.status.AVAILABLE")}
                    </option>
                    <option value="UNAVAILABLE">
                      {t("salles.status.UNAVAILABLE")}
                    </option>
                    <option value="MAINTENANCE">
                      {t("salles.status.MAINTENANCE")}
                    </option>
                  </FormSelect>
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
                          colSpan={6}
                        >
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedRooms.map((room) => (
                        <Fragment key={room.id}>
                          <tr className="border-b border-border text-text-primary">
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
                              <td className="px-3 py-3" colSpan={6}>
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
                                    <FormSelect
                                      aria-label={t("salles.form.statusLabel")}
                                      invalid={Boolean(
                                        editForm.formState.errors.status,
                                      )}
                                      value={editValues.status ?? "AVAILABLE"}
                                      onChange={(event) =>
                                        editForm.setValue(
                                          "status",
                                          event.target.value as RoomStatus,
                                          {
                                            shouldDirty: true,
                                            shouldTouch: true,
                                            shouldValidate: true,
                                          },
                                        )
                                      }
                                    >
                                      <option value="AVAILABLE">
                                        {t("salles.status.AVAILABLE")}
                                      </option>
                                      <option value="UNAVAILABLE">
                                        {t("salles.status.UNAVAILABLE")}
                                      </option>
                                      <option value="MAINTENANCE">
                                        {t("salles.status.MAINTENANCE")}
                                      </option>
                                    </FormSelect>
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

                    {!loading && !loadingData && sortedRooms.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={6}
                        >
                          {t("salles.list.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
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
