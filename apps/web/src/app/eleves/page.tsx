"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EmailInput } from "../../components/ui/email-input";
import { FormField } from "../../components/ui/form-field";
import { SubmitButton } from "../../components/ui/form-buttons";
import {
  LifeEventsList,
  lifeEventTypeLabel,
  type LifeEventRow,
  type LifeEventType,
} from "../../components/life-events/life-events-list";
import { ModuleHelpTab } from "../../components/ui/module-help-tab";
import { PasswordInput } from "../../components/ui/password-input";
import { PinInput } from "../../components/ui/pin-input";
import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PHONE_PIN_REGEX = /^\d{6}$/;
const CAMEROON_LOCAL_PHONE_REGEX = /^\d{9}$/;

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

type Tab = "list" | "assignments" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type SchoolYearRow = {
  id: string;
  label: string;
  isActive: boolean;
};

type ClassroomRow = {
  id: string;
  name: string;
  schoolYear: { id: string; label: string };
};

type EnrollmentRow = {
  id: string;
  status: "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED";
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  schoolYear: { id: string; label: string };
  class: {
    id: string;
    name: string;
  };
};

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  parentLinks: Array<{
    id: string;
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone?: string | null;
    };
  }>;
  currentEnrollment: EnrollmentRow | null;
  enrollments: EnrollmentRow[];
};

const createStudentSchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire."),
    classId: z.string().trim().min(1, "La classe est obligatoire."),
    email: z.union([z.string().trim().email("Email invalide."), z.literal("")]),
    password: z.union([
      z
        .string()
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      z.literal(""),
    ]),
  })
  .superRefine((value, ctx) => {
    const hasEmail = value.email.trim().length > 0;
    const hasPassword = value.password.trim().length > 0;

    if (hasEmail !== hasPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message:
          "Saisissez email et mot de passe ensemble, ou laissez les deux vides.",
      });
    }
  });

const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
});

const createLifeEventSchema = z.object({
  type: z.enum(["ABSENCE", "RETARD", "SANCTION", "PUNITION"]),
  occurredAt: z.string().trim().min(1, "La date est obligatoire."),
  reason: z.string().trim().min(1, "Le motif est obligatoire."),
  justified: z.boolean().optional(),
  comment: z.string().trim().optional(),
});

const createLifeEventFormSchema = createLifeEventSchema.extend({
  durationMinutes: z.string().trim().optional(),
});

const linkParentSchema = z
  .object({
    mode: z.enum(["email", "phone"]),
    email: z.union([
      z.string().trim().email("Email parent invalide."),
      z.literal(""),
    ]),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || CAMEROON_LOCAL_PHONE_REGEX.test(value), {
        message: "Le numero parent doit contenir 9 chiffres.",
      }),
    password: z.union([
      z
        .string()
        .regex(
          PASSWORD_COMPLEXITY_REGEX,
          "Le mot de passe doit contenir au moins 8 caracteres avec majuscules, minuscules et chiffres.",
        ),
      z.literal(""),
    ]),
    pin: z.union([
      z.string().regex(PHONE_PIN_REGEX, "Le PIN doit contenir 6 chiffres."),
      z.literal(""),
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "email") {
      if (!value.email.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email parent obligatoire.",
        });
      }
      if (!value.password.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Mot de passe initial obligatoire.",
        });
      }
    }

    if (value.mode === "phone") {
      if (!value.phone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Telephone parent obligatoire.",
        });
      }
      if (!value.pin.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pin"],
          message: "PIN initial obligatoire.",
        });
      }
    }
  });

function toDateTimeLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function normalizeCmPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

