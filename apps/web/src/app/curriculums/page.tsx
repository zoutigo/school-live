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
        setError("Impossible de charger les curriculums.");
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
      setError("Erreur reseau.");
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
        setError("Impossible de charger les matieres du curriculum.");
        return;
      }

      setCurriculumSubjects((await response.json()) as CurriculumSubject[]);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Creation niveau impossible.");
        setError(String(message));
        return;
      }

      academicLevelForm.reset({ code: "", label: "" });
      setSuccess("Niveau academique cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Mise a jour niveau impossible.");
        setError(String(message));
        return;
      }

      setEditingAcademicLevelId(null);
      setSuccess("Niveau academique modifie.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression niveau impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Niveau academique supprime.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Creation filiere impossible.");
        setError(String(message));
        return;
      }

      trackForm.reset({ code: "", label: "" });
      setSuccess("Filiere creee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Mise a jour filiere impossible.");
        setError(String(message));
        return;
      }

      setEditingTrackId(null);
      setSuccess("Filiere modifiee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression filiere impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Filiere supprimee.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Creation impossible.");
        setError(String(message));
        return;
      }

      curriculumForm.reset({
        academicLevelId: values.academicLevelId,
        trackId: "",
      });
      setSuccess("Curriculum cree.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      if (selectedCurriculumId === curriculumId) {
        setSelectedCurriculumId("");
      }
      setSuccess("Curriculum supprime.");
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Enregistrement impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Matiere du curriculum enregistree.");
      curriculumSubjectForm.reset({
        subjectId: values.subjectId,
        coefficient: "",
        weeklyHours: "",
        isMandatory: values.isMandatory,
      });
      await loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
      setError("Session CSRF invalide. Reconnectez-vous.");
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
            : (payload?.message ?? "Suppression impossible.");
        setError(String(message));
        return;
      }

      setSuccess("Matiere retiree du curriculum.");
      await loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
      await loadData(schoolSlug);
    } catch {
      setError("Erreur reseau.");
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
    <AppShell schoolSlug={schoolSlug} schoolName="Gestion des curriculums">
      <div className="grid gap-4">
        <Card
          title="Curriculums"
          subtitle="Structure academique et coefficients de moyenne generale"
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
              Niveaux
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
              Filieres
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
              Curriculums
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
              Matieres du curriculum
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
              Aide
            </button>

            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <label className="ml-auto grid min-w-[260px] gap-1 text-sm">
                <span className="text-text-secondary">Ecole</span>
                <FormSelect
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                >
                  <option value="">Selectionner une ecole</option>
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
              moduleName="Curriculums"
              moduleSummary="ce module definit la structure academique (niveaux, filieres) puis les curriculums et coefficients officiels des matieres."
              actions={[
                {
                  name: "Niveaux et filieres",
                  purpose: "poser la base academique de l'ecole.",
                  howTo:
                    "creer d'abord les niveaux puis les filieres si besoin dans leurs onglets dedies.",
                  moduleImpact:
                    "ces listes deviennent disponibles dans la creation des curriculums.",
                  crossModuleImpact:
                    "elles structurent classes, matieres et futurs calculs de moyenne generale.",
                },
                {
                  name: "Curriculum",
                  purpose:
                    "composer le programme officiel d'un niveau/filiere.",
                  howTo:
                    "creer un curriculum puis ajouter les matieres avec leurs coefficients.",
                  moduleImpact:
                    "le coefficient est enregistre au niveau curriculum.",
                  crossModuleImpact:
                    "la moyenne generale depend de ces coefficients (sauf override de classe).",
                },
              ]}
            />
          ) : !schoolSlug ? (
            <p className="text-sm text-text-secondary">
              Selectionnez une ecole.
            </p>
          ) : tab === "levels" ? (
            <div className="grid gap-4">
              <form
                className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
                onSubmit={academicLevelForm.handleSubmit(onCreateAcademicLevel)}
              >
                <FormField
                  label="Code"
                  error={academicLevelForm.formState.errors.code?.message}
                >
                  <FormTextInput
                    aria-label="Code"
                    invalid={academicLevelCodeInvalid}
                    value={academicLevelValues.code ?? ""}
                    onChange={(event) => {
                      academicLevelForm.setValue("code", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: 6EME"
                  />
                </FormField>
                <FormField
                  label="Libelle"
                  error={academicLevelForm.formState.errors.label?.message}
                >
                  <FormTextInput
                    aria-label="Libelle"
                    invalid={academicLevelLabelInvalid}
                    value={academicLevelValues.label ?? ""}
                    onChange={(event) => {
                      academicLevelForm.setValue("label", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: 6eme"
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={
                      submittingAcademicLevel ||
                      !academicLevelForm.formState.isValid
                    }
                  >
                    {submittingAcademicLevel ? "Creation..." : "Ajouter"}
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
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Libelle</th>
                      <th className="px-3 py-2 font-medium">Curriculums</th>
                      <th className="px-3 py-2 font-medium">Classes</th>
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
                                  Modifier
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
                                    : "Supprimer"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingAcademicLevelId === level.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                                  <FormField
                                    label="Code"
                                    error={
                                      editAcademicLevelForm.formState.errors
                                        .code?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label="Code niveau"
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
                                    label="Libelle"
                                    error={
                                      editAcademicLevelForm.formState.errors
                                        .label?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label="Libelle niveau"
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
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingAcademicLevelId(null);
                                      editAcademicLevelForm.reset();
                                    }}
                                  >
                                    Annuler
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
                          Aucun niveau academique.
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
                  label="Code"
                  error={trackForm.formState.errors.code?.message}
                >
                  <FormTextInput
                    aria-label="Code"
                    invalid={trackCodeInvalid}
                    value={trackValues.code ?? ""}
                    onChange={(event) => {
                      trackForm.setValue("code", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: C"
                  />
                </FormField>
                <FormField
                  label="Libelle"
                  error={trackForm.formState.errors.label?.message}
                >
                  <FormTextInput
                    aria-label="Libelle"
                    invalid={trackLabelInvalid}
                    value={trackValues.label ?? ""}
                    onChange={(event) => {
                      trackForm.setValue("label", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: Scientifique"
                  />
                </FormField>
                <div className="self-end">
                  <SubmitButton
                    disabled={submittingTrack || !trackForm.formState.isValid}
                  >
                    {submittingTrack ? "Creation..." : "Ajouter"}
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
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Libelle</th>
                      <th className="px-3 py-2 font-medium">Curriculums</th>
                      <th className="px-3 py-2 font-medium">Classes</th>
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
                                  Modifier
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
                                    : "Supprimer"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingTrackId === track.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                                  <FormField
                                    label="Code"
                                    error={
                                      editTrackForm.formState.errors.code
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label="Code filiere"
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
                                    label="Libelle"
                                    error={
                                      editTrackForm.formState.errors.label
                                        ?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label="Libelle filiere"
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
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingTrackId(null);
                                      editTrackForm.reset();
                                    }}
                                  >
                                    Annuler
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
                          Aucune filiere.
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
                  label="Niveau academique"
                  error={
                    curriculumForm.formState.errors.academicLevelId?.message
                  }
                >
                  <FormSelect
                    aria-label="Niveau academique"
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
                    <option value="">Selectionner</option>
                    {academicLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.code} - {level.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField label="Filiere (optionnel)">
                  <FormSelect
                    aria-label="Filiere (optionnel)"
                    value={curriculumValues.trackId ?? ""}
                    onChange={(event) => {
                      curriculumForm.setValue("trackId", event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    <option value="">Aucune</option>
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
                    {submittingCurriculum ? "Creation..." : "Creer"}
                  </SubmitButton>
                </div>
                <FormSubmitHint
                  visible={!curriculumForm.formState.isValid}
                  className="md:col-span-3"
                />
              </form>
              <p className="text-xs text-text-secondary">
                Nom genere automatiquement:{" "}
                <span className="font-medium text-text-primary">
                  {generatedCurriculumName || "-"}
                </span>
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="px-3 py-2 font-medium">Nom</th>
                      <th className="px-3 py-2 font-medium">Niveau</th>
                      <th className="px-3 py-2 font-medium">Filiere</th>
                      <th className="px-3 py-2 font-medium">Matieres</th>
                      <th className="px-3 py-2 font-medium">Classes</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Action
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
                          Chargement...
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
                                Ouvrir
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
                                  : "Supprimer"}
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
                          Aucun curriculum.
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
                <span className="text-text-secondary">Curriculum</span>
                <FormSelect
                  value={selectedCurriculumId}
                  onChange={(event) =>
                    setSelectedCurriculumId(event.target.value)
                  }
                >
                  <option value="">Selectionner</option>
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
                      label="Matiere"
                      error={
                        curriculumSubjectForm.formState.errors.subjectId
                          ?.message
                      }
                    >
                      <FormSelect
                        aria-label="Matiere"
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
                        <option value="">Selectionner</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>

                    <FormField
                      label="Coefficient"
                      error={
                        curriculumSubjectForm.formState.errors.coefficient
                          ?.message
                      }
                    >
                      <FormNumberInput
                        aria-label="Coefficient"
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
                        placeholder="Ex: 4"
                      />
                    </FormField>

                    <FormField
                      label="Heures/sem."
                      error={
                        curriculumSubjectForm.formState.errors.weeklyHours
                          ?.message
                      }
                    >
                      <FormNumberInput
                        aria-label="Heures/sem."
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
                        placeholder="Ex: 3"
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
                      <span className="text-text-secondary">Obligatoire</span>
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
                          ? "Enregistrement..."
                          : "Enregistrer"}
                      </Button>
                    </div>
                  </form>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">Matiere</th>
                          <th className="px-3 py-2 font-medium">Coefficient</th>
                          <th className="px-3 py-2 font-medium">Heures/sem.</th>
                          <th className="px-3 py-2 font-medium">Obligatoire</th>
                          <th className="px-3 py-2 font-medium text-right">
                            Action
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
                              {entry.isMandatory ? "Oui" : "Non"}
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
                                Retirer
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
                              Aucune matiere dans ce curriculum.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary">
                  Selectionnez un curriculum pour configurer ses matieres.
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
