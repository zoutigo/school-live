import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const CLASS_DEEP_LINK = "/classes/{classId}/fil";
const GENERAL_DEEP_LINK = "/fil";

const CHAPTER = {
  role: "TEACHER",
  moduleKey: "fil",
  order: 7,
  icon: "Newspaper",
  colorFrom: "#B0562E",
  colorTo: "#7C3A1D",
  titleFr: "Fil d'actualité",
  titleEn: "News feed",
  descriptionFr:
    "Apprenez à publier sur le fil général de l'école et à suivre la vie de vos classes.",
  descriptionEn:
    "Learn how to publish on the school's general feed and follow your classes' life.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "En tant qu'enseignant, quels fils d'actualité pouvez-vous consulter ?",
    textEn: "As a teacher, which news feeds can you view?",
    hintFr: "Il n'existe pas de fil \"personnel\" séparé.",
    hintEn: "There is no separate \"personal\" feed.",
    explanationFr:
      "Le fil général de l'école et le fil de chacune des classes où vous enseignez.",
    explanationEn:
      "The school's general feed and the feed of each class you teach.",
    options: [
      {
        textFr: "Le fil général de l'école et les fils de vos classes",
        textEn: "The school's general feed and your classes' feeds",
        isCorrect: true,
      },
      { textFr: "Uniquement un fil personnel privé", textEn: "Only a private personal feed", isCorrect: false },
      { textFr: "Aucun, c'est réservé aux parents", textEn: "None, it's reserved to parents", isCorrect: false },
      { textFr: "Le fil de toutes les écoles du réseau", textEn: "The feed of every school in the network", isCorrect: false },
    ],
  },
  {
    order: 2,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: CLASS_DEEP_LINK,
    textFr: "Comment accédez-vous au fil d'actualité d'une classe que vous enseignez ?",
    textEn: "How do you reach the news feed of a class you teach?",
    hintFr: "C'est une entrée du menu de cette classe.",
    hintEn: "It's an entry in that class's menu.",
    explanationFr:
      "Depuis le menu de la classe concernée, l'entrée \"Fil de classe\".",
    explanationEn: "From that class's menu, the \"Class feed\" entry.",
    options: [
      { textFr: "Le menu de la classe > Fil de classe", textEn: "The class menu > Class feed", isCorrect: true },
      { textFr: "Les paramètres du compte", textEn: "Account settings", isCorrect: false },
      { textFr: "La messagerie privée", textEn: "Private messaging", isCorrect: false },
      { textFr: "L'onglet Discipline", textEn: "The Discipline tab", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_MULTI",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "Quelles actions pouvez-vous réaliser sur le fil d'actualité ? (plusieurs réponses)",
    textEn: "Which actions can you take on the news feed? (select all that apply)",
    hintFr: "Un des boutons permet aussi de créer un sondage.",
    hintEn: "One of the buttons also lets you create a poll.",
    explanationFr:
      "Publier une info, réaliser un sondage, et réagir/commenter les publications.",
    explanationEn:
      "Publish an update, run a poll, and react/comment on posts.",
    options: [
      { textFr: "Publier une info", textEn: "Publish an update", isCorrect: true },
      { textFr: "Réaliser un sondage", textEn: "Run a poll", isCorrect: true },
      { textFr: "Réagir et commenter une publication", textEn: "React and comment on a post", isCorrect: true },
      { textFr: "Modifier les notes d'un élève", textEn: "Edit a student's grades", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: CLASS_DEEP_LINK,
    textFr:
      "Sur le fil d'une classe précise, vous devez choisir l'audience à chaque publication.",
    textEn: "On a specific class's feed, you must choose the audience for every post.",
    hintFr: "Le fil de classe cible déjà une audience évidente.",
    hintEn: "The class feed already targets an obvious audience.",
    explanationFr:
      "Faux : sur le fil d'une classe, l'audience est automatiquement cette classe, sans sélecteur.",
    explanationEn:
      "False: on a class feed, the audience is automatically that class, with no selector.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "Depuis le fil général de l'école, quelles audiences un enseignant peut-il choisir pour une publication ?",
    textEn:
      "From the school's general feed, which audiences can a teacher pick for a post?",
    hintFr: "Une des options réserve la publication au personnel de l'école.",
    hintEn: "One of the options reserves the post to school staff.",
    explanationFr:
      "Parents et élèves de l'école, une classe précise, ou l'équipe interne (staff uniquement).",
    explanationEn:
      "Parents and students of the school, a specific class, or the internal team (staff only).",
    options: [
      {
        textFr: "Parents et élèves de l'école, une classe, ou l'équipe interne",
        textEn: "School parents and students, a class, or the internal team",
        isCorrect: true,
      },
      { textFr: "Uniquement les administrateurs de la plateforme", textEn: "Only platform administrators", isCorrect: false },
      { textFr: "Uniquement vos propres enfants", textEn: "Only your own children", isCorrect: false },
      { textFr: "Toutes les écoles du réseau Scolive", textEn: "Every school in the Scolive network", isCorrect: false },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "Vous voulez recueillir l'avis des familles sur le thème d'une prochaine sortie scolaire. Quel outil utilisez-vous ?",
    textEn:
      "You want to gather families' opinions on the theme of an upcoming school trip. Which tool do you use?",
    hintFr: "Ce n'est pas une simple publication texte.",
    hintEn: "It's not a simple text post.",
    explanationFr: "Le bouton \"Réaliser un sondage\" du fil d'actualité.",
    explanationEn: "The \"Run a poll\" button on the news feed.",
    options: [
      { textFr: "Réaliser un sondage", textEn: "Run a poll", isCorrect: true },
      { textFr: "Envoyer une convocation", textEn: "Send a summons", isCorrect: false },
      { textFr: "Créer une évaluation", textEn: "Create an assessment", isCorrect: false },
      { textFr: "Ouvrir un ticket d'assistance", textEn: "Open a support ticket", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: CLASS_DEEP_LINK,
    textFr:
      "Comment retrouvez-vous rapidement une ancienne publication dans un fil de classe très actif ?",
    textEn: "How do you quickly find an old post in a very active class feed?",
    hintFr: "Il y a une barre dédiée juste au-dessus des publications.",
    hintEn: "There's a dedicated bar just above the posts.",
    explanationFr: "Avec la barre de recherche \"Rechercher une publication\" (ou \"Rechercher dans le fil\").",
    explanationEn: "With the \"Search a post\" (or \"Search the feed\") search bar.",
    options: [
      { textFr: "La barre de recherche du fil", textEn: "The feed's search bar", isCorrect: true },
      { textFr: "En appelant l'administration", textEn: "By calling the front office", isCorrect: false },
      { textFr: "En parcourant tous les messages privés", textEn: "By browsing all private messages", isCorrect: false },
      { textFr: "Ce n'est pas possible", textEn: "It isn't possible", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: CLASS_DEEP_LINK,
    textFr:
      "Vous n'enseignez pas dans la classe 5eA. Que se passe-t-il si vous essayez d'ouvrir son fil de classe ?",
    textEn:
      "You don't teach in class 5eA. What happens if you try to open its class feed?",
    hintFr: "L'accès est vérifié côté serveur, pas seulement dans le menu.",
    hintEn: "Access is checked server-side, not only in the menu.",
    explanationFr:
      "L'accès est refusé : seuls les enseignants réellement affectés à cette classe peuvent voir ou publier sur son fil.",
    explanationEn:
      "Access is denied: only teachers actually assigned to that class can view or post on its feed.",
    options: [
      {
        textFr: "L'accès est refusé, vous n'êtes pas affecté à cette classe",
        textEn: "Access is denied, you aren't assigned to that class",
        isCorrect: true,
      },
      { textFr: "Vous pouvez consulter mais pas publier", textEn: "You can view but not post", isCorrect: false },
      { textFr: "Vous pouvez tout faire comme dans vos classes", textEn: "You can do everything like in your classes", isCorrect: false },
      { textFr: "Une demande est envoyée au référent", textEn: "A request is sent to the referent", isCorrect: false },
    ],
  },
  {
    order: 9,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "En tant qu'enseignant, vous pouvez publier une information réservée uniquement aux parents (sans les élèves).",
    textEn: "As a teacher, you can publish an update reserved only to parents (without students).",
    hintFr: "Cette audience précise n'existe pas côté enseignant.",
    hintEn: "That precise audience doesn't exist on the teacher side.",
    explanationFr:
      "Faux : l'audience \"Parents uniquement\" n'est pas proposée aux enseignants, seulement \"Parents et élèves de l'école\".",
    explanationEn:
      "False: the \"Parents only\" audience isn't offered to teachers, only \"School parents and students\".",
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
