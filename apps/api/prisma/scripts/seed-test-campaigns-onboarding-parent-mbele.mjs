import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

for (const candidate of [
  path.resolve(__dirname, "../../../docker/.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
]) {
  dotenv.config({ path: candidate, override: false });
}

const prisma = new PrismaClient();

const SCHOOL_SLUG = "lycee-du-poisson-d-avril";
const CREATOR_EMAIL = "zoutigo@gmail.com";
const TESTER_EMAIL = "mariemichellefoe@gmail.com";
const CHILD_LABEL = "Nicolas MBELE";

const TITLE_PREFIX = "Onboarding parent";

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const school = await prisma.school.findUniqueOrThrow({
    where: { slug: SCHOOL_SLUG },
  });

  const creator = await prisma.user.findUniqueOrThrow({
    where: { email: CREATOR_EMAIL },
  });

  const tester = await prisma.user.findUniqueOrThrow({
    where: { email: TESTER_EMAIL },
  });

  if (!tester.isTester) {
    await prisma.user.update({
      where: { id: tester.id },
      data: { isTester: true },
    });
    console.log(`✅ ${tester.email} marqué isTester=true`);
  } else {
    console.log(`ℹ️  ${tester.email} était déjà isTester=true`);
  }

  const campaignShared = {
    schoolId: school.id,
    createdById: creator.id,
    updatedById: creator.id,
  };

  const caseShared = {
    createdById: creator.id,
    updatedById: creator.id,
    audienceRoles: { create: [{ role: "PARENT" }] },
  };

  const today = new Date();

  const campaignsDef = [
    {
      title: `${TITLE_PREFIX} — Fil d'actualité (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du fil d'actualité côté parent : publication d'une actualité avec image insérée et pièce jointe, publication d'un sondage, vote, et consultation du fil.",
      offsetDays: 0,
      durationDays: 4,
      note: "Publier une actualité avec image + pièce jointe, publier et voter à un sondage, consulter le fil.",
      cases: [
        {
          priority: "HIGH",
          title: "Publier une actualité avec image insérée dans l'éditeur",
          module: "Fil d'actualité",
          objective:
            "Vérifier la publication d'une actualité par le parent avec une image insérée directement dans le corps du texte.",
          preconditions:
            "Être connecté avec le compte parent, sur l'école Lycée du Poisson d'Avril.",
          steps: [
            "Depuis l'accueil, appuyer sur l'accès rapide « Fil d'actualité »",
            "Appuyer sur le bouton de création (icône +)",
            "Rédiger un texte d'actualité (au moins un paragraphe)",
            "Utiliser la barre d'outils de l'éditeur pour insérer une image dans le texte",
            "Choisir le public visé (ex. Parents uniquement)",
            "Publier l'actualité",
          ],
          expectedResult:
            "L'actualité est publiée et visible dans le fil, avec l'image correctement affichée à l'intérieur du texte.",
          evidenceRequired: true,
        },
        {
          priority: "HIGH",
          title: "Publier une actualité avec une pièce jointe",
          module: "Fil d'actualité",
          objective:
            "Vérifier l'ajout d'une pièce jointe (fichier distinct du texte) lors de la publication d'une actualité.",
          preconditions: "Être connecté avec le compte parent.",
          steps: [
            "Depuis le fil d'actualité, appuyer sur le bouton de création",
            "Rédiger un court texte d'actualité",
            "Appuyer sur « Ajouter une pièce jointe »",
            "Sélectionner un fichier (PDF ou image) depuis l'appareil",
            "Vérifier que la pièce jointe apparaît dans la liste avant publication",
            "Publier l'actualité",
          ],
          expectedResult:
            "L'actualité est publiée avec la pièce jointe visible et téléchargeable depuis le fil.",
          evidenceRequired: true,
        },
        {
          priority: "CRITICAL",
          title: "Publier un sondage",
          module: "Fil d'actualité",
          objective:
            "Vérifier la création d'un sondage (question + au moins deux options) depuis le fil d'actualité.",
          preconditions: "Être connecté avec le compte parent.",
          steps: [
            "Depuis le fil d'actualité, appuyer sur le bouton de création",
            "Basculer le composeur en mode « Sondage »",
            "Saisir la question du sondage",
            "Saisir au moins deux options de réponse",
            "Publier le sondage",
          ],
          expectedResult:
            "Le sondage est publié et apparaît dans le fil avec sa question et ses options de vote.",
          evidenceRequired: true,
        },
        {
          priority: "MEDIUM",
          title: "Voter à un sondage et consulter les résultats",
          module: "Fil d'actualité",
          objective:
            "Vérifier qu'un vote sur un sondage est bien pris en compte et que les résultats s'affichent.",
          preconditions: "Un sondage est publié et visible dans le fil (cas précédent).",
          steps: [
            "Ouvrir le sondage publié précédemment",
            "Sélectionner une option et voter",
            "Vérifier que le résultat (pourcentage ou décompte) s'affiche après le vote",
          ],
          expectedResult:
            "Le vote est enregistré, l'option choisie est mise en évidence et les résultats du sondage sont visibles.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Consulter le fil et ouvrir le détail d'une actualité",
          module: "Fil d'actualité",
          objective:
            "Vérifier la consultation générale du fil d'actualité et l'ouverture du détail d'un post existant.",
          preconditions: "Le fil contient au moins une actualité.",
          steps: [
            "Faire défiler le fil d'actualité",
            "Ouvrir une actualité (autre que celles créées durant cette campagne)",
            "Vérifier l'affichage complet du contenu (texte, image, pièce jointe si présents)",
            "Revenir au fil",
          ],
          expectedResult:
            "Le fil se charge correctement, le détail d'une actualité s'ouvre et affiche son contenu complet.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Messagerie (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification de la messagerie côté parent : envoi d'un message avec image insérée, envoi avec pièce jointe, lecture et réponse dans une conversation.",
      offsetDays: 2,
      durationDays: 4,
      note: "Envoyer un message avec image inline + un message avec pièce jointe, vérifier badge non-lu et réponse.",
      cases: [
        {
          priority: "HIGH",
          title: "Envoyer un message avec une image insérée",
          module: "Messagerie",
          objective:
            "Vérifier l'envoi d'un message avec une image insérée directement dans le corps du texte.",
          preconditions: "Être connecté avec le compte parent, au moins un destinataire disponible.",
          steps: [
            "Depuis l'accueil, appuyer sur l'accès rapide « Messagerie »",
            "Démarrer une nouvelle conversation ou en ouvrir une existante",
            "Rédiger un texte de message",
            "Utiliser la barre d'outils de l'éditeur pour insérer une image dans le texte",
            "Envoyer le message",
          ],
          expectedResult:
            "Le message est envoyé et affiche correctement le texte avec l'image insérée dans la conversation.",
          evidenceRequired: true,
        },
        {
          priority: "HIGH",
          title: "Envoyer un message avec une pièce jointe",
          module: "Messagerie",
          objective:
            "Vérifier l'ajout d'une pièce jointe distincte du texte lors de l'envoi d'un message.",
          preconditions: "Une conversation est ouverte.",
          steps: [
            "Dans une conversation, appuyer sur « Ajouter une pièce jointe »",
            "Sélectionner un fichier depuis l'appareil",
            "Vérifier que la pièce jointe apparaît avant envoi",
            "Envoyer le message",
          ],
          expectedResult:
            "Le message est envoyé avec la pièce jointe visible et téléchargeable dans la conversation.",
          evidenceRequired: true,
        },
        {
          priority: "MEDIUM",
          title: "Lire un message reçu et vérifier le badge de non-lus",
          module: "Messagerie",
          objective:
            "Vérifier que le compteur de messages non lus se met à jour correctement après lecture.",
          preconditions: "Au moins un message non lu existe dans une conversation.",
          steps: [
            "Depuis l'accueil, observer le badge de non-lus sur l'accès rapide « Messagerie »",
            "Ouvrir la messagerie et repérer la conversation avec un message non lu",
            "Ouvrir cette conversation et lire le message",
            "Revenir à l'accueil et vérifier que le badge a diminué ou disparu",
          ],
          expectedResult:
            "Le badge de non-lus reflète correctement le nombre de messages non lus avant et après lecture.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Répondre dans une conversation existante",
          module: "Messagerie",
          objective:
            "Vérifier qu'une réponse dans une conversation existante s'affiche correctement et met à jour la liste des conversations.",
          preconditions: "Une conversation avec au moins un message existe déjà.",
          steps: [
            "Ouvrir une conversation existante",
            "Rédiger une réponse",
            "Envoyer la réponse",
            "Revenir à la liste des conversations",
            "Vérifier que la conversation remonte en tête de liste avec le dernier message affiché",
          ],
          expectedResult:
            "La réponse est envoyée, visible dans la conversation, et la liste des conversations reflète le dernier message.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Notes & bulletin (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du module Notes côté parent pour l'enfant Nicolas MBELE : consultation des notes, détail d'une évaluation et consultation du bulletin de période.",
      offsetDays: 4,
      durationDays: 4,
      note: "Consulter les notes de l'enfant, le détail d'une évaluation, puis le bulletin de la période en cours.",
      cases: [
        {
          priority: "HIGH",
          title: "Consulter la liste des notes de l'enfant",
          module: "Notes",
          objective:
            "Vérifier que les notes de Nicolas MBELE se chargent et s'affichent correctement pour le parent.",
          preconditions:
            "Être connecté avec le compte parent, l'enfant Nicolas MBELE doit avoir au moins une note saisie.",
          steps: [
            "Depuis l'accueil, ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Notes »",
            "Vérifier que la liste des notes par matière se charge",
          ],
          expectedResult:
            "La liste des notes de Nicolas MBELE s'affiche, organisée par matière, sans erreur de chargement.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Ouvrir le détail d'une évaluation",
          module: "Notes",
          objective:
            "Vérifier l'ouverture du détail d'une évaluation notée (matière, coefficient, appréciation si présente).",
          preconditions: "Au moins une évaluation notée existe pour l'enfant.",
          steps: [
            "Depuis la liste des notes, sélectionner une évaluation",
            "Ouvrir son détail",
            "Vérifier les informations affichées (matière, note, coefficient, appréciation)",
          ],
          expectedResult:
            "Le détail de l'évaluation s'affiche avec des informations cohérentes et lisibles.",
          evidenceRequired: false,
        },
        {
          priority: "CRITICAL",
          title: "Consulter le bulletin de la période en cours",
          module: "Notes",
          objective:
            "Vérifier la consultation du bulletin de période pour l'enfant, avec les moyennes par matière et générale.",
          preconditions: "La période en cours a des notes suffisantes pour générer un bulletin.",
          steps: [
            "Depuis le module Notes de l'enfant, ouvrir l'onglet Bulletin",
            "Sélectionner la période concernée si plusieurs sont disponibles",
            "Vérifier l'affichage des moyennes par matière et de la moyenne générale",
          ],
          expectedResult:
            "Le bulletin de période s'affiche correctement avec les moyennes par matière et la moyenne générale de l'enfant.",
          evidenceRequired: true,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Devoirs (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du module Devoirs côté parent pour l'enfant Nicolas MBELE.",
      offsetDays: 6,
      durationDays: 3,
      note: "Consulter la liste des devoirs à venir, le détail d'un devoir, et son statut.",
      cases: [
        {
          priority: "HIGH",
          title: "Consulter la liste des devoirs à venir",
          module: "Devoirs",
          objective:
            "Vérifier que les devoirs à venir de l'enfant se chargent correctement.",
          preconditions: "L'enfant Nicolas MBELE a au moins un devoir programmé.",
          steps: [
            "Ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Homework » / « Devoirs »",
            "Vérifier que la liste des devoirs à venir se charge",
          ],
          expectedResult:
            "La liste des devoirs à venir de l'enfant s'affiche, triée par date, sans erreur.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Ouvrir le détail d'un devoir",
          module: "Devoirs",
          objective: "Vérifier l'ouverture du détail d'un devoir (matière, consigne, date d'échéance).",
          preconditions: "Au moins un devoir existe dans la liste.",
          steps: [
            "Depuis la liste des devoirs, sélectionner un devoir",
            "Ouvrir son détail",
            "Vérifier les informations affichées (matière, consigne, date d'échéance)",
          ],
          expectedResult:
            "Le détail du devoir s'affiche avec des informations complètes et cohérentes.",
          evidenceRequired: false,
        },
        {
          priority: "LOW",
          title: "Vérifier le statut d'un devoir (fait / à faire)",
          module: "Devoirs",
          objective: "Vérifier que le statut d'un devoir est visible et compréhensible pour le parent.",
          preconditions: "Un devoir avec un statut connu existe.",
          steps: [
            "Depuis la liste ou le détail d'un devoir, repérer l'indicateur de statut",
            "Vérifier que le statut affiché correspond à l'état réel du devoir",
          ],
          expectedResult:
            "Le statut du devoir (fait / à faire / en retard) est visible et cohérent avec la réalité.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Emploi du temps (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification de l'emploi du temps côté parent pour l'enfant Nicolas MBELE.",
      offsetDays: 8,
      durationDays: 3,
      note: "Consulter l'emploi du temps de la semaine et naviguer entre les semaines.",
      cases: [
        {
          priority: "HIGH",
          title: "Consulter l'emploi du temps de la semaine courante",
          module: "Emploi du temps",
          objective: "Vérifier le chargement de l'emploi du temps de l'enfant pour la semaine courante.",
          preconditions: "La classe de l'enfant a un emploi du temps configuré.",
          steps: [
            "Ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Emploi du temps »",
            "Vérifier que les cours de la semaine courante s'affichent avec horaires, matières et salles",
          ],
          expectedResult:
            "L'emploi du temps de la semaine courante s'affiche correctement, avec les créneaux, matières et salles.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Naviguer entre les semaines",
          module: "Emploi du temps",
          objective: "Vérifier la navigation vers la semaine précédente et suivante.",
          preconditions: "L'emploi du temps de la semaine courante est affiché.",
          steps: [
            "Depuis l'emploi du temps, naviguer vers la semaine suivante",
            "Vérifier que les cours affichés changent en conséquence",
            "Naviguer vers la semaine précédente",
            "Vérifier le retour à la semaine courante",
          ],
          expectedResult:
            "La navigation entre semaines fonctionne sans erreur et affiche les cours correspondant à chaque semaine.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Vie scolaire (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du module Vie scolaire (discipline) côté parent pour l'enfant Nicolas MBELE.",
      offsetDays: 10,
      durationDays: 3,
      note: "Consulter les événements de vie scolaire, leur détail, et filtrer par type.",
      cases: [
        {
          priority: "HIGH",
          title: "Consulter la liste des événements de vie scolaire",
          module: "Vie scolaire",
          objective:
            "Vérifier le chargement des événements de vie scolaire (absences, retards, sanctions) de l'enfant.",
          preconditions: "L'enfant a au moins un événement de vie scolaire enregistré.",
          steps: [
            "Ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Vie scolaire »",
            "Vérifier que la liste des événements se charge",
          ],
          expectedResult:
            "La liste des événements de vie scolaire de l'enfant s'affiche sans erreur.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Ouvrir le détail d'un événement",
          module: "Vie scolaire",
          objective: "Vérifier l'ouverture du détail d'un événement de vie scolaire.",
          preconditions: "Au moins un événement existe dans la liste.",
          steps: [
            "Depuis la liste, sélectionner un événement",
            "Ouvrir son détail",
            "Vérifier les informations affichées (type, date, motif/commentaire)",
          ],
          expectedResult: "Le détail de l'événement s'affiche avec des informations cohérentes.",
          evidenceRequired: false,
        },
        {
          priority: "LOW",
          title: "Filtrer les événements par type",
          module: "Vie scolaire",
          objective: "Vérifier le filtrage de la liste des événements par type (absence, retard, sanction).",
          preconditions: "Plusieurs types d'événements existent pour l'enfant, sinon utiliser un seul type disponible.",
          steps: [
            "Depuis la liste des événements, ouvrir le panneau de filtres",
            "Sélectionner un type d'événement",
            "Appliquer le filtre",
            "Vérifier que seuls les événements du type choisi restent affichés",
            "Réinitialiser le filtre",
          ],
          expectedResult:
            "Le filtre par type réduit correctement la liste et la réinitialisation restaure la liste complète.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Vie de classe (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du module Vie de classe côté parent pour l'enfant Nicolas MBELE.",
      offsetDays: 12,
      durationDays: 3,
      note: "Consulter les actualités de la classe de l'enfant et leur détail.",
      cases: [
        {
          priority: "MEDIUM",
          title: "Consulter la liste des actualités de la classe",
          module: "Vie de classe",
          objective: "Vérifier le chargement des actualités propres à la classe de l'enfant.",
          preconditions: "La classe de l'enfant a au moins une actualité publiée.",
          steps: [
            "Ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Vie de classe »",
            "Vérifier que la liste des actualités de la classe se charge",
          ],
          expectedResult: "La liste des actualités de la classe de l'enfant s'affiche sans erreur.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Ouvrir le détail d'une actualité de classe",
          module: "Vie de classe",
          objective: "Vérifier l'ouverture du détail d'une actualité de classe.",
          preconditions: "Au moins une actualité de classe existe.",
          steps: [
            "Depuis la liste des actualités de classe, sélectionner une actualité",
            "Ouvrir son détail",
            "Vérifier l'affichage complet du contenu",
          ],
          expectedResult: "Le détail de l'actualité de classe s'affiche correctement.",
          evidenceRequired: false,
        },
      ],
    },
    {
      title: `${TITLE_PREFIX} — Ressources (${CHILD_LABEL})`,
      description:
        "Parcours de découverte et de vérification du module Ressources côté parent pour l'enfant Nicolas MBELE.",
      offsetDays: 14,
      durationDays: 4,
      note: "Consulter les ressources disponibles, effectuer une recherche/filtre, puis ouvrir/télécharger une ressource.",
      cases: [
        {
          priority: "HIGH",
          title: "Consulter la liste des ressources disponibles",
          module: "Ressources",
          objective: "Vérifier le chargement de la liste des ressources accessibles au parent pour l'enfant.",
          preconditions: "Au moins une ressource validée existe pour le niveau/la filière de l'enfant.",
          steps: [
            "Ouvrir la fiche de l'enfant Nicolas MBELE",
            "Depuis le sous-menu enfant, appuyer sur « Ressources »",
            "Vérifier que la liste des ressources se charge",
          ],
          expectedResult: "La liste des ressources s'affiche correctement, sans erreur de chargement.",
          evidenceRequired: false,
        },
        {
          priority: "MEDIUM",
          title: "Rechercher et filtrer dans les ressources",
          module: "Ressources",
          objective: "Vérifier la recherche par mot-clé et le filtrage des ressources.",
          preconditions: "La liste des ressources contient plusieurs éléments.",
          steps: [
            "Depuis la liste des ressources, utiliser le champ de recherche avec un mot-clé",
            "Vérifier que les résultats correspondent",
            "Ouvrir le panneau de filtres et filtrer par matière ou niveau",
            "Vérifier que la liste filtrée reste cohérente",
            "Réinitialiser les filtres",
          ],
          expectedResult:
            "La recherche et les filtres renvoient des résultats cohérents, et la réinitialisation restaure la liste complète.",
          evidenceRequired: false,
        },
        {
          priority: "HIGH",
          title: "Ouvrir et télécharger une ressource",
          module: "Ressources",
          objective:
            "Vérifier l'ouverture d'une fiche ressource ainsi que le téléchargement de sa pièce jointe.",
          preconditions: "Une ressource avec pièce jointe est disponible.",
          steps: [
            "Ouvrir une fiche ressource depuis la liste",
            "Vérifier l'affichage du contenu (énoncé et/ou corrigé selon les droits parent)",
            "Télécharger la pièce jointe si disponible",
            "Vérifier que le fichier téléchargé s'ouvre correctement",
          ],
          expectedResult:
            "La fiche ressource s'affiche correctement et sa pièce jointe se télécharge et s'ouvre sans erreur.",
          evidenceRequired: true,
        },
      ],
    },
  ];

  for (const def of campaignsDef) {
    const existing = await prisma.testCampaign.findFirst({
      where: { title: def.title },
      select: { id: true },
    });

    if (existing) {
      console.log(
        `Campagne déjà présente (id=${existing.id}) : ${def.title} — seed ignoré pour éviter les doublons.`,
      );
      continue;
    }

    const startsAt = addDays(today, def.offsetDays);
    const dueAt = addDays(startsAt, def.durationDays);

    const campaign = await prisma.testCampaign.create({
      data: {
        ...campaignShared,
        title: def.title,
        description: def.description,
        status: "ACTIVE",
        startsAt,
        dueAt,
        testCases: {
          create: def.cases.map((c, index) => ({
            ...caseShared,
            orderIndex: index,
            priority: c.priority,
            title: c.title,
            module: c.module,
            objective: c.objective,
            preconditions: c.preconditions,
            steps: c.steps,
            expectedResult: c.expectedResult,
            evidenceRequired: c.evidenceRequired,
            dueAt,
          })),
        },
      },
    });

    console.log(`✅ Campagne créée : ${campaign.title} (id=${campaign.id})`);

    await prisma.testCampaignAssignment.create({
      data: {
        campaignId: campaign.id,
        userId: tester.id,
        assignedById: creator.id,
        note: def.note,
      },
    });

    console.log(`✅ Campagne assignée à ${tester.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
