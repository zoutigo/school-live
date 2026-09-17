import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const GENERAL_DEEP_LINK = "/fil";
const CHILD_DEEP_LINK = "/children/{childId}/vie-de-classe";

const CHAPTER = {
  role: "PARENT",
  moduleKey: "fil",
  order: 6,
  icon: "Newspaper",
  colorFrom: "#D9645A",
  colorTo: "#A63F37",
  titleFr: "Fil d'actualité",
  titleEn: "News feed",
  descriptionFr:
    "Apprenez à publier sur le fil général de l'école et à distinguer la vie de classe de chaque enfant.",
  descriptionEn:
    "Learn how to publish on the school's general feed and tell your children's class life apart.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Où consultez-vous le fil d'actualité général de l'école ?",
    textEn: "Where do you check the school's general news feed?",
    hintFr: "C'est une entrée de votre menu principal, pas du sous-menu d'un enfant.",
    hintEn: "It's an entry in your main menu, not a child's submenu.",
    explanationFr: 'L\'entrée "Fil d\'actualité" de votre menu principal.',
    explanationEn: 'The "News feed" entry of your main menu.',
    options: [
      {
        textFr: "Le menu \"Fil d'actualité\"",
        textEn: 'The "News feed" menu',
        isCorrect: true,
      },
      {
        textFr: "La fiche d'un enfant, onglet Vie de classe",
        textEn: "A child's page, Class life tab",
        isCorrect: false,
      },
      { textFr: "La messagerie", textEn: "Messaging", isCorrect: false },
      {
        textFr: "La situation financière",
        textEn: "The financial overview",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Quels sont les deux types de publication que vous pouvez créer ?",
    textEn: "What are the two post types you can create?",
    hintFr: "L'un des deux propose des options à choisir.",
    hintEn: "One of the two offers options to choose from.",
    explanationFr: "Post et Sondage.",
    explanationEn: "Post and Poll.",
    options: [
      { textFr: "Post et Sondage", textEn: "Post and Poll", isCorrect: true },
      {
        textFr: "Note et Devoir",
        textEn: "Grade and Homework",
        isCorrect: false,
      },
      {
        textFr: "Message et Rappel",
        textEn: "Message and Reminder",
        isCorrect: false,
      },
      { textFr: "Photo et Vidéo", textEn: "Photo and Video", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Quelle audience un parent peut-il choisir en publiant sur le fil général ?",
    textEn: "Which audience can a parent pick when publishing on the general feed?",
    hintFr: "Contrairement au personnel de l'école, vous n'avez pas de choix.",
    hintEn: "Unlike school staff, you don't get a choice.",
    explanationFr:
      "Une seule option, fixe : \"Parents uniquement\". Seul le personnel choisit une audience plus large.",
    explanationEn:
      'A single, fixed option: "Parents only". Only staff can pick a broader audience.',
    options: [
      {
        textFr: "Parents uniquement, sans autre choix",
        textEn: "Parents only, no other choice",
        isCorrect: true,
      },
      {
        textFr: "Toute l'école",
        textEn: "The whole school",
        isCorrect: false,
      },
      {
        textFr: "Le personnel uniquement",
        textEn: "Staff only",
        isCorrect: false,
      },
      {
        textFr: "Un choix parmi quatre audiences",
        textEn: "A choice among four audiences",
        isCorrect: false,
      },
    ],
  },
  {
    order: 4,
    type: "TRUE_FALSE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: CHILD_DEEP_LINK,
    textFr:
      "Le fil \"Vie de classe\" accessible depuis la fiche d'un enfant permet de commenter et réagir, comme le fil général.",
    textEn:
      "The \"Class life\" feed accessible from a child's page lets you comment and react, just like the general feed.",
    hintFr: "Ce fil sert uniquement à vous informer de ce qui se passe dans la classe.",
    hintEn: "This feed is only there to keep you informed of what happens in class.",
    explanationFr:
      "Faux : ce fil est en lecture seule pour le parent, sans publication, commentaire ni réaction possibles.",
    explanationEn:
      "False: this feed is read-only for the parent, with no posting, commenting or reacting possible.",
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: false },
      { textFr: "Faux", textEn: "False", isCorrect: true },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    stage: "DISCOVERY",
    image: null,
    deepLinkRoute: CHILD_DEEP_LINK,
    textFr: "Le fil \"Vie de classe\" d'un enfant particulier montre :",
    textEn: "A specific child's \"Class life\" feed shows:",
    hintFr: "Il ne s'agit pas du fil général de l'école.",
    hintEn: "It isn't the school's general feed.",
    explanationFr:
      "Les publications propres à la classe de cet enfant uniquement.",
    explanationEn: "Only the posts specific to that child's class.",
    options: [
      {
        textFr: "Les publications de la classe de cet enfant",
        textEn: "The posts from that child's class",
        isCorrect: true,
      },
      {
        textFr: "Toutes les publications de l'école",
        textEn: "All of the school's posts",
        isCorrect: false,
      },
      {
        textFr: "Uniquement vos propres publications",
        textEn: "Only your own posts",
        isCorrect: false,
      },
      {
        textFr: "Les publications de tous vos enfants confondues",
        textEn: "All your children's posts merged together",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Comment créez-vous un sondage plutôt qu'une publication classique ?",
    textEn: "How do you create a poll instead of a regular post?",
    hintFr: "Le choix se fait au tout début, avant de rédiger le contenu.",
    hintEn: "The choice is made right at the start, before writing the content.",
    explanationFr:
      "En sélectionnant \"Sondage\" dans le composeur, puis en renseignant la question et les options de réponse.",
    explanationEn:
      'By selecting "Poll" in the composer, then filling in the question and answer options.',
    options: [
      {
        textFr: "En choisissant \"Sondage\" dans le composeur",
        textEn: 'By choosing "Poll" in the composer',
        isCorrect: true,
      },
      {
        textFr: "En ajoutant une image à un Post",
        textEn: "By adding an image to a Post",
        isCorrect: false,
      },
      {
        textFr: "En contactant le support",
        textEn: "By contacting support",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible pour un parent",
        textEn: "It isn't possible for a parent",
        isCorrect: false,
      },
    ],
  },
  {
    order: 7,
    type: "MCQ_MULTI",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Que pouvez-vous joindre à une publication ? (plusieurs réponses)",
    textEn: "What can you attach to a post? (select all that apply)",
    hintFr: "Pensez aux médias, pas au contenu pédagogique.",
    hintEn: "Think media, not academic content.",
    explanationFr: "Une image et une pièce jointe (document).",
    explanationEn: "An image and an attachment (document).",
    options: [
      { textFr: "Une image", textEn: "An image", isCorrect: true },
      {
        textFr: "Une pièce jointe (document)",
        textEn: "An attachment (document)",
        isCorrect: true,
      },
      {
        textFr: "Une note d'évaluation",
        textEn: "A grade",
        isCorrect: false,
      },
      {
        textFr: "Un motif d'absence",
        textEn: "An absence reason",
        isCorrect: false,
      },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Comment réagissez-vous (\"j'aime\") à une publication du fil général ?",
    textEn: "How do you react (\"like\") to a post on the general feed?",
    hintFr: "L'icône se trouve directement sous la publication.",
    hintEn: "The icon sits directly under the post.",
    explanationFr: "En touchant l'icône de réaction affichée sous la publication.",
    explanationEn: "By tapping the reaction icon shown under the post.",
    options: [
      {
        textFr: "En touchant l'icône sous la publication",
        textEn: "By tapping the icon under the post",
        isCorrect: true,
      },
      {
        textFr: "En la partageant par messagerie",
        textEn: "By sharing it through messaging",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est possible que pour le personnel",
        textEn: "It's only possible for staff",
        isCorrect: false,
      },
      {
        textFr: "En répondant à la notification par email",
        textEn: "By replying to the notification by email",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    stage: "PRACTICE",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Comment ajoutez-vous un commentaire sur une publication du fil général ?",
    textEn: "How do you add a comment to a post on the general feed?",
    hintFr: "Une icône dédiée, distincte de la réaction, ouvre la zone de saisie.",
    hintEn: "A dedicated icon, separate from the reaction, opens the input area.",
    explanationFr:
      "En touchant l'icône commentaire de la publication, puis en saisissant votre message.",
    explanationEn:
      "By tapping the post's comment icon, then typing your message.",
    options: [
      {
        textFr: "En touchant l'icône commentaire de la publication",
        textEn: "By tapping the post's comment icon",
        isCorrect: true,
      },
      {
        textFr: "En modifiant directement le sondage",
        textEn: "By directly editing the poll",
        isCorrect: false,
      },
      {
        textFr: "Uniquement en réponse à une notification",
        textEn: "Only by replying to a notification",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible sur le fil général",
        textEn: "It isn't possible on the general feed",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "TRUE_FALSE",
    stage: "MASTERY",
    image: null,
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr: "Une fois publiée, vous pouvez modifier ou supprimer votre propre publication.",
    textEn: "Once published, you can edit or delete your own post.",
    hintFr: "Les actions apparaissent directement sur votre publication.",
    hintEn: "The actions appear directly on your own post.",
    explanationFr:
      "Vrai : vous restez maître de vos publications et pouvez les modifier ou les supprimer après coup.",
    explanationEn:
      "True: you keep control of your posts and can edit or delete them afterwards.",
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
    deepLinkRoute: GENERAL_DEEP_LINK,
    textFr:
      "Un parent peut-il mettre l'une de ses publications \"en avant\" (badge mis en avant), comme le fait parfois le personnel de l'école ?",
    textEn:
      'Can a parent "feature" one of their posts (highlighted badge), like school staff sometimes do?',
    hintFr: "Cette option n'apparaît que dans le composeur du personnel.",
    hintEn: "This option only appears in staff's composer.",
    explanationFr:
      "Non : seul le personnel de l'école peut épingler une publication pour une durée donnée.",
    explanationEn:
      "No: only school staff can pin a post for a given duration.",
    options: [
      {
        textFr: "Non, c'est réservé au personnel de l'école",
        textEn: "No, that's reserved to school staff",
        isCorrect: true,
      },
      {
        textFr: "Oui, pendant 3 jours maximum",
        textEn: "Yes, for up to 3 days",
        isCorrect: false,
      },
      {
        textFr: "Oui, pendant 7 jours maximum",
        textEn: "Yes, for up to 7 days",
        isCorrect: false,
      },
      {
        textFr: "Oui, sans limite de durée",
        textEn: "Yes, with no time limit",
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
