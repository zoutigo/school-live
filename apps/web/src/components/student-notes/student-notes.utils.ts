import type { TranslateFn } from "../../i18n/useTranslation";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
  StudentSubjectNotes,
  YearlyNotesSnapshot,
  YearlySubjectNotes,
} from "./student-notes.types";

function averageOf(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return Number(
    (valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2),
  );
}

/**
 * Synthèse annuelle calculée côté client à partir des bulletins de trimestre
 * déjà chargés (jamais persistée ni éditable — voir `YearlyNotesSnapshot`).
 * Moyenne annuelle générale et par matière = moyenne des trimestres
 * disponibles (les trimestres sans donnée sont ignorés, jamais comptés à 0),
 * pour rester cohérent avec le "yearlyAverage" déjà affiché dans l'onglet
 * Decision côté mobile (`promotions.service.ts#listTermReportsForDecision`).
 */
export function computeYearlySnapshot(
  snapshots: StudentNotesTermSnapshot[],
  t: TranslateFn,
): YearlyNotesSnapshot | null {
  if (snapshots.length === 0) return null;

  const generalAverage = {
    student: averageOf(snapshots.map((s) => s.generalAverage.student)),
    class: averageOf(snapshots.map((s) => s.generalAverage.class)),
    min: averageOf(snapshots.map((s) => s.generalAverage.min)),
    max: averageOf(snapshots.map((s) => s.generalAverage.max)),
  };

  const subjectIds = Array.from(
    new Set(snapshots.flatMap((s) => s.subjects.map((subject) => subject.id))),
  );

  const subjects: YearlySubjectNotes[] = subjectIds.map((subjectId) => {
    const termAverages: Partial<Record<StudentNotesTerm, number | null>> = {};
    let reference: StudentSubjectNotes | null = null;
    for (const snapshot of snapshots) {
      const found = snapshot.subjects.find(
        (subject) => subject.id === subjectId,
      );
      termAverages[snapshot.term] = found?.studentAverage ?? null;
      if (found) reference = found;
    }
    return {
      id: subjectId,
      subjectLabel: reference?.subjectLabel ?? "",
      teachers: reference?.teachers ?? [],
      coefficient: reference?.coefficient ?? 1,
      studentAverage: averageOf(Object.values(termAverages)),
      classAverage: null,
      classMin: null,
      classMax: null,
      rank: null,
      classSize: null,
      appreciation: null,
      evaluations: [],
      termAverages,
    };
  });

  return {
    term: "YEARLY",
    label: t("notes.teacher.terms.yearly"),
    councilLabel: t("notes.teacher.reports.yearly.councilLabel"),
    generatedAtLabel: "",
    generalAverage,
    subjects,
  };
}