export default function ElevesPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("list");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYearRow[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<
    EnrollmentRow[]
  >([]);
  const [studentLifeEvents, setStudentLifeEvents] = useState<LifeEventRow[]>(
    [],
  );

  const [searchFilter, setSearchFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [schoolYearFilter, setSchoolYearFilter] = useState("");

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const [targetClassId, setTargetClassId] = useState("");
  const [targetStatus, setTargetStatus] = useState<
    "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
  >("ACTIVE");

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusDraftByEnrollmentId, setStatusDraftByEnrollmentId] = useState<
    Record<string, "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED">
  >({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkingParent, setLinkingParent] = useState(false);
  const [submittingLifeEvent, setSubmittingLifeEvent] = useState(false);
  const [editingLifeEventId, setEditingLifeEventId] = useState<string | null>(
    null,
  );
  const [editEventType, setEditEventType] = useState<LifeEventType>("ABSENCE");
  const [editEventOccurredAt, setEditEventOccurredAt] = useState("");
  const [editEventReason, setEditEventReason] = useState("");
  const [editEventDurationMinutes, setEditEventDurationMinutes] = useState("");
  const [editEventJustified, setEditEventJustified] = useState(false);
  const [editEventComment, setEditEventComment] = useState("");
  const [updatingLifeEventId, setUpdatingLifeEventId] = useState<string | null>(
    null,
  );
  const [deletingLifeEventId, setDeletingLifeEventId] = useState<string | null>(
    null,
  );
  const [lifeEventDeleteTarget, setLifeEventDeleteTarget] =
    useState<LifeEventRow | null>(null);
  const linkParentForm = useForm<
    z.input<typeof linkParentSchema>,
    unknown,
    z.output<typeof linkParentSchema>
  >({
    resolver: zodResolver(linkParentSchema),
    mode: "onChange",
    defaultValues: {
      mode: "phone",
      email: "",
      phone: "",
      password: "",
      pin: "",
    },
  });
  const linkParentValues = linkParentForm.watch();
  const linkParentValidation = useMemo(
    () =>
      linkParentSchema.safeParse({
        mode: linkParentValues.mode ?? "phone",
        email: linkParentValues.email ?? "",
        phone: linkParentValues.phone ?? "",
        password: linkParentValues.password ?? "",
        pin: linkParentValues.pin ?? "",
      }),
    [linkParentValues],
  );
  const editStudentForm = useForm<
    z.input<typeof updateStudentSchema>,
    unknown,
    z.output<typeof updateStudentSchema>
  >({
    resolver: zodResolver(updateStudentSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });
  const editStudentValues = editStudentForm.watch();
  const editStudentValidation = useMemo(
    () =>
      updateStudentSchema.safeParse({
        firstName: editStudentValues.firstName ?? "",
        lastName: editStudentValues.lastName ?? "",
      }),
    [editStudentValues],
  );
  const createLifeEventForm = useForm<
    z.input<typeof createLifeEventFormSchema>,
    unknown,
    z.output<typeof createLifeEventFormSchema>
  >({
    resolver: zodResolver(createLifeEventFormSchema),
    mode: "onChange",
    defaultValues: {
      type: "ABSENCE",
      occurredAt: "",
      reason: "",
      durationMinutes: "",
      justified: false,
      comment: "",
    },
  });
  const createLifeEventValues = createLifeEventForm.watch();
  const createLifeEventValidation = useMemo(
    () =>
      createLifeEventFormSchema.safeParse({
        type: createLifeEventValues.type ?? "ABSENCE",
        occurredAt: createLifeEventValues.occurredAt ?? "",
        reason: createLifeEventValues.reason ?? "",
        durationMinutes: createLifeEventValues.durationMinutes ?? "",
        justified:
          createLifeEventValues.type === "SANCTION" ||
          createLifeEventValues.type === "PUNITION"
            ? undefined
            : (createLifeEventValues.justified ?? false),
        comment: createLifeEventValues.comment ?? "",
      }),
    [createLifeEventValues],
  );
  const createStudentForm = useForm<
    z.input<typeof createStudentSchema>,
    unknown,
    z.output<typeof createStudentSchema>
  >({
    resolver: zodResolver(createStudentSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      classId: "",
      email: "",
      password: "",
    },
  });
  const createStudentValues = createStudentForm.watch();
  const createStudentValidation = useMemo(
    () =>
      createStudentSchema.safeParse({
        firstName: createStudentValues.firstName ?? "",
        lastName: createStudentValues.lastName ?? "",
        classId: createStudentValues.classId ?? "",
        email: createStudentValues.email ?? "",
        password: createStudentValues.password ?? "",
      }),
    [createStudentValues],
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadData(schoolSlug);
  }, [schoolSlug]);

  useEffect(() => {
    if (!schoolSlug || !selectedStudentId) {
      setSelectedStudentEnrollments([]);
      setStudentLifeEvents([]);
      setEditingLifeEventId(null);
      return;
    }
    void Promise.all([
      loadStudentEnrollments(schoolSlug, selectedStudentId),
      loadStudentLifeEvents(schoolSlug, selectedStudentId),
    ]);
  }, [schoolSlug, selectedStudentId]);

  useEffect(() => {
    if (createLifeEventForm.getValues("occurredAt")) {
      return;
    }
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    createLifeEventForm.setValue(
      "occurredAt",
      local.toISOString().slice(0, 16),
      {
        shouldValidate: true,
      },
    );
  }, [createLifeEventForm]);

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

      const mePayload = (await meResponse
        .json()
        .catch(() => null)) as Partial<MeResponse> | null;
      if (!mePayload || typeof mePayload.role !== "string") {
        setError("Session invalide. Veuillez recharger la page.");
        setLoading(false);
        return;
      }

      const me: MeResponse = {
        role: mePayload.role as Role,
        schoolSlug:
          typeof mePayload.schoolSlug === "string"
            ? mePayload.schoolSlug
            : null,
      };
      setRole(me.role);

      const allowed =
        me.role === "SUPER_ADMIN" ||
        me.role === "ADMIN" ||
        me.role === "SCHOOL_ADMIN" ||
        me.role === "SCHOOL_MANAGER" ||
        me.role === "SUPERVISOR";
      if (!allowed) {
        router.replace(
          me.schoolSlug ? `/schools/${me.schoolSlug}/dashboard` : "/",
        );
        return;
      }

      if (
        me.role === "SCHOOL_ADMIN" ||
        me.role === "SCHOOL_MANAGER" ||
        me.role === "SUPERVISOR"
      ) {
        if (!me.schoolSlug) {
          setError("Aucune ecole rattachee a ce compte.");
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

    try {
      const params = new URLSearchParams();
      if (searchFilter.trim()) {
        params.set("search", searchFilter.trim());
      }
      if (classFilter) {
        params.set("classId", classFilter);
      }
      if (schoolYearFilter) {
        params.set("schoolYearId", schoolYearFilter);
      }

      const [schoolYearsResponse, classroomsResponse, studentsResponse] =
        await Promise.all([
          fetch(buildAdminPath(currentSchoolSlug, "school-years"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "classrooms"), {
            credentials: "include",
          }),
          fetch(
            buildAdminPath(currentSchoolSlug, `students?${params.toString()}`),
            {
              credentials: "include",
            },
          ),
        ]);

      if (
        !schoolYearsResponse.ok ||
        !classroomsResponse.ok ||
        !studentsResponse.ok
      ) {
        setError("Impossible de charger les eleves.");
        return;
      }

      const schoolYearsPayload =
        (await schoolYearsResponse.json()) as SchoolYearRow[];
      const classroomsPayload =
        (await classroomsResponse.json()) as ClassroomRow[];
      const studentsPayload = (await studentsResponse.json()) as StudentRow[];

      setSchoolYears(schoolYearsPayload);
      setClassrooms(classroomsPayload);
      setStudents(studentsPayload);

      if (!schoolYearFilter && schoolYearsPayload.length > 0) {
        const active = schoolYearsPayload.find((entry) => entry.isActive);
        setSchoolYearFilter(active?.id ?? "");
      }

      if (
        !(createStudentForm.getValues("classId") ?? "") &&
        classroomsPayload.length > 0
      ) {
        const preferred = classroomsPayload.find(
          (entry) =>
            entry.schoolYear.id ===
            (schoolYearsPayload.find((y) => y.isActive)?.id ?? ""),
        );
        createStudentForm.setValue(
          "classId",
          preferred?.id ?? classroomsPayload[0].id,
          { shouldValidate: true },
        );
      }

      if (!selectedStudentId && studentsPayload.length > 0) {
        setSelectedStudentId(studentsPayload[0].id);
      }
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoadingData(false);
    }
  }

  async function loadStudentEnrollments(
    currentSchoolSlug: string,
    studentId: string,
  ) {
    try {
      const response = await fetch(
        buildAdminPath(currentSchoolSlug, `students/${studentId}/enrollments`),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as EnrollmentRow[];
      setSelectedStudentEnrollments(payload);

      const current = payload.find((row) => row.isCurrent);
      if (current) {
        setTargetClassId(current.class.id);
        setTargetStatus(current.status);
      } else if (payload.length > 0) {
        setTargetClassId(payload[0].class.id);
        setTargetStatus(payload[0].status);
      }

      const draft: Record<
        string,
        "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED"
      > = {};
      payload.forEach((entry) => {
        draft[entry.id] = entry.status;
      });
      setStatusDraftByEnrollmentId(draft);
    } catch {
      // no-op
    }
  }

  async function loadStudentLifeEvents(
    currentSchoolSlug: string,
    studentId: string,
  ) {
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/students/${studentId}/life-events?limit=100`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as LifeEventRow[];
      setStudentLifeEvents(payload);
    } catch {
      // no-op
    }
  }

  async function onCreateStudent(values: z.output<typeof createStudentSchema>) {
    if (!schoolSlug) {
      return;
    }
    setError(null);
    setSuccess(null);

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "students"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          classId: values.classId,
          email: values.email.trim() || undefined,
          password: values.password.trim() || undefined,
        }),
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

      createStudentForm.reset({
        firstName: "",
        lastName: "",
        classId: createStudentForm.getValues("classId") ?? "",
        email: "",
        password: "",
      });
      setSuccess("Eleve cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditStudent(student: StudentRow) {
    setEditingStudentId(student.id);
    editStudentForm.reset({
      firstName: student.firstName,
      lastName: student.lastName,
    });
  }

  async function saveStudent(studentId: string) {
    if (!schoolSlug) {
      return;
    }

    setError(null);
    const isValid = await editStudentForm.trigger();
    if (!isValid) return;
    const values = editStudentForm.getValues();

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${studentId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(values),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingStudentId(null);
      setSuccess("Eleve modifie.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteStudent() {
    if (!deleteTarget || !schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${deleteTarget.id}`),
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

      if (selectedStudentId === deleteTarget.id) {
        setSelectedStudentId("");
        setSelectedStudentEnrollments([]);
      }

      setDeleteTarget(null);
      setSuccess("Eleve supprime.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeleting(false);
    }
  }

  async function assignStudentClass() {
    if (!schoolSlug || !selectedStudentId || !targetClassId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `students/${selectedStudentId}/enrollments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            classId: targetClassId,
            status: targetStatus,
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
            : (payload?.message ?? "Affectation impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Affectation enregistree.");
      await Promise.all([
        loadData(schoolSlug),
        loadStudentEnrollments(schoolSlug, selectedStudentId),
      ]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setAssigning(false);
    }
  }

  async function updateOneEnrollmentStatus(enrollmentId: string) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const draft = statusDraftByEnrollmentId[enrollmentId];
    if (!draft) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingStatusId(enrollmentId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `students/${selectedStudentId}/enrollments/${enrollmentId}`,
        ),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ status: draft }),
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

      setSuccess("Statut d'inscription mis a jour.");
      await Promise.all([
        loadData(schoolSlug),
        loadStudentEnrollments(schoolSlug, selectedStudentId),
      ]);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function linkParentToStudent(
    values: z.output<typeof linkParentSchema>,
  ) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setLinkingParent(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "parent-students"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            studentId: selectedStudentId,
            ...(values.mode === "email"
              ? {
                  email: values.email.trim(),
                  password: values.password.trim(),
                }
              : {
                  phone: values.phone?.trim(),
                  pin: values.pin.trim(),
                }),
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
            : (payload?.message ?? "Affectation parent impossible.");
        setError(String(message));
        return;
      }

      linkParentForm.reset({
        mode: values.mode,
        email: "",
        phone: "",
        password: "",
        pin: "",
      });
      setSuccess(
        values.mode === "email"
          ? "Parent affecte. Si nouveau compte, premiere connexion email + mot de passe initial."
          : "Parent affecte. Si nouveau compte, activation via compte en attente avec PIN initial.",
      );
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLinkingParent(false);
    }
  }

  async function createStudentLifeEvent(
    values: z.output<typeof createLifeEventFormSchema>,
  ) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const occurredAtIso = values.occurredAt
      ? new Date(values.occurredAt).toISOString()
      : "";
    const parsed = createLifeEventSchema.safeParse({
      type: values.type,
      occurredAt: occurredAtIso,
      reason: values.reason,
      justified:
        values.type === "SANCTION" || values.type === "PUNITION"
          ? undefined
          : values.justified,
      comment: values.comment,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const durationValue = (values.durationMinutes ?? "").trim();
    let durationMinutes: number | undefined;
    if (durationValue.length > 0) {
      const parsedDurationMinutes = Number.parseInt(durationValue, 10);
      if (
        !Number.isFinite(parsedDurationMinutes) ||
        parsedDurationMinutes < 0
      ) {
        setError("La duree doit etre un entier positif.");
        return;
      }
      durationMinutes = parsedDurationMinutes;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setSubmittingLifeEvent(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: parsed.data.type,
            occurredAt: parsed.data.occurredAt,
            reason: parsed.data.reason,
            durationMinutes,
            justified: parsed.data.justified,
            comment: parsed.data.comment || undefined,
            classId: selectedStudent?.currentEnrollment?.class.id,
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
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        return;
      }

      createLifeEventForm.reset({
        type: values.type,
        occurredAt: createLifeEventForm.getValues("occurredAt") ?? "",
        reason: "",
        durationMinutes: "",
        justified: false,
        comment: "",
      });
      setSuccess("Evenement vie scolaire enregistre.");
      await loadStudentLifeEvents(schoolSlug, selectedStudentId);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setSubmittingLifeEvent(false);
    }
  }

  function startEditLifeEvent(event: LifeEventRow) {
    setEditingLifeEventId(event.id);
    setEditEventType(event.type);
    setEditEventOccurredAt(toDateTimeLocalInput(event.occurredAt));
    setEditEventReason(event.reason);
    setEditEventDurationMinutes(
      typeof event.durationMinutes === "number"
        ? String(event.durationMinutes)
        : "",
    );
    setEditEventJustified(Boolean(event.justified));
    setEditEventComment(event.comment ?? "");
    setError(null);
    setSuccess(null);
  }

  async function saveLifeEvent() {
    if (!schoolSlug || !selectedStudentId || !editingLifeEventId) {
      return;
    }

    const occurredAtIso = editEventOccurredAt
      ? new Date(editEventOccurredAt).toISOString()
      : "";
    const parsed = createLifeEventSchema.safeParse({
      type: editEventType,
      occurredAt: occurredAtIso,
      reason: editEventReason,
      justified:
        editEventType === "SANCTION" || editEventType === "PUNITION"
          ? undefined
          : editEventJustified,
      comment: editEventComment,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }

    const durationValue = editEventDurationMinutes.trim();
    let durationMinutes: number | undefined;
    if (durationValue.length > 0) {
      const parsedDurationMinutes = Number.parseInt(durationValue, 10);
      if (
        !Number.isFinite(parsedDurationMinutes) ||
        parsedDurationMinutes < 0
      ) {
        setError("La duree doit etre un entier positif.");
        return;
      }
      durationMinutes = parsedDurationMinutes;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setUpdatingLifeEventId(editingLifeEventId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events/${editingLifeEventId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            type: parsed.data.type,
            occurredAt: parsed.data.occurredAt,
            reason: parsed.data.reason,
            durationMinutes,
            justified: parsed.data.justified,
            comment: parsed.data.comment || undefined,
            classId: selectedStudent?.currentEnrollment?.class.id,
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
            : (payload?.message ?? "Modification impossible.");
        setError(String(message));
        return;
      }

      setEditingLifeEventId(null);
      setSuccess("Evenement vie scolaire modifie.");
      await loadStudentLifeEvents(schoolSlug, selectedStudentId);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setUpdatingLifeEventId(null);
    }
  }

  async function deleteLifeEvent(eventId: string) {
    if (!schoolSlug || !selectedStudentId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError("Session CSRF invalide. Reconnectez-vous.");
      router.replace("/");
      return;
    }

    setDeletingLifeEventId(eventId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/life-events/${eventId}`,
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

      setLifeEventDeleteTarget(null);
      if (editingLifeEventId === eventId) {
        setEditingLifeEventId(null);
      }
      setSuccess("Evenement vie scolaire supprime.");
      await loadStudentLifeEvents(schoolSlug, selectedStudentId);
    } catch {
      setError("Erreur reseau.");
    } finally {
      setDeletingLifeEventId(null);
    }
  }

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      ),
    [students],
  );

  const selectedStudent = useMemo(
    () => students.find((entry) => entry.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  if (loading) {
    return (
      <AppShell schoolSlug={schoolSlug} schoolName="Gestion des eleves">
        <Card title="Eleves" subtitle="Chargement...">
          <p className="text-sm text-text-secondary">Chargement...</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des eleves">
      <div className="grid gap-4">
        <Card
          title="Eleves"
          subtitle="CRUD des eleves, visualisation et suivi des inscriptions"
        >
          <div className="section-tabs mb-4">
            <button
              type="button"
              onClick={() => setTab("list")}
              className={`section-tab ${tab === "list" ? "section-tab-active" : ""}`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setTab("assignments")}
              className={`section-tab ${tab === "assignments" ? "section-tab-active" : ""}`}
            >
              Affectations
            </button>
            <button
              type="button"
              onClick={() => setTab("help")}
              className={`section-tab ${tab === "help" ? "section-tab-active" : ""}`}
            >
              Aide
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">Ecole</span>
                <select
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                  className="rounded-[14px] border border-warm-border bg-warm-surface px-3 py-2.5 text-text-primary outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selectionner une ecole</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {tab === "help" ? (
            <ModuleHelpTab
              moduleName="Eleves"
              moduleSummary="ce module gere la creation, la mise a jour, la suppression et la consultation du parcours eleve."
              actions={[
                {
                  name: "Creer",
                  purpose:
                    "ajouter un nouvel eleve et l'affecter a une classe de l'annee scolaire.",
                  howTo:
                    "completer le formulaire puis valider. Vous pouvez ajouter un compte de connexion en saisissant email + mot de passe.",
                  moduleImpact:
                    "l'eleve est visible dans la liste et dans les filtres de suivi.",
                  crossModuleImpact:
                    "l'eleve devient utilisable dans Inscriptions, Notes et tableaux de bord.",
                },
                {
                  name: "Modifier",
                  purpose:
                    "corriger l'identite eleve ou ajuster ses affectations annuelles.",
                  howTo:
                    "utiliser Modifier dans la liste, puis l'onglet Affectations pour les inscriptions et statuts.",
                  moduleImpact:
                    "les donnees eleve et son historique sont mis a jour.",
                  crossModuleImpact:
                    "les autres modules refletent immediatement les nouveaux noms/classes/statuts.",
                },
                {
                  name: "Supprimer",
                  purpose:
                    "retirer un eleve errone ou inactif du perimetre de l'ecole.",
                  howTo: "cliquer Supprimer puis confirmer.",
                  moduleImpact:
                    "la fiche eleve et ses inscriptions associees sont retirees.",
                  crossModuleImpact:
                    "les historiques liees a cet eleve ne seront plus visibles dans les vues operationnelles.",
                },
              ]}
              tips={[
                "Verifier la classe cible avant creation pour eviter des reassigations inutiles.",
                "Pour les changements de statut, utiliser l'onglet Affectations afin de conserver un suivi propre.",
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole pour gerer les eleves.
            </p>
          ) : tab === "list" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-6"
                onSubmit={createStudentForm.handleSubmit(onCreateStudent)}
              >
                <FormField
                  label="Prenom"
                  error={createStudentForm.formState.errors.firstName?.message}
                >
                  <input
                    aria-label="Prenom"
                    value={createStudentValues.firstName ?? ""}
                    onChange={(event) => {
                      createStudentForm.setValue(
                        "firstName",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
                <FormField
                  label="Nom"
                  error={createStudentForm.formState.errors.lastName?.message}
                >
                  <input
                    aria-label="Nom"
                    value={createStudentValues.lastName ?? ""}
                    onChange={(event) => {
                      createStudentForm.setValue(
                        "lastName",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </FormField>
                <FormField
                  label="Classe"
                  error={createStudentForm.formState.errors.classId?.message}
                >
                  <select
                    aria-label="Classe"
                    value={createStudentValues.classId ?? ""}
                    onChange={(event) => {
                      createStudentForm.setValue(
                        "classId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {classrooms.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.schoolYear.label})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Email (optionnel)"
                  error={createStudentForm.formState.errors.email?.message}
                >
                  <EmailInput
                    value={createStudentValues.email ?? ""}
                    onChange={(event) => {
                      createStudentForm.setValue("email", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                </FormField>
                <FormField
                  label="Mot de passe (optionnel)"
                  error={createStudentForm.formState.errors.email?.message}
                >
                  <PasswordInput
                    value={createStudentValues.password ?? ""}
                    onChange={(event) => {
                      createStudentForm.setValue(
                        "password",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={submitting || !createStudentValidation.success}
                  >
                    {submitting ? "Creation..." : "Ajouter"}
                  </SubmitButton>
                </div>
              </form>

              <form
                className="filter-panel grid gap-3 md:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (schoolSlug) {
                    void loadData(schoolSlug);
                  }
                }}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Recherche</span>
                  <input
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    placeholder="Nom ou prenom"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Classe</span>
                  <select
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Toutes</option>
                    {classrooms.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.schoolYear.label})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Annee scolaire</span>
                  <select
                    value={schoolYearFilter}
                    onChange={(event) =>
                      setSchoolYearFilter(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Toutes</option>
                    {schoolYears.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                        {entry.isActive ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="self-end">
                  <SubmitButton disabled={loadingData}>Filtrer</SubmitButton>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Eleve</th>
                      <th className="px-3 py-2 font-medium">Classe courante</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium">Inscriptions</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || loadingData) && (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Chargement...
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      sortedStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">
                            {editingStudentId === student.id ? (
                              <div className="grid gap-2">
                                <FormField
                                  label="Prenom"
                                  className="text-xs"
                                  error={
                                    editStudentForm.formState.errors.firstName
                                      ?.message
                                  }
                                >
                                  <input
                                    value={editStudentValues.firstName ?? ""}
                                    onChange={(event) =>
                                      editStudentForm.setValue(
                                        "firstName",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </FormField>
                                <FormField
                                  label="Nom"
                                  className="text-xs"
                                  error={
                                    editStudentForm.formState.errors.lastName
                                      ?.message
                                  }
                                >
                                  <input
                                    value={editStudentValues.lastName ?? ""}
                                    onChange={(event) =>
                                      editStudentForm.setValue(
                                        "lastName",
                                        event.target.value,
                                        {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        },
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </FormField>
                              </div>
                            ) : (
                              `${student.lastName} ${student.firstName}`
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {student.currentEnrollment
                              ? `${student.currentEnrollment.class.name} (${student.currentEnrollment.schoolYear.label})`
                              : "-"}
                          </td>
                          <td className="px-3 py-2">
                            {student.currentEnrollment?.status ?? "-"}
                          </td>
                          <td className="px-3 py-2">
                            {student.enrollments.length}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-2">
                              {editingStudentId === student.id ? (
                                <>
                                  <Button
                                    type="button"
                                    disabled={
                                      saving || !editStudentValidation.success
                                    }
                                    onClick={() => {
                                      void saveStudent(student.id);
                                    }}
                                  >
                                    {saving ? "..." : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingStudentId(null)}
                                  >
                                    Annuler
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedStudentId(student.id);
                                      setTab("assignments");
                                    }}
                                  >
                                    Voir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => startEditStudent(student)}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                      setDeleteTarget({
                                        id: student.id,
                                        label: `${student.lastName} ${student.firstName}`,
                                      })
                                    }
                                  >
                                    Supprimer
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!loading && !loadingData && sortedStudents.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          Aucun eleve trouve.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm md:max-w-[420px]">
                <span className="text-text-secondary">Eleve</span>
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selectionner</option>
                  {sortedStudents.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.lastName} {entry.firstName}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedStudent ? (
                <p className="text-sm text-text-secondary">
                  Selectionnez un eleve pour voir son detail.
                </p>
              ) : (
                <>
                  <div className="rounded-card border border-border bg-background p-3 text-sm">
                    <p className="font-medium text-text-primary">Identite</p>
                    <p className="mt-1 text-text-secondary">
                      {selectedStudent.lastName} {selectedStudent.firstName}
                    </p>
                    <p className="mt-1 text-text-secondary">
                      Classe courante:{" "}
                      {selectedStudent.currentEnrollment?.class.name ?? "-"}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <FormField label="Mode parent">
                      <select
                        value={linkParentValues.mode ?? "phone"}
                        onChange={(event) => {
                          const nextMode = event.target.value as
                            | "email"
                            | "phone";
                          linkParentForm.setValue("mode", nextMode, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          if (nextMode === "email") {
                            linkParentForm.setValue("phone", "", {
                              shouldValidate: true,
                            });
                            linkParentForm.setValue("pin", "", {
                              shouldValidate: true,
                            });
                          } else {
                            linkParentForm.setValue("email", "", {
                              shouldValidate: true,
                            });
                            linkParentForm.setValue("password", "", {
                              shouldValidate: true,
                            });
                          }
                        }}
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="phone">Telephone + PIN</option>
                        <option value="email">Email + mot de passe</option>
                      </select>
                    </FormField>
                    <FormField
                      label={
                        linkParentValues.mode === "email"
                          ? "Email du parent"
                          : "Telephone du parent"
                      }
                      error={
                        linkParentValues.mode === "email"
                          ? linkParentForm.formState.errors.email?.message
                          : linkParentForm.formState.errors.phone?.message
                      }
                    >
                      {linkParentValues.mode === "email" ? (
                        <EmailInput
                          value={linkParentValues.email ?? ""}
                          onChange={(event) => {
                            linkParentForm.setValue(
                              "email",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          placeholder="parent@email.com"
                        />
                      ) : (
                        <input
                          value={linkParentValues.phone ?? ""}
                          onChange={(event) => {
                            linkParentForm.setValue(
                              "phone",
                              normalizeCmPhoneInput(event.target.value),
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          placeholder="6XXXXXXXX"
                          className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                    </FormField>
                    <FormField
                      label={
                        linkParentValues.mode === "email"
                          ? "Mot de passe initial"
                          : "PIN initial"
                      }
                      error={
                        linkParentValues.mode === "email"
                          ? linkParentForm.formState.errors.password?.message
                          : linkParentForm.formState.errors.pin?.message
                      }
                    >
                      {linkParentValues.mode === "email" ? (
                        <PasswordInput
                          value={linkParentValues.password ?? ""}
                          onChange={(event) => {
                            linkParentForm.setValue(
                              "password",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          placeholder="MotDePasse123"
                        />
                      ) : (
                        <PinInput
                          value={linkParentValues.pin ?? ""}
                          onChange={(event) => {
                            linkParentForm.setValue(
                              "pin",
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            );
                          }}
                          placeholder="123456"
                        />
                      )}
                    </FormField>
                    <div className="self-end">
                      <Button
                        type="button"
                        disabled={
                          linkingParent || !linkParentValidation.success
                        }
                        onClick={() => {
                          void linkParentForm.handleSubmit(
                            linkParentToStudent,
                          )();
                        }}
                      >
                        {linkingParent ? "Affectation..." : "Affecter parent"}
                      </Button>
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-2 text-sm font-medium text-text-primary">
                        Parents lies
                      </p>
                      {(selectedStudent.parentLinks ?? []).length === 0 ? (
                        <p className="text-sm text-text-secondary">
                          Aucun parent lie.
                        </p>
                      ) : (
                        <ul className="grid gap-1 text-sm text-text-secondary">
                          {(selectedStudent.parentLinks ?? []).map((link) => (
                            <li key={link.id}>
                              {link.parent.lastName} {link.parent.firstName} -{" "}
                              {link.parent.email ?? link.parent.phone ?? "-"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-card border border-border bg-background p-3">
                    <p className="text-sm font-medium text-text-primary">
                      Vie scolaire: absences, retards, sanctions et punitions
                    </p>
                    <div className="grid gap-3 md:grid-cols-6">
                      <FormField
                        label="Type"
                        error={
                          createLifeEventForm.formState.errors.type?.message
                        }
                      >
                        <select
                          value={createLifeEventValues.type ?? "ABSENCE"}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "type",
                              event.target.value as LifeEventType,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="ABSENCE">Absence</option>
                          <option value="RETARD">Retard</option>
                          <option value="SANCTION">Sanction</option>
                          <option value="PUNITION">Punition</option>
                        </select>
                      </FormField>
                      <FormField
                        label="Date/heure"
                        className="md:col-span-2"
                        error={
                          createLifeEventForm.formState.errors.occurredAt
                            ?.message
                        }
                      >
                        <input
                          type="datetime-local"
                          value={createLifeEventValues.occurredAt ?? ""}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "occurredAt",
                              event.target.value,
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
                        label="Motif"
                        className="md:col-span-2"
                        error={
                          createLifeEventForm.formState.errors.reason?.message
                        }
                      >
                        <input
                          value={createLifeEventValues.reason ?? ""}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "reason",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          placeholder="Motif de l'evenement"
                          className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                      </FormField>
                      <FormField label="Duree (min)">
                        <input
                          value={createLifeEventValues.durationMinutes ?? ""}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "durationMinutes",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          placeholder="ex: 10"
                          className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                      </FormField>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <FormField label="Commentaire">
                        <input
                          value={createLifeEventValues.comment ?? ""}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "comment",
                              event.target.value,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          placeholder="Commentaire (optionnel)"
                          className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                        />
                      </FormField>
                      <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          checked={createLifeEventValues.justified ?? false}
                          onChange={(event) =>
                            createLifeEventForm.setValue(
                              "justified",
                              event.target.checked,
                              {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              },
                            )
                          }
                          disabled={
                            createLifeEventValues.type === "SANCTION" ||
                            createLifeEventValues.type === "PUNITION"
                          }
                        />
                        Justifie
                      </label>
                    </div>
                    <div>
                      <Button
                        type="button"
                        disabled={
                          submittingLifeEvent ||
                          !createLifeEventValidation.success
                        }
                        onClick={() => {
                          void createLifeEventForm.handleSubmit(
                            createStudentLifeEvent,
                          )();
                        }}
                      >
                        {submittingLifeEvent ? "Enregistrement..." : "Signaler"}
                      </Button>
                    </div>

                    {editingLifeEventId ? (
                      <div className="grid gap-3 rounded-card border border-border bg-surface p-3 md:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">Type</span>
                          <select
                            value={editEventType}
                            onChange={(event) =>
                              setEditEventType(
                                event.target.value as LifeEventType,
                              )
                            }
                            className="rounded-card border border-border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="ABSENCE">Absence</option>
                            <option value="RETARD">Retard</option>
                            <option value="SANCTION">Sanction</option>
                            <option value="PUNITION">Punition</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Date/heure
                          </span>
                          <input
                            type="datetime-local"
                            value={editEventOccurredAt}
                            onChange={(event) =>
                              setEditEventOccurredAt(event.target.value)
                            }
                            className="rounded-card border border-border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="grid gap-1 text-sm md:col-span-2">
                          <span className="text-text-secondary">Motif</span>
                          <input
                            value={editEventReason}
                            onChange={(event) =>
                              setEditEventReason(event.target.value)
                            }
                            className="rounded-card border border-border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="text-text-secondary">
                            Duree (min)
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={editEventDurationMinutes}
                            onChange={(event) =>
                              setEditEventDurationMinutes(event.target.value)
                            }
                            className="rounded-card border border-border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="grid gap-1 text-sm md:col-span-2">
                          <span className="text-text-secondary">
                            Commentaire
                          </span>
                          <input
                            value={editEventComment}
                            onChange={(event) =>
                              setEditEventComment(event.target.value)
                            }
                            className="rounded-card border border-border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                          <input
                            type="checkbox"
                            checked={editEventJustified}
                            onChange={(event) =>
                              setEditEventJustified(event.target.checked)
                            }
                            disabled={
                              editEventType === "SANCTION" ||
                              editEventType === "PUNITION"
                            }
                          />
                          Justifie
                        </label>
                        <div className="flex gap-2 md:col-span-2">
                          <Button
                            type="button"
                            disabled={
                              updatingLifeEventId === editingLifeEventId
                            }
                            onClick={() => {
                              void saveLifeEvent();
                            }}
                          >
                            {updatingLifeEventId === editingLifeEventId
                              ? "Enregistrement..."
                              : "Enregistrer"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingLifeEventId(null)}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <LifeEventsList
                      events={studentLifeEvents}
                      emptyLabel="Aucun evenement de vie scolaire."
                      deletingEventId={deletingLifeEventId}
                      onEdit={startEditLifeEvent}
                      onDelete={(row) => setLifeEventDeleteTarget(row)}
                    />
                  </div>

                  <div className="grid gap-3 rounded-card border border-border bg-background p-3 md:grid-cols-3">
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">
                        Nouvelle classe
                      </span>
                      <select
                        value={targetClassId}
                        onChange={(event) =>
                          setTargetClassId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selectionner</option>
                        {classrooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name} ({entry.schoolYear.label})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Statut</span>
                      <select
                        value={targetStatus}
                        onChange={(event) =>
                          setTargetStatus(
                            event.target.value as
                              | "ACTIVE"
                              | "TRANSFERRED"
                              | "WITHDRAWN"
                              | "GRADUATED",
                          )
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRANSFERRED">TRANSFERRED</option>
                        <option value="WITHDRAWN">WITHDRAWN</option>
                        <option value="GRADUATED">GRADUATED</option>
                      </select>
                    </label>
                    <div className="self-end">
                      <Button
                        type="button"
                        disabled={assigning || !targetClassId}
                        onClick={() => {
                          void assignStudentClass();
                        }}
                      >
                        {assigning ? "Affectation..." : "Affecter"}
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">Annee</th>
                          <th className="px-3 py-2 font-medium">Classe</th>
                          <th className="px-3 py-2 font-medium">Statut</th>
                          <th className="px-3 py-2 font-medium">Courant</th>
                          <th className="px-3 py-2 font-medium text-right">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentEnrollments.map((enrollment) => (
                          <tr
                            key={enrollment.id}
                            className="border-b border-border text-text-primary"
                          >
                            <td className="px-3 py-2">
                              {enrollment.schoolYear.label}
                            </td>
                            <td className="px-3 py-2">
                              {enrollment.class.name}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={
                                  statusDraftByEnrollmentId[enrollment.id] ??
                                  enrollment.status
                                }
                                onChange={(event) =>
                                  setStatusDraftByEnrollmentId((current) => ({
                                    ...current,
                                    [enrollment.id]: event.target.value as
                                      | "ACTIVE"
                                      | "TRANSFERRED"
                                      | "WITHDRAWN"
                                      | "GRADUATED",
                                  }))
                                }
                                className="rounded-card border border-border bg-surface px-2 py-1 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="TRANSFERRED">TRANSFERRED</option>
                                <option value="WITHDRAWN">WITHDRAWN</option>
                                <option value="GRADUATED">GRADUATED</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {enrollment.isCurrent ? "Oui" : "Non"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={updatingStatusId === enrollment.id}
                                onClick={() => {
                                  void updateOneEnrollmentStatus(enrollment.id);
                                }}
                              >
                                {updatingStatusId === enrollment.id
                                  ? "..."
                                  : "Maj"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {selectedStudentEnrollments.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-6 text-text-secondary"
                              colSpan={5}
                            >
                              Aucune inscription.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
        title="Confirmer la suppression"
        message={
          deleteTarget
            ? `Voulez-vous supprimer l'eleve ${deleteTarget.label} ?`
            : ""
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          void confirmDeleteStudent();
        }}
      />
      <ConfirmDialog
        open={Boolean(lifeEventDeleteTarget)}
        title="Supprimer cet evenement ?"
        message={
          lifeEventDeleteTarget
            ? `Cette action est irreversible. L'evenement "${lifeEventTypeLabel(lifeEventDeleteTarget.type)} - ${lifeEventDeleteTarget.reason}" sera supprime definitivement.`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        loading={
          Boolean(lifeEventDeleteTarget) &&
          deletingLifeEventId === lifeEventDeleteTarget?.id
        }
        onCancel={() => {
          if (!deletingLifeEventId) {
            setLifeEventDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (!lifeEventDeleteTarget) {
            return;
          }
          void deleteLifeEvent(lifeEventDeleteTarget.id);
        }}
      />
    </AppShell>
  );
}
