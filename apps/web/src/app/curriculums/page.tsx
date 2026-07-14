"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type Tab =
  | "levels"
  | "tracks"
  | "curriculums"
  | "subjects"
  | "cycles"
  | "national"
  | "nationalTracks"
  | "nationalSubjects"
  | "help";

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

type NationalCycle = {
  id: string;
  code: string;
  label: string;
  _count?: {
    academicLevels: number;
  };
};

type NationalAcademicLevel = {
  id: string;
  code: string;
  label: string;
  cycleId: string | null;
  cycle: NationalCycle | null;
  languageSystem: "FRANCOPHONE" | "ANGLOPHONE" | "BILINGUAL" | null;
  _count?: {
    classes: number;
    curriculums: number;
  };
};

type NationalTrack = {
  id: string;
  code: string;
  label: string;
  _count?: {
    classes: number;
    curriculums: number;
  };
};

type NationalCurriculum = {
  id: string;
  name: string;
  academicLevelId: string;
  trackId: string | null;
  academicLevel: { id: string; code: string; label: string };
  track: { id: string; code: string; label: string } | null;
  _count: {
    classes: number;
    subjects: number;
  };
};

type NationalSubject = {
  id: string;
  code: string;
  name: string;
  _count?: {
    curriculumSubjects: number;
  };
};

type NationalCurriculumSubject = {
  id: string;
  subjectId: string;
  isMandatory: boolean;
  coefficient: number | null;
  weeklyHours: number | null;
  subject: { id: string; name: string };
};

const academicLevelFormSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  label: z.string().trim().min(1, "Le libelle est obligatoire."),
});

const nationalAcademicLevelFormSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  label: z.string().trim().min(1, "Le libelle est obligatoire."),
  cycleId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  languageSystem: z
    .union([z.enum(["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"]), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
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

const nationalCurriculumFormSchema = z.object({
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

const nationalSubjectFormSchema = z.object({
  code: z.string().trim().min(1, "Le code est obligatoire."),
  name: z.string().trim().min(1, "Le nom est obligatoire."),
});

export default function CurriculumsPage() {
  return (
    <Suspense fallback={null}>
      <CurriculumsPageContent />
    </Suspense>
  );
}

function CurriculumsPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const schoolSlugParam = searchParams.get("schoolSlug");

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

  const [nationalCycles, setNationalCycles] = useState<NationalCycle[]>([]);
  const [nationalAcademicLevels, setNationalAcademicLevels] = useState<
    NationalAcademicLevel[]
  >([]);
  const [nationalCurriculums, setNationalCurriculums] = useState<
    NationalCurriculum[]
  >([]);
  const [loadingNationalCatalog, setLoadingNationalCatalog] = useState(false);
  const [submittingNationalLevel, setSubmittingNationalLevel] = useState(false);
  const [deletingNationalLevelId, setDeletingNationalLevelId] = useState<
    string | null
  >(null);
  const [submittingNationalCurriculum, setSubmittingNationalCurriculum] =
    useState(false);
  const [deletingNationalCurriculumId, setDeletingNationalCurriculumId] =
    useState<string | null>(null);

  const [editingNationalLevelId, setEditingNationalLevelId] = useState<
    string | null
  >(null);
  const [savingNationalLevel, setSavingNationalLevel] = useState(false);
  const [editingNationalCurriculumId, setEditingNationalCurriculumId] =
    useState<string | null>(null);
  const [savingNationalCurriculum, setSavingNationalCurriculum] =
    useState(false);

  const [nationalTracks, setNationalTracks] = useState<NationalTrack[]>([]);
  const [loadingNationalTracks, setLoadingNationalTracks] = useState(false);
  const [submittingNationalTrack, setSubmittingNationalTrack] = useState(false);
  const [editingNationalTrackId, setEditingNationalTrackId] = useState<
    string | null
  >(null);
  const [savingNationalTrack, setSavingNationalTrack] = useState(false);
  const [deletingNationalTrackId, setDeletingNationalTrackId] = useState<
    string | null
  >(null);

  const [nationalSubjects, setNationalSubjects] = useState<NationalSubject[]>(
    [],
  );
  const [loadingNationalSubjects, setLoadingNationalSubjects] = useState(false);
  const [submittingNationalSubject, setSubmittingNationalSubject] =
    useState(false);
  const [editingNationalSubjectId, setEditingNationalSubjectId] = useState<
    string | null
  >(null);
  const [savingNationalSubject, setSavingNationalSubject] = useState(false);
  const [deletingNationalSubjectId, setDeletingNationalSubjectId] = useState<
    string | null
  >(null);
  const [selectedNationalCurriculumId, setSelectedNationalCurriculumId] =
    useState("");
  const [nationalCurriculumSubjects, setNationalCurriculumSubjects] = useState<
    NationalCurriculumSubject[]
  >([]);
  const [
    submittingNationalCurriculumSubject,
    setSubmittingNationalCurriculumSubject,
  ] = useState(false);

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
  const nationalAcademicLevelForm = useForm<
    z.input<typeof nationalAcademicLevelFormSchema>
  >({
    resolver: zodResolver(nationalAcademicLevelFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "", cycleId: "", languageSystem: "" },
  });
  const nationalCurriculumForm = useForm<
    z.input<typeof nationalCurriculumFormSchema>
  >({
    resolver: zodResolver(nationalCurriculumFormSchema),
    mode: "onChange",
    defaultValues: { academicLevelId: "", trackId: "" },
  });
  const nationalTrackForm = useForm<z.input<typeof trackFormSchema>>({
    resolver: zodResolver(trackFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
  });
  const editNationalTrackForm = useForm<z.input<typeof trackFormSchema>>({
    resolver: zodResolver(trackFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "" },
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
  const editNationalAcademicLevelForm = useForm<
    z.input<typeof nationalAcademicLevelFormSchema>
  >({
    resolver: zodResolver(nationalAcademicLevelFormSchema),
    mode: "onChange",
    defaultValues: { code: "", label: "", cycleId: "", languageSystem: "" },
  });
  const editNationalCurriculumForm = useForm<
    z.input<typeof nationalCurriculumFormSchema>
  >({
    resolver: zodResolver(nationalCurriculumFormSchema),
    mode: "onChange",
    defaultValues: { academicLevelId: "", trackId: "" },
  });
  const nationalSubjectForm = useForm<
    z.input<typeof nationalSubjectFormSchema>
  >({
    resolver: zodResolver(nationalSubjectFormSchema),
    mode: "onChange",
    defaultValues: { code: "", name: "" },
  });
  const editNationalSubjectForm = useForm<
    z.input<typeof nationalSubjectFormSchema>
  >({
    resolver: zodResolver(nationalSubjectFormSchema),
    mode: "onChange",
    defaultValues: { code: "", name: "" },
  });
  const nationalCurriculumSubjectForm = useForm<
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
  const academicLevelValues = academicLevelForm.watch();
  const trackValues = trackForm.watch();
  const curriculumValues = curriculumForm.watch();
  const curriculumSubjectValues = curriculumSubjectForm.watch();
  const editAcademicLevelValues = editAcademicLevelForm.watch();
  const editTrackValues = editTrackForm.watch();
  const nationalTrackValues = nationalTrackForm.watch();
  const editNationalTrackValues = editNationalTrackForm.watch();
  const nationalSubjectValues = nationalSubjectForm.watch();
  const editNationalSubjectValues = editNationalSubjectForm.watch();
  const nationalCurriculumSubjectValues = nationalCurriculumSubjectForm.watch();
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
  const nationalTrackCodeInvalid =
    !!nationalTrackForm.formState.errors.code ||
    !(nationalTrackValues.code ?? "").trim();
  const nationalTrackLabelInvalid =
    !!nationalTrackForm.formState.errors.label ||
    !(nationalTrackValues.label ?? "").trim();
  const editNationalTrackCodeInvalid =
    !!editNationalTrackForm.formState.errors.code ||
    !(editNationalTrackValues.code ?? "").trim();
  const editNationalTrackLabelInvalid =
    !!editNationalTrackForm.formState.errors.label ||
    !(editNationalTrackValues.label ?? "").trim();
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
  const nationalSubjectCodeInvalid =
    !!nationalSubjectForm.formState.errors.code ||
    !(nationalSubjectValues.code ?? "").trim();
  const nationalSubjectNameInvalid =
    !!nationalSubjectForm.formState.errors.name ||
    !(nationalSubjectValues.name ?? "").trim();
  const editNationalSubjectCodeInvalid =
    !!editNationalSubjectForm.formState.errors.code ||
    !(editNationalSubjectValues.code ?? "").trim();
  const editNationalSubjectNameInvalid =
    !!editNationalSubjectForm.formState.errors.name ||
    !(editNationalSubjectValues.name ?? "").trim();
  const nationalCurriculumSubjectIdInvalid =
    !!nationalCurriculumSubjectForm.formState.errors.subjectId ||
    !(nationalCurriculumSubjectValues.subjectId ?? "").trim();
  const nationalCurriculumCoefficientInvalid =
    !!nationalCurriculumSubjectForm.formState.errors.coefficient;
  const nationalCurriculumWeeklyHoursInvalid =
    !!nationalCurriculumSubjectForm.formState.errors.weeklyHours;

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
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      void loadNationalCatalog();
      void loadNationalTracks();
      void loadNationalSubjects();
    }
  }, [role]);

  useEffect(() => {
    void nationalAcademicLevelForm.trigger();
    void nationalCurriculumForm.trigger();
    void nationalTrackForm.trigger();
    void nationalSubjectForm.trigger();
  }, [
    nationalAcademicLevelForm,
    nationalCurriculumForm,
    nationalTrackForm,
    nationalSubjectForm,
  ]);

  useEffect(() => {
    if (!schoolSlug || !selectedCurriculumId) {
      setCurriculumSubjects([]);
      return;
    }
    void loadCurriculumSubjects(schoolSlug, selectedCurriculumId);
  }, [schoolSlug, selectedCurriculumId]);

  useEffect(() => {
    if (!selectedNationalCurriculumId) {
      setNationalCurriculumSubjects([]);
      return;
    }
    void loadNationalCurriculumSubjects(selectedNationalCurriculumId);
  }, [selectedNationalCurriculumId]);

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

      const schoolsResponse = await fetch(`${API_URL}/system/schools/options`, {
        credentials: "include",
      });
      if (!schoolsResponse.ok) {
        router.replace("/");
        return;
      }

      const schoolRows = (await schoolsResponse.json()) as SchoolOption[];
      setSchools(schoolRows);

      const requestedSchool = schoolSlugParam
        ? schoolRows.find((row) => row.slug === schoolSlugParam)
        : null;

      if (requestedSchool) {
        setSchoolSlug(requestedSchool.slug);
        setTab("curriculums");
        setLoading(false);
        return;
      }

      setSchoolSlug(schoolRows[0]?.slug ?? null);
      // Un compte plateforme (SUPER_ADMIN/ADMIN) gère le catalogue NATIONAL par
      // défaut : la gestion du catalogue d'une école précise reste accessible
      // via le sélecteur d'école, mais ne doit jamais être la vue d'atterrissage.
      setTab("national");
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

  async function loadNationalCatalog() {
    setLoadingNationalCatalog(true);
    try {
      const [
        cyclesResponse,
        levelsResponse,
        tracksResponse,
        curriculumsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/system/cycles`, { credentials: "include" }),
        fetch(`${API_URL}/system/academic-levels`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/system/tracks`, { credentials: "include" }),
        fetch(`${API_URL}/system/curriculums`, { credentials: "include" }),
      ]);

      if (cyclesResponse.ok) {
        setNationalCycles((await cyclesResponse.json()) as NationalCycle[]);
      }
      if (levelsResponse.ok) {
        setNationalAcademicLevels(
          (await levelsResponse.json()) as NationalAcademicLevel[],
        );
      }
      if (tracksResponse.ok) {
        setNationalTracks((await tracksResponse.json()) as NationalTrack[]);
      }
      if (curriculumsResponse.ok) {
        setNationalCurriculums(
          (await curriculumsResponse.json()) as NationalCurriculum[],
        );
      }
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setLoadingNationalCatalog(false);
    }
  }

  async function loadNationalTracks() {
    setLoadingNationalTracks(true);
    try {
      const response = await fetch(`${API_URL}/system/tracks`, {
        credentials: "include",
      });
      if (response.ok) {
        setNationalTracks((await response.json()) as NationalTrack[]);
      }
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setLoadingNationalTracks(false);
    }
  }

  async function onCreateNationalTrack(
    values: z.output<typeof trackFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingNationalTrack(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/tracks`, {
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

      nationalTrackForm.reset({ code: "", label: "" });
      setSuccess(t("curriculums.success.trackCreated"));
      await loadNationalTracks();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingNationalTrack(false);
    }
  }

  function onInvalidCreateNationalTrack(
    errors: typeof nationalTrackForm.formState.errors,
  ) {
    if (errors.code) {
      nationalTrackForm.setFocus("code");
    } else if (errors.label) {
      nationalTrackForm.setFocus("label");
    }
  }

  function startEditNationalTrack(track: NationalTrack) {
    setEditingNationalTrackId(track.id);
    editNationalTrackForm.reset({ code: track.code, label: track.label });
    void editNationalTrackForm.trigger();
  }

  async function saveNationalTrack(
    trackId: string,
    values: z.output<typeof trackFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingNationalTrack(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/tracks/${trackId}`, {
        method: "PATCH",
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
            : (payload?.message ?? t("curriculums.error.trackUpdateFailed"));
        setError(String(message));
        return;
      }

      setEditingNationalTrackId(null);
      setSuccess(t("curriculums.success.trackEdited"));
      await loadNationalTracks();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingNationalTrack(false);
    }
  }

  async function deleteNationalTrack(trackId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingNationalTrackId(trackId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/tracks/${trackId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });

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
      await loadNationalTracks();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingNationalTrackId(null);
    }
  }

  async function onCreateNationalAcademicLevel(
    values: z.input<typeof nationalAcademicLevelFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingNationalLevel(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/academic-levels`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          code: values.code,
          label: values.label,
          cycleId: values.cycleId || undefined,
          languageSystem: values.languageSystem || undefined,
        }),
      });

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

      nationalAcademicLevelForm.reset({
        code: "",
        label: "",
        cycleId: "",
        languageSystem: "",
      });
      setSuccess(t("curriculums.success.levelCreated"));
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingNationalLevel(false);
    }
  }

  function onInvalidCreateNationalAcademicLevel(
    errors: typeof nationalAcademicLevelForm.formState.errors,
  ) {
    if (errors.code) {
      nationalAcademicLevelForm.setFocus("code");
    } else if (errors.label) {
      nationalAcademicLevelForm.setFocus("label");
    }
  }

  async function deleteNationalAcademicLevel(levelId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingNationalLevelId(levelId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/academic-levels/${levelId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
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
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingNationalLevelId(null);
    }
  }

  function startEditNationalLevel(level: NationalAcademicLevel) {
    setEditingNationalLevelId(level.id);
    editNationalAcademicLevelForm.reset({
      code: level.code,
      label: level.label,
      cycleId: level.cycleId ?? "",
      languageSystem: level.languageSystem ?? "",
    });
    void editNationalAcademicLevelForm.trigger();
  }

  async function saveNationalAcademicLevel(
    levelId: string,
    values: z.input<typeof nationalAcademicLevelFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingNationalLevel(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/academic-levels/${levelId}`,
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
            cycleId: values.cycleId || undefined,
            languageSystem: values.languageSystem || undefined,
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

      setEditingNationalLevelId(null);
      setSuccess(t("curriculums.success.levelEdited"));
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingNationalLevel(false);
    }
  }

  async function onCreateNationalCurriculum(
    values: z.input<typeof nationalCurriculumFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingNationalCurriculum(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/curriculums`, {
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
            : (payload?.message ??
              t("curriculums.error.curriculumCreateFailed"));
        setError(String(message));
        return;
      }

      nationalCurriculumForm.reset({ academicLevelId: "", trackId: "" });
      setSuccess(t("curriculums.success.curriculumCreated"));
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingNationalCurriculum(false);
    }
  }

  function onInvalidCreateNationalCurriculum(
    errors: typeof nationalCurriculumForm.formState.errors,
  ) {
    if (errors.academicLevelId) {
      nationalCurriculumForm.setFocus("academicLevelId");
    }
  }

  async function deleteNationalCurriculum(curriculumId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingNationalCurriculumId(curriculumId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/curriculums/${curriculumId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
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

      setSuccess(t("curriculums.success.curriculumDeleted"));
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingNationalCurriculumId(null);
    }
  }

  function startEditNationalCurriculum(curriculum: NationalCurriculum) {
    setEditingNationalCurriculumId(curriculum.id);
    editNationalCurriculumForm.reset({
      academicLevelId: curriculum.academicLevelId,
      trackId: curriculum.trackId ?? "",
    });
    void editNationalCurriculumForm.trigger();
  }

  async function saveNationalCurriculum(
    curriculumId: string,
    values: z.input<typeof nationalCurriculumFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingNationalCurriculum(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/curriculums/${curriculumId}`,
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
            : (payload?.message ??
              t("curriculums.error.curriculumUpdateFailed"));
        setError(String(message));
        return;
      }

      setEditingNationalCurriculumId(null);
      setSuccess(t("curriculums.success.curriculumEdited"));
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingNationalCurriculum(false);
    }
  }

  async function loadNationalSubjects() {
    setLoadingNationalSubjects(true);
    try {
      const response = await fetch(`${API_URL}/system/subjects`, {
        credentials: "include",
      });
      if (response.ok) {
        setNationalSubjects((await response.json()) as NationalSubject[]);
      }
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setLoadingNationalSubjects(false);
    }
  }

  async function onCreateNationalSubject(
    values: z.output<typeof nationalSubjectFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingNationalSubject(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/subjects`, {
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
            : (payload?.message ?? t("curriculums.error.subjectCreateFailed"));
        setError(String(message));
        return;
      }

      nationalSubjectForm.reset({ code: "", name: "" });
      setSuccess(t("curriculums.success.subjectCreated"));
      await loadNationalSubjects();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingNationalSubject(false);
    }
  }

  function onInvalidCreateNationalSubject(
    errors: typeof nationalSubjectForm.formState.errors,
  ) {
    if (errors.code) {
      nationalSubjectForm.setFocus("code");
    } else if (errors.name) {
      nationalSubjectForm.setFocus("name");
    }
  }

  function startEditNationalSubject(subject: NationalSubject) {
    setEditingNationalSubjectId(subject.id);
    editNationalSubjectForm.reset({ code: subject.code, name: subject.name });
    void editNationalSubjectForm.trigger();
  }

  async function saveNationalSubject(
    subjectId: string,
    values: z.output<typeof nationalSubjectFormSchema>,
  ) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSavingNationalSubject(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/subjects/${subjectId}`, {
        method: "PATCH",
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
            : (payload?.message ?? t("curriculums.error.subjectUpdateFailed"));
        setError(String(message));
        return;
      }

      setEditingNationalSubjectId(null);
      setSuccess(t("curriculums.success.subjectEdited"));
      await loadNationalSubjects();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSavingNationalSubject(false);
    }
  }

  async function deleteNationalSubject(subjectId: string) {
    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setDeletingNationalSubjectId(subjectId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/system/subjects/${subjectId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message =
          payload?.message && Array.isArray(payload.message)
            ? payload.message.join(", ")
            : (payload?.message ?? t("curriculums.error.subjectDeleteFailed"));
        setError(String(message));
        return;
      }

      setSuccess(t("curriculums.success.subjectDeleted"));
      await loadNationalSubjects();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setDeletingNationalSubjectId(null);
    }
  }

  async function loadNationalCurriculumSubjects(curriculumId: string) {
    try {
      const response = await fetch(
        `${API_URL}/system/curriculums/${curriculumId}/subjects`,
        { credentials: "include" },
      );
      if (!response.ok) {
        setError(t("curriculums.error.loadSubjectsFailed"));
        return;
      }
      setNationalCurriculumSubjects(
        (await response.json()) as NationalCurriculumSubject[],
      );
    } catch {
      setError(t("curriculums.error.network"));
    }
  }

  async function onUpsertNationalCurriculumSubject(
    values: z.output<typeof curriculumSubjectFormSchema>,
  ) {
    if (!selectedNationalCurriculumId) {
      return;
    }

    const csrfToken = getCsrfTokenCookie();
    if (!csrfToken) {
      setError(t("curriculums.error.csrf"));
      router.replace("/");
      return;
    }

    setSubmittingNationalCurriculumSubject(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `${API_URL}/system/curriculums/${selectedNationalCurriculumId}/subjects`,
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
      nationalCurriculumSubjectForm.reset({
        subjectId: values.subjectId,
        coefficient: "",
        weeklyHours: "",
        isMandatory: values.isMandatory,
      });
      await loadNationalCurriculumSubjects(selectedNationalCurriculumId);
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
    } finally {
      setSubmittingNationalCurriculumSubject(false);
    }
  }

  async function onDeleteNationalCurriculumSubject(subjectId: string) {
    if (!selectedNationalCurriculumId) {
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
        `${API_URL}/system/curriculums/${selectedNationalCurriculumId}/subjects/${subjectId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
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
      await loadNationalCurriculumSubjects(selectedNationalCurriculumId);
      await loadNationalCatalog();
    } catch {
      setError(t("curriculums.error.network"));
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
  const orderedNationalSubjects = useMemo(
    () => [...nationalSubjects].sort((a, b) => a.name.localeCompare(b.name)),
    [nationalSubjects],
  );
  const cycleSummaries = useMemo(() => {
    const groups: Array<{ cycle: NationalCycle | null }> = [
      ...nationalCycles.map((cycle) => ({ cycle })),
      { cycle: null },
    ];
    return groups.map(({ cycle }) => {
      const levelsForCycle = nationalAcademicLevels.filter((level) =>
        cycle ? level.cycleId === cycle.id : !level.cycleId,
      );
      const languageSystemBreakdown = (
        ["FRANCOPHONE", "ANGLOPHONE", "BILINGUAL"] as const
      ).map((languageSystem) => ({
        languageSystem,
        count: levelsForCycle.filter(
          (level) => level.languageSystem === languageSystem,
        ).length,
      }));
      return {
        cycle,
        count: levelsForCycle.length,
        languageSystemBreakdown,
        unclassifiedLanguageSystemCount: levelsForCycle.filter(
          (level) => !level.languageSystem,
        ).length,
      };
    });
  }, [nationalCycles, nationalAcademicLevels]);
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
            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => setTab("cycles")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "cycles"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("curriculums.tab.cycles")}
              </button>
            ) : null}
            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => setTab("national")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "national"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("curriculums.tab.national")}
              </button>
            ) : null}
            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => setTab("nationalTracks")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "nationalTracks"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("curriculums.tab.nationalTracks")}
              </button>
            ) : null}
            {role === "SUPER_ADMIN" || role === "ADMIN" ? (
              <button
                type="button"
                onClick={() => setTab("nationalSubjects")}
                className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
                  tab === "nationalSubjects"
                    ? "border border-border border-b-surface bg-surface text-primary"
                    : "text-text-secondary"
                }`}
              >
                {t("curriculums.tab.nationalSubjects")}
              </button>
            ) : null}
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
          ) : tab === "national" ? (
            <div className="grid gap-6">
              <p className="text-sm text-text-secondary">
                {t("curriculums.national.intro")}
              </p>

              <div className="grid gap-3">
                <h3 className="font-heading text-base font-semibold">
                  {t("curriculums.national.levelsTitle")}
                </h3>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                  onSubmit={nationalAcademicLevelForm.handleSubmit(
                    onCreateNationalAcademicLevel,
                    onInvalidCreateNationalAcademicLevel,
                  )}
                >
                  <FormField
                    label={t("curriculums.national.codeLabel")}
                    error={
                      nationalAcademicLevelForm.formState.errors.code?.message
                    }
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.codeLabel")}
                      {...nationalAcademicLevelForm.register("code")}
                      placeholder={t("curriculums.national.codePlaceholder")}
                      invalid={Boolean(
                        nationalAcademicLevelForm.formState.errors.code,
                      )}
                    />
                  </FormField>
                  <FormField
                    label={t("curriculums.national.labelLabel")}
                    error={
                      nationalAcademicLevelForm.formState.errors.label?.message
                    }
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.labelLabel")}
                      {...nationalAcademicLevelForm.register("label")}
                      placeholder={t("curriculums.national.labelPlaceholder")}
                      invalid={Boolean(
                        nationalAcademicLevelForm.formState.errors.label,
                      )}
                    />
                  </FormField>
                  <FormField label={t("schools.form.fieldCycleOpt")}>
                    <select
                      aria-label={t("schools.form.fieldCycleOpt")}
                      className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      {...nationalAcademicLevelForm.register("cycleId")}
                    >
                      <option value="">
                        {t("schools.form.cyclePlaceholder")}
                      </option>
                      {nationalCycles.map((cycle) => (
                        <option key={cycle.id} value={cycle.id}>
                          {cycle.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t("schools.form.fieldLanguageSystemOpt")}>
                    <select
                      aria-label={t("schools.form.fieldLanguageSystemOpt")}
                      className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      {...nationalAcademicLevelForm.register("languageSystem")}
                    >
                      <option value="">
                        {t("schools.form.languageSystemPlaceholder")}
                      </option>
                      <option value="FRANCOPHONE">
                        {t("schools.form.languageSystemFrancophone")}
                      </option>
                      <option value="ANGLOPHONE">
                        {t("schools.form.languageSystemAnglophone")}
                      </option>
                      <option value="BILINGUAL">
                        {t("schools.form.languageSystemBilingual")}
                      </option>
                    </select>
                  </FormField>
                  <div className="self-end">
                    <SubmitButton disabled={submittingNationalLevel}>
                      {t("curriculums.national.add")}
                    </SubmitButton>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colCode")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colLabel")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colCycle")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colLanguageSystem")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalAcademicLevels.map((level) => (
                        <Fragment key={level.id}>
                          <tr className="border-b border-border">
                            <td className="px-3 py-2 font-mono text-xs">
                              {level.code}
                            </td>
                            <td className="px-3 py-2">{level.label}</td>
                            <td className="px-3 py-2">
                              {level.cycle ? level.cycle.label : "-"}
                            </td>
                            <td className="px-3 py-2">
                              {level.languageSystem
                                ? t(
                                    {
                                      FRANCOPHONE:
                                        "schools.form.languageSystemFrancophone",
                                      ANGLOPHONE:
                                        "schools.form.languageSystemAnglophone",
                                      BILINGUAL:
                                        "schools.form.languageSystemBilingual",
                                    }[level.languageSystem],
                                  )
                                : "-"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditNationalLevel(level)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={
                                    deletingNationalLevelId === level.id
                                  }
                                  onClick={() =>
                                    void deleteNationalAcademicLevel(level.id)
                                  }
                                >
                                  {deletingNationalLevelId === level.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingNationalLevelId === level.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={5}>
                                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
                                  <FormField
                                    label={t("curriculums.national.codeLabel")}
                                    error={
                                      editNationalAcademicLevelForm.formState
                                        .errors.code?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.codeEditAria",
                                      )}
                                      {...editNationalAcademicLevelForm.register(
                                        "code",
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("curriculums.national.labelLabel")}
                                    error={
                                      editNationalAcademicLevelForm.formState
                                        .errors.label?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.labelEditAria",
                                      )}
                                      {...editNationalAcademicLevelForm.register(
                                        "label",
                                      )}
                                    />
                                  </FormField>
                                  <FormField
                                    label={t("schools.form.fieldCycleOpt")}
                                  >
                                    <select
                                      aria-label={t(
                                        "schools.form.fieldCycleOpt",
                                      )}
                                      className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                      {...editNationalAcademicLevelForm.register(
                                        "cycleId",
                                      )}
                                    >
                                      <option value="">
                                        {t("schools.form.cyclePlaceholder")}
                                      </option>
                                      {nationalCycles.map((cycle) => (
                                        <option key={cycle.id} value={cycle.id}>
                                          {cycle.label}
                                        </option>
                                      ))}
                                    </select>
                                  </FormField>
                                  <FormField
                                    label={t(
                                      "schools.form.fieldLanguageSystemOpt",
                                    )}
                                  >
                                    <select
                                      aria-label={t(
                                        "schools.form.fieldLanguageSystemOpt",
                                      )}
                                      className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                      {...editNationalAcademicLevelForm.register(
                                        "languageSystem",
                                      )}
                                    >
                                      <option value="">
                                        {t(
                                          "schools.form.languageSystemPlaceholder",
                                        )}
                                      </option>
                                      <option value="FRANCOPHONE">
                                        {t(
                                          "schools.form.languageSystemFrancophone",
                                        )}
                                      </option>
                                      <option value="ANGLOPHONE">
                                        {t(
                                          "schools.form.languageSystemAnglophone",
                                        )}
                                      </option>
                                      <option value="BILINGUAL">
                                        {t(
                                          "schools.form.languageSystemBilingual",
                                        )}
                                      </option>
                                    </select>
                                  </FormField>
                                  <Button
                                    type="button"
                                    disabled={
                                      savingNationalLevel ||
                                      !editNationalAcademicLevelForm.formState
                                        .isValid
                                    }
                                    onClick={() => {
                                      void editNationalAcademicLevelForm.handleSubmit(
                                        (values) =>
                                          saveNationalAcademicLevel(
                                            level.id,
                                            values,
                                          ),
                                      )();
                                    }}
                                  >
                                    {savingNationalLevel
                                      ? t("curriculums.level.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingNationalLevelId(null);
                                      editNationalAcademicLevelForm.reset();
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
                      {!loadingNationalCatalog &&
                      nationalAcademicLevels.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={5}
                          >
                            {t("curriculums.national.emptyLevels")}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3">
                <h3 className="font-heading text-base font-semibold">
                  {t("curriculums.national.curriculumsTitle")}
                </h3>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  onSubmit={nationalCurriculumForm.handleSubmit(
                    onCreateNationalCurriculum,
                    onInvalidCreateNationalCurriculum,
                  )}
                >
                  <FormField
                    label={t("curriculums.national.academicLevelLabel")}
                    error={
                      nationalCurriculumForm.formState.errors.academicLevelId
                        ?.message
                    }
                  >
                    <FormSelect
                      aria-label={t("curriculums.national.academicLevelLabel")}
                      {...nationalCurriculumForm.register("academicLevelId")}
                    >
                      <option value="">
                        {t("curriculums.national.academicLevelPlaceholder")}
                      </option>
                      {nationalAcademicLevels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                  <FormField label={t("curriculums.national.trackLabel")}>
                    <FormSelect
                      aria-label={t("curriculums.national.trackLabel")}
                      {...nationalCurriculumForm.register("trackId")}
                    >
                      <option value="">
                        {t("curriculums.national.trackPlaceholder")}
                      </option>
                      {nationalTracks.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.label}
                        </option>
                      ))}
                    </FormSelect>
                  </FormField>
                  <div className="self-end">
                    <SubmitButton disabled={submittingNationalCurriculum}>
                      {t("curriculums.national.add")}
                    </SubmitButton>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colName")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colLevel")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colTrack")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalCurriculums.map((curriculum) => (
                        <Fragment key={curriculum.id}>
                          <tr className="border-b border-border">
                            <td className="px-3 py-2">{curriculum.name}</td>
                            <td className="px-3 py-2">
                              {curriculum.academicLevel.label}
                            </td>
                            <td className="px-3 py-2">
                              {curriculum.track
                                ? curriculum.track.label
                                : t("curriculums.national.trackPlaceholder")}
                            </td>
                            <td className="px-3 py-2">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    startEditNationalCurriculum(curriculum)
                                  }
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={
                                    deletingNationalCurriculumId ===
                                    curriculum.id
                                  }
                                  onClick={() =>
                                    void deleteNationalCurriculum(curriculum.id)
                                  }
                                >
                                  {deletingNationalCurriculumId ===
                                  curriculum.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingNationalCurriculumId === curriculum.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={4}>
                                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                                  <FormField
                                    label={t(
                                      "curriculums.national.academicLevelLabel",
                                    )}
                                    error={
                                      editNationalCurriculumForm.formState
                                        .errors.academicLevelId?.message
                                    }
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "curriculums.national.academicLevelEditAria",
                                      )}
                                      {...editNationalCurriculumForm.register(
                                        "academicLevelId",
                                      )}
                                    >
                                      {nationalAcademicLevels.map((level) => (
                                        <option key={level.id} value={level.id}>
                                          {level.label}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <FormField
                                    label={t("curriculums.national.trackLabel")}
                                  >
                                    <FormSelect
                                      aria-label={t(
                                        "curriculums.national.trackLabel",
                                      )}
                                      {...editNationalCurriculumForm.register(
                                        "trackId",
                                      )}
                                    >
                                      <option value="">
                                        {t(
                                          "curriculums.national.trackPlaceholder",
                                        )}
                                      </option>
                                      {nationalTracks.map((track) => (
                                        <option key={track.id} value={track.id}>
                                          {track.label}
                                        </option>
                                      ))}
                                    </FormSelect>
                                  </FormField>
                                  <Button
                                    type="button"
                                    disabled={
                                      savingNationalCurriculum ||
                                      !editNationalCurriculumForm.formState
                                        .isValid
                                    }
                                    onClick={() => {
                                      void editNationalCurriculumForm.handleSubmit(
                                        (values) =>
                                          saveNationalCurriculum(
                                            curriculum.id,
                                            values,
                                          ),
                                      )();
                                    }}
                                  >
                                    {savingNationalCurriculum
                                      ? t("curriculums.level.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingNationalCurriculumId(null);
                                      editNationalCurriculumForm.reset();
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
                      {!loadingNationalCatalog &&
                      nationalCurriculums.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={4}
                          >
                            {t("curriculums.national.emptyCurriculums")}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : tab === "cycles" ? (
            <div
              className="grid gap-4 md:grid-cols-3"
              data-testid="curriculums-cycles-tab"
            >
              {cycleSummaries.map((summary) => (
                <div
                  key={summary.cycle?.id ?? "unclassified"}
                  className="rounded-card border border-border bg-background p-4"
                  data-testid={`curriculums-cycle-card-${summary.cycle?.id ?? "unclassified"}`}
                >
                  <h3 className="font-heading text-base font-semibold text-text-primary">
                    {summary.cycle
                      ? summary.cycle.label
                      : t("curriculums.cycles.unclassified")}
                  </h3>
                  <p className="mt-1 text-2xl font-heading font-semibold text-primary">
                    {summary.count}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("curriculums.cycles.levelsCount")}
                  </p>
                  <ul className="mt-3 grid gap-1 text-sm text-text-secondary">
                    {summary.languageSystemBreakdown.map((entry) => (
                      <li
                        key={entry.languageSystem}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {t(
                            {
                              FRANCOPHONE:
                                "schools.form.languageSystemFrancophone",
                              ANGLOPHONE:
                                "schools.form.languageSystemAnglophone",
                              BILINGUAL: "schools.form.languageSystemBilingual",
                            }[entry.languageSystem],
                          )}
                        </span>
                        <span className="font-medium text-text-primary">
                          {entry.count}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between">
                      <span>
                        {t("curriculums.cycles.unclassifiedLanguage")}
                      </span>
                      <span className="font-medium text-text-primary">
                        {summary.unclassifiedLanguageSystemCount}
                      </span>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          ) : tab === "nationalTracks" ? (
            <div className="grid gap-6">
              <div className="grid gap-3">
                <h3 className="font-heading text-base font-semibold">
                  {t("curriculums.national.track.title")}
                </h3>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  onSubmit={nationalTrackForm.handleSubmit(
                    onCreateNationalTrack,
                    onInvalidCreateNationalTrack,
                  )}
                >
                  <FormField
                    label={t("curriculums.national.codeLabel")}
                    error={nationalTrackForm.formState.errors.code?.message}
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.codeLabel")}
                      invalid={nationalTrackCodeInvalid}
                      value={nationalTrackValues.code ?? ""}
                      onChange={(event) => {
                        nationalTrackForm.setValue("code", event.target.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormField>
                  <FormField
                    label={t("curriculums.national.labelLabel")}
                    error={nationalTrackForm.formState.errors.label?.message}
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.labelLabel")}
                      invalid={nationalTrackLabelInvalid}
                      value={nationalTrackValues.label ?? ""}
                      onChange={(event) => {
                        nationalTrackForm.setValue(
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
                  <div className="self-end">
                    <SubmitButton
                      disabled={
                        submittingNationalTrack ||
                        !nationalTrackForm.formState.isValid
                      }
                    >
                      {submittingNationalTrack
                        ? t("curriculums.national.track.creating")
                        : t("curriculums.national.add")}
                    </SubmitButton>
                  </div>
                  <FormSubmitHint
                    visible={!nationalTrackForm.formState.isValid}
                    className="md:col-span-3"
                  />
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colCode")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colLabel")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalTracks.map((track) => (
                        <Fragment key={track.id}>
                          <tr className="border-b border-border">
                            <td className="px-3 py-2 font-mono text-xs">
                              {track.code}
                            </td>
                            <td className="px-3 py-2">{track.label}</td>
                            <td className="px-3 py-2">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => startEditNationalTrack(track)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={
                                    deletingNationalTrackId === track.id
                                  }
                                  onClick={() =>
                                    void deleteNationalTrack(track.id)
                                  }
                                >
                                  {deletingNationalTrackId === track.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingNationalTrackId === track.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={3}>
                                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                                  <FormField
                                    label={t(
                                      "curriculums.national.track.codeEditAria",
                                    )}
                                    error={
                                      editNationalTrackForm.formState.errors
                                        .code?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.track.codeEditAria",
                                      )}
                                      invalid={editNationalTrackCodeInvalid}
                                      value={editNationalTrackValues.code ?? ""}
                                      onChange={(event) => {
                                        editNationalTrackForm.setValue(
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
                                    label={t(
                                      "curriculums.national.track.labelEditAria",
                                    )}
                                    error={
                                      editNationalTrackForm.formState.errors
                                        .label?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.track.labelEditAria",
                                      )}
                                      invalid={editNationalTrackLabelInvalid}
                                      value={
                                        editNationalTrackValues.label ?? ""
                                      }
                                      onChange={(event) => {
                                        editNationalTrackForm.setValue(
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
                                  <Button
                                    type="button"
                                    disabled={
                                      savingNationalTrack ||
                                      !editNationalTrackForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editNationalTrackForm.handleSubmit(
                                        (values) =>
                                          saveNationalTrack(track.id, values),
                                      )();
                                    }}
                                  >
                                    {savingNationalTrack
                                      ? t("curriculums.level.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingNationalTrackId(null);
                                      editNationalTrackForm.reset();
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
                      {!loadingNationalTracks && nationalTracks.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={3}
                          >
                            {t("curriculums.national.track.empty")}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : tab === "nationalSubjects" ? (
            <div className="grid gap-6">
              <div className="grid gap-3">
                <h3 className="font-heading text-base font-semibold">
                  {t("curriculums.national.subject.title")}
                </h3>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
                  onSubmit={nationalSubjectForm.handleSubmit(
                    onCreateNationalSubject,
                    onInvalidCreateNationalSubject,
                  )}
                >
                  <FormField
                    label={t("curriculums.national.subject.codeLabel")}
                    error={nationalSubjectForm.formState.errors.code?.message}
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.subject.codeLabel")}
                      invalid={nationalSubjectCodeInvalid}
                      value={nationalSubjectValues.code ?? ""}
                      onChange={(event) => {
                        nationalSubjectForm.setValue(
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
                    label={t("curriculums.national.subject.nameLabel")}
                    error={nationalSubjectForm.formState.errors.name?.message}
                  >
                    <FormTextInput
                      aria-label={t("curriculums.national.subject.nameLabel")}
                      invalid={nationalSubjectNameInvalid}
                      value={nationalSubjectValues.name ?? ""}
                      onChange={(event) => {
                        nationalSubjectForm.setValue(
                          "name",
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
                      disabled={
                        submittingNationalSubject ||
                        !nationalSubjectForm.formState.isValid
                      }
                    >
                      {submittingNationalSubject
                        ? t("curriculums.national.subject.creating")
                        : t("curriculums.national.add")}
                    </SubmitButton>
                  </div>
                  <FormSubmitHint
                    visible={!nationalSubjectForm.formState.isValid}
                    className="md:col-span-3"
                  />
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-text-secondary">
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colCode")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.subject.nameLabel")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("curriculums.national.colActions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedNationalSubjects.map((subject) => (
                        <Fragment key={subject.id}>
                          <tr className="border-b border-border">
                            <td className="px-3 py-2 font-mono text-xs">
                              {subject.code}
                            </td>
                            <td className="px-3 py-2">{subject.name}</td>
                            <td className="px-3 py-2">
                              <div className="inline-flex gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    startEditNationalSubject(subject)
                                  }
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={
                                    deletingNationalSubjectId === subject.id
                                  }
                                  onClick={() =>
                                    void deleteNationalSubject(subject.id)
                                  }
                                >
                                  {deletingNationalSubjectId === subject.id
                                    ? "..."
                                    : t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {editingNationalSubjectId === subject.id ? (
                            <tr className="border-b border-border bg-background">
                              <td className="px-3 py-3" colSpan={3}>
                                <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                                  <FormField
                                    label={t(
                                      "curriculums.national.subject.codeLabel",
                                    )}
                                    error={
                                      editNationalSubjectForm.formState.errors
                                        .code?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.subject.codeEditAria",
                                      )}
                                      invalid={editNationalSubjectCodeInvalid}
                                      value={
                                        editNationalSubjectValues.code ?? ""
                                      }
                                      onChange={(event) => {
                                        editNationalSubjectForm.setValue(
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
                                    label={t(
                                      "curriculums.national.subject.nameLabel",
                                    )}
                                    error={
                                      editNationalSubjectForm.formState.errors
                                        .name?.message
                                    }
                                  >
                                    <FormTextInput
                                      aria-label={t(
                                        "curriculums.national.subject.nameEditAria",
                                      )}
                                      invalid={editNationalSubjectNameInvalid}
                                      value={
                                        editNationalSubjectValues.name ?? ""
                                      }
                                      onChange={(event) => {
                                        editNationalSubjectForm.setValue(
                                          "name",
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
                                  <Button
                                    type="button"
                                    disabled={
                                      savingNationalSubject ||
                                      !editNationalSubjectForm.formState.isValid
                                    }
                                    onClick={() => {
                                      void editNationalSubjectForm.handleSubmit(
                                        (values) =>
                                          saveNationalSubject(
                                            subject.id,
                                            values,
                                          ),
                                      )();
                                    }}
                                  >
                                    {savingNationalSubject
                                      ? t("curriculums.level.saving")
                                      : t("common.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      setEditingNationalSubjectId(null);
                                      editNationalSubjectForm.reset();
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
                      {!loadingNationalSubjects &&
                      orderedNationalSubjects.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-6 text-text-secondary"
                            colSpan={3}
                          >
                            {t("curriculums.national.subject.empty")}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3">
                <h3 className="font-heading text-base font-semibold">
                  {t("curriculums.national.subject.rattachementTitle")}
                </h3>
                <label className="grid max-w-md gap-1 text-sm">
                  <span className="text-text-secondary">
                    {t("curriculums.national.academicLevelLabel")}
                  </span>
                  <FormSelect
                    value={selectedNationalCurriculumId}
                    onChange={(event) =>
                      setSelectedNationalCurriculumId(event.target.value)
                    }
                  >
                    <option value="">{t("common.select")}</option>
                    {nationalCurriculums.map((curriculum) => (
                      <option key={curriculum.id} value={curriculum.id}>
                        {curriculum.name}
                      </option>
                    ))}
                  </FormSelect>
                </label>

                {selectedNationalCurriculumId ? (
                  <>
                    <form
                      className="grid gap-3 md:grid-cols-5"
                      onSubmit={nationalCurriculumSubjectForm.handleSubmit(
                        onUpsertNationalCurriculumSubject,
                      )}
                    >
                      <FormField
                        label={t("curriculums.subject.subjectLabel")}
                        error={
                          nationalCurriculumSubjectForm.formState.errors
                            .subjectId?.message
                        }
                      >
                        <FormSelect
                          aria-label={t("curriculums.subject.subjectLabel")}
                          invalid={nationalCurriculumSubjectIdInvalid}
                          value={
                            nationalCurriculumSubjectValues.subjectId ?? ""
                          }
                          onChange={(event) => {
                            nationalCurriculumSubjectForm.setValue(
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
                          {orderedNationalSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </FormSelect>
                      </FormField>

                      <FormField
                        label={t("curriculums.subject.coefficientLabel")}
                        error={
                          nationalCurriculumSubjectForm.formState.errors
                            .coefficient?.message
                        }
                      >
                        <FormNumberInput
                          aria-label={t("curriculums.subject.coefficientLabel")}
                          invalid={nationalCurriculumCoefficientInvalid}
                          min={0}
                          step="0.1"
                          value={
                            nationalCurriculumSubjectValues.coefficient ?? ""
                          }
                          onChange={(event) => {
                            nationalCurriculumSubjectForm.setValue(
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
                          nationalCurriculumSubjectForm.formState.errors
                            .weeklyHours?.message
                        }
                      >
                        <FormNumberInput
                          aria-label={t("curriculums.subject.weeklyHoursLabel")}
                          invalid={nationalCurriculumWeeklyHoursInvalid}
                          min={0}
                          step="0.5"
                          value={
                            nationalCurriculumSubjectValues.weeklyHours ?? ""
                          }
                          onChange={(event) => {
                            nationalCurriculumSubjectForm.setValue(
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
                          checked={
                            nationalCurriculumSubjectValues.isMandatory ?? true
                          }
                          onChange={(event) => {
                            nationalCurriculumSubjectForm.setValue(
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
                          visible={
                            !nationalCurriculumSubjectForm.formState.isValid
                          }
                          className="mb-2"
                        />
                        <Button
                          type="submit"
                          disabled={
                            submittingNationalCurriculumSubject ||
                            !nationalCurriculumSubjectForm.formState.isValid
                          }
                        >
                          {submittingNationalCurriculumSubject
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
                          {nationalCurriculumSubjects.map((entry) => (
                            <tr
                              key={entry.id}
                              className="border-b border-border text-text-primary"
                            >
                              <td className="px-3 py-2">
                                {entry.subject.name}
                              </td>
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
                                    void onDeleteNationalCurriculumSubject(
                                      entry.subjectId,
                                    );
                                  }}
                                >
                                  {t("curriculums.subject.remove")}
                                </Button>
                              </td>
                            </tr>
                          ))}

                          {nationalCurriculumSubjects.length === 0 ? (
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
