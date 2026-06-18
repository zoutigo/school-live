"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  FormCheckbox,
  FormNumberInput,
  FormSelect,
  FormSubmitHint,
  FormTextInput,
} from "../../components/ui/form-controls";
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

type Tab = "levels" | "tracks" | "curriculums" | "subjects" | "help";

type MeResponse = {
  role: Role;
  schoolSlug: string | null;
};

type SchoolOption = {
  id: string;
  slug: string;
  name: string;
};

type AcademicLevel = {
  id: string;
  code: string;
  label: string;
  _count?: {
    classes: number;
    curriculums: number;
  };
};

type Track = {
  id: string;
  code: string;
  label: string;
  _count?: {
    classes: number;
    curriculums: number;
  };
};

type Subject = {
  id: string;
  name: string;
};

type Curriculum = {
  id: string;
  name: string;
  academicLevelId: string;
  trackId: string | null;
  academicLevel: AcademicLevel;
  track: Track | null;
  _count: {
    classes: number;
    subjects: number;
  };
};

type CurriculumSubject = {
  id: string;
  subjectId: string;
  isMandatory: boolean;
  coefficient: number | null;
  weeklyHours: number | null;
  subject: Subject;
};

const academicLevelFormSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  label: z.string().trim().min(1, "Le libelle est obligatoire."),
});

const trackFormSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  label: z.string().trim().min(1, "Le libelle est obligatoire."),
});

