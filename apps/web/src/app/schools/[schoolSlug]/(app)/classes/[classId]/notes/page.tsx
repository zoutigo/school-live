"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { ModuleHelpTab } from "../../../../../../../components/ui/module-help-tab";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
  formatShortDateTime,
} from "../_shared";

type TabKey = "list" | "view" | "help";

type GradeRow = {
  id: string;
  value: number;
  maxValue: number;
  assessmentWeight: number;
  term: string;
  subjectId: string;
  classId: string;
  studentId: string;
  subject?: { id: string; name: string };
  student?: { id: string; firstName: string; lastName: string };
  createdAt?: string;
};

export default function TeacherClassNotesPage() {
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  async function bootstrap() {
    setLoading(true);
    setError(null);

    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      if (me.role !== "TEACHER") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const [contextResponse, gradesResponse] = await Promise.all([
        fetch(`${API_URL}/schools/${schoolSlug}/grades/context`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/schools/${schoolSlug}/grades`, {
          credentials: "include",
        }),
      ]);

      if (!contextResponse.ok || !gradesResponse.ok) {
        setError("Impossible de charger les notes de la classe.");
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      const gradesPayload = (await gradesResponse.json()) as GradeRow[];
      setContext(contextPayload);
      setGrades(gradesPayload.filter((entry) => entry.classId === classId));
    } catch {
      setError("Erreur reseau.");
    } finally {
      setLoading(false);
    }
  }

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

  useEffect(() => {
    if (!classContext || classContext.students.length === 0) {
      setSelectedStudentId("");
      return;
    }

    const exists = classContext.students.some(
      (entry) => entry.id === selectedStudentId,
    );
    if (!exists) {
      setSelectedStudentId(classContext.students[0].id);
    }
  }, [classContext, selectedStudentId]);

  const selectedStudentGrades = useMemo(() => {
    if (!selectedStudentId) {
      return [];
    }

    return grades
      .filter((entry) => entry.studentId === selectedStudentId)
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [grades, selectedStudentId]);

  return (
    <div className="grid gap-4">
      <Card
        title={`Notes - ${classContext?.className ?? "Classe"}`}
        subtitle="Suivi des notes pour la classe"
      >
        <div className="mb-4 flex items-end gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "list"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setTab("view")}
            className={`rounded-t-card px-4 py-2 text-sm font-heading font-semibold ${
              tab === "view"
                ? "border border-border border-b-surface bg-surface text-primary"
                : "text-text-secondary"
            }`}
          >
            Voir
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
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Chargement...</p>
        ) : error ? (
          <p className="text-sm text-notification">{error}</p>
        ) : !classContext ? (
          <p className="text-sm text-notification">
            Classe non accessible avec vos affectations.
          </p>
        ) : tab === "help" ? (
          <ModuleHelpTab
            moduleName="Notes de classe"
            moduleSummary="cet espace enseignant affiche les notes deja saisies pour cette classe et facilite le suivi eleve par eleve."
            actions={[
              {
                name: "Lister",
                purpose: "voir rapidement le volume de notes de la classe.",
                howTo:
                  "utiliser l'onglet Liste pour verifier les dernieres saisies.",
                moduleImpact: "vous identifiez les eleves non encore evalues.",
                crossModuleImpact:
                  "complete le module general Cahier de notes pour la saisie.",
              },
              {
                name: "Voir",
                purpose: "suivre les notes d'un eleve cible.",
                howTo:
                  "selectionner un eleve pour afficher ses evaluations de la classe.",
                moduleImpact: "aide a preparer remediations et retours eleve.",
                crossModuleImpact:
                  "alimente les echanges parent/enseignant et le suivi du cursus.",
              },
            ]}
          />
        ) : tab === "list" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-card border border-border bg-background px-3 py-2">
                <p className="text-xs text-text-secondary">Classe</p>
                <p className="text-sm font-semibold text-text-primary">
                  {classContext.className}
                </p>
              </div>
              <div className="rounded-card border border-border bg-background px-3 py-2">
                <p className="text-xs text-text-secondary">Eleves</p>
                <p className="text-sm font-semibold text-text-primary">
                  {classContext.students.length}
                </p>
              </div>
              <div className="rounded-card border border-border bg-background px-3 py-2">
                <p className="text-xs text-text-secondary">Matieres</p>
                <p className="text-sm font-semibold text-text-primary">
                  {classContext.subjects.length}
                </p>
              </div>
              <div className="rounded-card border border-border bg-background px-3 py-2">
                <p className="text-xs text-text-secondary">Notes</p>
                <p className="text-sm font-semibold text-text-primary">
                  {grades.length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Eleve</th>
                    <th className="px-3 py-2 font-medium">Matiere</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                    <th className="px-3 py-2 font-medium">Coef eval.</th>
                    <th className="px-3 py-2 font-medium">Periode</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-text-secondary" colSpan={6}>
                        Aucune note trouvee pour cette classe.
                      </td>
                    </tr>
                  ) : (
                    grades
                      .slice()
                      .sort((a, b) => {
                        const at = a.createdAt
                          ? new Date(a.createdAt).getTime()
                          : 0;
                        const bt = b.createdAt
                          ? new Date(b.createdAt).getTime()
                          : 0;
                        return bt - at;
                      })
                      .map((entry) => (
                        <tr key={entry.id} className="border-b border-border">
                          <td className="px-3 py-2">
                            {formatShortDateTime(entry.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            {entry.student?.lastName ?? "-"}{" "}
                            {entry.student?.firstName ?? ""}
                          </td>
                          <td className="px-3 py-2">
                            {entry.subject?.name ?? "-"}
                          </td>
                          <td className="px-3 py-2">
                            {entry.value}/{entry.maxValue}
                          </td>
                          <td className="px-3 py-2">
                            {entry.assessmentWeight}
                          </td>
                          <td className="px-3 py-2">{entry.term}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm md:max-w-[420px]">
              <span className="text-text-secondary">Eleve</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="rounded-card border border-border bg-surface px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-primary"
              >
                {classContext.students.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.lastName} {entry.firstName}
                  </option>
                ))}
              </select>
            </label>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Matiere</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                    <th className="px-3 py-2 font-medium">Coef eval.</th>
                    <th className="px-3 py-2 font-medium">Periode</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentGrades.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-text-secondary" colSpan={5}>
                        Aucune note pour cet eleve dans cette classe.
                      </td>
                    </tr>
                  ) : (
                    selectedStudentGrades.map((entry) => (
                      <tr key={entry.id} className="border-b border-border">
                        <td className="px-3 py-2">
                          {formatShortDateTime(entry.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          {entry.subject?.name ?? "-"}
                        </td>
                        <td className="px-3 py-2">
                          {entry.value}/{entry.maxValue}
                        </td>
                        <td className="px-3 py-2">{entry.assessmentWeight}</td>
                        <td className="px-3 py-2">{entry.term}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
