import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/salles";

const CHAPTER = {
  role: "SCHOOL_ADMIN",
  moduleKey: "salles",
  order: 5,
  icon: "DoorOpen",
  colorFrom: "#0891B2",
  colorTo: "#155E75",
  titleFr: "Salles",
  titleEn: "Rooms",
  descriptionFr:
    "Apprenez à créer des salles, gérer leur statut et leur capacité, et consulter leur calendrier d'occupation.",
  descriptionEn:
    "Learn how to create rooms, manage their status and capacity, and check their occupancy calendar.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Quels statuts peut prendre une salle ? (plusieurs réponses)",
    textEn: "Which statuses can a room have? (select all that apply)",
    hintFr: "Il y en a exactement trois.",
    hintEn: "There are exactly three.",
    explanationFr: "Disponible, Maintenance, Indisponible.",
    explanationEn: "Available, Maintenance, Unavailable.",
    options: [
      { textFr: "Disponible", textEn: "Available", isCorrect: true },
      { textFr: "Maintenance", textEn: "Maintenance", isCorrect: true },
      { textFr: "Indisponible", textEn: "Unavailable", isCorrect: true },
      { textFr: "Réservée VIP", textEn: "VIP reserved", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quels champs renseignez-vous à la création d'une salle ? (plusieurs réponses)",
    textEn:
      "Which fields do you fill in when creating a room? (select all that apply)",
    hintFr:
      "L'un d'eux précise combien de cours peuvent s'y tenir en simultané.",
    hintEn: "One of them specifies how many classes can be held there at once.",
    explanationFr:
      "Nom, capacité, statut et description ; le nombre de créneaux simultanés aussi.",
    explanationEn:
      "Name, capacity, status and description; concurrent slot count too.",
    options: [
      { textFr: "Nom", textEn: "Name", isCorrect: true },
      { textFr: "Capacité", textEn: "Capacity", isCorrect: true },
      {
        textFr: "Nombre de créneaux simultanés",
        textEn: "Concurrent slot count",
        isCorrect: true,
      },
      {
        textFr: "Tarif horaire de location",
        textEn: "Hourly rental rate",
        isCorrect: false,
      },
    ],
  },
  {
    order: 3,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Une salle peut être configurée pour accueillir plusieurs cours en même temps.",
    textEn:
      "A room can be configured to host several classes at the same time.",
    hintFr: 'C\'est le rôle du champ "Cours simultanés autorisés".',
    hintEn: 'That\'s the role of the "Concurrent classes allowed" field.',
    explanationFr:
      'Vrai : le champ "Cours simultanés autorisés" accepte un nombre supérieur à 1 pour une salle polyvalente.',
    explanationEn:
      'True: the "Concurrent classes allowed" field accepts a number above 1 for a multipurpose room.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "À quoi sert l'onglet Calendrier d'une salle ?",
    textEn: "What is a room's Calendar tab for?",
    hintFr: "On y voit qui occupe la salle, et quand.",
    hintEn: "It shows who occupies the room, and when.",
    explanationFr:
      "Il affiche les créneaux occupés : classe, matière, enseignant, date et heure.",
    explanationEn:
      "It shows the occupied slots: class, subject, teacher, date and time.",
    options: [
      {
        textFr: "Visualiser les créneaux d'occupation de la salle",
        textEn: "Visualize the room's occupancy slots",
        isCorrect: true,
      },
      {
        textFr: "Facturer le loyer de la salle",
        textEn: "Bill the room's rent",
        isCorrect: false,
      },
      {
        textFr: "Gérer le ménage",
        textEn: "Manage cleaning",
        isCorrect: false,
      },
      {
        textFr: "Modifier la couleur de la salle",
        textEn: "Change the room's color",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Sur quoi peut porter un filtre de recherche de salle disponible ? (plusieurs réponses)",
    textEn:
      "What can a room-availability search filter on? (select all that apply)",
    hintFr:
      "Un intervalle de dates et d'heures est possible, ainsi qu'un statut.",
    hintEn: "A date/time range is possible, as well as a status.",
    explanationFr:
      "Une plage de disponibilité (date/heure de début et de fin), le statut, et le mode simultanéité.",
    explanationEn:
      "An availability range (start/end date and time), the status, and the simultaneity mode.",
    options: [
      {
        textFr: "Plage de disponibilité (dates/heures)",
        textEn: "Availability range (dates/times)",
        isCorrect: true,
      },
      { textFr: "Statut", textEn: "Status", isCorrect: true },
      {
        textFr: "Simultanéité (unique/multiple)",
        textEn: "Simultaneity (single/multiple)",
        isCorrect: true,
      },
      {
        textFr: "Note moyenne des élèves",
        textEn: "Students' average grade",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Une salle peut être supprimée sans confirmation préalable.",
    textEn: "A room can be deleted without prior confirmation.",
    hintFr: "Comme pour classes et matières, cette action est protégée.",
    hintEn: "Like classes and subjects, this action is protected.",
    explanationFr:
      "Faux : une confirmation explicite est demandée avant la suppression.",
    explanationEn:
      "False: an explicit confirmation is required before deleting.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: 'Que signifie le statut "Maintenance" pour une salle ?',
    textEn: '\nWhat does the "Maintenance" status mean for a room?',
    hintFr:
      "C'est un état temporaire distinct d'une indisponibilité définitive.",
    hintEn:
      "It's a temporary state, distinct from a definitive unavailability.",
    explanationFr:
      "La salle est temporairement hors service, par exemple pour des travaux.",
    explanationEn:
      "The room is temporarily out of service, e.g. for renovation.",
    options: [
      {
        textFr: "Elle est temporairement hors service",
        textEn: "It's temporarily out of service",
        isCorrect: true,
      },
      {
        textFr: "Elle est réservée aux enseignants",
        textEn: "It's reserved for teachers",
        isCorrect: false,
      },
      {
        textFr: "Elle vient d'être créée",
        textEn: "It was just created",
        isCorrect: false,
      },
      {
        textFr: "Elle est en cours de nettoyage automatique",
        textEn: "It's undergoing automatic cleaning",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Un champ de recherche par nom de salle existe dans la liste.",
    textEn: "A search-by-room-name field exists in the list.",
    hintFr: "Il complète les filtres de disponibilité et de statut.",
    hintEn: "It complements the availability and status filters.",
    explanationFr:
      "Vrai : un champ de recherche dédié permet de filtrer par nom.",
    explanationEn: "True: a dedicated search field lets you filter by name.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Créez une salle sans indiquer de capacité : ce champ est-il obligatoire ?",
    textEn: "Create a room without a capacity: is this field required?",
    hintFr: "Comparez avec le champ Nom, lui strictement requis.",
    hintEn: "Compare with the Name field, which is strictly required.",
    explanationFr:
      "Non, seul le nom est strictement obligatoire à la création.",
    explanationEn: "No, only the name is strictly required at creation.",
    options: [
      { textFr: "Non", textEn: "No", isCorrect: true },
      { textFr: "Oui", textEn: "Yes", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Filtrez sur une plage de disponibilité qui ne correspond à aucun créneau libre : que voyez-vous ?",
    textEn:
      "Filter on an availability range matching no free slot: what do you see?",
    hintFr: "Comme les autres listes, un message dédié existe pour ce cas.",
    hintEn: "Like other lists, a dedicated message exists for this case.",
    explanationFr:
      "Un message d'état vide, comme pour toute liste sans résultat.",
    explanationEn: "An empty-state message, like for any list with no result.",
    options: [
      {
        textFr: "Un message d'état vide",
        textEn: "An empty-state message",
        isCorrect: true,
      },
      {
        textFr: "La première salle disponible s'affiche quand même",
        textEn: "The first available room shows up anyway",
        isCorrect: false,
      },
      {
        textFr: "L'application se fige",
        textEn: "The app freezes",
        isCorrect: false,
      },
      {
        textFr: "Toutes les salles s'affichent sans tenir compte du filtre",
        textEn: "Every room shows up, ignoring the filter",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Ouvrez le calendrier d'une salle occupée à un horaire donné : quelles informations identifient ce créneau ?",
    textEn:
      "Open the calendar of a room occupied at a given time: what information identifies that slot?",
    hintFr: "Ce sont les mêmes éléments qu'un cours dans un emploi du temps.",
    hintEn: "These are the same elements as a class in a timetable.",
    explanationFr: "La classe, la matière, l'enseignant, la date et l'heure.",
    explanationEn:
      "The class, the subject, the teacher, the date and the time.",
    options: [
      {
        textFr: "Classe, matière, enseignant, date et heure",
        textEn: "Class, subject, teacher, date and time",
        isCorrect: true,
      },
      {
        textFr: "Uniquement le nom de la salle",
        textEn: "Only the room's name",
        isCorrect: false,
      },
      {
        textFr: "Le montant des frais de scolarité",
        textEn: "The tuition fee amount",
        isCorrect: false,
      },
      {
        textFr: "La liste des absences du jour",
        textEn: "The day's list of absences",
        isCorrect: false,
      },
    ],
  },
  {
    order: 12,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Passez une salle en statut "Indisponible" : elle continue d\'apparaître dans les résultats filtrés sur "Disponible".',
    textEn:
      '\nSet a room to "Unavailable": it still shows up when filtering on "Available".',
    hintFr: "Le statut choisi doit correspondre au filtre pour apparaître.",
    hintEn: "The chosen status must match the filter to show up.",
    explanationFr:
      'Faux : une salle indisponible n\'apparaît plus dans un filtre "Disponible".',
    explanationEn:
      'False: an unavailable room no longer shows up under an "Available" filter.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Pourquoi consulter le calendrier d'une salle avant de la choisir dans l'emploi du temps d'une classe ?",
    textEn:
      "Why check a room's calendar before picking it in a class's timetable?",
    hintFr:
      "Deux cours ne peuvent normalement pas se tenir au même moment dans la même salle à créneau unique.",
    hintEn:
      "Two classes normally can't be held at once in the same single-slot room.",
    explanationFr:
      "Pour éviter un conflit d'occupation : une salle à créneau unique déjà réservée sur ce créneau ne peut pas accueillir un second cours.",
    explanationEn:
      "To avoid an occupancy conflict: a single-slot room already booked for that time cannot host a second class.",
    options: [
      {
        textFr: "Pour éviter un conflit d'occupation sur le même créneau",
        textEn: "To avoid an occupancy conflict on the same slot",
        isCorrect: true,
      },
      {
        textFr: "Le calendrier n'a aucune utilité pratique",
        textEn: "The calendar has no practical use",
        isCorrect: false,
      },
      {
        textFr: "Pour choisir la couleur de la salle",
        textEn: "To choose the room's color",
        isCorrect: false,
      },
      {
        textFr: "Pour connaître le salaire de l'enseignant",
        textEn: "To know the teacher's salary",
        isCorrect: false,
      },
    ],
  },
  {
    order: 14,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      'Une salle dont "Cours simultanés autorisés" vaut 3 peut accueillir jusqu\'à trois cours différents en même temps sans être considérée en conflit.',
    textEn:
      'A room whose "Concurrent classes allowed" is set to 3 can host up to three different classes at once without being considered in conflict.',
    hintFr:
      "C'est précisément la différence avec une salle mono-cours (valeur 1).",
    hintEn:
      "That's precisely the difference with a single-class room (value 1).",
    explanationFr:
      "Vrai : ce champ existe justement pour des espaces pouvant accueillir plusieurs activités simultanément (ex. grande salle polyvalente).",
    explanationEn:
      "True: this field exists precisely for spaces that can host several activities at once (e.g. a large multipurpose hall).",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
];

async function main() {
  const chapter = await prisma.quizChapter.upsert({
    where: {
      role_moduleKey: { role: CHAPTER.role, moduleKey: CHAPTER.moduleKey },
    },
    create: CHAPTER,
    update: CHAPTER,
  });

  for (const question of QUESTIONS) {
    const savedQuestion = await prisma.quizQuestion.upsert({
      where: {
        chapterId_order: { chapterId: chapter.id, order: question.order },
      },
      create: {
        chapterId: chapter.id,
        order: question.order,
        type: question.type,
        stage: question.stage,
        textFr: question.textFr,
        textEn: question.textEn,
        hintFr: question.hintFr,
        hintEn: question.hintEn,
        explanationFr: question.explanationFr,
        explanationEn: question.explanationEn,
        imageUrl: question.image,
        deepLinkRoute: question.deepLinkRoute,
      },
      update: {
        type: question.type,
        stage: question.stage,
        textFr: question.textFr,
        textEn: question.textEn,
        hintFr: question.hintFr,
        hintEn: question.hintEn,
        explanationFr: question.explanationFr,
        explanationEn: question.explanationEn,
        imageUrl: question.image,
        deepLinkRoute: question.deepLinkRoute,
        isActive: true,
      },
    });

    for (const [index, option] of question.options.entries()) {
      await prisma.quizAnswerOption.upsert({
        where: {
          questionId_order: { questionId: savedQuestion.id, order: index + 1 },
        },
        create: {
          questionId: savedQuestion.id,
          order: index + 1,
          textFr: option.textFr,
          textEn: option.textEn,
          isCorrect: option.isCorrect,
        },
        update: {
          textFr: option.textFr,
          textEn: option.textEn,
          isCorrect: option.isCorrect,
        },
      });
    }
  }

  console.log(
    `Training quiz seeded: chapter "${chapter.titleFr}" (${QUESTIONS.length} questions) for role ${CHAPTER.role}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
