import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/discipline/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "discipline",
  order: 1,
  icon: "ShieldCheck",
  colorFrom: "#3DA5F5",
  colorTo: "#207FD5",
  titleFr: "Discipline",
  titleEn: "Discipline",
  descriptionFr:
    "Découvrez comment suivre le comportement de votre enfant à l'école : sanctions, avertissements et mentions positives.",
  descriptionEn:
    "Discover how to follow your child's behaviour at school: sanctions, warnings and positive mentions.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q1-fiche-enfant"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Où consultez-vous le comportement disciplinaire de votre enfant ?",
    textEn: "Where do you check your child's disciplinary record?",
    hintFr:
      "Ouvrez la fiche de votre enfant, puis regardez les onglets disponibles en haut de page.",
    hintEn:
      "Open your child's profile, then look at the tabs available at the top of the page.",
    explanationFr:
      'Ouvrez la fiche de votre enfant puis l\'onglet "Discipline" : vous y retrouvez sanctions, avertissements et mentions positives.',
    explanationEn:
      "Open your child's profile, then the \"Discipline\" tab: you'll find sanctions, warnings and positive mentions there.",
    options: [
      {
        textFr: "Dans l'onglet \"Discipline\" de la fiche de l'enfant",
        textEn: 'In the "Discipline" tab of the child\'s profile',
        isCorrect: true,
      },
      {
        textFr: "Dans la messagerie",
        textEn: "In the messaging inbox",
        isCorrect: false,
      },
      {
        textFr: "Dans les paramètres du compte",
        textEn: "In account settings",
        isCorrect: false,
      },
      {
        textFr: "Il faut appeler l'école",
        textEn: "You have to call the school",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: IMG("q2-notification"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Un nouvel évènement disciplinaire déclenche une pastille de notification dans le menu.",
    textEn:
      "A new disciplinary event triggers a notification badge in the menu.",
    hintFr:
      "Repensez à ce qui se passe pour vos autres modules (notes, messages) quand il y a du nouveau.",
    hintEn:
      "Think about what happens on your other modules (grades, messages) when there's something new.",
    explanationFr:
      "Comme pour les notes ou les messages, un évènement disciplinaire non lu affiche une pastille rouge sur l'entrée \"Discipline\" jusqu'à consultation.",
    explanationEn:
      'Just like grades or messages, an unread disciplinary event shows a red badge on the "Discipline" menu entry until you view it.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q3-mention-positive"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: 'Que signifie une "mention positive" dans le module Discipline ?',
    textEn: 'What does a "positive mention" mean in the Discipline module?',
    hintFr: "Le module Discipline ne sert pas qu'à signaler des sanctions.",
    hintEn: "The Discipline module isn't only there to report sanctions.",
    explanationFr:
      "Le module ne sert pas qu'à signaler des sanctions : il valorise aussi les comportements exemplaires grâce aux mentions positives.",
    explanationEn:
      "The module isn't only for sanctions: it also highlights exemplary behaviour through positive mentions.",
    options: [
      {
        textFr: "Une reconnaissance d'un comportement exemplaire",
        textEn: "A recognition of exemplary behaviour",
        isCorrect: true,
      },
      {
        textFr: "Une sanction déguisée",
        textEn: "A disguised sanction",
        isCorrect: false,
      },
      {
        textFr: "Un rappel du règlement intérieur",
        textEn: "A reminder of school rules",
        isCorrect: false,
      },
      {
        textFr: "Une absence justifiée",
        textEn: "An excused absence",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q4-historique"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr: "Comment retrouver l'historique disciplinaire complet de l'année ?",
    textEn: "How do you find the full disciplinary history for the year?",
    hintFr:
      "Le tableau du module Discipline n'affiche pas qu'un seul évènement.",
    hintEn: "The Discipline module table doesn't show just one event.",
    explanationFr:
      "Le tableau du module Discipline liste chronologiquement tous les évènements de l'année scolaire, pas seulement le dernier.",
    explanationEn:
      "The Discipline module table lists every event of the school year chronologically, not just the latest one.",
    options: [
      {
        textFr:
          "Le tableau du module Discipline liste tous les évènements avec leur date",
        textEn: "The Discipline module table lists every event with its date",
        isCorrect: true,
      },
      {
        textFr: "Seul le dernier évènement est visible",
        textEn: "Only the latest event is visible",
        isCorrect: false,
      },
      {
        textFr: "Il faut contacter l'administration à chaque fois",
        textEn: "You must contact the school office every time",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas disponible côté parent",
        textEn: "This isn't available to parents",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: IMG("q5-fiche-evenement"),
    deepLinkRoute: "/children/{childId}/discipline",
    textFr:
      "Quelles informations retrouve-t-on sur la fiche d'un évènement disciplinaire ? (plusieurs réponses)",
    textEn:
      "Which details appear on a disciplinary event card? (select all that apply)",
    hintFr:
      "Pensez aux informations utiles à un parent, jamais à des données confidentielles d'un enseignant.",
    hintEn:
      "Think about what's useful to a parent, never a teacher's confidential data.",
    explanationFr:
      "Chaque évènement affiche sa date, son type (sanction/avertissement/mention) et le motif renseigné par l'établissement — jamais d'informations sensibles comme un mot de passe.",
    explanationEn:
      "Each event shows its date, type (sanction/warning/mention) and the reason given by the school — never sensitive data such as a password.",
    options: [
      {
        textFr: "La date de l'évènement",
        textEn: "The event date",
        isCorrect: true,
      },
      {
        textFr: "Le motif renseigné par l'école",
        textEn: "The reason given by the school",
        isCorrect: true,
      },
      {
        textFr: "Le type d'évènement (sanction, avertissement, mention)",
        textEn: "The event type (sanction, warning, mention)",
        isCorrect: true,
      },
      {
        textFr: "Le mot de passe de l'enseignant",
        textEn: "The teacher's password",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q6-messagerie"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous avez une question sur un évènement disciplinaire : quelle est la meilleure action ?",
    textEn:
      "You have a question about a disciplinary event: what's the best action?",
    hintFr:
      "Il existe un canal direct pour écrire à l'école depuis l'application.",
    hintEn: "There's a direct channel to message the school from the app.",
    explanationFr:
      "La messagerie interne relie directement les familles à l'établissement : c'est le canal prévu pour échanger sur un évènement disciplinaire.",
    explanationEn:
      "In-app messaging connects families directly with the school: it's the intended channel to discuss a disciplinary event.",
    options: [
      {
        textFr: "Écrire à l'école via la messagerie",
        textEn: "Message the school through in-app messaging",
        isCorrect: true,
      },
      {
        textFr: "Modifier l'évènement vous-même",
        textEn: "Edit the event yourself",
        isCorrect: false,
      },
      {
        textFr: "Ignorer, ça se réglera seul",
        textEn: "Ignore it, it will sort itself out",
        isCorrect: false,
      },
      {
        textFr: "Supprimer le compte de l'enfant",
        textEn: "Delete the child's account",
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
        difficulty: question.difficulty,
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
        difficulty: question.difficulty,
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
