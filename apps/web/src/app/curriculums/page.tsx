"use client";

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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

  const [curriculumAcademicLevelId, setCurriculumAcademicLevelId] =
    useState("");
  const [curriculumTrackId, setCurriculumTrackId] = useState("");

  const [academicLevelCode, setAcademicLevelCode] = useState("");
  const [academicLevelLabel, setAcademicLevelLabel] = useState("");
  const [editingAcademicLevelId, setEditingAcademicLevelId] = useState<
    string | null
  >(null);
  const [editAcademicLevelCode, setEditAcademicLevelCode] = useState("");
  const [editAcademicLevelLabel, setEditAcademicLevelLabel] = useState("");

  const [trackCode, setTrackCode] = useState("");
  const [trackLabel, setTrackLabel] = useState("");
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackCode, setEditTrackCode] = useState("");
  const [editTrackLabel, setEditTrackLabel] = useState("");

  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectIsMandatory, setSubjectIsMandatory] = useState(true);
  const [subjectCoefficient, setSubjectCoefficient] = useState("");
  const [subjectWeeklyHours, setSubjectWeeklyHours] = useState("");

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

      if (!curriculumAcademicLevelId && levelsPayload.length > 0) {
        setCurriculumAcademicLevelId(levelsPayload[0].id);
      }
      if (!selectedCurriculumId && curriculumsPayload.length > 0) {
        setSelectedCurriculumId(curriculumsPayload[0].id);
      }
      if (!selectedSubjectId && subjectsPayload.length > 0) {
        setSelectedSubjectId(subjectsPayload[0].id);
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

  async function onCreateAcademicLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          body: JSON.stringify({
            code: academicLevelCode,
            label: academicLevelLabel,
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
            : (payload?.message ?? "Creation niveau impossible.");
        setError(String(message));
        return;
      }

      setAcademicLevelCode("");
      setAcademicLevelLabel("");
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
    setEditAcademicLevelCode(level.code);
    setEditAcademicLevelLabel(level.label);
  }

  async function saveAcademicLevel(levelId: string) {
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
            code: editAcademicLevelCode,
            label: editAcademicLevelLabel,
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

  async function onCreateTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        body: JSON.stringify({
          code: trackCode,
          label: trackLabel,
        }),
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

      setTrackCode("");
      setTrackLabel("");
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
    setEditTrackCode(track.code);
    setEditTrackLabel(track.label);
  }

  async function saveTrack(trackId: string) {
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
            code: editTrackCode,
            label: editTrackLabel,
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

  async function onCreateCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          academicLevelId: curriculumAcademicLevelId,
          trackId: curriculumTrackId || undefined,
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

      setCurriculumTrackId("");
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

  async function onUpsertCurriculumSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            subjectId: selectedSubjectId,
            isMandatory: subjectIsMandatory,
            coefficient:
              subjectCoefficient.trim() === ""
                ? undefined
                : Number(subjectCoefficient),
            weeklyHours:
              subjectWeeklyHours.trim() === ""
                ? undefined
                : Number(subjectWeeklyHours),
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
      setSubjectCoefficient("");
      setSubjectWeeklyHours("");
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
      (entry) => entry.id === curriculumAcademicLevelId,
    );
    if (!level) {
      return "";
    }
    const track = tracks.find((entry) => entry.id === curriculumTrackId);
    return `${level.code} - ${track?.code ?? "TRONC_COMMUN"}`;
  }, [academicLevels, tracks, curriculumAcademicLevelId, curriculumTrackId]);

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
                <select
                  value={schoolSlug ?? ""}
                  onChange={(event) =>
                    setSchoolSlug(event.target.value || null)
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
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
                onSubmit={onCreateAcademicLevel}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Code</span>
                  <input
                    value={academicLevelCode}
                    onChange={(event) =>
                      setAcademicLevelCode(event.target.value)
                    }
                    placeholder="Ex: 6EME"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Libelle</span>
                  <input
                    value={academicLevelLabel}
                    onChange={(event) =>
                      setAcademicLevelLabel(event.target.value)
                    }
                    placeholder="Ex: 6eme"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submittingAcademicLevel}>
                    {submittingAcademicLevel ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
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
                                  <input
                                    value={editAcademicLevelCode}
                                    onChange={(event) =>
                                      setEditAcademicLevelCode(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <input
                                    value={editAcademicLevelLabel}
                                    onChange={(event) =>
                                      setEditAcademicLevelLabel(
                                        event.target.value,
                                      )
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <Button
                                    type="button"
                                    disabled={savingAcademicLevel}
                                    onClick={() => {
                                      void saveAcademicLevel(level.id);
                                    }}
                                  >
                                    {savingAcademicLevel
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                      setEditingAcademicLevelId(null)
                                    }
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
                onSubmit={onCreateTrack}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Code</span>
                  <input
                    value={trackCode}
                    onChange={(event) => setTrackCode(event.target.value)}
                    placeholder="Ex: C"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Libelle</span>
                  <input
                    value={trackLabel}
                    onChange={(event) => setTrackLabel(event.target.value)}
                    placeholder="Ex: Scientifique"
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="self-end">
                  <Button type="submit" disabled={submittingTrack}>
                    {submittingTrack ? "Creation..." : "Ajouter"}
                  </Button>
                </div>
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
                                  <input
                                    value={editTrackCode}
                                    onChange={(event) =>
                                      setEditTrackCode(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <input
                                    value={editTrackLabel}
                                    onChange={(event) =>
                                      setEditTrackLabel(event.target.value)
                                    }
                                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                                  />
                                  <Button
                                    type="button"
                                    disabled={savingTrack}
                                    onClick={() => {
                                      void saveTrack(track.id);
                                    }}
                                  >
                                    {savingTrack
                                      ? "Enregistrement..."
                                      : "Enregistrer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingTrackId(null)}
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
                onSubmit={onCreateCurriculum}
              >
                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">Niveau academique</span>
                  <select
                    value={curriculumAcademicLevelId}
                    onChange={(event) =>
                      setCurriculumAcademicLevelId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selectionner</option>
                    {academicLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.code} - {level.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-text-secondary">
                    Filiere (optionnel)
                  </span>
                  <select
                    value={curriculumTrackId}
                    onChange={(event) =>
                      setCurriculumTrackId(event.target.value)
                    }
                    className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucune</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.code} - {track.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="self-end">
                  <Button type="submit" disabled={submittingCurriculum}>
                    {submittingCurriculum ? "Creation..." : "Creer"}
                  </Button>
                </div>
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
                <select
                  value={selectedCurriculumId}
                  onChange={(event) =>
                    setSelectedCurriculumId(event.target.value)
                  }
                  className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selectionner</option>
                  {orderedCurriculums.map((curriculum) => (
                    <option key={curriculum.id} value={curriculum.id}>
                      {curriculum.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCurriculumId ? (
                <>
                  <form
                    className="grid gap-3 md:grid-cols-5"
                    onSubmit={onUpsertCurriculumSubject}
                  >
                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Matiere</span>
                      <select
                        value={selectedSubjectId}
                        onChange={(event) =>
                          setSelectedSubjectId(event.target.value)
                        }
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selectionner</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Coefficient</span>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={subjectCoefficient}
                        onChange={(event) =>
                          setSubjectCoefficient(event.target.value)
                        }
                        placeholder="Ex: 4"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-text-secondary">Heures/sem.</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={subjectWeeklyHours}
                        onChange={(event) =>
                          setSubjectWeeklyHours(event.target.value)
                        }
                        placeholder="Ex: 3"
                        className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="flex items-end gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={subjectIsMandatory}
                        onChange={(event) =>
                          setSubjectIsMandatory(event.target.checked)
                        }
                      />
                      <span className="text-text-secondary">Obligatoire</span>
                    </label>

                    <div className="self-end">
                      <Button
                        type="submit"
                        disabled={submittingCurriculumSubject}
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
