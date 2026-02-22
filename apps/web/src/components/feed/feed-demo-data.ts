import type { FeedPost } from "./types";

export function buildDemoFeed(schoolSlug: string): FeedPost[] {
  return [
    {
      id: "feed-1",
      type: "POST",
      schoolSlug,
      author: {
        id: "u-staff-1",
        fullName: "Aline Roussel",
        civility: "Mme",
        roleLabel: "Vie scolaire",
        avatarText: "AR",
      },
      title: "Semaine culturelle - programme final",
      bodyHtml:
        "<p>Chers parents, le programme de la semaine culturelle est desormais confirme.</p><p><strong>Temps fort vendredi :</strong> restitution musicale et exposition de projets.</p>",
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      featuredUntil: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 5,
      ).toISOString(),
      audience: {
        scope: "SCHOOL_ALL",
        label: "Toute l'ecole",
      },
      attachments: [
        {
          id: "a-1",
          fileName: "Programme-semaine-culturelle.pdf",
          sizeLabel: "420 Ko",
        },
      ],
      likedByViewer: false,
      likesCount: 12,
      comments: [
        {
          id: "c-1",
          authorName: "Valery MBELE",
          text: "Merci pour le programme, tres utile.",
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        },
      ],
    },
    {
      id: "feed-2",
      type: "POLL",
      schoolSlug,
      author: {
        id: "u-teacher-1",
        fullName: "M. Njoya",
        civility: "M.",
        roleLabel: "Professeur principal",
        avatarText: "NJ",
      },
      title: "Sondage sortie pedagogique",
      bodyHtml:
        "<p>Nous finalisons la sortie pedagogique du mois prochain. Votre preference nous aide a choisir le format.</p>",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      featuredUntil: null,
      audience: {
        scope: "PARENTS_STUDENTS",
        label: "Parents et eleves",
      },
      attachments: [],
      likedByViewer: false,
      likesCount: 7,
      comments: [],
      poll: {
        question: "Quel format preferez-vous pour la sortie ?",
        votedOptionId: null,
        options: [
          { id: "p1", label: "Musee + atelier pratique", votes: 16 },
          { id: "p2", label: "Visite entreprise locale", votes: 9 },
          { id: "p3", label: "Journee sportive inter-classes", votes: 11 },
        ],
      },
    },
    {
      id: "feed-3",
      type: "POST",
      schoolSlug,
      author: {
        id: "u-staff-2",
        fullName: "Patrice Mbelek",
        civility: "M.",
        roleLabel: "Comptabilite",
        avatarText: "PM",
      },
      title: "Rappel echeance frais de cantine",
      bodyHtml:
        "<p>Merci de regulariser les frais de cantine avant le <strong>28 fevrier</strong>.</p><p>Le detail est disponible en piece jointe.</p>",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      featuredUntil: null,
      audience: {
        scope: "STAFF_ONLY",
        label: "Staff uniquement",
      },
      attachments: [
        {
          id: "a-2",
          fileName: "Etat-cantine-fevrier.xlsx",
          sizeLabel: "190 Ko",
        },
      ],
      likedByViewer: false,
      likesCount: 3,
      comments: [],
    },
    {
      id: "feed-4",
      type: "POST",
      schoolSlug,
      author: {
        id: "u-teacher-2",
        fullName: "Valery Mbele",
        civility: "M.",
        roleLabel: "Enseignant",
        avatarText: "VM",
      },
      title: "Preparation eval classe 6e A",
      bodyHtml: "<p>Rappel: revision du chapitre 3 pour la classe 6e A.</p>",
      createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
      featuredUntil: null,
      audience: {
        scope: "CLASS",
        classId: "class-6a",
        label: "Classe 6e A",
      },
      attachments: [],
      likedByViewer: false,
      likesCount: 1,
      comments: [],
    },
    {
      id: "feed-5",
      type: "POST",
      schoolSlug,
      author: {
        id: "u-parent-1",
        fullName: "Parent delegue",
        civility: "Mme",
        roleLabel: "Parents",
        avatarText: "PD",
      },
      title: "Organisation covoiturage de fin de semaine",
      bodyHtml:
        "<p>Les parents interesses par un covoiturage peuvent se signaler ici.</p>",
      createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      featuredUntil: null,
      audience: {
        scope: "PARENTS_ONLY",
        label: "Parents uniquement",
      },
      attachments: [],
      likedByViewer: false,
      likesCount: 2,
      comments: [],
    },
  ];
}
