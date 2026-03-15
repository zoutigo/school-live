import { STUDENT_NOTES_DEMO_DATA } from "../../../../../components/student-notes/student-notes-demo-data";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
} from "../../../../../components/student-notes/student-notes.types";

export type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

export type StudentLifeEventRow = {
  id: string;
  type: "ABSENCE" | "RETARD" | "SANCTION" | "PUNITION";
  occurredAt: string;
  durationMinutes: number | null;
  justified: boolean | null;
  reason: string;
  comment: string | null;
};

export type ChildDisciplineSummary = {
  childId: string;
  childName: string;
  absences: number;
  unjustifiedAbsences: number;
  retards: number;
  incidents: number;
  statusLabel: string;
  statusTone: "calm" | "watch" | "alert";
  detail: string;
};

export type LatestEvaluation = {
  id: string;
  subjectLabel: string;
  score: number;
  maxScore: number;
  recordedAtLabel: string;
};

export type ChildNotesSummary = {
  childId: string;
  childName: string;
  averageLabel: string;
  termLabel: string;
  trendLabel: string;
  latestEvaluations: LatestEvaluation[];
};

export type ParentAccountItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "watch" | "alert";
};

export type ParentAccountSummary = {
  headline: string;
  detail: string;
  items: ParentAccountItem[];
};

export type ParentDashboardSummaryResponse = {
  unreadMessages: number;
  payments: {
    connected: boolean;
    pendingCount: number | null;
    overdueCount: number | null;
    detail: string;
  };
  documents: {
    recentCount: number;
    totalPublishedCount: number;
    detail: string;
    latest: Array<{
      id: string;
      title: string;
      publishedAt: string | null;
    }>;
  };
};

export function getCurrentTerm(date = new Date()): StudentNotesTerm {
  const month = date.getMonth() + 1;
  if (month >= 9 && month <= 12) {
    return "TERM_1";
  }
  if (month >= 1 && month <= 3) {
    return "TERM_2";
  }
  return "TERM_3";
}

function formatStudentName(child: ParentChild) {
  return `${child.firstName} ${child.lastName}`.trim();
}

function parseRecordedAt(value: string) {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(value);
  if (!slashMatch) {
    return null;
  }

  const day = Number(slashMatch[1]);
  const month = Number(slashMatch[2]) - 1;
  const year = slashMatch[3]
    ? Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
    : new Date().getFullYear();
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value: string) {
  const normalized = parseRecordedAt(value);
  if (!normalized) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(normalized);
}

function formatAverage(value: number | null) {
  if (value === null) {
    return "En attente";
  }
  return `${value.toFixed(1).replace(".", ",")}/20`;
}

export function buildDisciplineSummary(
  child: ParentChild,
  lifeEvents: StudentLifeEventRow[],
): ChildDisciplineSummary {
  const absences = lifeEvents.filter((entry) => entry.type === "ABSENCE");
  const retards = lifeEvents.filter((entry) => entry.type === "RETARD");
  const incidents = lifeEvents.filter(
    (entry) => entry.type === "SANCTION" || entry.type === "PUNITION",
  );
  const unjustifiedAbsences = absences.filter(
    (entry) => entry.justified === false,
  ).length;

  let statusLabel = "Situation sereine";
  let statusTone: ChildDisciplineSummary["statusTone"] = "calm";
  let detail = "Aucun signal disciplinaire notable sur la periode.";

  if (unjustifiedAbsences > 0 || incidents.length >= 2) {
    statusLabel = "Priorite parent";
    statusTone = "alert";
    detail =
      unjustifiedAbsences > 0
        ? `${unjustifiedAbsences} absence${unjustifiedAbsences > 1 ? "s" : ""} a justifier.`
        : `${incidents.length} incidents recenses sur la periode.`;
  } else if (
    absences.length > 0 ||
    retards.length > 1 ||
    incidents.length > 0
  ) {
    statusLabel = "A surveiller";
    statusTone = "watch";
    detail =
      absences.length > 0
        ? `${absences.length} absence${absences.length > 1 ? "s" : ""} enregistree${absences.length > 1 ? "s" : ""}.`
        : `${retards.length} retard${retards.length > 1 ? "s" : ""} ce trimestre.`;
  }

  return {
    childId: child.id,
    childName: formatStudentName(child),
    absences: absences.length,
    unjustifiedAbsences,
    retards: retards.length,
    incidents: incidents.length,
    statusLabel,
    statusTone,
    detail,
  };
}

