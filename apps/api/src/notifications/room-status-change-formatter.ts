import type {
  RoomStatus,
  RoomStatusChangeEventPayload,
} from "./room-status-change.types.js";

function statusLabel(status: RoomStatus) {
  switch (status) {
    case "AVAILABLE":
      return "disponible";
    case "UNAVAILABLE":
      return "indisponible";
    case "MAINTENANCE":
      return "en maintenance";
  }
}

export function buildRoomStatusChangeContent(
  event: RoomStatusChangeEventPayload,
) {
  const title = "Changement de statut de salle";
  const summary = `La salle ${event.roomName} est maintenant ${statusLabel(
    event.newStatus,
  )} (était ${statusLabel(event.previousStatus)}).`;
  const details = [
    summary,
    `Mise à jour effectuée par ${event.actorFullName}.`,
  ];
  const bodyHtml = `<p>${summary}</p><p>Mise à jour effectuée par ${event.actorFullName}.</p>`;

  return {
    title,
    summary,
    details,
    bodyHtml,
  };
}
