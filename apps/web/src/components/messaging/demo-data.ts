import type { MessagingMessage } from "./types";

export const DEMO_MESSAGES: MessagingMessage[] = [
  {
    id: "m-001",
    folder: "inbox",
    sender: "Mme L. COUDEYRE",
    subject: "Nouvelle activite extra-scolaire",
    preview: "Inscription ouverte pour l'atelier sciences du mercredi.",
    createdAt: "lun. 09 fev. 2026 a 11:26",
    unread: true,
    body: [
      "Bonjour,",
      "Nous ouvrons les inscriptions pour l'atelier sciences.",
      "Merci de confirmer votre interet avant vendredi 17h.",
      "Cordialement,",
      "Mme Coudeyre",
    ],
    attachments: [],
  },
  {
    id: "m-002",
    folder: "inbox",
    sender: "C. PIGEON",
    subject: "Fiche de presentation divinite grecque",
    preview: "Document a completer avant le prochain cours d'histoire.",
    createdAt: "sam. 07 fev. 2026 a 11:32",
    unread: false,
    body: [
      "Bonjour,",
      "Voici la fiche de presentation a preparer pour la semaine prochaine.",
      "Votre enfant peut l'imprimer ou la remplir a la main.",
      "Bonne journee,",
      "Mme Pigeon",
    ],
    attachments: [
      {
        id: "att-001",
        fileName: "fiche_divinite_grecque.pdf",
        sizeLabel: "318 Ko",
        mimeType: "application/pdf",
      },
    ],
  },
  {
    id: "m-003",
    folder: "inbox",
    sender: "Vie scolaire",
    subject: "Sortie Vienne jeudi 26 fevrier",
    preview: "Autorisation parentale a signer avant lundi.",
    createdAt: "ven. 06 fev. 2026 a 07:05",
    unread: false,
    body: [
      "Bonjour,",
      "La sortie pedagogique est maintenue jeudi 26 fevrier.",
      "Merci de renvoyer l'autorisation signee avant lundi 18h.",
    ],
    attachments: [
      {
        id: "att-002",
        fileName: "autorisation_sortie.pdf",
        sizeLabel: "220 Ko",
        mimeType: "application/pdf",
      },
    ],
  },
  {
    id: "m-004",
    folder: "sent",
    sender: "Moi",
    subject: "Absence medicale - justificatif",
    preview: "Bonjour, vous trouverez le justificatif en piece jointe.",
    createdAt: "jeu. 05 fev. 2026 a 08:41",
    unread: false,
    body: [
      "Bonjour,",
      "Je vous partage le justificatif d'absence de Lisa pour lundi dernier.",
      "Merci.",
    ],
    attachments: [
      {
        id: "att-003",
        fileName: "justificatif_absence.pdf",
        sizeLabel: "144 Ko",
        mimeType: "application/pdf",
      },
    ],
  },
  {
    id: "m-004b",
    folder: "drafts",
    sender: "Moi",
    subject: "Question sur la sortie de classe",
    preview: "Brouillon en cours de redaction...",
    createdAt: "jeu. 05 fev. 2026 a 18:12",
    unread: false,
    body: [
      "Bonjour,",
      "Je voulais savoir si le repas est pris en charge pour la sortie.",
      "Merci d'avance pour votre retour.",
    ],
    attachments: [],
  },
  {
    id: "m-005",
    folder: "archive",
    sender: "Administration",
    subject: "Rappel reglement interieur",
    preview: "Mise a jour du reglement et des horaires.",
    createdAt: "mer. 28 jan. 2026 a 09:10",
    unread: false,
    body: [
      "Bonjour,",
      "Veuillez trouver ci-joint la version mise a jour du reglement interieur.",
      "Merci de le consulter.",
    ],
    attachments: [
      {
        id: "att-004",
        fileName: "reglement_interieur_2026.pdf",
        sizeLabel: "410 Ko",
        mimeType: "application/pdf",
      },
    ],
  },
];

export function getDemoMessageById(messageId: string) {
  return DEMO_MESSAGES.find((message) => message.id === messageId) ?? null;
}