export function buildNotesSummary(
  child: ParentChild,
  snapshots: StudentNotesTermSnapshot[],
): ChildNotesSummary {
  const currentTerm = getCurrentTerm();
  const snapshot =
    snapshots.find((entry) => entry.term === currentTerm) ??
    snapshots[0] ??
    null;

  if (!snapshot) {
    return {
      childId: child.id,
      childName: formatStudentName(child),
      averageLabel: "En attente",
      termLabel: "Trimestre en cours",
      trendLabel: "Aucune evaluation publiee",
      latestEvaluations: [],
    };
  }

  const latestEvaluations = snapshot.subjects
    .flatMap((subject) =>
      subject.evaluations.map((evaluation) => ({
        subjectLabel: subject.subjectLabel,
        evaluation,
      })),
    )
    .sort((left, right) => {
      const leftDate =
        parseRecordedAt(left.evaluation.recordedAt)?.getTime() ?? 0;
      const rightDate =
        parseRecordedAt(right.evaluation.recordedAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    })
    .slice(0, 3)
    .map(({ subjectLabel, evaluation }) => {
      const score = evaluation.score;
      if (typeof score !== "number" || !Number.isFinite(score)) {
        return null;
      }
      return {
        id: evaluation.id,
        subjectLabel,
        score,
        maxScore: evaluation.maxScore,
        recordedAtLabel: formatDateLabel(evaluation.recordedAt),
      };
    })
    .filter(
      (evaluation): evaluation is LatestEvaluation => evaluation !== null,
    );

  const average = snapshot.generalAverage.student;
  let trendLabel = "Progression a confirmer";
  if (average !== null && average >= 14) {
    trendLabel = "Dynamique tres encourageante";
  } else if (average !== null && average >= 10) {
    trendLabel = "Bases solides ce trimestre";
  } else if (average !== null) {
    trendLabel = "Points de vigilance a suivre";
  }

  return {
    childId: child.id,
    childName: formatStudentName(child),
    averageLabel: formatAverage(average),
    termLabel: snapshot.label || "Trimestre en cours",
    trendLabel,
    latestEvaluations,
  };
}

export function buildAccountSummary(
  payload: ParentDashboardSummaryResponse,
): ParentAccountSummary {
  const unreadMessages = payload.unreadMessages;
  const pendingPayments = payload.payments.pendingCount ?? 0;
  const latePayments = payload.payments.overdueCount ?? 0;
  const recentDocuments = payload.documents.recentCount;
  const pendingActions = [
    payload.payments.connected && pendingPayments > 0,
    unreadMessages > 0,
    recentDocuments > 0,
  ].filter(Boolean).length;

  const latestDocumentLabel =
    payload.documents.latest[0]?.title ??
    (payload.documents.totalPublishedCount > 0
      ? `${payload.documents.totalPublishedCount} document(s) publie(s)`
      : "Aucun document publie");

  return {
    headline:
      pendingActions === 0
        ? "Compte parent a jour"
        : `${pendingActions} point${pendingActions > 1 ? "s" : ""} a traiter`,
    detail:
      payload.payments.connected && latePayments > 0
        ? "Un reglement reste en retard et merite une verification."
        : "Retrouvez ici les elements administratifs et les echanges a suivre.",
    items: [
      {
        id: "payments",
        label: "Paiements",
        value: payload.payments.connected ? String(pendingPayments) : "--",
        detail: payload.payments.connected
          ? pendingPayments > 0
            ? `${latePayments} en retard, ${pendingPayments - latePayments} en attente`
            : "Aucun paiement en attente"
          : payload.payments.detail,
        tone:
          payload.payments.connected && latePayments > 0
            ? "alert"
            : payload.payments.connected && pendingPayments > 0
              ? "watch"
              : "neutral",
      },
      {
        id: "messages",
        label: "Messages non lus",
        value: String(unreadMessages),
        detail:
          unreadMessages > 0
            ? "Des echanges attendent votre lecture."
            : "Boite de reception a jour",
        tone: unreadMessages > 0 ? "watch" : "neutral",
      },
      {
        id: "documents",
        label: "Documents recents",
        value: String(recentDocuments),
        detail:
          recentDocuments > 0 ? latestDocumentLabel : payload.documents.detail,
        tone: recentDocuments > 0 ? "neutral" : "watch",
      },
    ],
  };
}

export const STUDENT_NOTES_FALLBACK = STUDENT_NOTES_DEMO_DATA;
