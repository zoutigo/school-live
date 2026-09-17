import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const DEEP_LINK = "/children/{childId}/sante";

const CHAPTER = {
  role: "PARENT",
  moduleKey: "sante",
  order: 7,
  icon: "HeartPulse",
  colorFrom: "#E0507A",
  colorTo: "#B02F56",
  titleFr: "Santé",
  titleEn: "Health",
  descriptionFr:
    "Découvrez comment consulter et compléter le dossier santé de votre enfant, et signaler un événement survenu hors école.",
  descriptionEn:
    "Discover how to check and complete your child's health record, and report an event that happened outside school.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Où accédez-vous au dossier santé de votre enfant ?",
    textEn: "Where do you access your child's health record?",
    hintFr: "C'est une entrée du sous-menu propre à cet enfant.",
    hintEn: "It's an entry in that specific child's submenu.",
    explanationFr: 'Depuis la fiche de votre enfant, l\'entrée "Santé".',
    explanationEn: 'From your child\'s page, the "Health" entry.',
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
        textFr: "Dans l'emploi du temps",
        textEn: "In the schedule",
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
    textFr: "Quels sont les deux onglets de l'écran Santé ?",
    textEn: "What are the two tabs of the Health screen?",
    hintFr: "L'un regroupe ce qui est durable, l'autre ce qui est daté.",
    hintEn: "One groups what's long-standing, the other what's dated.",
    explanationFr: "Conditions et Historique.",
    explanationEn: "Conditions and History.",
    options: [
      {
        textFr: "Conditions et Historique",
        textEn: "Conditions and History",
        isCorrect: true,
      },
      {
        textFr: "Vaccins et Allergies",
        textEn: "Vaccines and Allergies",
        isCorrect: false,
      },
      {
        textFr: "Urgences et Suivis",
        textEn: "Emergencies and Follow-ups",
        isCorrect: false,
      },
      {
        textFr: "Notes et Bulletins",
        textEn: "Grades and Report cards",
        isCorrect: false,
      },
    ],
  },
  {
    order: 3,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Que regroupe l'onglet \"Conditions\" ? (plusieurs réponses)",
    textEn: "What does the \"Conditions\" tab group? (select all that apply)",
    hintFr: "Ce sont des informations durables, pas des événements ponctuels.",
    hintEn: "These are long-standing pieces of information, not one-off events.",
    explanationFr:
      "Les allergies, pathologies, traitements et consignes durables (et \"Autre\").",
    explanationEn:
      "Allergies, pathologies, treatments and long-standing instructions (and \"Other\").",
    options: [
      { textFr: "Les allergies", textEn: "Allergies", isCorrect: true },
      {
        textFr: "Les pathologies et traitements",
        textEn: "Pathologies and treatments",
        isCorrect: true,
      },
      {
        textFr: "Les consignes durables",
        textEn: "Long-standing instructions",
        isCorrect: true,
      },
      {
        textFr: "Les résultats scolaires",
        textEn: "Academic results",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Que regroupe l'onglet \"Historique\" ?",
    textEn: "What does the \"History\" tab group?",
    hintFr: "Contrairement à Conditions, tout y est daté.",
    hintEn: "Unlike Conditions, everything here has a date.",
    explanationFr:
      "Les soins reçus à l'école et les événements que vous signalez, triés par date.",
    explanationEn:
      "Care received at school and events you report, sorted by date.",
    options: [
      {
        textFr: "Les soins reçus à l'école et vos signalements, par date",
        textEn: "Care received at school and your reports, by date",
        isCorrect: true,
      },
      {
        textFr: "Uniquement les vaccins",
        textEn: "Only vaccines",
        isCorrect: false,
      },
      {
        textFr: "Les allergies déclarées en début d'année",
        textEn: "Allergies declared at the start of the year",
        isCorrect: false,
      },
      {
        textFr: "Les absences pour maladie",
        textEn: "Absences for illness",
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
    textFr:
      "Combien de niveaux d'alerte peuvent qualifier une condition ou un événement ?",
    textEn:
      "How many alert levels can qualify a condition or an event?",
    hintFr: "Le plus grave porte un nom qui appelle à agir vite.",
    hintEn: "The most severe one has a name that calls for quick action.",
    explanationFr: "Trois : Info, Attention et Urgent.",
    explanationEn: "Three: Info, Attention and Urgent.",
    options: [
      { textFr: "Trois", textEn: "Three", isCorrect: true },
      { textFr: "Deux", textEn: "Two", isCorrect: false },
      { textFr: "Cinq", textEn: "Five", isCorrect: false },
      {
        textFr: "Il n'y a pas de niveau d'alerte",
        textEn: "There is no alert level",
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
    textFr: "Quel bouton utilisez-vous pour ajouter une information de santé ?",
    textEn: "Which button do you use to add health information?",
    hintFr: "C'est un bouton flottant, visible en bas de l'écran.",
    hintEn: "It's a floating button, visible at the bottom of the screen.",
    explanationFr: "Le bouton \"+\".",
    explanationEn: 'The "+" button.',
    options: [
      { textFr: "Le bouton \"+\"", textEn: 'The "+" button', isCorrect: true },
      {
        textFr: "Le menu Paramètres",
        textEn: "The Settings menu",
        isCorrect: false,
      },
      { textFr: "La messagerie", textEn: "Messaging", isCorrect: false },
      {
        textFr: "Un lien reçu par email",
        textEn: "A link received by email",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Sur quel onglet le bouton \"+\" ouvre-t-il le formulaire d'ajout d'une nouvelle condition (allergie, pathologie...) ?",
    textEn:
      "On which tab does the \"+\" button open the form to add a new condition (allergy, pathology...)?",
    hintFr: "C'est l'onglet des informations durables.",
    hintEn: "It's the tab for long-standing information.",
    explanationFr: "Sur l'onglet Conditions.",
    explanationEn: "On the Conditions tab.",
    options: [
      { textFr: "Conditions", textEn: "Conditions", isCorrect: true },
      { textFr: "Historique", textEn: "History", isCorrect: false },
      {
        textFr: "Les deux indifféremment",
        textEn: "Either one, indifferently",
        isCorrect: false,
      },
      {
        textFr: "Aucun, c'est l'enseignant qui les ajoute",
        textEn: "Neither, only the teacher adds them",
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
    textFr:
      "Sur quel onglet le bouton \"+\" permet-il de signaler un événement survenu hors école ?",
    textEn:
      "On which tab does the \"+\" button let you report an event that happened outside school?",
    hintFr: "C'est l'onglet trié par date.",
    hintEn: "It's the tab sorted by date.",
    explanationFr: "Sur l'onglet Historique.",
    explanationEn: "On the History tab.",
    options: [
      { textFr: "Historique", textEn: "History", isCorrect: true },
      { textFr: "Conditions", textEn: "Conditions", isCorrect: false },
      {
        textFr: "Les deux indifféremment",
        textEn: "Either one, indifferently",
        isCorrect: false,
      },
      {
        textFr: "Aucun, c'est réservé au personnel",
        textEn: "Neither, it's staff-only",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_MULTI",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Parmi ces types, lesquels peuvent qualifier un signalement dans l'Historique ? (plusieurs réponses)",
    textEn:
      "Among these types, which ones can qualify a report in the History tab? (select all that apply)",
    hintFr: "Ce sont tous des événements de santé ponctuels.",
    hintEn: "They are all one-off health events.",
    explanationFr: "Maladie, Accident et Vaccination en font partie.",
    explanationEn: "Illness, Accident and Vaccination are among them.",
    options: [
      { textFr: "Maladie", textEn: "Illness", isCorrect: true },
      { textFr: "Accident", textEn: "Accident", isCorrect: true },
      { textFr: "Vaccination", textEn: "Vaccination", isCorrect: true },
      {
        textFr: "Absence injustifiée",
        textEn: "Unjustified absence",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Comment retrouvez-vous rapidement une condition ou un événement précis parmi plusieurs ?",
    textEn:
      "How do you quickly find one specific condition or event among several?",
    hintFr: "Les deux outils se trouvent en haut de chaque onglet.",
    hintEn: "Both tools sit at the top of each tab.",
    explanationFr:
      "En combinant la recherche par mot-clé et les filtres (type, niveau d'alerte).",
    explanationEn:
      "By combining keyword search and filters (type, alert level).",
    options: [
      {
        textFr: "Avec la recherche et les filtres",
        textEn: "With search and filters",
        isCorrect: true,
      },
      {
        textFr: "En contactant le personnel de santé de l'école",
        textEn: "By contacting the school's health staff",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible, il faut tout parcourir",
        textEn: "It isn't possible, you must scroll through everything",
        isCorrect: false,
      },
      {
        textFr: "En triant par nom d'enseignant",
        textEn: "By sorting by teacher name",
        isCorrect: false,
      },
    ],
  },
  {
    order: 11,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Lorsque vous signalez un événement de santé survenu hors école, l'enseignant référent de la classe de votre enfant en est automatiquement informé.",
    textEn:
      "When you report a health event that happened outside school, your child's class referent teacher is automatically notified.",
    hintFr: "Ce lien avec le référent est ce qui distingue un signalement d'une simple note personnelle.",
    hintEn: "This link with the referent is what sets a report apart from a simple personal note.",
    explanationFr:
      "Vrai : le signalement déclenche une notification automatique vers l'enseignant référent.",
    explanationEn:
      "True: the report automatically triggers a notification to the referent teacher.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 12,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr:
      "Un signalement peut indiquer une restriction concernant quelle activité ?",
    textEn: "A report can flag a restriction concerning which activity?",
    hintFr: "C'est une case à cocher distincte du type de signalement.",
    hintEn: "It's a checkbox separate from the report's type.",
    explanationFr:
      "Le sport : un signalement peut porter une restriction sportive pour votre enfant.",
    explanationEn:
      "Sport: a report can carry a sport restriction for your child.",
    options: [
      { textFr: "Le sport", textEn: "Sport", isCorrect: true },
      { textFr: "La cantine", textEn: "The cafeteria", isCorrect: false },
      { textFr: "Les devoirs", textEn: "Homework", isCorrect: false },
      { textFr: "La messagerie", textEn: "Messaging", isCorrect: false },
    ],
  },
  {
    order: 13,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: DEEP_LINK,
    textFr: "Les événements de santé que vous signalez apparaissent dans l'onglet Conditions.",
    textEn: "The health events you report appear in the Conditions tab.",
    hintFr: "Un signalement a toujours une date précise.",
    hintEn: "A report always has a precise date.",
    explanationFr:
      "Faux : vos signalements apparaissent dans l'onglet Historique, pas dans Conditions.",
    explanationEn:
      "False: your reports appear in the History tab, not in Conditions.",
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
