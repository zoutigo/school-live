import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/classes/{classId}/agenda";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "emploi-du-temps",
  order: 6,
  icon: "CalendarDays",
  colorFrom: "#2F8F6E",
  colorTo: "#1E6349",
  titleFr: "Emploi du temps",
  titleEn: "Schedule",
  descriptionFr:
    "Apprenez à créer vos créneaux récurrents et ponctuels, à en supprimer, et à annuler une séance avec un motif.",
  descriptionEn:
    "Learn how to create your recurring and one-off slots, remove them, and cancel a class with a reason.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Où gérez-vous l'emploi du temps de votre classe ?",
    textEn: "Where do you manage your class's schedule?",
    hintFr: "C'est le même écran que celui accessible depuis votre menu classe.",
    hintEn: "It's the same screen reachable from your class menu.",
    explanationFr:
      "Depuis le menu de votre classe, l'entrée \"Emploi du temps\" ouvre la page de gestion annuelle.",
    explanationEn:
      "From your class menu, the \"Schedule\" entry opens the yearly management page.",
    options: [
      { textFr: "Emploi du temps de la classe", textEn: "Class schedule", isCorrect: true },
      { textFr: "Fil de classe", textEn: "Class feed", isCorrect: false },
      { textFr: "Messagerie", textEn: "Messaging", isCorrect: false },
      { textFr: "Discipline", textEn: "Discipline", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Quels sont les trois onglets de la page Emploi du temps ?",
    textEn: "What are the three tabs of the Schedule page?",
    hintFr: "Un onglet concerne les jours fériés et vacances scolaires.",
    hintEn: "One tab is about holidays and school breaks.",
    explanationFr: "Créneaux, Vacances et Couleurs.",
    explanationEn: "Slots, Vacations and Colors.",
    options: [
      { textFr: "Créneaux, Vacances, Couleurs", textEn: "Slots, Vacations, Colors", isCorrect: true },
      { textFr: "Créneaux, Absences, Salles", textEn: "Slots, Absences, Rooms", isCorrect: false },
      { textFr: "Semaine, Mois, Année", textEn: "Week, Month, Year", isCorrect: false },
      { textFr: "Créneaux, Enseignants, Notes", textEn: "Slots, Teachers, Grades", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un enseignant non référent de la classe peut créer un créneau pour son propre cours, même s'il n'est pas référent.",
    textEn:
      "A teacher who isn't the class referent can still create a slot for their own course, even without referent status.",
    hintFr: "La règle distingue \"gérer sa classe\" de \"gérer son propre créneau\".",
    hintEn: "The rule separates \"managing the class\" from \"managing one's own slot\".",
    explanationFr:
      "Vrai : un enseignant assigné à un créneau (même sans être référent) peut le créer, modifier ou supprimer.",
    explanationEn:
      "True: a teacher assigned to a slot (even without being the referent) can create, edit or delete it.",
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
    textFr: "Qui peut modifier l'onglet Vacances de la classe ?",
    textEn: "Who can edit the class's Vacations tab?",
    hintFr: "C'est plus restreint que la gestion des créneaux.",
    hintEn: "It's more restricted than slot management.",
    explanationFr:
      "Seuls le responsable pédagogique (référent) et les administrateurs peuvent modifier les vacances.",
    explanationEn:
      "Only the pedagogical lead (referent) and admins can edit vacations.",
    options: [
      {
        textFr: "Le référent de la classe et les administrateurs",
        textEn: "The class referent and admins",
        isCorrect: true,
      },
      { textFr: "N'importe quel enseignant de la classe", textEn: "Any teacher of the class", isCorrect: false },
      { textFr: "Uniquement les élèves délégués", textEn: "Only class representatives", isCorrect: false },
      { textFr: "Personne, c'est automatique", textEn: "Nobody, it's automatic", isCorrect: false },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Comment ouvrez-vous le formulaire de création d'un créneau récurrent ?",
    textEn: "How do you open the recurring slot creation form?",
    hintFr: "Un bouton en forme de plus est visible en haut de l'onglet Créneaux.",
    hintEn: "A plus-shaped button is visible at the top of the Slots tab.",
    explanationFr: "En cliquant sur le bouton \"Ajouter\" (icône +) de l'onglet Créneaux.",
    explanationEn: "By clicking the \"Add\" (+) button in the Slots tab.",
    options: [
      { textFr: "Le bouton \"Ajouter\" (+)", textEn: "The \"Add\" (+) button", isCorrect: true },
      { textFr: "Le menu Paramètres", textEn: "The Settings menu", isCorrect: false },
      { textFr: "L'onglet Vacances", textEn: "The Vacations tab", isCorrect: false },
      { textFr: "La messagerie", textEn: "Messaging", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_MULTI",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations renseignez-vous pour créer un créneau récurrent ? (plusieurs réponses)",
    textEn:
      "Which fields do you fill in to create a recurring slot? (select all that apply)",
    hintFr: "Pensez à tout ce qui définit un cours dans la semaine.",
    hintEn: "Think of everything that defines a class in the week.",
    explanationFr:
      "Jour de la semaine, horaires de début et de fin, matière, enseignant et salle (optionnelle).",
    explanationEn:
      "Weekday, start and end time, subject, teacher and room (optional).",
    options: [
      { textFr: "Le jour de la semaine", textEn: "The weekday", isCorrect: true },
      { textFr: "L'heure de début et de fin", textEn: "Start and end time", isCorrect: true },
      { textFr: "La matière et l'enseignant", textEn: "The subject and teacher", isCorrect: true },
      { textFr: "Le montant des frais de scolarité", textEn: "The tuition fee amount", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous voulez ajouter une séance exceptionnelle un jour non habituel, sans toucher au reste de l'année. Que créez-vous ?",
    textEn:
      "You want to add an exceptional class on an unusual day, without changing the rest of the year. What do you create?",
    hintFr: "Ce n'est pas un créneau qui se répète chaque semaine.",
    hintEn: "It's not a slot that repeats every week.",
    explanationFr:
      "Un créneau ponctuel : il ne concerne qu'une seule date, contrairement au créneau récurrent.",
    explanationEn:
      "A one-off slot: it only concerns a single date, unlike a recurring slot.",
    options: [
      { textFr: "Un créneau ponctuel", textEn: "A one-off slot", isCorrect: true },
      { textFr: "Un créneau récurrent", textEn: "A recurring slot", isCorrect: false },
      { textFr: "Une période de vacances", textEn: "A vacation period", isCorrect: false },
      { textFr: "Une couleur de matière", textEn: "A subject color", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Comment ouvrez-vous les actions possibles (modifier, supprimer...) sur une séance déjà planifiée ?",
    textEn:
      "How do you open the possible actions (edit, delete...) on an already scheduled class?",
    hintFr: "L'indication apparaît juste au-dessus du calendrier.",
    hintEn: "The hint appears just above the calendar.",
    explanationFr:
      "En cliquant directement sur le créneau dans la vue jour, semaine ou mois.",
    explanationEn: "By clicking directly on the slot in the day, week or month view.",
    options: [
      { textFr: "En cliquant sur le créneau affiché", textEn: "By clicking the displayed slot", isCorrect: true },
      { textFr: "En passant par la messagerie", textEn: "Through messaging", isCorrect: false },
      { textFr: "En appelant le support", textEn: "By calling support", isCorrect: false },
      { textFr: "Ce n'est pas possible", textEn: "It isn't possible", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Sur un créneau récurrent, quelle action modifie uniquement cette date précise, sans toucher aux autres semaines ?",
    textEn:
      "On a recurring slot, which action changes only that specific date, without affecting other weeks?",
    hintFr: "Une des quatre actions du menu \"Gérer l'occurrence\" cible une seule date.",
    hintEn: "One of the four \"Manage occurrence\" menu actions targets a single date.",
    explanationFr: "\"Modifier cette occurrence\" (ou \"Supprimer cette occurrence\") ne touche que la date sélectionnée.",
    explanationEn: "\"Edit this occurrence\" (or \"Delete this occurrence\") only affects the selected date.",
    options: [
      { textFr: "Modifier cette occurrence", textEn: "Edit this occurrence", isCorrect: true },
      { textFr: "Modifier toute la série", textEn: "Edit the whole series", isCorrect: false },
      { textFr: "Supprimer toute la série", textEn: "Delete the whole series", isCorrect: false },
      { textFr: "Changer de couleur de matière", textEn: "Change the subject color", isCorrect: false },
    ],
  },
  {
    order: 10,
    type: "TRUE_FALSE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "\"Supprimer toute la série\" supprime le créneau récurrent et toutes ses occurrences futures.",
    textEn:
      "\"Delete the whole series\" removes the recurring slot and all of its future occurrences.",
    hintFr: "Un message d'avertissement le précise avant confirmation.",
    hintEn: "A warning message states it before confirmation.",
    explanationFr: "Vrai, c'est une action irréversible sur toute la série à venir.",
    explanationEn: "True, this is an irreversible action on the whole upcoming series.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous devez vous absenter et annuler une séance ponctuelle. Que devez-vous obligatoirement renseigner pour valider l'annulation ?",
    textEn:
      "You must be absent and cancel a single class. What must you fill in to validate the cancellation?",
    hintFr: "Un champ texte est requis, sinon le bouton reste désactivé.",
    hintEn: "A text field is required, otherwise the button stays disabled.",
    explanationFr:
      "Le motif de l'annulation : le bouton de validation reste désactivé tant qu'il est vide.",
    explanationEn:
      "The cancellation reason: the confirm button stays disabled while it's empty.",
    options: [
      { textFr: "Le motif de l'annulation", textEn: "The cancellation reason", isCorrect: true },
      { textFr: "Un nouveau créneau de remplacement", textEn: "A new replacement slot", isCorrect: false },
      { textFr: "L'accord d'un parent", textEn: "A parent's approval", isCorrect: false },
      { textFr: "Rien, la suppression est immédiate", textEn: "Nothing, deletion is immediate", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Une fois une séance annulée avec un motif, où ce motif apparaît-il pour les familles de la classe ?",
    textEn:
      "Once a class is cancelled with a reason, where does that reason appear for the class's families?",
    hintFr: "Une notification et une publication automatique sont générées.",
    hintEn: "A notification and an automatic post are generated.",
    explanationFr:
      "Le motif apparaît dans la notification envoyée et dans la publication automatique sur le fil de la classe.",
    explanationEn:
      "The reason appears in the sent notification and in the automatic post on the class feed.",
    options: [
      {
        textFr: "Dans la notification et sur le fil de la classe",
        textEn: "In the notification and on the class feed",
        isCorrect: true,
      },
      { textFr: "Nulle part, c'est confidentiel", textEn: "Nowhere, it's confidential", isCorrect: false },
      { textFr: "Uniquement dans un email au directeur", textEn: "Only in an email to the principal", isCorrect: false },
      { textFr: "Dans le cahier de notes", textEn: "In the grade book", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous cliquez sur un créneau récurrent enseigné par un collègue, dans votre classe. Que pouvez-vous faire ?",
    textEn:
      "You click on a recurring slot taught by a colleague, in your class. What can you do?",
    hintFr: "La permission dépend de qui est assigné au créneau, pas seulement de la classe.",
    hintEn: "The permission depends on who is assigned to the slot, not just the class.",
    explanationFr:
      "Rien, sauf si vous êtes le référent de la classe : seul l'enseignant assigné ou le référent peut gérer ce créneau.",
    explanationEn:
      "Nothing, unless you are the class referent: only the assigned teacher or the referent can manage that slot.",
    options: [
      {
        textFr: "Rien, sauf si vous êtes référent de la classe",
        textEn: "Nothing, unless you are the class referent",
        isCorrect: true,
      },
      { textFr: "Tout, comme sur vos propres créneaux", textEn: "Everything, like on your own slots", isCorrect: false },
      { textFr: "Seulement changer la couleur", textEn: "Only change the color", isCorrect: false },
      { textFr: "Seulement le supprimer", textEn: "Only delete it", isCorrect: false },
    ],
  },
  {
    order: 14,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Le motif d'annulation est également obligatoire lorsque vous supprimez toute une série de créneaux récurrents.",
    textEn:
      "The cancellation reason is also required when you delete an entire series of recurring slots.",
    hintFr: "Le champ motif n'apparaît que pour une annulation d'occurrence unique.",
    hintEn: "The reason field only appears for a single-occurrence cancellation.",
    explanationFr:
      "Faux : le motif ne s'applique qu'à l'annulation d'une occurrence unique, pas à la suppression de toute la série.",
    explanationEn:
      "False: the reason only applies to a single-occurrence cancellation, not to deleting the whole series.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
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
