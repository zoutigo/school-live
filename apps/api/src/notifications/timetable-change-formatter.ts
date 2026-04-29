import type {
  TimetableChangeEventPayload,
  TimetableChangeSnapshot,
} from "./timetable-change.types.js";

function formatTime(minute: number) {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (minute % 60).toString().padStart(2, "0");
  return `${hours}h${minutes}`;
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function describeSnapshot(snapshot: TimetableChangeSnapshot) {
  const roomLabel = snapshot.room ? `, salle ${snapshot.room}` : "";
  return `${snapshot.subjectName} le ${formatDate(snapshot.date)} de ${formatTime(
    snapshot.startMinute,
  )} à ${formatTime(snapshot.endMinute)} avec ${
    snapshot.teacherName
  }${roomLabel}`;
}

function titleForKind(kind: TimetableChangeEventPayload["kind"]) {
  switch (kind) {
    case "ONE_OFF_CREATED":
      return "Nouveau créneau ponctuel";
    case "ONE_OFF_UPDATED":
      return "Créneau ponctuel modifié";
    case "ONE_OFF_DELETED":
      return "Créneau ponctuel supprimé";
    case "OCCURRENCE_OVERRIDDEN":
      return "Séance modifiée";
    case "OCCURRENCE_CANCELLED":
      return "Séance annulée";
    case "OCCURRENCE_OVERRIDE_UPDATED":
      return "Modification de séance mise à jour";
    case "OCCURRENCE_OVERRIDE_DELETED":
      return "Séance rétablie";
  }
}

export function buildTimetableChangeContent(
  event: TimetableChangeEventPayload,
) {
  const title = titleForKind(event.kind);
  const details: string[] = [];

  switch (event.kind) {
    case "ONE_OFF_CREATED":
      if (event.after) {
        details.push(
          `Un créneau ponctuel a été ajouté: ${describeSnapshot(event.after)}.`,
        );
      }
      break;
    case "ONE_OFF_UPDATED":
    case "OCCURRENCE_OVERRIDE_UPDATED":
      if (event.before) {
        details.push(`Avant: ${describeSnapshot(event.before)}.`);
      }
      if (event.after) {
        details.push(`Après: ${describeSnapshot(event.after)}.`);
      }
      break;
    case "ONE_OFF_DELETED":
      if (event.before) {
        details.push(
          `Le créneau ponctuel suivant a été supprimé: ${describeSnapshot(event.before)}.`,
        );
      }
      break;
    case "OCCURRENCE_CANCELLED":
      if (event.before) {
        details.push(
          `La séance suivante a été annulée: ${describeSnapshot(event.before)}.`,
        );
      }
      break;
    case "OCCURRENCE_OVERRIDDEN":
      if (event.before) {
        details.push(`Séance initiale: ${describeSnapshot(event.before)}.`);
      }
      if (event.after) {
        details.push(`Nouvelle séance: ${describeSnapshot(event.after)}.`);
      }
      break;
    case "OCCURRENCE_OVERRIDE_DELETED":
      if (event.before) {
        details.push(
          `La modification suivante a été supprimée: ${describeSnapshot(event.before)}.`,
        );
      }
      if (event.after) {
        details.push(
          `L'horaire habituel est rétabli: ${describeSnapshot(event.after)}.`,
        );
      }
      break;
  }

  if (event.reason?.trim()) {
    details.push(`Motif: ${event.reason.trim()}.`);
  }

  details.push(`Mise à jour effectuée par ${event.actorFullName}.`);

  const summary = details[0] ?? title;
  const bodyHtml = `<p>${summary}</p>${
    details.length > 1
      ? `<ul>${details
          .slice(1)
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul>`
      : ""
  }`;

  return {
    title,
    summary,
    details,
    bodyHtml,
  };
}
