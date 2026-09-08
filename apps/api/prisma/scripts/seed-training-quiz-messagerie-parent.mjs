import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

const IMG = (name) => `/training-quiz/messagerie/${name}.svg`;

const CHAPTER = {
  role: "PARENT",
  moduleKey: "messagerie",
  order: 2,
  icon: "MessageSquare",
  colorFrom: "#8B6DD9",
  colorTo: "#5B3FBF",
  titleFr: "Messagerie",
  titleEn: "Messaging",
  descriptionFr:
    "Apprenez à échanger avec l'école : écrire, répondre, retrouver vos messages et organiser vos dossiers.",
  descriptionEn:
    "Learn how to communicate with the school: write, reply, find your messages and organise your folders.",
};

const QUESTIONS = [
  {
    order: 1,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q1-nouveau-message"),
    deepLinkRoute: "/messagerie",
    textFr: "Où écrire un nouveau message à l'école ?",
    textEn: "Where do you write a new message to the school?",
    hintFr: "Cherchez un bouton bien visible en haut de la messagerie.",
    hintEn:
      "Look for a clearly visible button at the top of the messaging page.",
    explanationFr:
      'Le bouton "Nouveau message" en haut de la messagerie ouvre le formulaire de composition.',
    explanationEn:
      'The "New message" button at the top of the messaging page opens the compose form.',
    options: [
      {
        textFr: 'En cliquant sur le bouton "Nouveau message"',
        textEn: 'By clicking the "New message" button',
        isCorrect: true,
      },
      {
        textFr: "En appelant l'école",
        textEn: "By calling the school",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible depuis l'application",
        textEn: "This isn't possible from the app",
        isCorrect: false,
      },
      {
        textFr: "En passant par les paramètres du compte",
        textEn: "Through account settings",
        isCorrect: false,
      },
    ],
  },
  {
    order: 2,
    type: "TRUE_FALSE",
    difficulty: "EASY",
    image: IMG("q2-envoyes"),
    deepLinkRoute: "/messagerie",
    textFr:
      'Un message que vous envoyez apparaît automatiquement dans le dossier "Envoyés".',
    textEn: 'A message you send automatically appears in the "Sent" folder.',
    hintFr: "Regardez les dossiers listés sur le côté de la messagerie.",
    hintEn: "Look at the folders listed on the side of the messaging page.",
    explanationFr:
      'Comme dans une boîte email classique, chaque message envoyé est archivé dans le dossier "Envoyés".',
    explanationEn:
      'Like a classic email inbox, every sent message is filed in the "Sent" folder.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 3,
    type: "MCQ_SINGLE",
    difficulty: "EASY",
    image: IMG("q3-boite-reception"),
    deepLinkRoute: "/messagerie",
    textFr: "Quel dossier affiche les messages que vous avez reçus ?",
    textEn: "Which folder shows the messages you have received?",
    hintFr: "C'est le tout premier dossier de la liste.",
    hintEn: "It's the very first folder in the list.",
    explanationFr:
      'La "Boîte de réception" liste tous les messages reçus des enseignants et de l\'administration.',
    explanationEn:
      'The "Inbox" lists every message received from teachers and school staff.',
    options: [
      {
        textFr: "La boîte de réception",
        textEn: "The inbox",
        isCorrect: true,
      },
      { textFr: "Les brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Les archives", textEn: "Archive", isCorrect: false },
      { textFr: "Les envoyés", textEn: "Sent", isCorrect: false },
    ],
  },
  {
    order: 4,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q4-brouillons"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Où retrouver un message que vous avez commencé à écrire mais pas encore envoyé ?",
    textEn:
      "Where do you find a message you started writing but haven't sent yet?",
    hintFr: "Ce dossier garde vos messages inachevés.",
    hintEn: "This folder keeps your unfinished messages.",
    explanationFr:
      "Un message non envoyé reste disponible dans le dossier \"Brouillons\" jusqu'à ce que vous l'envoyiez ou le supprimiez.",
    explanationEn:
      'An unsent message stays available in the "Drafts" folder until you send or delete it.',
    options: [
      { textFr: "Dans les brouillons", textEn: "In drafts", isCorrect: true },
      {
        textFr: "Il est automatiquement supprimé",
        textEn: "It is automatically deleted",
        isCorrect: false,
      },
      {
        textFr: "Dans la boîte de réception",
        textEn: "In the inbox",
        isCorrect: false,
      },
      {
        textFr: "Dans les archives",
        textEn: "In the archive",
        isCorrect: false,
      },
    ],
  },
  {
    order: 5,
    type: "MCQ_SINGLE",
    difficulty: "MEDIUM",
    image: IMG("q5-archives"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Quel dossier permet de ranger un message sans le supprimer définitivement ?",
    textEn:
      "Which folder lets you put a message aside without deleting it for good?",
    hintFr:
      "Pensez à un dossier qui garde une trace sans encombrer la boîte de réception.",
    hintEn:
      "Think of a folder that keeps a record without cluttering the inbox.",
    explanationFr:
      'Les "Archives" permettent de sortir un message de la boîte de réception tout en le conservant.',
    explanationEn:
      'The "Archive" folder lets you move a message out of the inbox while keeping it.',
    options: [
      { textFr: "Les archives", textEn: "The archive", isCorrect: true },
      { textFr: "Les brouillons", textEn: "Drafts", isCorrect: false },
      { textFr: "Les envoyés", textEn: "Sent", isCorrect: false },
      {
        textFr: "Il faut le supprimer, il n'y a pas d'autre solution",
        textEn: "You must delete it, there is no other option",
        isCorrect: false,
      },
    ],
  },
  {
    order: 6,
    type: "TRUE_FALSE",
    difficulty: "MEDIUM",
    image: IMG("q6-repondre"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous pouvez répondre directement à un message reçu, sans avoir à recréer un nouveau message de zéro.",
    textEn:
      "You can reply directly to a received message, without creating a new one from scratch.",
    hintFr: "Ouvrez un message reçu et regardez les actions proposées.",
    hintEn: "Open a received message and look at the actions offered.",
    explanationFr:
      'Le bouton "Répondre" pré-remplit un nouveau message avec le bon destinataire et l\'objet.',
    explanationEn:
      'The "Reply" button pre-fills a new message with the right recipient and subject.',
    options: [
      { textFr: "Vrai", textEn: "True", isCorrect: true },
      { textFr: "Faux", textEn: "False", isCorrect: false },
    ],
  },
  {
    order: 7,
    type: "MCQ_MULTI",
    difficulty: "HARD",
    image: IMG("q7-dossiers"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Parmi ces dossiers, lesquels retrouve-t-on dans la messagerie ? (plusieurs réponses)",
    textEn:
      "Which of these folders can you find in the messaging module? (select all that apply)",
    hintFr: "Regardez la liste des dossiers sur le côté de l'écran.",
    hintEn: "Look at the list of folders on the side of the screen.",
    explanationFr:
      "La messagerie propose quatre dossiers : boîte de réception, envoyés, brouillons et archives. Il n'y a pas de corbeille distincte.",
    explanationEn:
      "Messaging has four folders: inbox, sent, drafts and archive. There is no separate trash folder.",
    options: [
      {
        textFr: "Boîte de réception",
        textEn: "Inbox",
        isCorrect: true,
      },
      { textFr: "Envoyés", textEn: "Sent", isCorrect: true },
      { textFr: "Brouillons", textEn: "Drafts", isCorrect: true },
      { textFr: "Archives", textEn: "Archive", isCorrect: true },
      { textFr: "Corbeille", textEn: "Trash", isCorrect: false },
    ],
  },
  {
    order: 8,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q8-recherche"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Comment retrouver rapidement un message précis dans une longue boîte de réception ?",
    textEn: "How do you quickly find a specific message in a long inbox?",
    hintFr: "Une barre en haut de la liste des messages sert exactement à ça.",
    hintEn: "A bar at the top of the message list does exactly that.",
    explanationFr:
      "La barre de recherche en haut de la messagerie filtre instantanément les messages par mot-clé.",
    explanationEn:
      "The search bar at the top of the messaging page instantly filters messages by keyword.",
    options: [
      {
        textFr: "En utilisant la barre de recherche",
        textEn: "By using the search bar",
        isCorrect: true,
      },
      {
        textFr: "En faisant défiler tous les messages un par un",
        textEn: "By scrolling through every message one by one",
        isCorrect: false,
      },
      {
        textFr: "Ce n'est pas possible",
        textEn: "It isn't possible",
        isCorrect: false,
      },
      {
        textFr: "En contactant le support technique",
        textEn: "By contacting technical support",
        isCorrect: false,
      },
    ],
  },
  {
    order: 9,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q9-envoyer-brouillon"),
    deepLinkRoute: "/messagerie",
    textFr:
      "Vous terminez et envoyez un brouillon commencé la veille : où se trouve-t-il ensuite ?",
    textEn:
      "You finish and send a draft started the day before: where does it end up?",
    hintFr: "Une fois envoyé, un message n'est plus un brouillon.",
    hintEn: "Once sent, a message is no longer a draft.",
    explanationFr:
      'Dès qu\'un brouillon est envoyé, il quitte le dossier "Brouillons" et apparaît dans "Envoyés".',
    explanationEn:
      'As soon as a draft is sent, it leaves the "Drafts" folder and appears in "Sent".',
    options: [
      {
        textFr: 'Dans le dossier "Envoyés"',
        textEn: 'In the "Sent" folder',
        isCorrect: true,
      },
      {
        textFr: "Il reste dans les brouillons",
        textEn: "It stays in drafts",
        isCorrect: false,
      },
      {
        textFr: "Dans les archives",
        textEn: "In the archive",
        isCorrect: false,
      },
      {
        textFr: "Il disparaît de l'application",
        textEn: "It disappears from the app",
        isCorrect: false,
      },
    ],
  },
  {
    order: 10,
    type: "MCQ_SINGLE",
    difficulty: "HARD",
    image: IMG("q10-destinataire"),
    deepLinkRoute: "/messagerie",
    textFr:
      'Quand vous cliquez sur "Répondre" à un message reçu, que se passe-t-il ?',
    textEn: 'When you click "Reply" on a received message, what happens?',
    hintFr: "Le formulaire de composition s'ouvre déjà à moitié rempli.",
    hintEn: "The compose form opens already half filled in.",
    explanationFr:
      "Un nouveau message s'ouvre avec le destinataire et l'objet déjà pré-remplis, prêt à recevoir votre réponse.",
    explanationEn:
      "A new message opens with the recipient and subject already pre-filled, ready for your reply.",
    options: [
      {
        textFr:
          "Un nouveau message s'ouvre avec le destinataire et l'objet pré-remplis",
        textEn: "A new message opens with the recipient and subject pre-filled",
        isCorrect: true,
      },
      {
        textFr: "Le message original est immédiatement supprimé",
        textEn: "The original message is immediately deleted",
        isCorrect: false,
      },
      {
        textFr: "Vous devez retaper l'adresse de l'école",
        textEn: "You have to retype the school's address",
        isCorrect: false,
      },
      {
        textFr: "Rien ne se passe, il faut utiliser un email externe",
        textEn: "Nothing happens, you must use an external email",
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
