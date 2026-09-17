import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/emploi-du-temps?childId={childId}";

const CHAPTER = {
  role: "PARENT",
  moduleKey: "emploi-du-temps",
  order: 5,
  icon: "CalendarDays",
  colorFrom: "#2FA7A6",
  colorTo: "#1D726F",
  titleFr: "Emploi du temps",
  titleEn: "Schedule",
  descriptionFr:
    "Découvrez comment consulter l'emploi du temps de votre enfant, changer de vue et naviguer dans le temps.",
  descriptionEn:
    "Discover how to check your child's schedule, switch views and navigate through time.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Où consultez-vous l'emploi du temps de votre enfant ?",
    textEn: "Where do you check your child's schedule?",
    hintFr:
      "C'est une entrée du sous-menu propre à chaque enfant, pas du menu principal.",
    hintEn: "It's an entry in each child's own submenu, not the main menu.",
    explanationFr:
      'Depuis la fiche de votre enfant, l\'entrée "Emploi du temps" ouvre son planning.',
    explanationEn:
      "From your child's page, the \"Schedule\" entry opens their timetable.",
    options: [
      {
        textFr: "Dans le sous-menu de l'enfant concerné",
        textEn: "In that child's submenu",
        isCorrect: true,
      },
      {
        textFr: "Dans le fil d'actualité général",
        textEn: "In the general news feed",
        isCorrect: false,
      },
      { textFr: "Dans la messagerie", textEn: "In messaging", isCorrect: false },
      {
        textFr: "Dans la situation financière",
        textEn: "In the financial overview",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Quels sont les trois modes d'affichage disponibles ?",
    textEn: "What are the three available display modes?",
    hintFr: "Ils vont du plus détaillé au plus large.",
    hintEn: "They range from most detailed to broadest.",
    explanationFr: "Jour, Semaine et Mois.",
    explanationEn: "Day, Week and Month.",
    options: [
      { textFr: "Jour, Semaine, Mois", textEn: "Day, Week, Month", isCorrect: true },
      {
        textFr: "Matin, Après-midi, Soir",
        textEn: "Morning, Afternoon, Evening",
        isCorrect: false,
      },
      {
        textFr: "Trimestre 1, 2, 3",
        textEn: "Term 1, 2, 3",
        isCorrect: false,
      },
      { textFr: "Classe, École, Ville", textEn: "Class, School, City", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Si vous avez plusieurs enfants scolarisés, chacun a son propre emploi du temps, distinct de celui de ses frères et sœurs.",
    textEn:
      "If you have several children enrolled, each one has their own schedule, separate from their siblings'.",
    hintFr: "L'emploi du temps est ouvert depuis la fiche d'un enfant précis.",
    hintEn: "The schedule is opened from one specific child's page.",
    explanationFr:
      "Vrai : vous consultez l'emploi du temps enfant par enfant, jamais une vue fusionnée.",
    explanationEn:
      "True: you check the schedule child by child, never a merged view.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Quelles informations affiche la carte d'un cours ? (plusieurs réponses)",
    textEn: "What information does a class card show? (select all that apply)",
    hintFr: "Pensez à tout ce qu'il faut savoir pour s'y rendre.",
    hintEn: "Think of everything needed to actually attend it.",
    explanationFr: "L'horaire, la matière, l'enseignant et la salle.",
    explanationEn: "The time slot, the subject, the teacher and the room.",
    options: [
      { textFr: "L'horaire du cours", textEn: "The class time", isCorrect: true },
      { textFr: "La matière", textEn: "The subject", isCorrect: true },
      {
        textFr: "L'enseignant et la salle",
        textEn: "The teacher and the room",
        isCorrect: true,
      },
      {
        textFr: "La moyenne de la classe",
        textEn: "The class average",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "En tant que parent, pouvez-vous créer ou modifier un créneau ?",
    textEn: "As a parent, can you create or edit a slot?",
    hintFr: "Ce module vous sert uniquement à vous informer.",
    hintEn: "This module is only there to keep you informed.",
    explanationFr:
      "Non, l'emploi du temps est en lecture seule côté parent : seuls les enseignants et l'administration le gèrent.",
    explanationEn:
      "No, the schedule is read-only for parents: only teachers and administration manage it.",
    options: [
      {
        textFr: "Non, c'est en lecture seule",
        textEn: "No, it's read-only",
        isCorrect: true,
      },
      {
        textFr: "Oui, comme un enseignant",
        textEn: "Yes, just like a teacher",
        isCorrect: false,
      },
      {
        textFr: "Oui, mais seulement pour annuler",
        textEn: "Yes, but only to cancel",
        isCorrect: false,
      },
      {
        textFr: "Oui, avec l'accord de l'enseignant",
        textEn: "Yes, with the teacher's approval",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Vous voulez voir en un coup d'œil toute la semaine de votre enfant. Quel mode choisissez-vous ?",
    textEn:
      "You want to see your child's whole week at a glance. Which mode do you pick?",
    hintFr: "Ce n'est ni le plus détaillé ni le plus large des trois modes.",
    hintEn: "It's neither the most detailed nor the broadest of the three modes.",
    explanationFr: "Le mode Semaine, entre le détail du Jour et la vue globale du Mois.",
    explanationEn: "Week mode, between the detail of Day and the overview of Month.",
    options: [
      { textFr: "Semaine", textEn: "Week", isCorrect: true },
      { textFr: "Jour", textEn: "Day", isCorrect: false },
      { textFr: "Mois", textEn: "Month", isCorrect: false },
      { textFr: "Année", textEn: "Year", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Comment revenez-vous directement à aujourd'hui après avoir navigué loin dans le temps ?",
    textEn: "How do you jump straight back to today after navigating far away?",
    hintFr: "Il n'est pas nécessaire d'utiliser les flèches plusieurs fois.",
    hintEn: "You don't need to tap the arrows repeatedly.",
    explanationFr: "En touchant le libellé de la période affichée, au centre de la barre de navigation.",
    explanationEn: "By tapping the displayed period's label, in the middle of the navigation bar.",
    options: [
      {
        textFr: "En touchant le libellé de la période",
        textEn: "By tapping the period's label",
        isCorrect: true,
      },
      {
        textFr: "En redémarrant l'application",
        textEn: "By restarting the app",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible",
        textEn: "It isn't possible",
        isCorrect: false,
      },
      {
        textFr: "En passant par la messagerie",
        textEn: "Through messaging",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Comment vous déplacez-vous d'une semaine à l'autre en vue Semaine ?",
    textEn: "How do you move from one week to the next in Week view?",
    hintFr: "Elles se trouvent de part et d'autre du libellé de la période.",
    hintEn: "They sit on either side of the period's label.",
    explanationFr: "Avec les flèches précédent/suivant de la barre de navigation.",
    explanationEn: "With the previous/next arrows on the navigation bar.",
    options: [
      {
        textFr: "Avec les flèches précédent/suivant",
        textEn: "With the previous/next arrows",
        isCorrect: true,
      },
      {
        textFr: "En balayant l'écran vers le bas",
        textEn: "By swiping down",
        isCorrect: false,
      },
      {
        textFr: "En secouant le téléphone",
        textEn: "By shaking the phone",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible en vue Semaine",
        textEn: "It isn't possible in Week view",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que se passe-t-il quand vous touchez un cours affiché ?",
    textEn: "What happens when you tap a displayed class?",
    hintFr: "Aucune action de modification ne vous est proposée.",
    hintEn: "You aren't offered any edit action.",
    explanationFr:
      "Vous voyez son détail (horaire, matière, enseignant, salle) sans pouvoir le modifier.",
    explanationEn:
      "You see its detail (time, subject, teacher, room) without being able to edit it.",
    options: [
      {
        textFr: "Le détail du cours s'affiche, en lecture seule",
        textEn: "The class detail is shown, read-only",
        isCorrect: true,
      },
      {
        textFr: "Un formulaire de modification s'ouvre",
        textEn: "An edit form opens",
        isCorrect: false,
      },
      {
        textFr: "Le cours est automatiquement annulé",
        textEn: "The class is automatically cancelled",
        isCorrect: false,
      },
      {
        textFr: "Rien ne se passe",
        textEn: "Nothing happens",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un cours annulé par l'enseignant continue d'apparaître dans l'emploi du temps de votre enfant, marqué comme annulé.",
    textEn:
      "A class cancelled by the teacher still appears on your child's schedule, marked as cancelled.",
    hintFr: "Comparez avec ce qui se passe pour un jour férié.",
    hintEn: "Compare with what happens on a public holiday.",
    explanationFr:
      "Faux : une séance annulée disparaît simplement de la vue, elle n'est pas affichée barrée.",
    explanationEn:
      "False: a cancelled class simply disappears from view, it isn't shown struck through.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 11,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Où retrouvez-vous le motif si une séance a été annulée par l'enseignant ?",
    textEn: "Where do you find the reason if a class was cancelled by the teacher?",
    hintFr: "Ce n'est pas dans l'emploi du temps lui-même.",
    hintEn: "It isn't in the schedule itself.",
    explanationFr:
      "Dans la notification reçue et dans la publication automatique sur le fil de la classe de votre enfant.",
    explanationEn:
      "In the notification you receive and in the automatic post on your child's class feed.",
    options: [
      {
        textFr: "Dans la notification et sur le fil de la classe",
        textEn: "In the notification and on the class feed",
        isCorrect: true,
      },
      {
        textFr: "Directement sur le créneau, qui reste affiché barré",
        textEn: "Directly on the slot, shown struck through",
        isCorrect: false,
      },
      {
        textFr: "Nulle part",
        textEn: "Nowhere",
        isCorrect: false,
      },
      {
        textFr: "Dans la situation financière",
        textEn: "In the financial overview",
        isCorrect: false,
      },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Votre enfant change de classe en cours d'année. Sur quoi s'appuie l'emploi du temps affiché ?",
    textEn:
      "Your child changes class during the year. What does the displayed schedule rely on?",
    hintFr: "Il reflète toujours la situation la plus récente.",
    hintEn: "It always reflects the most recent situation.",
    explanationFr:
      "Sur sa classe actuelle : l'emploi du temps suit l'inscription en cours, pas celle de début d'année.",
    explanationEn:
      "On their current class: the schedule follows the ongoing enrolment, not the start-of-year one.",
    options: [
      {
        textFr: "Sa classe actuelle",
        textEn: "Their current class",
        isCorrect: true,
      },
      {
        textFr: "Sa classe de septembre, figée pour l'année",
        textEn: "Their September class, frozen for the year",
        isCorrect: false,
      },
      {
        textFr: "La classe de son frère ou sa sœur",
        textEn: "Their sibling's class",
        isCorrect: false,
      },
      {
        textFr: "Une moyenne des deux classes",
        textEn: "An average of both classes",
        isCorrect: false,
      },
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