const curriculumFormSchema = z.object({
  academicLevelId: z
    .string()
    .trim()
    .min(1, "Le niveau academique est obligatoire."),
  trackId: z
    .union([z.string().trim(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

const curriculumSubjectFormSchema = z.object({
  subjectId: z.string().trim().min(1, "La matiere est obligatoire."),
  coefficient: z
    .union([z.string().trim(), z.literal("")])
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "Le coefficient doit etre positif.",
    ),
  weeklyHours: z
    .union([z.string().trim(), z.literal("")])
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "Les heures doivent etre positives.",
    ),
  isMandatory: z.boolean(),
});

export default function CurriculumsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("curriculums");
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState<
    CurriculumSubject[]
  >([]);

  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");

  const [editingAcademicLevelId, setEditingAcademicLevelId] = useState<
    string | null
  >(null);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  const [submittingAcademicLevel, setSubmittingAcademicLevel] = useState(false);
  const [savingAcademicLevel, setSavingAcademicLevel] = useState(false);
  const [deletingAcademicLevelId, setDeletingAcademicLevelId] = useState<
    string | null
  >(null);

  const [submittingTrack, setSubmittingTrack] = useState(false);
  const [savingTrack, setSavingTrack] = useState(false);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);

  const [submittingCurriculum, setSubmittingCurriculum] = useState(false);
  const [deletingCurriculumId, setDeletingCurriculumId] = useState<
    string | null
  >(null);

  const [submittingCurriculumSubject, setSubmittingCurriculumSubject] =
    useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const academicLevelForm = useForm<z.input<typeof academicLevelFormSchema>>({
    resolver: zodResolver(academicLevelFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const trackForm = useForm<z.input<typeof trackFormSchema>>({
    resolver: zodResolver(trackFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const curriculumForm = useForm<z.input<typeof curriculumFormSchema>>({
    resolver: zodResolver(curriculumFormSchema),
    mode: "onChange",
    defaultValues: { academicLevelId: "", trackId: "" },
  });
  const curriculumSubjectForm = useForm<
    z.input<typeof curriculumSubjectFormSchema>
  >({
    resolver: zodResolver(curriculumSubjectFormSchema),
    mode: "onChange",
    defaultValues: {
      subjectId: "",
      coefficient: "",
      weeklyHours: "",
      isMandatory: true,
    },
  });
  const editAcademicLevelForm = useForm<
    z.input<typeof academicLevelFormSchema>
  >({
    resolver: zodResolver(academicLevelFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const editTrackForm = useForm<z.input<typeof trackFormSchema>>({
    resolver: zodResolver(trackFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const academicLevelValues = academicLevelForm.watch();
  const trackValues = trackForm.watch();
  const curriculumValues = curriculumForm.watch();
  const curriculumSubjectValues = curriculumSubjectForm.watch();
  const editAcademicLevelValues = editAcademicLevelForm.watch();
  const editTrackValues = editTrackForm.watch();
  const academicLevelCodeInvalid =
    !!academicLevelForm.formState.errors.code ||
    !(academicLevelValues.code ?? "").trim();
  const academicLevelLabelInvalid =
    !!academicLevelForm.formState.errors.label ||
    !(academicLevelValues.label ?? "").trim();
  const editAcademicLevelCodeInvalid =
    !!editAcademicLevelForm.formState.errors.code ||
    !(editAcademicLevelValues.code ?? "").trim();
  const editAcademicLevelLabelInvalid =
    !!editAcademicLevelForm.formState.errors.label ||
    !(editAcademicLevelValues.label ?? "").trim();
  const trackCodeInvalid =
    !!trackForm.formState.errors.code || !(trackValues.code ?? "").trim();
  const trackLabelInvalid =
    !!trackForm.formState.errors.label || !(trackValues.label ?? "").trim();
  const editTrackCodeInvalid =
    !!editTrackForm.formState.errors.code ||
    !(editTrackValues.code ?? "").trim();
  const editTrackLabelInvalid =
    !!editTrackForm.formState.errors.label ||
    !(editTrackValues.label ?? "").trim();
  const curriculumAcademicLevelInvalid =
    !!curriculumForm.formState.errors.academicLevelId ||
    !(curriculumValues.academicLevelId ?? "").trim();
  const curriculumSubjectIdInvalid =
    !!curriculumSubjectForm.formState.errors.subjectId ||
    !(curriculumSubjectValues.subjectId ?? "").trim();
  const curriculumCoefficientInvalid =
    !!curriculumSubjectForm.formState.errors.coefficient;
  const curriculumWeeklyHoursInvalid =
    !!curriculumSubjectForm.formState.errors.weeklyHours;

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
    if (!schoolSlug || !selectedCurriculumId) {
      setCurriculumSubjects([]);
      return;
    }
    void loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
  }, [schoolSlug, selectedCurriculumId]);

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
          setError(t("curriculums.error.noSchoolAdmin"));
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
      setError(t("curriculums.error.apiDown"));
      setLoading(false);
    }
  }

  async function loadData(currentSchoolSlug: string) {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const [levelsRes, tracksRes, subjectsRes, curriculumsRes] =
        await Promise.all([
          fetch(buildAdminPath(currentSchoolSlug, "academic-levels"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "tracks"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "subjects"), {
            credentials: "include",
          }),
          fetch(buildAdminPath(currentSchoolSlug, "curriculums"), {
            credentials: "include",
          }),
        ]);

      if (
        !levelsRes.ok ||
        !tracksRes.ok ||
        !subjectsRes.ok ||
        !curriculumsRes.ok
      ) {
        setError(t("curriculums.error.loadFailed"));
        return;
      }

      const levelsPayload = (await levelsRes.json()) as AcademicLevel[];
      const tracksPayload = (await tracksRes.json()) as Track[];
      const subjectsPayload = ((await subjectsRes.json()) as Subject[]).map(
        (entry) => ({ id: entry.id, name: entry.name }),
      );
      const curriculumsPayload = (await curriculumsRes.json()) as Curriculum[];

      setAcademicLevels(levelsPayload);
      setTracks(tracksPayload);
      setSubjects(subjectsPayload);
      setCurriculums(curriculumsPayload);

      if (
        !curriculumForm.getValues("academicLevelId") &&
        levelsPayload.length > 0
      ) {
        curriculumForm.setValue("academicLevelId", levelsPayload[0].id, {
          shouldValidate: true,
        });
      }
      if (!selectedCurriculumId && curriculumsPayload.length > 0) {
        setSelectedCurriculumId(curriculumsPayload[0].id);
      }
      if (
        !curriculumSubjectForm.getValues("subjectId") &&
        subjectsPayload.length > 0
      ) {
        curriculumSubjectForm.setValue("subjectId", subjectsPayload[0].id, {
          shouldValidate: true,
        });
      }
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setLoadingData(false);
    }
  }

  async function loadCurriculumSubjects(
    currentSchoolSlug: string,
    curriculumId: string,
  ) {
    try {
      const response = await fetch(
        buildAdminPath(
          currentSchoolSlug,
          `curriculums/${curriculumId}/subjects`,
        ),
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        setError(t("curriculums.error.loadSubjectsFailed"));
        return;
      }

      setCurriculumSubjects((await response.json()) as CurriculumSubject[]);
    } catch {
      setError(t("curriculums.error.network"));
    }
  }

  async function onCreateAcademicLevel(
    values: z.output<typeof academicLevelFormSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingAcademicLevel(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, "academic-levels"),
        {
          method: "POST",
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
            : (payload?.message ?? t("curriculums.error.levelCreateFailed"));
        setError(String(message));
        return;
      }

      academicLevelForm.reset({ code: "", label: "" });
      setSuccess(t("curriculums.success.levelCreated"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingAcademicLevel(false);
    }
  }

  function startEditAcademicLevel(level: AcademicLevel) {
    setEditingAcademicLevelId(level.id);
    editAcademicLevelForm.reset({
      code: level.code,
      label: level.label,
    });
    void editAcademicLevelForm.trigger();
  }

  async function saveAcademicLevel(
    levelId: string,
    values: z.output<typeof academicLevelFormSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingAcademicLevel(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `academic-levels/${levelId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            code: values.code,
            label: values.label,
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
            : (payload?.message ?? t("curriculums.error.levelUpdateFailed"));
        setError(String(message));
        return;
      }

      setEditingAcademicLevelId(null);
      setSuccess(t("curriculums.success.levelEdited"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingAcademicLevel(false);
    }
  }

  async function deleteAcademicLevel(levelId: string) {
    if (!schoolSlug) {
      return;
    }
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingAcademicLevelId(levelId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `academic-levels/${levelId}`),
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
            : (payload?.message ?? t("curriculums.error.levelDeleteFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("curriculums.success.levelDeleted"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingAcademicLevelId(null);
    }
  }

  async function onCreateTrack(values: z.output<typeof trackFormSchema>) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingTrack(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(buildAdminPath(schoolSlug, "tracks"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("curriculums.error.trackCreateFailed"));
        setError(String(message));
        return;
      }

      trackForm.reset({ code: "", label: "" });
      setSuccess(t("curriculums.success.trackCreated"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingTrack(false);
    }
  }

  function startEditTrack(track: Track) {
    setEditingTrackId(track.id);
    editTrackForm.reset({
      code: track.code,
      label: track.label,
    });
    void editTrackForm.trigger();
  }

  async function saveTrack(
    trackId: string,
    values: z.output<typeof trackFormSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingTrack(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `tracks/${trackId}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            code: values.code,
            label: values.label,
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
            : (payload?.message ?? t("curriculums.error.trackUpdateFailed"));
        setError(String(message));
        return;
      }

      setEditingTrackId(null);
      setSuccess(t("curriculums.success.trackEdited"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingTrack(false);
    }
  }

  async function deleteTrack(trackId: string) {
    if (!schoolSlug) {
      return;
    }
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingTrackId(trackId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `tracks/${trackId}`),
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
            : (payload?.message ?? t("curriculums.error.trackDeleteFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("curriculums.success.trackDeleted"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingTrackId(null);
    }
  }

  async function onCreateCurriculum(
    values: z.input<typeof curriculumFormSchema>,
  ) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingCurriculum(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(buildAdminPath(schoolSlug, "curriculums"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          academicLevelId: values.academicLevelId,
          trackId: values.trackId || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ??
              t("curriculums.error.curriculumCreateFailed"));
        setError(String(message));
        return;
      }

      curriculumForm.reset({
        academicLevelId: values.academicLevelId,
        trackId: "",
      });
      setSuccess(t("curriculums.success.curriculumCreated"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingCurriculum(false);
    }
  }

  async function onDeleteCurriculum(curriculumId: string) {
    if (!schoolSlug) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingCurriculumId(curriculumId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        buildAdminPath(schoolSlug, `curriculums/${curriculumId}`),
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
            : (payload?.message ?? t("curriculums.error.deleteFailed"));
        setError(String(message));
        return;
      }

      if (selectedCurriculumId === curriculumId) {
        setSelectedCurriculumId("");
      }
      setSuccess(t("curriculums.success.curriculumDeleted"));
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingCurriculumId(null);
    }
  }

  async function onUpsertCurriculumSubject(
    values: z.output<typeof curriculumSubjectFormSchema>,
  ) {
    if (!schoolSlug || !selectedCurriculumId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingCurriculumSubject(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `curriculums/${selectedCurriculumId}/subjects`,
        ),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            subjectId: values.subjectId,
            isMandatory: values.isMandatory,
            coefficient:
              !values.coefficient || values.coefficient.trim() === ""
                ? undefined
                : Number(values.coefficient),
            weeklyHours:
              !values.weeklyHours || values.weeklyHours.trim() === ""
                ? undefined
                : Number(values.weeklyHours),
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
            : (payload?.message ?? t("curriculums.error.saveFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("curriculums.success.subjectSaved"));
      curriculumSubjectForm.reset({
        subjectId: values.subjectId,
        coefficient: "",
        weeklyHours: "",
        isMandatory: values.isMandatory,
      });
      await loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingCurriculumSubject(false);
    }
  }

  async function onDeleteCurriculumSubject(subjectId: string) {
    if (!schoolSlug || !selectedCurriculumId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        buildAdminPath(
          schoolSlug,
          `curriculums/${selectedCurriculumId}/subjects/${subjectId}`,
        ),
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
            : (payload?.message ?? t("curriculums.error.deleteFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("curriculums.success.subjectRemoved"));
      await loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
      await loadData(schoolSlug);
    } catch {
      setError(t("curriculums.error.network"));
    }
  }

  const orderedCurriculums = useMemo(
    () => [...curriculums].sort((a, b) => a.name.localeCompare(b.name)),
    [curriculums],
  );
  const orderedLevels = useMemo(
    () => [...academicLevels].sort((a, b) => a.code.localeCompare(b.code)),
    [academicLevels],
  );
  const orderedTracks = useMemo(
    () => [...tracks].sort((a, b) => a.code.localeCompare(b.code)),
    [tracks],
  );
  const generatedCurriculumName = useMemo(() => {
    const level = academicLevels.find(
      (entry) => entry.id === curriculumValues.academicLevelId,
    );
    if (!level) {
      return "";
    }
    const track = tracks.find((entry) => entry.id === curriculumValues.trackId);
    return `${level.code} - ${track?.code ?? "TRONC_COMMUN"}`;
  }, [
    academicLevels,
    tracks,
    curriculumValues.academicLevelId,
    curriculumValues.trackId,
  ]);

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("curriculums.shellName")}>
      <div className="grid gap-4">
        <Card
          title={t("curriculums.title")}
          subtitle={t("curriculums.subtitle")}
        >
          <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("levels")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "levels"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("curriculums.tab.levels")}
            </button>
            <button
              type="button"
              onClick={() => setTab("tracks")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "tracks"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("curriculums.tab.tracks")}
            </button>
            <button
              type="button"
              onClick={() => setTab("curriculums")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "curriculums"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("curriculums.tab.curriculums")}
            </button>
            <button
              type="button"
              onClick={() => setTab("subjects")}
              className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                tab === "subjects"
                  ? "border border-border border-b-surface bg-surface text-primary"
                  : "text-text-secondary"
              }`}
            >
              {t("curriculums.tab.subjects")}
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
              {t("curriculums.tab.help")}
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("curriculums.schoolLabel")}
                </span>
                <FormSelect
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                >
                  <option value="">{t("curriculums.schoolPlaceholder")}</option>
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
              moduleName={t("curriculums.help.moduleName")}
              moduleSummary={t("curriculums.help.moduleSummary")}
              actions={[
                {
                  name: t("curriculums.help.action1.name"),
                  purpose: t("curriculums.help.action1.purpose"),
                  howTo: t("curriculums.help.action1.howTo"),
                  moduleImpact: t("curriculums.help.action1.moduleImpact"),
                  crossModuleImpact: t(
                    "curriculums.help.action1.crossModuleImpact",
                  ),
                },
                {
                  name: t("curriculums.help.action2.name"),
                  purpose: t("curriculums.help.action2.purpose"),
                  howTo: t("curriculums.help.action2.howTo"),
                  moduleImpact: t("curriculums.help.action2.moduleImpact"),
                  crossModuleImpact: t(
                    "curriculums.help.action2.crossModuleImpact",
                  ),
                },
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              {t("curriculums.noSchool")}
            </p>
          ) : tab === "levels" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
                onSubmit={academicLevelForm.handleSubmit(onCreateAcademicLevel)}
              >
                <FormField
                  label={t("curriculums.level.codeLabel")}
                  error={academicLevelForm.formState.errors.code?.message}
                >
                  <FormTextInput
                    aria-label={t("curriculums.level.codeLabel")}
                    invalid={academicLevelCodeInvalid}
                    value={academicLevelValues.code ?? ""}
                    onChange={(event) => {
                      academicLevelForm.setValue("code", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("curriculums.level.codePlaceholder")}
                  />
                </FormField>
                <FormField
                  label={t("curriculums.level.labelLabel")}
                  error={academicLevelForm.formState.errors.label?.message}
                >
                  <FormTextInput
                    aria-label={t("curriculums.level.labelLabel")}
                    invalid={academicLevelLabelInvalid}
                    value={academicLevelValues.label ?? ""}
                    onChange={(event) => {
                      academicLevelForm.setValue("label", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("curriculums.level.labelPlaceholder")}
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={
                      submittingAcademicLevel ||
                      !academicLevelForm.formState.isValid
                    }
                  >
                    {submittingAcademicLevel
                      ? t("curriculums.level.creating")
                      : t("curriculums.level.add")}
                  </SubmitButton>
                </div>
                <FormSubmitHint
                  visible={!academicLevelForm.formState.isValid}
                  className="md:col-span-3"
                />
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.level.colCode")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.level.colLabel")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.level.colCurriculums")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.level.colClasses")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("curriculums.level.colActions")}
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
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      orderedLevels.map((level) => (
                        <Fragment key={level.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{level.code}</td>
                            <td className="px-3 py-2">{level.label}</td>
                            <td className="px-3 py-2">
                              {level._count?.curriculums ?? 0}
                            </td>
                            <td className="px-3 py-2">
                              {level._count?.classes ?? 0}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditAcademicLevel(level)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={
                                    deletingAcademicLevelId === level.id
                                  }
                                  onClick={() => {
                                    void deleteAcademicLevel(level.id);
                                  }}
                                >
                                  {deletingAcademicLevelId === level.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingAcademicLevelId === level.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                                  <FormField
                                    label={t("curriculums.level.codeLabel")}
                                    error={
                                      editAcademicLevelForm.formState.errors
                                        .code?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.level.codeEditAria",
                                      )}
                                      invalid={editAcademicLevelCodeInvalid}
                                      value={editAcademicLevelValues.code ?? ""}
                                      onChange={(event) => {
                                        editAcademicLevelForm.setValue(
                                          "code",
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
                                  <FormField
                                    label={t("curriculums.level.labelLabel")}
                                    error={
                                      editAcademicLevelForm.formState.errors
                                        .label?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.level.labelEditAria",
                                      )}
                                      invalid={editAcademicLevelLabelInvalid}
                                      value={
                                        editAcademicLevelValues.label ?? ""
                                      }
                                      onChange={(event) => {
                                        editAcademicLevelForm.setValue(
                                          "label",
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
                                  <FormSubmitHint
                                    visible={
                                      !editAcademicLevelForm.formState.isValid
                                    }
                                    className="md:col-span-4"
                                  />
                                  <Button
                                    type="button"
                                    disabled={
                                      savingAcademicLevel ||
                                      !editAcademicLevelForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editAcademicLevelForm.handleSubmit(
                                        (values) =>
                                          saveAcademicLevel(level.id, values),
                                      )();
                                    }}
                                  >
                                    {savingAcademicLevel
                                      ? t("curriculums.level.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingAcademicLevelId(null);
                                      editAcademicLevelForm.reset();
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

                    {!loading && !loadingData && orderedLevels.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("curriculums.level.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === "tracks" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
                onSubmit={trackForm.handleSubmit(onCreateTrack)}
              >
                <FormField
                  label={t("curriculums.track.codeLabel")}
                  error={trackForm.formState.errors.code?.message}
                >
                  <FormTextInput
                    aria-label={t("curriculums.track.codeLabel")}
                    invalid={trackCodeInvalid}
                    value={trackValues.code ?? ""}
                    onChange={(event) => {
                      trackForm.setValue("code", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("curriculums.track.codePlaceholder")}
                  />
                </FormField>
                <FormField
                  label={t("curriculums.track.labelLabel")}
                  error={trackForm.formState.errors.label?.message}
                >
                  <FormTextInput
                    aria-label={t("curriculums.track.labelLabel")}
                    invalid={trackLabelInvalid}
                    value={trackValues.label ?? ""}
                    onChange={(event) => {
                      trackForm.setValue("label", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder={t("curriculums.track.labelPlaceholder")}
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={submittingTrack || !trackForm.formState.isValid}
                  >
                    {submittingTrack
                      ? t("curriculums.track.creating")
                      : t("curriculums.track.add")}
                  </SubmitButton>
                </div>
                <FormSubmitHint
                  visible={!trackForm.formState.isValid}
                  className="md:col-span-3"
                />
              </form>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.track.colCode")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.track.colLabel")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.track.colCurriculums")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.track.colClasses")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("curriculums.track.colActions")}
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
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !loadingData &&
                      orderedTracks.map((track) => (
                        <Fragment key={track.id}>
                          <tr className="border-b border-border text-text-primary">
                            <td className="px-3 py-2">{track.code}</td>
                            <td className="px-3 py-2">{track.label}</td>
                            <td className="px-3 py-2">
                              {track._count?.curriculums ?? 0}
                            </td>
                            <td className="px-3 py-2">
                              {track._count?.classes ?? 0}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditTrack(track)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={deletingTrackId === track.id}
                                  onClick={() => {
                                    void deleteTrack(track.id);
                                  }}
                                >
                                  {deletingTrackId === track.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingTrackId === track.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                                  <FormField
                                    label={t("curriculums.track.codeLabel")}
                                    error={
                                      editTrackForm.formState.errors.code
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.track.codeEditAria",
                                      )}
                                      invalid={editTrackCodeInvalid}
                                      value={editTrackValues.code ?? ""}
                                      onChange={(event) => {
                                        editTrackForm.setValue(
                                          "code",
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
                                  <FormField
                                    label={t("curriculums.track.labelLabel")}
                                    error={
                                      editTrackForm.formState.errors.label
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.track.labelEditAria",
                                      )}
                                      invalid={editTrackLabelInvalid}
                                      value={editTrackValues.label ?? ""}
                                      onChange={(event) => {
                                        editTrackForm.setValue(
                                          "label",
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
                                  <FormSubmitHint
                                    visible={!editTrackForm.formState.isValid}
                                    className="md:col-span-4"
                                  />
                                  <Button
                                    type="button"
                                    disabled={
                                      savingTrack ||
                                      !editTrackForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editTrackForm.handleSubmit(
                                        (values) => saveTrack(track.id, values),
                                      )();
                                    }}
                                  >
                                    {savingTrack
                                      ? t("curriculums.track.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingTrackId(null);
                                      editTrackForm.reset();
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

                    {!loading && !loadingData && orderedTracks.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={5}
                        >
                          {t("curriculums.track.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === "curriculums" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-3"
                onSubmit={curriculumForm.handleSubmit(onCreateCurriculum)}
              >
                <FormField
                  label={t("curriculums.curriculum.levelLabel")}
                  error={
                    curriculumForm.formState.errors.academicLevelId?.message
                  }
                >
                  <FormSelect
                    aria-label={t("curriculums.curriculum.levelLabel")}
                    invalid={curriculumAcademicLevelInvalid}
                    value={curriculumValues.academicLevelId ?? ""}
                    onChange={(event) => {
                      curriculumForm.setValue(
                        "academicLevelId",
                        event.target.value,
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                  >
                    <option value="">{t("common.select")}</option>
                    {academicLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.code} - {level.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField label={t("curriculums.curriculum.trackLabel")}>
                  <FormSelect
                    aria-label={t("curriculums.curriculum.trackLabel")}
                    value={curriculumValues.trackId ?? ""}
                    onChange={(event) => {
                      curriculumForm.setValue("trackId", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">
                      {t("curriculums.curriculum.trackNone")}
                    </option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.code} - {track.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <div className="self-end">
                  <SubmitButton
                    disabled={
                      submittingCurriculum || !curriculumForm.formState.isValid
                    }
                  >
                    {submittingCurriculum
                      ? t("curriculums.curriculum.creating")
                      : t("curriculums.curriculum.add")}
                  </SubmitButton>
                </div>
                <FormSubmitHint
                  visible={!curriculumForm.formState.isValid}
                  className="md:col-span-3"
                />
              </form>
              <p className="text-xs text-text-secondary">
                {t("curriculums.curriculum.generatedName")}{" "}
                <span className="font-medium text-text-primary">
                  {generatedCurriculumName || "-"}
                </span>
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.curriculum.colName")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.curriculum.colLevel")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.curriculum.colTrack")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.curriculum.colSubjects")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("curriculums.curriculum.colClasses")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("curriculums.curriculum.colAction")}
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
                      orderedCurriculums.map((curriculum) => (
                        <tr
                          key={curriculum.id}
                          className="border-b border-border text-text-primary"
                        >
                          <td className="px-3 py-2">{curriculum.name}</td>
                          <td className="px-3 py-2">
                            {curriculum.academicLevel.code} -{" "}
                            {curriculum.academicLevel.label}
                          </td>
                          <td className="px-3 py-2">
                            {curriculum.track
                              ? `${curriculum.track.code} - ${curriculum.track.label}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2">
                            {curriculum._count.subjects}
                          </td>
                          <td className="px-3 py-2">
                            {curriculum._count.classes}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setTab("subjects");
                                  setSelectedCurriculumId(curriculum.id);
                                }}
                              >
                                {t("curriculums.curriculum.open")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={
                                  deletingCurriculumId === curriculum.id
                                }
                                onClick={() => {
                                  void onDeleteCurriculum(curriculum.id);
                                }}
                              >
                                {deletingCurriculumId === curriculum.id
                                  ? "..."
                                  : t("common.delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!loading &&
                    !loadingData &&
                    orderedCurriculums.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-6 text-text-secondary"
                          colSpan={6}
                        >
                          {t("curriculums.curriculum.empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="grid max-w-md gap-1 text-sm">
                <span className="text-text-secondary">
                  {t("curriculums.subject.curriculumLabel")}
                </span>
                <FormSelect
                  value={selectedCurriculumId}
                  onChange={(event) =>
                    setSelectedCurriculumId(event.target.value)
                  }
                >
                  <option value="">{t("common.select")}</option>
                  {orderedCurriculums.map((curriculum) => (
                    <option key={curriculum.id} value={curriculum.id}>
                      {curriculum.name}
                    </option>
                  ))}
                </FormSelect>
              </label>

              {selectedCurriculumId ? (
                <>
                  <form
                    className="grid gap-3 md:grid-cols-5"
                    onSubmit={curriculumSubjectForm.handleSubmit(
                      onUpsertCurriculumSubject,
                    )}
                  >
                    <FormField
                      label={t("curriculums.subject.subjectLabel")}
                      error={
                        curriculumSubjectForm.formState.errors.subjectId
                          ?.message
                      }
                    >
                      <FormSelect
                        aria-label={t("curriculums.subject.subjectLabel")}
                        invalid={curriculumSubjectIdInvalid}
                        value={curriculumSubjectValues.subjectId ?? ""}
                        onChange={(event) => {
                          curriculumSubjectForm.setValue(
                            "subjectId",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      >
                        <option value="">{t("common.select")}</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField
                      label={t("curriculums.subject.coefficientLabel")}
                      error={
                        curriculumSubjectForm.formState.errors.coefficient
                          ?.message
                      }
                    >
                      <FormNumberInput
                        aria-label={t("curriculums.subject.coefficientLabel")}
                        invalid={curriculumCoefficientInvalid}
                        min={0}
                        step="0.1"
                        value={curriculumSubjectValues.coefficient ?? ""}
                        onChange={(event) => {
                          curriculumSubjectForm.setValue(
                            "coefficient",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder={t(
                          "curriculums.subject.coefficientPlaceholder",
                        )}
                      />
                    </FormField>

                    <FormField
                      label={t("curriculums.subject.weeklyHoursLabel")}
                      error={
                        curriculumSubjectForm.formState.errors.weeklyHours
                          ?.message
                      }
                    >
                      <FormNumberInput
                        aria-label={t("curriculums.subject.weeklyHoursLabel")}
                        invalid={curriculumWeeklyHoursInvalid}
                        min={0}
                        step="0.5"
                        value={curriculumSubjectValues.weeklyHours ?? ""}
                        onChange={(event) => {
                          curriculumSubjectForm.setValue(
                            "weeklyHours",
                            event.target.value,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        placeholder={t(
                          "curriculums.subject.weeklyHoursPlaceholder",
                        )}
                      />
                    </FormField>

                    <label className="flex items-end gap-2 text-sm">
                      <FormCheckbox
                        checked={curriculumSubjectValues.isMandatory ?? true}
                        onChange={(event) => {
                          curriculumSubjectForm.setValue(
                            "isMandatory",
                            event.target.checked,
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                      />
                      <span className="text-text-secondary">
                        {t("curriculums.subject.mandatory")}
                      </span>
                    </label>

                    <div className="self-end">
                      <FormSubmitHint
                        visible={!curriculumSubjectForm.formState.isValid}
                        className="mb-2"
                      />
                      <Button
                        type="submit"
                        disabled={
                          submittingCurriculumSubject ||
                          !curriculumSubjectForm.formState.isValid
                        }
                      >
                        {submittingCurriculumSubject
                          ? t("curriculums.subject.saving")
                          : t("common.save")}
                      </Button>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">
                            {t("curriculums.subject.colSubject")}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t("curriculums.subject.colCoefficient")}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t("curriculums.subject.colWeeklyHours")}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t("curriculums.subject.colMandatory")}
                          </th>
                          <th className="px-3 py-2 font-medium text-right">
                            {t("curriculums.subject.colAction")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {curriculumSubjects.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-border text-text-primary"
                          >
                            <td className="px-3 py-2">{entry.subject.name}</td>
                            <td className="px-3 py-2">
                              {entry.coefficient ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.weeklyHours ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {entry.isMandatory
                                ? t("curriculums.subject.yes")
                                : t("curriculums.subject.no")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  void onDeleteCurriculumSubject(
                                    entry.subjectId,
                                  );
                                }}
                              >
                                {t("curriculums.subject.remove")}
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {curriculumSubjects.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-6 text-text-secondary"
                              colSpan={5}
                            >
                              {t("curriculums.subject.empty")}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t("curriculums.subject.selectHint")}
                </p>
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
    </AppShell>
  );
}
